"""
Test pipeline: crawl 7 nguồn → content_filter → in kết quả.
Không dùng API key, không ghi Supabase — thuần HTTP + Python logic.
"""
import sys, types
from datetime import datetime, date, timedelta
from pathlib import Path
import importlib.util, time

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# ── Mock Supabase & pandas (không cần) ───────────────────────────────────────
mock_sb = types.ModuleType('supabase_writer')
mock_sb.get_client   = lambda: None
mock_sb.upsert_batch = lambda *a, **kw: 0
sys.modules['supabase_writer'] = mock_sb
try:
    import pandas
except ImportError:
    sys.modules['pandas'] = types.ModuleType('pandas')

BASE_DIR     = Path(__file__).parent
CRAWLERS_DIR = BASE_DIR / 'crawlers'
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(CRAWLERS_DIR))


def load_mod(name):
    spec = importlib.util.spec_from_file_location(name, CRAWLERS_DIR / f'{name}.py')
    mod  = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def normalize(a: dict, source: str) -> dict:
    pub = a.get('published_at') or a.get('_ts')
    return {
        'title':        (a.get('title') or a.get('Tiêu đề') or '').strip(),
        'content':      (a.get('content') or a.get('Nội dung') or '').strip(),
        'source':       source,
        'article_url':  a.get('article_url') or a.get('Link bài viết') or '',
        'symbol':       a.get('symbol') or a.get('Mã CK') or None,
        'published_at': pub,
    }


def crawl(label, source_key, fn, no_op='upsert_to_supabase'):
    t0 = time.time()
    print(f"  [{label}] đang crawl...", flush=True)
    try:
        arts = fn()
        arts = [normalize(a, source_key) for a in (arts or [])]
        arts = [a for a in arts if a['article_url'] and a['title']]
        print(f"  [{label}] ✓ {len(arts)} bài  ({time.time()-t0:.1f}s)")
        return arts
    except Exception as e:
        print(f"  [{label}] ✗ lỗi: {e}")
        return []


# ════════════════════════════════════════════════════════════════
print(f"\n{'='*65}")
print(f"  PIPELINE TEST — {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
print(f"  Bước 1: Crawl 7 nguồn  |  Bước 2: Content Filter")
print(f"  (Không API key, không Supabase)")
print(f"{'='*65}\n")

t_start = time.time()
pool = []

# ── 1. VnExpress ─────────────────────────────────────────────────
mod = load_mod('vnexpress_scraper')
mod.START_DATE = date.today() - timedelta(days=1)
mod.MAX_PAGES  = 3
mod.WORKERS    = 4
mod.upsert_to_supabase = lambda *a, **kw: None
pool += crawl('VnExpress', 'vnexpress', mod.scrape_article_list)

# ── 2. Vietstock ─────────────────────────────────────────────────
mod = load_mod('vietstock_scraper')
mod.START_DATE = date.today() - timedelta(days=2)  # lấy rộng, date filter sẽ cắt chính xác
mod.MAX_PAGES  = 3
mod.upsert_news_to_supabase = lambda *a, **kw: None
pool += crawl('Vietstock', 'vietstock', mod.scrape_article_list)

# ── 3. MarketTimes ───────────────────────────────────────────────
mod = load_mod('markettimes_scraper')
mod.upsert_to_supabase = lambda *a, **kw: None
pool += crawl('MarketTimes', 'markettimes',
              lambda: mod.scrape_all_channels(lookback_days=1))

# ── 4. CafeF ─────────────────────────────────────────────────────
mod = load_mod('cafef_scraper')
mod.upsert_to_supabase = lambda *a, **kw: None
pool += crawl('CafeF', 'cafef',
              lambda: mod.scrape_all(lookback_days=1))

# ── 5. TinNhanhChungKhoan ────────────────────────────────────────
mod = load_mod('tinnhanh_scraper')
mod.upsert_to_supabase = lambda *a, **kw: None
pool += crawl('TinNhanh', 'tinnhanhchungkhoan',
              lambda: mod.scrape_all(lookback_days=1))

# ── 6. BaoDauTu ──────────────────────────────────────────────────
mod = load_mod('baodautu_scraper')
mod.upsert_to_supabase = lambda *a, **kw: None
pool += crawl('BaoDauTu', 'baodautu',
              lambda: mod.scrape_all(lookback_days=1))

# ── 7. NhaDauTu ──────────────────────────────────────────────────
mod = load_mod('nhadautu_scraper')
mod.upsert_to_supabase = lambda *a, **kw: None
pool += crawl('NhaDauTu', 'nhadautu',
              lambda: mod.scrape_all(lookback_days=1))

t_crawl = time.time() - t_start
print(f"\n  Pool thô: {len(pool)} bài từ 7 nguồn  ({t_crawl:.0f}s)")

# ── Lọc ngày 24h ─────────────────────────────────────────────────────────────
now    = datetime.now()
cutoff = now - timedelta(hours=24)
before = len(pool)
pool_ok = []
for a in pool:
    pub = a.get('published_at')
    if pub is None:
        pub = now
    if not isinstance(pub, datetime):
        try:
            pub = datetime.fromisoformat(str(pub))
        except Exception:
            pub = now
    if pub > now or pub < cutoff:
        continue
    a['published_at'] = pub
    pool_ok.append(a)
print(f"  Sau date filter: {len(pool_ok)} bài ok ({before - len(pool_ok)} bỏ ngoài 24h/tương lai)")
pool = pool_ok

# ── Quality pre-filter: loại rác rõ ràng trước khi enrich ───────────────────
from content_filter import run_quality_filter
pool = run_quality_filter(pool)
print(f"  Sau quality pre-filter: {len(pool)} bài (đã loại xổ số/tuyển dụng/spam)")

# ── Enrich content: fetch full text + real dates cho bài đã qua quality ──────
# Chạy TRƯỚC relevance filter → filter có content thật để đánh giá
print(f"\n  Đang enrich {len(pool)} bài (4 workers, ~2-3 phút)...", flush=True)
sys.path.insert(0, str(BASE_DIR))
from pipeline_runner import _enrich_filtered
pool = _enrich_filtered(pool, max_workers=4)
with_content = sum(1 for a in pool if len(a.get('content') or '') > 80)
print(f"  Enrich xong: {with_content}/{len(pool)} bài có content")

# ════════════════════════════════════════════════════════════════
# BƯỚC 2: CONTENT FILTER (thuần Python, không API)
# ════════════════════════════════════════════════════════════════
print(f"\n{'='*65}")
print(f"  BƯỚC 2: CONTENT FILTER")
print(f"{'='*65}")

from content_filter import run_filter, print_source_stats, SOURCE_PRIORITY

filtered = run_filter(pool, verbose=True)

# ════════════════════════════════════════════════════════════════
# KẾT QUẢ
# ════════════════════════════════════════════════════════════════
print(f"\n{'='*65}")
print(f"  PHÂN BỔ SAU FILTER THEO NGUỒN")
print(f"{'='*65}")
print_source_stats(filtered)

print(f"\n{'='*65}")
print(f"  TOP 30 BÀI SẼ LƯU VÀO SUPABASE (đã qua lọc)")
print(f"{'='*65}")
for i, a in enumerate(filtered[:30], 1):
    title = a['title'][:72]
    src   = a['source']
    sym   = f" [{a['symbol']}]" if a.get('symbol') else ''
    pub   = a.get('published_at')
    ts    = pub.strftime('%d/%m %H:%M') if isinstance(pub, datetime) else '??:??'
    print(f"  {i:2}. [{ts}][{src}]{sym}")
    print(f"       {title}")

print(f"\n{'='*65}")
print(f"  TỔNG KẾT")
print(f"  Crawl xong:       {len(pool):4d} bài  ({t_crawl:.0f}s)")
print(f"  Sau filter:       {len(filtered):4d} bài  "
      f"(loại {len(pool)-len(filtered)} bài = {(len(pool)-len(filtered))*100//max(len(pool),1)}%)")
print(f"  Tổng thời gian:   {time.time()-t_start:.0f}s")
print(f"{'='*65}")
