"""
Wealbee Pipeline — crawl 24h gần nhất từ tất cả nguồn, filter tài chính, upsert Supabase.

Chạy toàn bộ:   python3 test_crawl_only.py
Chạy 1 nguồn:   python3 test_crawl_only.py vietstock
Nhiều nguồn:    python3 test_crawl_only.py cafef tinnhanh
"""

import sys, time, importlib.util
from datetime import datetime, date, timedelta
from pathlib import Path

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE_DIR     = Path(__file__).parent
CRAWLERS_DIR = BASE_DIR / 'crawlers'
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(CRAWLERS_DIR))

from dotenv import load_dotenv
load_dotenv(BASE_DIR / '.env')

import content_filter


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod  = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def normalize(a: dict) -> dict:
    """Chuẩn hoá article về key chung để chạy content_filter."""
    pub = a.get('published_at') or a.get('_ts') or a.get('_dt') or a.get('Ngày đăng', '')
    return {
        'title':        (a.get('title') or a.get('Tiêu đề', '')).strip(),
        'article_url':  a.get('article_url') or a.get('Link bài viết', ''),
        'symbol':       a.get('symbol') or a.get('Mã CK', '') or None,
        'published_at': pub,
        'content':      (a.get('content') or a.get('Nội dung', '')).strip(),
        'source':       a.get('source', ''),
    }


def filter_24h(articles: list[dict]) -> list[dict]:
    """Loại bài có published_at cũ hơn 24h (post-enrich safety check)."""
    cutoff = datetime.now() - timedelta(hours=24)
    kept = []
    for a in articles:
        pub = a.get('published_at') or a.get('_ts') or a.get('_dt')
        if isinstance(pub, str):
            try:
                pub = datetime.fromisoformat(pub)
            except Exception:
                pub = None
        # Nếu không có ngày → giữ lại (tránh mất bài do parse fail)
        if pub is None or pub >= cutoff:
            kept.append(a)
    return kept


def apply_content_filter(articles: list[dict], source_key: str) -> list[dict]:
    """
    Normalize, chạy content_filter 3 tầng, trả về bài gốc tương ứng.
    """
    norm_articles = []
    for a in articles:
        n = normalize(a)
        if not n['source']:
            n['source'] = source_key
        norm_articles.append(n)

    passed_norm = content_filter.run_filter(norm_articles, verbose=True)
    passed_urls = {n['article_url'] for n in passed_norm if n['article_url']}

    return [
        a for a in articles
        if (a.get('article_url') or a.get('Link bài viết', '')) in passed_urls
    ]


def print_sample(source: str, articles: list[dict]):
    print(f"\n  [{source}] Mẫu 3 bài đầu sau filter:")
    for i, a in enumerate(articles[:3], 1):
        n   = normalize(a)
        pub = n['published_at']
        if isinstance(pub, datetime):
            pub = pub.strftime('%d/%m %H:%M')
        elif isinstance(pub, str):
            pub = pub[:16]
        sym = f"[{n['symbol']}] " if n['symbol'] else ""
        print(f"    {i}. [{pub}] {sym}{n['title'][:75]}")
        clen = len(n['content'])
        print(f"       {n['article_url'][:70]}  ({clen} ký tự)")


def run_source(
    name: str,
    source_key: str,
    crawl_fn,
    enrich_fn,
    upsert_fn,
) -> tuple[int, int, int]:
    """
    Crawl → enrich toàn bộ → filter 24h → filter nội dung → upsert.
    Trả về (n_crawled, n_filtered, n_upserted).
    """
    print(f"\n{'─'*65}")
    print(f"  [{name}] Đang crawl 24h gần nhất...")
    t0 = time.time()

    try:
        articles = crawl_fn()
    except Exception as e:
        print(f"  [{name}] LỖI crawl: {e}")
        import traceback; traceback.print_exc()
        return 0, 0, 0

    n_crawled = len(articles)
    if not n_crawled:
        print(f"  [{name}] Không crawl được bài nào")
        return 0, 0, 0

    print(f"  [{name}] Crawl: {n_crawled} bài — đang lấy nội dung đầy đủ...")

    try:
        articles = enrich_fn(articles)
    except Exception as e:
        print(f"  [{name}] LỖI enrich: {e}")
        import traceback; traceback.print_exc()

    # Filter 24h sau khi có ngày chính xác từ trang bài
    before_24h = len(articles)
    articles   = filter_24h(articles)
    dropped_24h = before_24h - len(articles)
    if dropped_24h:
        print(f"  [{name}] Loại {dropped_24h} bài cũ hơn 24h (sau enrich)")

    # Filter nội dung: chất lượng + liên quan tài chính + dedup
    articles_filtered = apply_content_filter(articles, source_key)
    n_filtered = len(articles_filtered)

    # Upsert Supabase
    n_upserted = 0
    try:
        result = upsert_fn(articles_filtered)
        n_upserted = result if isinstance(result, int) else n_filtered
    except Exception as e:
        print(f"  [{name}] LỖI upsert: {e}")
        import traceback; traceback.print_exc()

    elapsed = time.time() - t0
    print(f"\n  [{name}] XONG: {n_crawled} crawl → {len(articles)} trong 24h → {n_filtered} sau filter → {n_upserted} upsert ({elapsed:.0f}s)")

    if articles_filtered:
        print_sample(name, articles_filtered)

    return n_crawled, n_filtered, n_upserted


def main():
    sources = sys.argv[1:] if len(sys.argv) > 1 else ['all']

    t0 = time.time()
    print(f"\n{'='*65}")
    print(f"  WEALBEE PIPELINE — {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print(f"  Nguồn: {', '.join(sources)}")
    print(f"{'='*65}")

    stats: dict[str, tuple[int, int, int]] = {}

    # ── VnExpress ─────────────────────────────────────────────────────────────
    if 'all' in sources or 'vnexpress' in sources:
        try:
            mod = load_module('vnexpress_scraper', CRAWLERS_DIR / 'vnexpress_scraper.py')
            mod.START_DATE = date.today() - timedelta(days=1)
            mod.MAX_PAGES  = 5
            mod.WORKERS    = 4
            stats['VnExpress'] = run_source(
                'VnExpress', 'vnexpress',
                mod.scrape_article_list,
                mod.enrich_content,
                mod.upsert_to_supabase,
            )
        except Exception as e:
            print(f"  VnExpress LỖI: {e}")
            import traceback; traceback.print_exc()
            stats['VnExpress'] = (0, 0, 0)

    # ── Vietstock ─────────────────────────────────────────────────────────────
    if 'all' in sources or 'vietstock' in sources:
        try:
            mod = load_module('vietstock_scraper', CRAWLERS_DIR / 'vietstock_scraper.py')
            stats['Vietstock'] = run_source(
                'Vietstock', 'vietstock',
                lambda: mod.scrape_article_list(lookback_hours=24),
                mod.enrich_content,
                mod.upsert_news_to_supabase,
            )
        except Exception as e:
            print(f"  Vietstock LỖI: {e}")
            import traceback; traceback.print_exc()
            stats['Vietstock'] = (0, 0, 0)

    # ── TinNhanhChungKhoan ────────────────────────────────────────────────────
    if 'all' in sources or 'tinnhanh' in sources:
        try:
            mod = load_module('tinnhanh_scraper', CRAWLERS_DIR / 'tinnhanh_scraper.py')
            stats['TinNhanh'] = run_source(
                'TinNhanhChungKhoan', 'tinnhanhchungkhoan',
                lambda: mod.scrape_all(lookback_days=1),
                mod.enrich_content,
                mod.upsert_to_supabase,
            )
        except Exception as e:
            print(f"  TinNhanh LỖI: {e}")
            import traceback; traceback.print_exc()
            stats['TinNhanh'] = (0, 0, 0)

    # ── CafeF ─────────────────────────────────────────────────────────────────
    if 'all' in sources or 'cafef' in sources:
        try:
            mod = load_module('cafef_scraper', CRAWLERS_DIR / 'cafef_scraper.py')
            stats['CafeF'] = run_source(
                'CafeF', 'cafef',
                lambda: mod.scrape_all(lookback_days=1),
                mod.enrich_content,
                mod.upsert_to_supabase,
            )
        except Exception as e:
            print(f"  CafeF LỖI: {e}")
            import traceback; traceback.print_exc()
            stats['CafeF'] = (0, 0, 0)

    # ── BaoDauTu ──────────────────────────────────────────────────────────────
    if 'all' in sources or 'baodautu' in sources:
        try:
            mod = load_module('baodautu_scraper', CRAWLERS_DIR / 'baodautu_scraper.py')
            stats['BaoDauTu'] = run_source(
                'BaoDauTu', 'baodautu',
                lambda: mod.scrape_all(lookback_days=1),
                mod.enrich_content,
                mod.upsert_to_supabase,
            )
        except Exception as e:
            print(f"  BaoDauTu LỖI: {e}")
            import traceback; traceback.print_exc()
            stats['BaoDauTu'] = (0, 0, 0)

    # ── NhaDauTu ──────────────────────────────────────────────────────────────
    if 'all' in sources or 'nhadautu' in sources:
        try:
            mod = load_module('nhadautu_scraper', CRAWLERS_DIR / 'nhadautu_scraper.py')
            stats['NhaDauTu'] = run_source(
                'NhaDauTu', 'nhadautu',
                lambda: mod.scrape_all(lookback_days=1),
                mod.enrich_content,
                mod.upsert_to_supabase,
            )
        except Exception as e:
            print(f"  NhaDauTu LỖI: {e}")
            import traceback; traceback.print_exc()
            stats['NhaDauTu'] = (0, 0, 0)

    # ── MarketTimes ───────────────────────────────────────────────────────────
    if 'all' in sources or 'markettimes' in sources:
        try:
            mod = load_module('markettimes_scraper', CRAWLERS_DIR / 'markettimes_scraper.py')
            stats['MarketTimes'] = run_source(
                'MarketTimes', 'markettimes',
                lambda: mod.scrape_all_channels(lookback_days=1),
                mod.enrich_content,
                mod.upsert_to_supabase,
            )
        except Exception as e:
            print(f"  MarketTimes LỖI: {e}")
            import traceback; traceback.print_exc()
            stats['MarketTimes'] = (0, 0, 0)

    # ── Tổng kết ──────────────────────────────────────────────────────────────
    print(f"\n{'='*65}")
    print(f"  TỔNG KẾT — {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print(f"  {'Nguồn':<24} {'Crawl':>6} {'Filter':>7} {'Upsert':>7}")
    print(f"  {'─'*24} {'─'*6} {'─'*7} {'─'*7}")
    tc = tf = tu = 0
    for name, (c, f, u) in stats.items():
        print(f"  {name:<24} {c:>6} {f:>7} {u:>7}")
        tc += c; tf += f; tu += u
    print(f"  {'─'*24} {'─'*6} {'─'*7} {'─'*7}")
    print(f"  {'TỔNG':<24} {tc:>6} {tf:>7} {tu:>7}")
    print(f"  Thời gian: {time.time()-t0:.0f}s")
    print(f"{'='*65}\n")


if __name__ == '__main__':
    main()
