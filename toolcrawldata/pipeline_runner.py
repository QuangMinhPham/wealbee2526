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

    # Nguoi Quan Sat
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location('nguoiquansat_scraper', CRAWLERS_DIR / 'nguoiquansat_scraper.py')
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
            mod.upsert_to_supabase(articles)
            all_new_urls += [a['article_url'] for a in new_articles if a.get('article_url')]
            log.info(f'  NguoiQuanSat: {len(articles)} crawl, {len(new_articles)} bai INSERT moi')
        else:
            log.warning('  NguoiQuanSat: khong co bai nao')
    except Exception as e:
        log.error(f'  NguoiQuanSat loi: {e}')

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

    all_new_urls = [u for u in all_new_urls if u]
    log.info(f'  Tong bai INSERT moi: {len(all_new_urls)}')
    return all_new_urls


# ── Bước 2: Label ──────────────────────────────────────────────────────────────

def run_label(new_urls: list[str]) -> int:
    """
    Gán nhãn chỉ những bài vừa INSERT mới (theo URL), có symbol, chưa có label.
    Mỗi bài: label tác động (positive/negative/neutral/trash) + news_type (6 loại)
             + affected_symbols (mảng mã bị ảnh hưởng).
    Trả về số bài đã label.
    """
    step_header(2, 'GÁN NHÃN GPT-4.1-mini')

    if not new_urls:
        log.info('  Khong co bai INSERT moi -> bo qua label')
        return 0

    try:
        import os, json
        from openai import OpenAI
        from supabase_writer import get_client
        from concurrent.futures import ThreadPoolExecutor, as_completed

        client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'), max_retries=1, timeout=15.0)
        sb     = get_client()

        # Lấy ID các bài mới có symbol, chưa label
        new_ids = []
        batch_size_url = 50
        for i in range(0, len(new_urls), batch_size_url):
            chunk = new_urls[i:i + batch_size_url]
            result = (
                sb.table('market_news')
                .select('id')
                .in_('article_url', chunk)
                .is_('label', 'null')
                .not_.is_('symbol', 'null')
                .execute()
            )
            new_ids += [r['id'] for r in (result.data or [])]

        log.info(f'  Bai moi co symbol chua label: {len(new_ids)}')
        if not new_ids:
            log.info('  Khong co bai nao can label')
            return 0

        SYSTEM_PROMPT = """Bạn là chuyên gia phân tích tin tức tài chính Việt Nam.
Phân tích bài báo và trả về JSON với 3 trường:

1. "label": tác động đến giá cổ phiếu
   - "positive": tin tốt, tích cực
   - "negative": tin xấu, tiêu cực
   - "neutral": thông tin trung tính
   - "trash": không có giá trị phân tích

2. "news_type": loại tin tức
   - "vi_mo": kinh tế vĩ mô, chính sách nhà nước, lãi suất, tỷ giá, GDP
   - "vi_mo_dn": tin tức vi mô ảnh hưởng nhiều doanh nghiệp cùng ngành
   - "hoat_dong_kd": kết quả kinh doanh, lợi nhuận, doanh thu, M&A của 1 doanh nghiệp cụ thể
   - "phap_ly": pháp lý, quy định, cơ cấu cổ đông, phát hành cổ phiếu
   - "thi_truong": diễn biến thị trường, chỉ số, dòng tiền, khối ngoại
   - "du_bao": dự báo, khuyến nghị, phân tích kỹ thuật

3. "affected_symbols": mảng mã cổ phiếu bị ảnh hưởng (viết hoa, tối đa 5 mã)
   - Với tin vĩ mô/thị trường: liệt kê các mã blue-chip liên quan (VIC, VNM, HPG...)
   - Với tin doanh nghiệp cụ thể: chỉ mã đó
   - Nếu không xác định được: mảng rỗng []

Chỉ trả về JSON, không giải thích. Ví dụ:
{"label":"positive","news_type":"hoat_dong_kd","affected_symbols":["FPT"]}"""

        VALID_LABELS    = {'positive', 'negative', 'neutral', 'trash'}
        VALID_TYPES     = {'vi_mo', 'vi_mo_dn', 'hoat_dong_kd', 'phap_ly', 'thi_truong', 'du_bao'}

        def label_one(article):
            text = f"Tiêu đề: {article.get('title','')}\nNội dung: {(article.get('content') or '')[:1500]}"
            try:
                resp = client.chat.completions.create(
                    model='gpt-4.1-mini',
                    messages=[
                        {'role': 'system', 'content': SYSTEM_PROMPT},
                        {'role': 'user',   'content': text},
                    ],
                    max_tokens=80,
                    temperature=0,
                    response_format={'type': 'json_object'},
                )
                raw = resp.choices[0].message.content.strip()
                data = json.loads(raw)
                label    = data.get('label', 'neutral')
                ntype    = data.get('news_type', 'thi_truong')
                affected = data.get('affected_symbols', [])
                if label not in VALID_LABELS:
                    label = 'neutral'
                if ntype not in VALID_TYPES:
                    ntype = 'thi_truong'
                if not isinstance(affected, list):
                    affected = []
                affected = [s for s in affected if isinstance(s, str) and s.isupper()][:5]
                return article['id'], label, ntype, affected
            except Exception as e:
                err = str(e)
                if '429' in err or 'rate_limit' in err:
                    raise
                log.warning(f'  API loi {article["id"][:8]}: {e}')
                return article['id'], 'neutral', 'thi_truong', []

        total_labeled = 0
        batch_size = 50

        for i in range(0, len(new_ids), batch_size):
            chunk_ids = new_ids[i:i + batch_size]
            result = (
                sb.table('market_news')
                .select('id,title,content,symbol')
                .in_('id', chunk_ids)
                .execute()
            )
            articles = result.data or []
            if not articles:
                continue

            log.info(f'  Dang label {len(articles)} bai...')
            with ThreadPoolExecutor(max_workers=5) as executor:
                futures = {executor.submit(label_one, a): a for a in articles}
                for future in as_completed(futures):
                    rec_id, label, ntype, affected = future.result()
                    sb.table('market_news').update({
                        'label':            label,
                        'news_type':        ntype,
                        'affected_symbols': affected,
                        'labeled_at':       datetime.now().isoformat(),
                        'labeled_by':       'gpt-4.1-mini',
                    }).eq('id', rec_id).execute()
                    total_labeled += 1

        log.info(f'  Da label: {total_labeled} bai')
        return total_labeled

    except Exception as e:
        log.error(f'  Label loi: {e}')
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

    n_label = run_label(new_urls)
    time.sleep(2)

    if n_label > 0:
        run_email()
    else:
        log.info('  Khong co bai moi co nhan → bo qua gui email')

    elapsed = time.time() - start
    log.info('=' * 55)
    log.info(f'  HOAN THANH — {elapsed:.0f}s')
    log.info(f'  Crawl moi: {len(new_urls)} bai | Label: {n_label} bai')
    log.info('=' * 55)


if __name__ == '__main__':
    main()
