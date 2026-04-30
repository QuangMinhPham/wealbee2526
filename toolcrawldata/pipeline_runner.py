"""
Wealbee Pipeline Runner — chạy toàn bộ luồng tự động.

Luồng:
  [1] Crawl tin tức 24h gần nhất → INSERT Supabase (upsert, không trùng)
  [2] Gán nhãn bằng GPT-4o-mini → chỉ label bài mới crawl + có symbol
  [3] Gửi email cho subscribers

Chạy thủ công:
  python pipeline_runner.py

Chạy qua GitHub Actions (7h sáng mỗi ngày):
  Xem .github/workflows/pipeline.yml
"""

import sys
import time
import logging
from datetime import datetime, date, timedelta
from pathlib import Path

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / '.env')

BASE_DIR     = Path(__file__).parent
CRAWLERS_DIR = BASE_DIR / 'crawlers'
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(CRAWLERS_DIR))

LOG_DIR = BASE_DIR / 'logs'
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_DIR / 'pipeline.log', encoding='utf-8'),
    ],
)
log = logging.getLogger('pipeline')


def step_header(step: int, title: str):
    log.info('=' * 55)
    log.info(f'  BƯỚC {step}: {title}')
    log.info('=' * 55)


# ── Bước 1: Crawl ──────────────────────────────────────────────────────────────

def run_crawl() -> list[str]:
    """
    Crawl VnExpress + Vietstock trong 24h gần nhất.
    Upsert theo article_url → không trùng lặp.
    Trả về list ID các bài vừa được INSERT mới (không phải update).
    """
    step_header(1, 'CRAWL TIN TỨC (24h)')

    from supabase_writer import get_client
    sb = get_client()

    # Lấy set article_url đã tồn tại TRƯỚC khi crawl
    # published_at lưu giờ VN (UTC+7) → dùng giờ local thay vì UTC
    since = (datetime.now() - timedelta(hours=24)).isoformat()
    existing_urls = set()
    offset = 0
    while True:
        rows = sb.table('market_news').select('article_url').gte('published_at', since).range(offset, offset + 999).execute()
        for r in (rows.data or []):
            if r.get('article_url'):
                existing_urls.add(r['article_url'])
        if len(rows.data or []) < 1000:
            break
        offset += 1000
    log.info(f'  Da co {len(existing_urls)} bai trong 24h qua')

    all_new_urls = []

    # VnExpress
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location('vnexpress_scraper', CRAWLERS_DIR / 'vnexpress_scraper.py')
        mod  = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)

        mod.START_DATE = date.today() - timedelta(days=1)
        mod.MAX_PAGES  = 10
        mod.WORKERS    = 5

        articles = mod.scrape_article_list()
        if articles:
            articles = mod.enrich_content(articles)
            new_articles = [
                a for a in articles
                if a.get('article_url') and a['article_url'] not in existing_urls
            ]
            mod.upsert_to_supabase(articles)
            all_new_urls += [a['article_url'] for a in new_articles if a.get('article_url')]
            log.info(f'  VnExpress: {len(articles)} crawl, {len(new_articles)} bai INSERT moi')
        else:
            log.warning('  VnExpress: khong co bai nao')
    except Exception as e:
        log.error(f'  VnExpress loi: {e}')

    # Nguoi Quan Sat — bị Cloudflare block trên datacenter IP (GitHub Actions)
    # log.warning('  NguoiQuanSat: skip (Cloudflare block)')

    # Vietstock
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location('vietstock_scraper', CRAWLERS_DIR / 'vietstock_scraper.py')
        mod  = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)

        mod.START_DATE = date.today() - timedelta(days=1)

        articles = mod.scrape_article_list()
        if articles:
            articles = mod.enrich_content(articles)
            new_articles = [
                a for a in articles
                if a.get('article_url') and a['article_url'] not in existing_urls
            ]
            mod.upsert_news_to_supabase(articles)
            all_new_urls += [a.get('article_url') or a.get('Link bài viết') for a in new_articles]
            log.info(f'  Vietstock: {len(articles)} crawl, {len(new_articles)} bai INSERT moi')
        else:
            log.warning('  Vietstock: khong co bai nao')
    except Exception as e:
        log.error(f'  Vietstock loi: {e}')

    # Markettimes
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location('markettimes_scraper', CRAWLERS_DIR / 'markettimes_scraper.py')
        mod  = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)

        articles = mod.scrape_all_channels(lookback_days=1)
        if articles:
            articles = mod.enrich_content(articles)
            new_articles = [
                a for a in articles
                if a.get('article_url') and a['article_url'] not in existing_urls
            ]
            mod.upsert_to_supabase(articles)
            all_new_urls += [a['article_url'] for a in new_articles if a.get('article_url')]
            log.info(f'  Markettimes: {len(articles)} crawl, {len(new_articles)} bai INSERT moi')
        else:
            log.warning('  Markettimes: khong co bai nao')
    except Exception as e:
        log.error(f'  Markettimes loi: {e}')

    all_new_urls = [u for u in all_new_urls if u]
    log.info(f'  Tong bai INSERT moi: {len(all_new_urls)}')
    return all_new_urls


# ── Bước 2: Label + Score + Reasoning (1 lần gọi GPT) ─────────────────────────

def run_label_and_score(new_urls: list[str]) -> int:
    """
    Gộp label + scoring + reasoning vào 1 lần gọi GPT-4.1-mini.
    Với mỗi bài trong 24h qua chưa có label:
      - Pre-filter content < 50 ký tự → trash ngay, không gọi API
      - Gọi GPT: phân loại trash/non-trash, chấm điểm -10..+10, viết reasoning 2 câu
      - Mapping score → label: very_positive / positive / neutral / negative / very_negative
    Trả về số bài đã xử lý.
    """
    step_header(2, 'LABEL + SCORE + REASONING (GPT-4.1-mini)')

    try:
        import os, json
        from openai import OpenAI
        from supabase_writer import get_client
        from concurrent.futures import ThreadPoolExecutor, as_completed

        client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'), max_retries=1, timeout=30.0)
        sb     = get_client()

        since = (datetime.now() - timedelta(hours=24)).isoformat()
        new_ids = []
        offset = 0
        while True:
            result = (
                sb.table('market_news')
                .select('id')
                .is_('label', 'null')
                .gte('published_at', since)
                .range(offset, offset + 999)
                .execute()
            )
            rows = result.data or []
            new_ids += [r['id'] for r in rows]
            if len(rows) < 1000:
                break
            offset += 1000

        log.info(f'  Bai trong 24h chua label: {len(new_ids)}')
        if not new_ids:
            log.info('  Khong co bai nao can xu ly')
            return 0

        SYSTEM_PROMPT = """Bạn là chuyên gia phân tích tài chính Việt Nam, tư duy như fund manager kỳ cựu.

## BƯỚC 1 — LỌC BÀI RÁC
Gán "trash": true nếu thuộc BẤT KỲ điều kiện nào:
- Nội dung rỗng, quá ngắn, chỉ có link/file đính kèm
- Thông báo hành chính thuần túy không có số liệu mới (giải trình, đính chính)
- Quảng cáo, advertorial, PR không có thông tin mới
- Tin chỉ tóm tắt lại bài cũ, không có sự kiện mới phát sinh
- Tin quốc tế không có liên hệ rõ ràng đến Việt Nam
Nếu "trash": true → trả về ngay với các trường còn lại = null.

## BƯỚC 2 — PHÂN LOẠI LOẠI TIN (news_type)
Chọn đúng 1 nhãn:
- "vi_mo": GDP, CPI, lãi suất NHNN, tỷ giá, xuất nhập khẩu, ngân sách nhà nước
- "vi_mo_dn": chính sách/xu hướng ngành ảnh hưởng nhiều DN cùng ngành
- "hoat_dong_kd": KQKD, lợi nhuận, M&A, thay đổi lãnh đạo của 1 DN cụ thể
- "phap_ly": luật/nghị định/thông tư mới, khởi tố, xử phạt, phát hành cổ phiếu
- "thi_truong": VN-Index, khối ngoại mua/bán ròng, margin, dòng tiền, ETF
- "du_bao": khuyến nghị CTCK, target price, phân tích kỹ thuật

## BƯỚC 3 — MÃ CỔ PHIẾU BỊ ẢNH HƯỞNG (affected_symbols)
Tối đa 5 mã viết hoa. Mảng rỗng [] nếu không xác định được.
- Tin vĩ mô/thị trường: liệt kê mã blue-chip liên quan trực tiếp
- Tin DN cụ thể: chỉ mã đó

## BƯỚC 4 — CHẤM ĐIỂM TÁC ĐỘNG (impact_score)
Thang -10 đến +10, bước 0.5. Xét theo thứ tự:
1. Tin ảnh hưởng trực tiếp hay gián tiếp đến doanh thu/lợi nhuận DN?
   - Trực tiếp, chiếm >30% DT/LN → biên độ đầy đủ
   - Gián tiếp hoặc <10% DT/LN → tối đa ±2
2. Ngắn hạn (1-2 quý) hay thay đổi cấu trúc dài hạn?
3. Tin đã được thị trường kỳ vọng trước? → giảm biên độ 40-60%
4. Yếu tố đặc thù VN: biên độ cứng 7%/10%, retail panic, margin cascade (thép/BDS/CK), SOE discount 20%

Ngưỡng nhãn:
- score > +5.0  → label = "very_positive"
- +1.5 < score ≤ +5.0 → label = "positive"
- -1.5 ≤ score ≤ +1.5 → label = "neutral"
- -5.0 ≤ score < -1.5 → label = "negative"
- score < -5.0 → label = "very_negative"

## BƯỚC 5 — REASONING (đúng 2 câu, bắt buộc)
CÂU 1 — Cơ chế + số:
"[Sự kiện cụ thể] → [cơ chế tác động] → [chỉ số tài chính bị ảnh hưởng + ước lượng định lượng]"
CÂU 2 — Bối cảnh DN (nếu có thông tin DN) hoặc hệ quả ngắn hạn cho nhà đầu tư.

NGÔN NGỮ BẮT BUỘC:
✅ Dùng: thu hẹp, kéo giảm, gây áp lực, đẩy tăng, xói mòn, siết chặt, hỗ trợ, tạo dư địa
✅ Dùng số cụ thể: ~25bps, 8-12%, 1.200 tỷ đồng, NIM, CASA, EBITDA margin, biên GP
❌ Tuyệt đối không dùng: "có thể", "có lẽ", "đáng lo ngại", "cần theo dõi", "đáng kể", "nhìn chung"

## OUTPUT — JSON STRICT (không có text ngoài JSON)
Nếu trash:
{"trash":true,"news_type":null,"affected_symbols":null,"impact_score":null,"label":"trash","impact_reasoning":null}
Nếu không trash:
{"trash":false,"news_type":"hoat_dong_kd","affected_symbols":["VNM"],"impact_score":-3.5,"label":"negative","impact_reasoning":"Câu 1. Câu 2."}"""

        VALID_LABELS = {'very_positive', 'positive', 'neutral', 'negative', 'very_negative', 'trash'}
        VALID_TYPES  = {'vi_mo', 'vi_mo_dn', 'hoat_dong_kd', 'phap_ly', 'thi_truong', 'du_bao'}

        # Cache company_context + beta để tránh query lặp lại
        stock_cache = {}

        def get_stock_context(symbol: str) -> str:
            if not symbol:
                return ''
            if symbol not in stock_cache:
                r = sb.table('stocks').select('company_context,beta').eq('symbol', symbol).limit(1).execute()
                if r.data:
                    row  = r.data[0]
                    ctx  = (row.get('company_context') or '')[:800]
                    beta = row.get('beta')
                    stock_cache[symbol] = f"{ctx}\nBeta so VN-Index: {beta}".strip() if beta else ctx
                else:
                    stock_cache[symbol] = ''
            return stock_cache[symbol]

        def score_to_label(score: float) -> str:
            if score > 5.0:
                return 'very_positive'
            elif score > 1.5:
                return 'positive'
            elif score >= -1.5:
                return 'neutral'
            elif score >= -5.0:
                return 'negative'
            else:
                return 'very_negative'

        def process_one(article):
            content = (article.get('content') or '').strip()

            # Pre-filter: content < 50 ký tự → trash ngay, không gọi API
            if len(content) < 50:
                return article['id'], {
                    'label': 'trash', 'news_type': None,
                    'affected_symbols': None, 'impact_score': None,
                    'impact_reasoning': None,
                }

            symbol      = article.get('symbol') or ''
            affected_db = article.get('affected_symbols') or []
            main_symbol = symbol or (affected_db[0] if affected_db else '')
            stock_ctx   = get_stock_context(main_symbol)

            user_text = f"Tiêu đề: {article.get('title', '')}\nNội dung: {content[:1500]}"
            if main_symbol:
                user_text += f"\nMã CK chính: {main_symbol}"
            if stock_ctx:
                user_text += f"\nThông tin doanh nghiệp:\n{stock_ctx}"

            try:
                resp = client.chat.completions.create(
                    model='gpt-4.1-mini',
                    messages=[
                        {'role': 'system', 'content': SYSTEM_PROMPT},
                        {'role': 'user',   'content': user_text},
                    ],
                    max_tokens=300,
                    temperature=0,
                    response_format={'type': 'json_object'},
                )
                data = json.loads(resp.choices[0].message.content.strip())

                if data.get('trash'):
                    return article['id'], {
                        'label': 'trash', 'news_type': None,
                        'affected_symbols': None, 'impact_score': None,
                        'impact_reasoning': None,
                    }

                score    = data.get('impact_score')
                label    = score_to_label(float(score)) if isinstance(score, (int, float)) else data.get('label', 'neutral')
                ntype    = data.get('news_type', 'thi_truong')
                affected = data.get('affected_symbols') or []
                reasoning = (data.get('impact_reasoning') or '').strip()

                if label not in VALID_LABELS:
                    label = 'neutral'
                if ntype not in VALID_TYPES:
                    ntype = 'thi_truong'
                if not isinstance(affected, list):
                    affected = []
                affected = [s for s in affected if isinstance(s, str) and len(s) <= 10][:5]

                return article['id'], {
                    'label':            label,
                    'news_type':        ntype,
                    'affected_symbols': affected,
                    'impact_score':     float(score) if isinstance(score, (int, float)) else None,
                    'impact_reasoning': reasoning or None,
                }

            except Exception as e:
                err = str(e)
                if '429' in err or 'rate_limit' in err:
                    raise
                log.warning(f'  API loi {article["id"][:8]}: {e}')
                return article['id'], {
                    'label': 'neutral', 'news_type': 'thi_truong',
                    'affected_symbols': [], 'impact_score': None,
                    'impact_reasoning': None,
                }

        total = 0
        batch_size = 50

        for i in range(0, len(new_ids), batch_size):
            chunk_ids = new_ids[i:i + batch_size]
            result = (
                sb.table('market_news')
                .select('id,title,content,symbol,affected_symbols')
                .in_('id', chunk_ids)
                .execute()
            )
            articles = result.data or []
            if not articles:
                continue

            log.info(f'  Dang xu ly {len(articles)} bai...')
            with ThreadPoolExecutor(max_workers=5) as executor:
                futures = {executor.submit(process_one, a): a for a in articles}
                for future in as_completed(futures):
                    rec_id, fields = future.result()
                    sb.table('market_news').update({
                        **fields,
                        'labeled_at':       datetime.now().isoformat(),
                        'labeled_by':       'gpt-4.1-mini',
                        'impact_scored_at': datetime.now().isoformat() if fields.get('impact_score') is not None else None,
                    }).eq('id', rec_id).execute()
                    log.info(f'  ✓ {rec_id[:8]}... → {fields["label"]} (score={fields.get("impact_score")})')
                    total += 1

        log.info(f'  Da xu ly: {total} bai')
        return total

    except Exception as e:
        log.error(f'  Label+score loi: {e}')
        return 0


# ── Bước 3: Email ──────────────────────────────────────────────────────────────

def run_email():
    """Gửi email cho tất cả subscribers."""
    step_header(3, 'GỬI EMAIL THÔNG BÁO')
    try:
        from email_notifier import run
        run()
    except Exception as e:
        log.error(f'  Email lỗi: {e}')


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    start = time.time()

    log.info('=' * 55)
    log.info(f'  WEALBEE PIPELINE — {datetime.now().strftime("%d/%m/%Y %H:%M:%S")}')
    log.info('=' * 55)

    new_urls = run_crawl()
    time.sleep(2)

    n_labeled = run_label_and_score(new_urls)
    time.sleep(2)

    run_email()

    elapsed = time.time() - start
    log.info('=' * 55)
    log.info(f'  HOAN THANH — {elapsed:.0f}s')
    log.info(f'  Crawl moi: {len(new_urls)} bai | Label+Score: {n_labeled} bai')
    log.info('=' * 55)


if __name__ == '__main__':
    main()
