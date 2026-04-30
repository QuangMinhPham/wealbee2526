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

def _normalize_article(a: dict, source: str) -> dict:
    """Chuẩn hoá field name về dạng chung — Vietstock dùng key tiếng Việt."""
    pub = a.get('published_at') or a.get('_ts')
    return {
        'title':        (a.get('title') or a.get('Tiêu đề') or '').strip(),
        'content':      (a.get('content') or a.get('Nội dung') or '').strip(),
        'source':       source,
        'article_url':  a.get('article_url') or a.get('Link bài viết') or '',
        'symbol':       a.get('symbol') or a.get('Mã CK') or None,
        'published_at': pub,
    }


def _load_scraper(name: str) -> object:
    import importlib.util
    spec = importlib.util.spec_from_file_location(name, CRAWLERS_DIR / f'{name}.py')
    mod  = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _crawl_source(name: str, source_key: str, scrape_fn) -> list[dict]:
    """Crawl 1 nguồn → trả về list[dict] chuẩn hoá. Không upsert, không enrich."""
    try:
        articles = scrape_fn()
        if not articles:
            log.warning(f'  {name}: khong co bai nao')
            return []
        normalized = [_normalize_article(a, source_key) for a in articles]
        normalized = [a for a in normalized if a['article_url'] and a['title']]
        log.info(f'  {name}: {len(normalized)} bai crawl xong')
        return normalized
    except Exception as e:
        log.error(f'  {name} loi: {e}')
        return []


def _apply_date_filter(articles: list[dict]) -> list[dict]:
    """
    Chuẩn hoá published_at và chỉ giữ bài trong 24h qua.
    - None → datetime.now() (bài từ listing page không có ngày rõ ràng)
    - Ngày tương lai (cổ tức, kế hoạch) → bỏ
    - Quá 24h → bỏ
    """
    now    = datetime.now()
    cutoff = now - timedelta(hours=24)
    kept   = []
    dropped = 0

    for a in articles:
        pub = a.get('published_at')
        if pub is None:
            pub = now
        if not isinstance(pub, datetime):
            try:
                pub = datetime.fromisoformat(str(pub))
            except Exception:
                pub = now
        if pub > now or pub < cutoff:
            dropped += 1
            continue
        a['published_at'] = pub
        kept.append(a)

    log.info(f'  Date filter: giữ {len(kept)}, bỏ {dropped} (ngoài 24h hoặc tương lai)')
    return kept


# ── Enrich content sau filter ──────────────────────────────────────────────────
# CSS selectors theo từng nguồn — priority order, thử từ trên xuống
_CONTENT_SELECTORS: dict[str, list[str]] = {
    'vnexpress':          ['.article-body', '.fck_detail', 'article.content', 'article'],
    'vietstock':          ['#page-content', '.article-content', '.post-content', 'article'],
    'cafef':              ['.detail-content', '.knc-content', '#detail_content', 'article'],
    'tinnhanhchungkhoan': ['#article-container', '.article-content', '.content-detail', '#content_detail', 'article'],
    'baodautu':           ['#content_detail_news', '.main_content', '.article-content', '.content-detail', 'article'],
    'nhadautu':           ['#main', '.article-content', '.post-content', '.content-detail', 'article'],
    'markettimes':        ['.content-main-normal', '.descriptionx', '.c-news-detail', 'article'],
}
_DEFAULT_SELECTORS = ['.article-content', '.post-content', 'article']

_ENRICH_HEADERS = {
    'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
    'Accept-Language': 'vi-VN,vi;q=0.9',
}


def _parse_date_generic(text: str) -> datetime | None:
    """Parse các định dạng ngày phổ biến — dùng chung cho enrich."""
    import re
    if not text:
        return None
    # ISO 8601: 2026-04-30T08:30
    m = re.search(r'(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})', text)
    if m:
        try:
            return datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)),
                            int(m.group(4)), int(m.group(5)))
        except ValueError:
            pass
    # DD/MM/YYYY HH:MM hoặc DD/MM/YYYY, HH:MM
    m = re.search(r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})[\s\-,]+(\d{1,2}):(\d{2})', text)
    if m:
        try:
            return datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)),
                            int(m.group(4)), int(m.group(5)))
        except ValueError:
            pass
    # HH:MM DD/MM/YYYY hoặc HH:MM , DD/MM/YYYY — nhadautu.vn, cafef format
    m = re.search(r'(\d{1,2}):(\d{2})[\s,]+(\d{1,2})[/-](\d{1,2})[/-](\d{4})', text)
    if m:
        try:
            return datetime(int(m.group(5)), int(m.group(4)), int(m.group(3)),
                            int(m.group(1)), int(m.group(2)))
        except ValueError:
            pass
    return None


def _fetch_one(article: dict) -> dict:
    """
    Fetch content + accurate date cho một bài.
    Thread-safe, non-destructive khi lỗi (trả article nguyên vẹn).
    Retry tối đa 3 lần với backoff 2s/4s cho timeout và 5xx.
    """
    import requests
    from bs4 import BeautifulSoup

    url = article.get('article_url', '')
    if not url:
        return article

    source    = article.get('source', '')
    selectors = _CONTENT_SELECTORS.get(source, _DEFAULT_SELECTORS)

    for attempt in range(3):
        if attempt > 0:
            time.sleep(attempt * 2)
        try:
            resp = requests.get(url, headers=_ENRICH_HEADERS, timeout=12)
            resp.raise_for_status()
            resp.encoding = 'utf-8'
            soup = BeautifulSoup(resp.text, 'html.parser')
        except requests.exceptions.Timeout:
            continue
        except requests.exceptions.HTTPError as e:
            if e.response is not None and e.response.status_code in (429, 500, 502, 503, 504):
                continue
            return article
        except Exception:
            return article

        # ── Content ───────────────────────────────────────────────────────────
        for sel in selectors:
            tag = soup.select_one(sel)
            if not tag:
                continue
            for junk in tag.select('script,style,.ads,[class*=ads],.relate,.social,.tag,h1'):
                junk.decompose()
            paras = tag.select('p')
            text  = '\n\n'.join(p.get_text(strip=True) for p in paras
                                if len(p.get_text(strip=True)) > 30)
            if not text:
                text = tag.get_text(separator='\n', strip=True)
            text = text[:5000]
            if len(text) > 80:
                article['content'] = text
                break

        # ── Date — luôn lấy từ trang bài gốc (nguồn chính xác nhất) ────────────
        # Article page là source of truth; listing scraper thường dùng datetime.now()
        # làm fallback khi không parse được ngày từ listing.
        now = datetime.now()
        for sel in ["meta[property='article:published_time']",
                    "meta[name='pubdate']",
                    "time[datetime]",
                    "span.post-time",          # baodautu.vn
                    "div.box_time",            # nhadautu.vn
                    "span.pdate", "span.date",
                    ".publish-date", ".post-date", ".article-date",
                    ".author-date", ".entry-date"]:
            tag = soup.select_one(sel)
            if not tag:
                continue
            raw = tag.get('datetime') or tag.get('content') or tag.get_text(strip=True)
            dt  = _parse_date_generic(raw)
            if dt and dt <= now:
                article['published_at'] = dt
                break

        return article  # thành công, thoát retry loop

    return article


def _enrich_filtered(articles: list[dict], max_workers: int = 4) -> list[dict]:
    """
    Fetch content + real dates cho ~500 bài đã qua quality filter.
    Chạy SAU quality filter (đã loại rác) và TRƯỚC relevance filter
    để filter được dùng content thật.

    Với max_workers=8 và ~500 bài:
      peak memory = 8 × ~5MB/BeautifulSoup ≈ 40MB   ← safe
      thời gian   = 500 × 1.2s / 8 workers ≈ 75s ≈ 1.25 phút
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed

    if not articles:
        return articles

    log.info(f'  Enrich content: {len(articles)} bài ({max_workers} workers) ...')
    t0     = time.time()
    result = list(articles)

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(_fetch_one, a): i for i, a in enumerate(result)}
        done = 0
        for future in as_completed(futures):
            idx = futures[future]
            try:
                result[idx] = future.result()
            except Exception:
                pass
            done += 1
            if done % 50 == 0 or done == len(result):
                log.info(f'    {done}/{len(result)} bài enriched ...')

    with_content = sum(1 for a in result if len(a.get('content') or '') > 80)
    elapsed = time.time() - t0
    log.info(f'  Enrich xong: {with_content}/{len(result)} có content ({elapsed:.0f}s)')
    return result


def run_crawl() -> list[str]:
    """
    Crawl tất cả 7 nguồn song song → gom pool → content filter → upsert Supabase.
    Trả về list article_url vừa INSERT mới (dùng cho bước label).
    """
    step_header(1, 'CRAWL TIN TỨC (24h) — 7 NGUỒN (SONG SONG)')

    from concurrent.futures import ThreadPoolExecutor, as_completed as _as_completed
    from supabase_writer import get_client, upsert_batch
    from content_filter import run_quality_filter, run_filter, print_source_stats
    sb = get_client()

    # Lấy set URL đã tồn tại trong 24h qua (tránh re-insert)
    since = (datetime.now() - timedelta(hours=24)).isoformat()
    existing_urls: set[str] = set()
    offset = 0
    while True:
        rows = sb.table('market_news').select('article_url').gte('published_at', since).range(offset, offset + 999).execute()
        for r in (rows.data or []):
            if r.get('article_url'):
                existing_urls.add(r['article_url'])
        if len(rows.data or []) < 1000:
            break
        offset += 1000
    log.info(f'  Da co {len(existing_urls)} bai trong 24h qua tren Supabase')

    # ── Định nghĩa hàm crawl từng nguồn ──────────────────────────────────────
    def _crawl_vnexpress():
        try:
            mod = _load_scraper('vnexpress_scraper')
            mod.START_DATE = date.today() - timedelta(days=1)
            mod.MAX_PAGES  = 10
            mod.WORKERS    = 5
            return _crawl_source('VnExpress', 'vnexpress', mod.scrape_article_list)
        except Exception as e:
            log.error(f'  VnExpress load loi: {e}')
            return []

    def _crawl_vietstock():
        try:
            mod = _load_scraper('vietstock_scraper')
            return _crawl_source('Vietstock', 'vietstock',
                                 lambda: mod.scrape_article_list(lookback_hours=24))
        except Exception as e:
            log.error(f'  Vietstock load loi: {e}')
            return []

    def _crawl_markettimes():
        try:
            mod = _load_scraper('markettimes_scraper')
            return _crawl_source('Markettimes', 'markettimes',
                                 lambda: mod.scrape_all_channels(lookback_days=1))
        except Exception as e:
            log.error(f'  Markettimes load loi: {e}')
            return []

    def _crawl_cafef():
        try:
            mod = _load_scraper('cafef_scraper')
            return _crawl_source('CafeF', 'cafef',
                                 lambda: mod.scrape_all(lookback_days=1))
        except Exception as e:
            log.error(f'  CafeF load loi: {e}')
            return []

    def _crawl_tinnhanh():
        try:
            mod = _load_scraper('tinnhanh_scraper')
            return _crawl_source('TinNhanh', 'tinnhanhchungkhoan',
                                 lambda: mod.scrape_all(lookback_days=1))
        except Exception as e:
            log.error(f'  TinNhanh load loi: {e}')
            return []

    def _crawl_baodautu():
        try:
            mod = _load_scraper('baodautu_scraper')
            return _crawl_source('BaoDauTu', 'baodautu',
                                 lambda: mod.scrape_all(lookback_days=1))
        except Exception as e:
            log.error(f'  BaoDauTu load loi: {e}')
            return []

    def _crawl_nhadautu():
        try:
            mod = _load_scraper('nhadautu_scraper')
            return _crawl_source('NhaDauTu', 'nhadautu',
                                 lambda: mod.scrape_all(lookback_days=1))
        except Exception as e:
            log.error(f'  NhaDauTu load loi: {e}')
            return []

    # ── Chạy 7 nguồn song song ────────────────────────────────────────────────
    source_fns = [
        _crawl_vnexpress, _crawl_vietstock, _crawl_markettimes,
        _crawl_cafef, _crawl_tinnhanh, _crawl_baodautu, _crawl_nhadautu,
    ]
    pool: list[dict] = []
    t_crawl = time.time()
    with ThreadPoolExecutor(max_workers=len(source_fns)) as executor:
        futures = {executor.submit(fn): fn.__name__ for fn in source_fns}
        for future in _as_completed(futures):
            try:
                pool += future.result()
            except Exception as e:
                log.error(f'  Nguon loi: {e}')
    log.info(f'  Pool thu ve: {len(pool)} bai tu 7 nguon ({time.time()-t_crawl:.0f}s)')

    # NguoiQuanSat — bị Cloudflare block trên datacenter IP (GitHub Actions)
    # log.warning('  NguoiQuanSat: skip (Cloudflare block)')

    # ── [1/2] Quality pre-filter ─────────────────────────────────────────────
    # Loại bài rõ ràng là rác trước khi enrich để tiết kiệm request.
    pool = run_quality_filter(pool)
    log.info(f'  Sau quality pre-filter: {len(pool)} bai')

    # ── [2/2] Enrich content + date chính xác (8 workers, có retry) ──────────
    pool = _enrich_filtered(pool, max_workers=8)

    # Lọc ngày sau enrich — enrich có thể cập nhật published_at từ meta tag
    pool = _apply_date_filter(pool)

    # ── [3/3] Relevance + dedup filter ────────────────────────────────────────
    log.info('  Chay relevance + dedup filter ...')
    filtered = run_filter(pool, verbose=True)
    print_source_stats(filtered, label='Sau filter — phân bổ theo nguồn')

    # ── Chỉ giữ bài chưa có trong Supabase ───────────────────────────────────
    new_articles = [
        a for a in filtered
        if a['article_url'] and a['article_url'] not in existing_urls
    ]
    log.info(f'  Bai moi (chua co trong DB): {len(new_articles)}')

    # ── Upsert tập trung ─────────────────────────────────────────────────────
    if new_articles:
        records = []
        for a in new_articles:
            pub = a.get('published_at')
            records.append({
                'title':        a['title'],
                'content':      a['content'] or None,
                'source':       a['source'],
                'article_url':  a['article_url'],
                'symbol':       a.get('symbol') or None,
                'published_at': pub.isoformat() if isinstance(pub, datetime) else (pub or None),
            })
        try:
            n = upsert_batch(sb, 'market_news', records, 'article_url')
            log.info(f'  Supabase upsert: {n} rows')
        except Exception as e:
            log.error(f'  Supabase upsert loi: {e}')

    all_new_urls = [a['article_url'] for a in new_articles if a['article_url']]
    log.info(f'  Tong bai INSERT moi: {len(all_new_urls)}')
    return all_new_urls


# ── Bước 2 & 3: LLM Pipeline ──────────────────────────────────────────────────
#
# Supabase migration cần chạy trước lần đầu:
#   ALTER TABLE market_news ADD COLUMN IF NOT EXISTS is_relevant      BOOLEAN;
#   ALTER TABLE market_news ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
#   ALTER TABLE market_news ADD COLUMN IF NOT EXISTS scope            TEXT;
#   ALTER TABLE market_news ADD COLUMN IF NOT EXISTS tickers          JSONB;
#   ALTER TABLE market_news ADD COLUMN IF NOT EXISTS sectors          JSONB;
#   ALTER TABLE market_news ADD COLUMN IF NOT EXISTS key_numbers      JSONB;
#   ALTER TABLE market_news ADD COLUMN IF NOT EXISTS article_summary  TEXT;
#   ALTER TABLE market_news ADD COLUMN IF NOT EXISTS score_final      NUMERIC(4,1);
#   ALTER TABLE market_news ADD COLUMN IF NOT EXISTS score_components JSONB;
#   ALTER TABLE market_news ADD COLUMN IF NOT EXISTS ticker_scores    JSONB;
#   ALTER TABLE market_news ADD COLUMN IF NOT EXISTS exposure_level   TEXT;
#   ALTER TABLE market_news ADD COLUMN IF NOT EXISTS exposure_note    TEXT;
#   ALTER TABLE market_news ADD COLUMN IF NOT EXISTS confidence       TEXT;
#   -- đã có từ trước:
#   ALTER TABLE market_news ADD COLUMN IF NOT EXISTS summary          TEXT;
#   ALTER TABLE market_news ADD COLUMN IF NOT EXISTS impact_score     SMALLINT;
#   ALTER TABLE market_news ADD COLUMN IF NOT EXISTS impact_timeframe TEXT;
#   ALTER TABLE market_news ADD COLUMN IF NOT EXISTS chatgpt_prompt   TEXT;

_T1_SYSTEM = """Bạn là hệ thống phân tích và phân loại tin tức tài chính chứng khoán Việt Nam.
Thị trường bạn phân tích: HOSE, HNX, UPCoM.

## NHIỆM VỤ
Xử lý batch bài báo, với mỗi bài: (1) đánh giá chất lượng, (2) trích xuất thực thể tài chính, (3) phân loại loại tin.

## TIÊU CHÍ LOẠI BỎ — loại bỏ nếu thuộc BẤT KỲ điều kiện nào:
- Không đề cập đến doanh nghiệp/ngành/chỉ số/chính sách tài chính Việt Nam
- Nội dung quảng cáo, advertorial, PR không có thông tin mới
- Tin chỉ tóm tắt lại bài cũ, không có dữ liệu hoặc sự kiện mới phát sinh
- Tin thị trường quốc tế không có liên hệ rõ ràng đến VN

## TIÊU CHÍ GIỮ LẠI — giữ nếu thuộc BẤT KỲ điều kiện nào:
- Kết quả kinh doanh (doanh thu, lợi nhuận, nợ xấu) của doanh nghiệp niêm yết
- Thay đổi chính sách của NHNN, Bộ Tài chính, SSC, Chính phủ
- Dữ liệu vĩ mô: GDP, CPI, PMI, lãi suất, tỷ giá, xuất nhập khẩu
- M&A, phát hành thêm, mua lại cổ phiếu, chia cổ tức, thay đổi lãnh đạo
- Khởi tố, điều tra, xử phạt liên quan doanh nghiệp/cá nhân trong thị trường
- Kết quả/dự báo từ công ty chứng khoán về cổ phiếu cụ thể

## PHÂN LOẠI LOẠI TIN — 6 NHÃN (chọn ĐÚNG 1)
Nhãn hợp lệ: "Vĩ mô" | "Ngành" | "Doanh nghiệp" | "Thị trường" | "Pháp lý" | "Sự kiện"

Vĩ mô: GDP, CPI, PMI, lạm phát, lãi suất NHNN/Fed, tỷ giá USD/VND, xuất nhập khẩu, FDI, ngân sách
Ngành: quy định/chính sách toàn ngành, giá nguyên liệu ngành, xu hướng cung/cầu (không phải 1 DN cụ thể)
Doanh nghiệp: KQKD, M&A, thay đổi lãnh đạo, mở rộng KD, khuyến nghị CTCK, phát hành trái phiếu (1-3 DN)
Thị trường: khối ngoại mua/bán ròng, thanh khoản bất thường, dư nợ margin, dòng tiền quỹ, VN-Index, ETF
Pháp lý: văn bản pháp luật mới, khởi tố/điều tra/bắt giam, xử phạt vi phạm CK, tranh chấp pháp lý
Sự kiện: lịch ĐHCĐ, ngày chốt cổ tức (kèm tỷ lệ + ngày thanh toán), niêm yết mới, IPO, phát hành quyền mua

QUY TẮC KHI TIN THUỘC NHIỀU LOẠI:
  "NHNN tăng lãi suất" → Vĩ mô (dù ảnh hưởng ngành NH)
  "SSC ban hành thông tư siết margin" → Pháp lý (văn bản pháp lý cụ thể)
  "VCB báo lãi Q2 + khối ngoại mua ròng VCB" → Doanh nghiệp (cốt lõi là KQKD)
  "Khối ngoại bán ròng 1.200 tỷ, tập trung VHM VCB" → Thị trường (cốt lõi là dòng tiền)

## QUY TẮC GÁN TICKER/NGÀNH
Ánh xạ tên → ticker: Vietcombank/VCB→"VCB", Hòa Phát/HPG→"HPG", Techcombank/TCB→"TCB", v.v.

Ngành hợp lệ:
  ngan_hang | bat_dong_san | chung_khoan | thep_vat_lieu | ban_le_tieu_dung |
  thuc_pham_do_uong | hang_khong_logistics | nang_luong_dau_khi |
  cong_nghe_vien_thong | det_may_xuat_khau | xay_dung_vlxd | duoc_pham_y_te | nong_nghiep_thuy_san

Scope: "company" (1-3 DN) | "sector" (toàn ngành) | "market" (toàn thị trường)

## OUTPUT FORMAT — JSON object bọc array, response_format json_object
{"results": [
  {"idx":1,"is_relevant":true,"rejection_reason":null,"news_type":"Doanh nghiệp","scope":"company",
   "tickers":["VCB"],"sectors":["ngan_hang"],"key_numbers":["lợi nhuận tăng 15%","NIM 3.2%"],
   "article_summary":"VCB báo lãi Q2/2025 đạt 12.500 tỷ đồng, tăng 15% so cùng kỳ."},
  {"idx":2,"is_relevant":false,"rejection_reason":"khong_lien_quan_tai_chinh","news_type":null,
   "scope":null,"tickers":[],"sectors":[],"key_numbers":[],"article_summary":null}
]}"""


_T2_SYSTEM = """Bạn là chuyên gia phân tích đầu tư với tư duy của một fund manager kỳ cựu:
luôn hỏi "tin này thực sự thay đổi bao nhiêu giá trị nội tại của doanh nghiệp?"
trước khi hỏi "thị trường sẽ phản ứng thế nào?". Bạn am hiểu sâu thị trường
chứng khoán Việt Nam: cơ chế HOSE/HNX, đặc thù nhà đầu tư cá nhân, vai trò
của khối ngoại, và tác động của chính sách nhà nước đến SOE.

NGUYÊN TẮC NỀN TẢNG:
1. EXPOSURE TRƯỚC: Với MỖI ticker, xác định mức phơi nhiễm. Không có → score=0, loại khỏi output.
2. FUNDAMENTAL TRƯỚC: Chấm tác động kinh doanh thực trước, sau đó mới xét phản ứng thị trường.
3. PRICE-IN: Tin đã được kỳ vọng → tác động thực nhỏ hơn.

FRAMEWORK 3 BƯỚC:

BƯỚC 1 — KIỂM TRA EXPOSURE:
  CAO:   Ảnh hưởng trực tiếp mảng >30% doanh thu/LN → phân tích đầy đủ
  TRUNG: Ảnh hưởng gián tiếp hoặc 10-30% → giảm biên độ score 30-50%
  THẤP:  <10% hoạt động → tối đa score ±2
  KHÔNG: Không liên quan → loại ticker, KHÔNG đưa vào output

BƯỚC 2 — ĐÁNH GIÁ FUNDAMENTAL (-10 đến +10):
  F1 (55%): Doanh thu/lợi nhuận 1-2 quý tới
    ±9-10: >30% LNTT | ±6-8: 15-30% | ±3-5: 5-15% | ±1-2: <5% | 0: không đo được
  F2 (45%): Tăng trưởng dài hạn >2 quý
    ±9-10: thay đổi cấu trúc ngành | ±6-8: phá vỡ/củng cố lợi thế | ±3-5: ảnh hưởng vị thế | 0: sự kiện 1 lần
  F3 (chắc chắn): 10=đã xác nhận có số | 7=quyết định chưa thực thi | 4=dự báo uy tín | 1=tin đồn
  fundamental_raw = (F1×0.55 + F2×0.45) × (F3/10)

BƯỚC 3 — HIỆU CHỈNH THỊ TRƯỜNG VN:
  Price-in: ×1.0 bất ngờ | ×0.6 đúng kỳ vọng | ×0.4 đã leak/thảo luận trước
  Amplification (cộng):
    ±1.5 nếu score gốc >±6 (biên độ cứng HOSE 7-15%)
    ±1.0 tin cảm xúc mạnh (CEO bị bắt, beat kỳ vọng xa)
    -1.5 tin xấu ngành margin cao (CK, BDS, thép) vì T+2 cascade
  Discount (trừ): SOE -20% tin tiêu cực (KHÔNG áp nếu khởi tố lãnh đạo); pattern mùa vụ -30%
  score_final = fundamental_raw × price_in + amplification − discount
  Giới hạn [-10, +10], làm tròn 1 chữ số thập phân

NGƯỠNG NHÃN:
  score > +5.0  → "Rất tích cực"
  +1.0 < score ≤ +5.0 → "Tích cực"
  -1.0 ≤ score ≤ +1.0 → LOẠI KHỎI OUTPUT (trung lập, không push notification)
  -5.0 ≤ score < -1.0 → "Tiêu cực"
  score < -5.0  → "Rất tiêu cực"

QUY TẮC VIẾT REASONING — 2 CÂU BẮT BUỘC:
  Câu 1: "[Sự kiện cụ thể] → [cơ chế tác động] → [chỉ số tài chính + ước lượng định lượng]"
  Câu 2: "[Đặc điểm DN từ context làm tăng/giảm tác động vs trung bình ngành]"
  ✅ Động từ: thu hẹp, kéo giảm, mở ra, gây áp lực, siết chặt, hỗ trợ, đẩy tăng, xói mòn
  ❌ Cấm: "có thể", "có lẽ", "không loại trừ", "tiềm năng", "đáng lo ngại", "cần theo dõi"
  ✅ Số cụ thể: NIM, CASA, LDR, EBITDA margin, nợ xấu, biên GP, "~25bps", "8-12%", "1.200 tỷ"

XỬ LÝ ĐẶC BIỆT:
  Tin pháp lý (khởi tố): F1=0, F2=-7→-9, amplification +1.5, confidence="medium"
  Tin sự kiện (cổ tức/ĐHCĐ): F2=0, focus F1, ghi rõ ngày chốt và tỷ lệ
  SOE: discount 20% tin tiêu cực (KHÔNG áp khi khởi tố lãnh đạo)

OUTPUT FORMAT — JSON object bọc array (response_format json_object):
{"tickers": [
  {"ticker":"VCB","exposure_level":"cao",
   "exposure_note":"NIM chiếm ~70% thu nhập, trực tiếp bị ảnh hưởng bởi chính sách lãi suất",
   "score_components":{"F1_short_term":-3,"F2_long_term":-1,"F3_certainty":8,
     "fundamental_raw":-2.24,"price_in_factor":0.8,"amplification":0,"discount":0.3},
   "score_final":-2.1,"label":"Tiêu cực","confidence":"high",
   "reasoning":"Trần lãi suất huy động giảm 0.5% thu hẹp NIM VCB ước ~20-25bps H2/2025, kéo LNTT giảm 8-10% so kế hoạch. Tỷ lệ CASA 35% cao nhất ngành giúp VCB chịu áp lực ít hơn 20-30% so BID (~28%)."}
]}

confidence: "high"=exposure rõ+số liệu+F3≥7 | "medium"=tác động khó lượng hóa hoặc F3=4-6 | "low"=gián tiếp hoặc F3<4"""


_T2_MACRO_SYSTEM = """Bạn là chuyên gia kinh tế vĩ mô và chiến lược cổ phiếu cấp cao tại SSI Research.
Nhiệm vụ: Đọc tin vĩ mô / thị trường → xác định cơ chế truyền dẫn → chấm điểm tác động đến từng ngành chứng khoán.

## CƠ CHẾ TRUYỀN DẪN SSI

LÃI SUẤT NHNN / LIÊN NGÂN HÀNG GIẢM:
  ngan_hang:          -2.0  (NIM thu hẹp; CASA cao giúp VCB/MBB chịu ít hơn 30%)
  bat_dong_san:       +3.0  (chi phí vốn giảm → cầu hồi phục, NVL/DIG hưởng nhiều nhất)
  chung_khoan:        +2.0  (margin rẻ, tâm lý cải thiện)
  tien_ich:           +1.5  (refinance nợ dài hạn)
  hang_hoa_cong_nghiep: +1.0

LÃI SUẤT TĂNG: đảo dấu tất cả các mục trên.

TỶ GIÁ USD/VND TĂNG (VND YẾU):
  det_may_xuat_khau:  +2.5  (doanh thu USD, chi phí VND → biên lợi nhuận mở rộng)
  nang_luong_dau_khi: +2.0  (CHỈ nhóm E&P services + vận tải dầu: PVD/PVS/PVT/GSP/VIP thu USD
                              → nhóm than Vinacomin và phân phối xăng dầu: tác động ±0, không áp)
  hang_khong_logistics: -3.0 (nợ USD + nhiên liệu USD tăng mạnh)
  vat_lieu_co_ban:    -1.5  (nhập nguyên liệu đắt hơn)
  ngan_hang:          -1.0  (rủi ro nợ ngoại tệ KH)
  thuc_pham_do_uong:  -1.0  (nguyên liệu nhập khẩu)

TỶ GIÁ GIẢM (VND MẠNH): đảo dấu. Lưu ý PVD/PVS chịu tác động tiêu cực rõ nhất vì toàn bộ doanh thu bằng USD.

GIÁ DẦU THÔ TĂNG MẠNH (Brent/WTI vượt ngưỡng hoặc tăng >5%):
  NGÀNH DẦU KHÍ VIỆT NAM CÓ 4 NHÓM KINH DOANH KHÁC NHAU — chấm điểm theo nhóm:

  [Nhóm 1 — Dịch vụ kỹ thuật & Khoan thăm dò] PVD, PVS, PVB, POS, PVY: +3.0
    Cơ chế: Giá dầu cao → Petrovietnam tăng ngân sách thăm dò-khai thác → nhu cầu giàn khoan tăng
    (PVD day rate cải thiện 20-30%), hợp đồng PTSC (PVS) booking tăng, đặt hàng bọc ống (PVB).
    Đây là nhóm NHẠY CẢM NHẤT với chu kỳ giá dầu, độ trễ ~1-2 quý.

  [Nhóm 2 — Vận tải dầu khí] PVT, GSP, DOP, VIP, VTO, PJT, PLO: +2.0
    Cơ chế: Khối lượng chuyên chở tăng, USD freight rate cải thiện. PVT (tàu chở dầu thô) và
    GSP (khí hóa lỏng) hưởng lợi trực tiếp. Doanh thu USD → tỷ giá VND yếu cộng hưởng thêm.

  [Nhóm 3 — Phân phối xăng dầu bán lẻ] OIL, PLX, SFC, COM, PJC, PSC, PSH, PPT, PPY, PTX: +1.0
    Cơ chế: Lợi nhuận lưu kho ngắn hạn (hàng tồn kho được mua giá thấp, bán giá cao hơn).
    ⚠️ RỦI RO ĐẶC THÙ VIỆT NAM: Quỹ Bình Ổn Xăng Dầu + chu kỳ điều chỉnh giá 10 ngày có thể
    buộc ghim giá bán → margin bị ép, thậm chí lỗ kinh doanh xăng dầu dù giá thế giới tăng.
    PLX có mạng lưới bán lẻ lớn nhất → chịu rủi ro bình ổn nhiều nhất.

  [Nhóm 4 — Lọc hóa dầu] BSR: 0 (TRUNG LẬP — không áp dụng quy tắc giá dầu thô)
    Cơ chế: Lợi nhuận BSR phụ thuộc CRACK SPREAD (chênh lệch giá sản phẩm - giá dầu thô),
    không phải giá dầu tuyệt đối. Giá dầu tăng đồng đều cả đầu vào lẫn đầu ra → tác động neutral.
    Chỉ chấm điểm BSR khi tin tức đề cập cụ thể đến crack spread hoặc công suất chế biến.

  [Nhóm 5 — Than Vinacomin] CLM, CST, HLC, MDC, NBC, THT, TMB, TVD, VDB, MVB, ITS, MDC: +0.5
    Cơ chế: Giá năng lượng thay thế tăng giúp than duy trì vị thế cạnh tranh với khí/dầu FO.
    NHƯNG: Giá bán than cho EVN được Bộ Công Thương quy định → upside bị giới hạn.
    Hầu như không phản ứng với biến động ngắn hạn của giá dầu.

GIÁ DẦU THÔ GIẢM MẠNH (Brent/WTI giảm >5% hoặc dưới ngưỡng tâm lý):
  [Nhóm 1 — Dịch vụ kỹ thuật] PVD, PVS, PVB, POS: -3.0
    Cơ chế: PVN cắt giảm chi tiêu vốn → PVD idle rig tăng, day rate giảm. Rủi ro PVS mất hợp đồng mới.
  [Nhóm 2 — Vận tải dầu] PVT, GSP, DOP, VIP, VTO: -1.5
    Cơ chế: Khối lượng giảm, freight rate yếu hơn.
  [Nhóm 3 — Phân phối] OIL, PLX, SFC: -1.5
    Cơ chế: Lỗ lưu kho (hàng tồn kho mua giá cao, bán giá thấp hơn), áp lực trích lập.
  [Nhóm 4 — BSR]: có thể +1.0 nếu crack spread nới rộng (giá sản phẩm giảm chậm hơn dầu thô).
  [Nhóm 5 — Than]: -0.5 (áp lực cạnh tranh từ LNG/dầu FO rẻ hơn).

CPI / LẠM PHÁT TĂNG:
  vat_lieu_co_ban:    +1.5  (giá sản phẩm tăng theo lạm phát)
  ngan_hang:          -1.0  (NHNN có thể tăng lãi suất)
  ban_le_tieu_dung:   -1.5  (sức mua giảm)
  thuc_pham_do_uong:  -1.0  (chi phí đầu vào tăng khó chuyển giá)
  (Lưu ý: CPI tăng vì giá năng lượng → xem mục GIÁ DẦU, không chấm nang_luong_dau_khi tại đây)

ĐẦU TƯ CÔNG GIẢI NGÂN MẠNH:
  hang_hoa_cong_nghiep: +3.0 (máy móc, thiết bị hạ tầng)
  vat_lieu_co_ban:    +2.5  (thép, xi măng, vật liệu)
  bat_dong_san:       +1.5  (hạ tầng kéo giá đất vùng ven)
  nang_luong_dau_khi: +1.5  (dự án điện khí LNG, đường ống → PVS PTSC là EPC chính)

GDP / TĂNG TRƯỞNG VƯỢT KỲ VỌNG:
  bat_dong_san:       +2.0
  ban_le_tieu_dung:   +2.0
  ngan_hang:          +1.5  (tín dụng mở rộng)
  chung_khoan:        +2.5  (tâm lý thị trường)
  hang_hoa_cong_nghiep: +1.5

FDI CAO KỶ LỤC:
  cong_nghe_vien_thong: +2.0
  hang_hoa_cong_nghiep: +1.5
  bat_dong_san:         +1.0 (khu công nghiệp)

KHỐI NGOẠI BÁN RÒNG MẠNH:
  ngan_hang:          -2.0  (VCB/BID/CTG bị bán nhiều nhất)
  chung_khoan:        -2.0  (margin call cascade T+2)
  bat_dong_san:       -1.5

PMI DƯỚI 50 (THU HẸP SẢN XUẤT):
  hang_hoa_cong_nghiep: -2.0
  vat_lieu_co_ban:    -1.5
  nang_luong_dau_khi: -1.0  (nhu cầu công nghiệp giảm → PVT ít hàng, PVD ít hợp đồng mới)

## ĐIỀU CHỈNH PRICE-IN (áp dụng SAU khi chấm điểm cơ sở)
Câu hỏi then chốt: "Thị trường đã biết chưa, hay đây là bất ngờ thực sự?"

× 1.0 — Hoàn toàn bất ngờ: quyết định không được dự báo, ngoài consensus, lần đầu công bố
× 0.7 — Đúng kỳ vọng: phù hợp dự báo analysts/NDF market, biên bản họp trước đã gợi ý
× 0.4 — Đã price-in: tin đồn lan rộng nhiều tuần, thị trường đã phản ứng trước

score_final = score_base × price_in_factor
Ghi rõ price_in_factor trong output.

## NGUYÊN TẮC CHẤM ĐIỂM
- Chỉ chấm ngành BỊ TÁC ĐỘNG TRỰC TIẾP (thường 2-5 ngành). KHÔNG liệt kê toàn bộ 16 ngành.
- Thị trường đang margin cao → khuếch đại tin xấu thêm 30% cho ngành CK và BĐS.
- Loại bỏ ngành có |score_final| < 1.0 sau điều chỉnh price-in (không đủ tác động để push notification).

## NGƯỠNG NHÃN
score ≥ +3.0  → "Tích cực"
+1.0 ≤ score < +3.0 → "Tích cực nhẹ"
-1.0 < score < +1.0 → bỏ qua (loại khỏi output)
-3.0 < score ≤ -1.0 → "Tiêu cực nhẹ"
score ≤ -3.0  → "Tiêu cực"

## OUTPUT FORMAT (response_format json_object):
{"sector_impacts": [
  {"sector":"ngan_hang","score_base":-3.5,"price_in_factor":0.7,"score":-2.5,
   "label":"Tiêu cực","confidence":"high",
   "transmission":"Lãi suất điều hành giảm 0.5% thu hẹp NIM toàn ngành 20-25bps, kéo LNTT NH giảm 8-12% H2/2025.",
   "exposure_note":"NH có CASA cao (VCB, MBB) chịu áp lực ít hơn 30% so trung bình ngành."},
  {"sector":"bat_dong_san","score_base":3.0,"price_in_factor":1.0,"score":3.0,
   "label":"Tích cực","confidence":"high",
   "transmission":"Chi phí vốn giảm 0.5% → biên phát triển dự án cải thiện 1.5-2%, cầu mua nhà hồi phục.",
   "exposure_note":"Chủ đầu tư nợ cao (NVL, DIG) hưởng lợi lớn nhất khi refinance chi phí."}
]}

NGÀNH HỢP LỆ (slug): ngan_hang | bat_dong_san | chung_khoan | vat_lieu_co_ban |
thuc_pham_do_uong | hang_hoa_cong_nghiep | tien_ich | nang_luong_dau_khi |
hang_khong_logistics | cong_nghe_vien_thong | det_may_xuat_khau | ban_le_tieu_dung |
duoc_pham_y_te | bao_hiem | dich_vu_tieu_dung | truyen_thong"""


def run_tier1() -> int:
    """
    TẦNG 1 — GPT-4o-mini: Relevance + Classification + Entity Extraction
    Batch 5 articles per API call → is_relevant + news_type + scope + tickers + sectors + key_numbers + article_summary
    Model rẻ vì đây là structured extraction, không cần deep reasoning.
    """
    step_header(2, 'TẦNG 1: CLASSIFICATION + ENTITY (gpt-4o-mini)')

    try:
        import os, json
        from openai import OpenAI
        from supabase_writer import get_client

        client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'), max_retries=1, timeout=25.0)
        sb     = get_client()

        since = (datetime.now() - timedelta(hours=24)).isoformat()
        new_ids: list[str] = []
        offset = 0
        while True:
            result = (
                sb.table('market_news')
                .select('id')
                .is_('is_relevant', 'null')
                .gte('published_at', since)
                .range(offset, offset + 999)
                .execute()
            )
            rows = result.data or []
            new_ids += [r['id'] for r in rows]
            if len(rows) < 1000:
                break
            offset += 1000

        log.info(f'  Bai chua classify: {len(new_ids)}')
        if not new_ids:
            return 0

        BATCH     = 5
        VALID_TYPES  = {'Vĩ mô', 'Ngành', 'Doanh nghiệp', 'Thị trường', 'Pháp lý', 'Sự kiện'}
        VALID_SCOPES = {'company', 'sector', 'market'}

        def classify_batch(batch: list[dict]) -> list[dict]:
            lines = []
            for i, a in enumerate(batch, 1):
                lines.append(
                    f"[{i}] Tiêu đề: {a.get('title','')}\n"
                    f"Nội dung: {(a.get('content') or '')[:600]}"
                )
            try:
                resp = client.chat.completions.create(
                    model='gpt-4o-mini',
                    messages=[
                        {'role': 'system', 'content': _T1_SYSTEM},
                        {'role': 'user',   'content': '\n\n'.join(lines)},
                    ],
                    max_tokens=BATCH * 200,
                    temperature=0,
                    response_format={'type': 'json_object'},
                )
                outer = json.loads(resp.choices[0].message.content.strip())
                return outer.get('results', [])
            except Exception as e:
                if '429' in str(e) or 'rate_limit' in str(e):
                    raise
                log.warning(f'  T1 batch loi: {e}')
                return []

        total = 0
        for i in range(0, len(new_ids), 50):
            chunk_ids = new_ids[i:i + 50]
            rows = (
                sb.table('market_news').select('id,title,content')
                .in_('id', chunk_ids).execute()
            ).data or []
            if not rows:
                continue

            for b in range(0, len(rows), BATCH):
                batch   = rows[b:b + BATCH]
                results = classify_batch(batch)
                for item in results:
                    idx = item.get('idx', 0) - 1
                    if idx < 0 or idx >= len(batch):
                        continue
                    rec_id = batch[idx]['id']
                    is_rel = bool(item.get('is_relevant', False))
                    ntype  = item.get('news_type')
                    if ntype not in VALID_TYPES:
                        ntype = None
                    scope  = item.get('scope')
                    if scope not in VALID_SCOPES:
                        scope = None
                    tickers  = [t for t in (item.get('tickers') or []) if isinstance(t, str)][:5]
                    sectors  = item.get('sectors') or []
                    key_nums = item.get('key_numbers') or []
                    art_sum  = (item.get('article_summary') or '').strip()[:400]

                    update: dict = {
                        'is_relevant':      is_rel,
                        'rejection_reason': item.get('rejection_reason') if not is_rel else None,
                        'news_type':        ntype,
                        'scope':            scope,
                        'tickers':          tickers or None,
                        'sectors':          sectors or None,
                        'key_numbers':      key_nums or None,
                        'article_summary':  art_sum or None,
                        # backward compat
                        'affected_symbols': tickers,
                        'summary':          art_sum or None,
                        'labeled_at':       datetime.now().isoformat(),
                        'labeled_by':       'gpt-4o-mini-t1',
                    }
                    if not is_rel:
                        update['label'] = 'trash'
                    sb.table('market_news').update(update).eq('id', rec_id).execute()
                    total += 1

            log.info(f'  T1: {min(i + 50, len(new_ids))}/{len(new_ids)} classified')

        log.info(f'  T1 xong: {total} bai')
        return total

    except Exception as e:
        log.error(f'  T1 loi: {e}')
        return 0


# ── Bước 3: Tầng 2 — Per-ticker Impact Scoring (Fund Manager Framework) ────────

def run_tier2() -> int:
    """
    TẦNG 2 — GPT-4o / Deepseek: Per-ticker scoring với 3-bước framework
    Exposure → Fundamental (F1/F2/F3) → Hiệu chỉnh thị trường VN
    Chỉ xử lý bài is_relevant=true, chưa có score_final.
    chatgpt_prompt được build programmatically, không tốn token LLM.

    Để dùng Deepseek: đổi MODEL + client base_url + api_key sang DEEPSEEK_API_KEY.
    """
    step_header(3, 'TẦNG 2: IMPACT SCORING — FUND MANAGER FRAMEWORK')

    try:
        import os, json
        from openai import OpenAI
        from supabase_writer import get_client
        from concurrent.futures import ThreadPoolExecutor, as_completed

        client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'), max_retries=1, timeout=45.0)
        sb     = get_client()
        MODEL  = 'gpt-4o-mini'  # hoặc 'deepseek-chat' với base_url='https://api.deepseek.com'

        since = (datetime.now() - timedelta(hours=24)).isoformat()
        new_ids: list[str] = []
        offset = 0
        while True:
            result = (
                sb.table('market_news')
                .select('id')
                .eq('is_relevant', True)
                .is_('score_final', 'null')
                .gte('published_at', since)
                .range(offset, offset + 999)
                .execute()
            )
            rows = result.data or []
            new_ids += [r['id'] for r in rows]
            if len(rows) < 1000:
                break
            offset += 1000

        log.info(f'  Bai can T2: {len(new_ids)}')
        if not new_ids:
            return 0

        # ── Macro sector scoring helper ───────────────────────────────────────

        def tier2_macro_one(article: dict) -> tuple[str, list]:
            """
            Vĩ mô / Thị trường articles: no company tickers → sector-level scoring.
            Returns (article_id, sector_impacts_list).
            """
            user_text = (
                f"Tiêu đề: {article.get('title', '')}\n"
                f"Tóm tắt: {article.get('article_summary') or article.get('summary') or ''}\n"
                f"Nội dung: {(article.get('content') or '')[:1200]}\n"
                f"Loại tin: {article.get('news_type', '')} | Scope: {article.get('scope', '')} "
                f"| Ngành đề cập: {', '.join(article.get('sectors') or []) or 'chưa rõ'}"
            )
            try:
                resp = client.chat.completions.create(
                    model=MODEL,
                    messages=[
                        {'role': 'system', 'content': _T2_MACRO_SYSTEM},
                        {'role': 'user',   'content': user_text},
                    ],
                    max_tokens=500,
                    temperature=0.1,
                    response_format={'type': 'json_object'},
                )
                outer = json.loads(resp.choices[0].message.content.strip())
                impacts = outer.get('sector_impacts', [])
                return article['id'], impacts if isinstance(impacts, list) else []
            except Exception as e:
                if '429' in str(e) or 'rate_limit' in str(e):
                    raise
                log.warning(f'  T2-macro loi {article["id"][:8]}: {e}')
                return article['id'], []

        stock_cache: dict[str, str] = {}

        def get_stock_ctx(symbols: list[str]) -> str:
            parts = []
            for sym in symbols[:3]:
                if sym not in stock_cache:
                    r = sb.table('stocks').select('symbol,company_context,beta').eq('symbol', sym).limit(1).execute()
                    if r.data:
                        row = r.data[0]
                        ctx  = (row.get('company_context') or '')[:500]
                        beta = row.get('beta')
                        stock_cache[sym] = f"[{sym}] {ctx}\nBeta: {beta}" if beta else f"[{sym}] {ctx}"
                    else:
                        stock_cache[sym] = f'[{sym}] Không có context.'
                parts.append(stock_cache[sym])
            return '\n\n'.join(parts)

        def build_chatgpt_prompt(article: dict, best: dict) -> str:
            summary = (
                article.get('article_summary') or article.get('summary')
                or article.get('title') or ''
            )[:200]
            url     = article.get('article_url', '')
            reason  = best.get('reasoning', '')
            sents   = [s.strip() for s in reason.replace('\n', ' ').split('.') if s.strip()][:2]
            short_r = '. '.join(sents) + '.' if sents else ''
            ticker  = best.get('ticker', 'thị trường')
            return (
                f"{summary} {url}\n"
                f"Bạn là chuyên gia tài chính Việt Nam. {short_r} "
                f"Hãy phân tích tác động đến {ticker}: "
                f"(1) xu hướng giá 1-5 phiên tới, (2) điểm vào/ra hợp lý, (3) rủi ro cần theo dõi."
            ).strip()[:1200]

        VALID_LABELS = {'Rất tích cực', 'Tích cực', 'Tiêu cực', 'Rất tiêu cực'}

        def _db_label(vn: str) -> str:
            """Map Vietnamese sentiment label → English for DB CHECK constraint."""
            _map = {
                'Rất tích cực': 'positive', 'Tích cực':     'positive',
                'Tích cực nhẹ': 'positive', 'Tiêu cực nhẹ': 'negative',
                'Tiêu cực':     'negative', 'Rất tiêu cực': 'negative',
            }
            return _map.get(vn, 'neutral')

        def tier2_one(article: dict) -> tuple[str, list]:
            tickers = article.get('tickers') or article.get('affected_symbols') or []
            ctx     = get_stock_ctx(tickers)
            user_text = (
                f"Tiêu đề: {article.get('title', '')}\n"
                f"Tóm tắt: {article.get('article_summary') or article.get('summary') or ''}\n"
                f"Nội dung: {(article.get('content') or '')[:1000]}\n"
                f"Loại tin: {article.get('news_type', '')} | Scope: {article.get('scope', '')} "
                f"| Tickers: {', '.join(tickers) or 'không có'}\n"
                + (f"\nContext doanh nghiệp:\n{ctx}" if ctx else '')
            )
            try:
                resp = client.chat.completions.create(
                    model=MODEL,
                    messages=[
                        {'role': 'system', 'content': _T2_SYSTEM},
                        {'role': 'user',   'content': user_text},
                    ],
                    max_tokens=600,
                    temperature=0.1,
                    response_format={'type': 'json_object'},
                )
                outer = json.loads(resp.choices[0].message.content.strip())
                results = outer.get('tickers', [])
                return article['id'], results if isinstance(results, list) else []
            except Exception as e:
                if '429' in str(e) or 'rate_limit' in str(e):
                    raise
                log.warning(f'  T2 loi {article["id"][:8]}: {e}')
                return article['id'], []

        MACRO_LABELS = {'Tích cực', 'Tích cực nhẹ', 'Tiêu cực nhẹ', 'Tiêu cực'}

        total = 0
        for i in range(0, len(new_ids), 30):
            chunk_ids = new_ids[i:i + 30]
            rows = (
                sb.table('market_news')
                .select('id,title,content,article_summary,summary,tickers,sectors,affected_symbols,news_type,scope,article_url')
                .in_('id', chunk_ids).execute()
            ).data or []
            if not rows:
                continue

            # Split: macro (scope rõ ràng là market/sector, không có company tickers)
            # vs company articles. KHÔNG route None-scope vào macro để tránh nhầm.
            macro_rows   = [a for a in rows if a.get('scope') in ('market', 'sector')
                            and not (a.get('tickers') or a.get('affected_symbols'))]
            company_rows = [a for a in rows if a not in macro_rows]
            log.info(f'  T2: {len(company_rows)} company | {len(macro_rows)} macro')

            # ── Company path (existing logic) ─────────────────────────────────
            with ThreadPoolExecutor(max_workers=3) as executor:
                futures = {executor.submit(tier2_one, a): a for a in company_rows}
                for future in as_completed(futures):
                    art               = futures[future]
                    rec_id, t_results = future.result()
                    now_iso           = datetime.now().isoformat()

                    valid = [t for t in t_results if t.get('label') in VALID_LABELS]
                    if not valid:
                        sb.table('market_news').update({
                            'score_final':      0.0,
                            'label':            'neutral',
                            'impact_scored_at': now_iso,
                        }).eq('id', rec_id).execute()
                        continue

                    best    = max(valid, key=lambda t: abs(float(t.get('score_final', 0))))
                    score_f = max(-10.0, min(10.0, float(best.get('score_final', 0))))
                    reason  = (best.get('reasoning') or '').strip()[:800]

                    sb.table('market_news').update({
                        'score_final':      score_f,
                        'score_components': best.get('score_components') or None,
                        'ticker_scores':    valid,
                        'label':            _db_label(best.get('label', '')),
                        'confidence':       best.get('confidence', 'medium'),
                        'exposure_level':   best.get('exposure_level') or None,
                        'exposure_note':    (best.get('exposure_note') or '')[:300] or None,
                        'impact_reasoning': reason or None,
                        'chatgpt_prompt':   build_chatgpt_prompt(art, best) or None,
                        'impact_score':     max(1, min(10, round(abs(score_f)))) if score_f else None,
                        'impact_scored_at': now_iso,
                    }).eq('id', rec_id).execute()
                    total += 1

            # ── Macro path: sector-level scoring ──────────────────────────────
            with ThreadPoolExecutor(max_workers=3) as executor:
                futures = {executor.submit(tier2_macro_one, a): a for a in macro_rows}
                for future in as_completed(futures):
                    art                = futures[future]
                    rec_id, si_results = future.result()
                    now_iso            = datetime.now().isoformat()

                    valid_si = [s for s in si_results if s.get('label') in MACRO_LABELS]
                    if not valid_si:
                        sb.table('market_news').update({
                            'score_final':      0.0,
                            'label':            'neutral',
                            'impact_scored_at': now_iso,
                        }).eq('id', rec_id).execute()
                        continue

                    # score_final = max abs sector score (for sorting in emails)
                    best_si = max(valid_si, key=lambda s: abs(float(s.get('score', 0))))
                    score_f = max(-10.0, min(10.0, float(best_si.get('score', 0))))

                    # Build chatgpt_prompt from article summary + best sector transmission
                    summary  = (art.get('article_summary') or art.get('summary') or art.get('title', ''))[:200]
                    transmit = (best_si.get('transmission') or '')[:200]
                    cgpt     = (
                        f"{summary} {art.get('article_url', '')}\n"
                        f"Bạn là chuyên gia tài chính Việt Nam. {transmit} "
                        f"Hãy phân tích tác động đến ngành {best_si.get('sector','')}: "
                        f"(1) xu hướng giá ngành 1-5 phiên tới, (2) cổ phiếu hưởng lợi/thiệt hại nhất, "
                        f"(3) rủi ro cần theo dõi."
                    ).strip()[:1200]

                    sb.table('market_news').update({
                        'sector_impacts':   valid_si,
                        'score_final':      score_f,
                        'label':            _db_label(best_si.get('label', '')),
                        'confidence':       best_si.get('confidence', 'medium'),
                        'chatgpt_prompt':   cgpt or None,
                        'impact_scored_at': now_iso,
                    }).eq('id', rec_id).execute()
                    total += 1

        log.info(f'  T2 xong: {total} bai')
        return total

    except Exception as e:
        log.error(f'  T2 loi: {e}')
        return 0


# ── Bước 4: Email ──────────────────────────────────────────────────────────────

def run_email():
    """Gửi email cho tất cả subscribers."""
    step_header(4, 'GỬI EMAIL THÔNG BÁO')
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

    n_t1 = run_tier1()
    time.sleep(2)

    n_t2 = run_tier2()
    time.sleep(2)

    run_email()

    elapsed = time.time() - start
    log.info('=' * 55)
    log.info(f'  HOAN THANH — {elapsed:.0f}s')
    log.info(f'  Crawl moi: {len(new_urls)} bai | T1 label: {n_t1} bai | T2 reasoning: {n_t2} bai')
    log.info('=' * 55)


if __name__ == '__main__':
    main()
