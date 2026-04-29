"""
Markettimes News Scraper
Crawl tin tức từ markettimes.vn qua HTML page + API /api/getMoreArticle/.
Upsert vào bảng market_news trên Supabase.

Chạy: python3 markettimes_scraper.py
"""

import sys
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import re
import requests
from bs4 import BeautifulSoup
from datetime import datetime, date, timedelta
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
import time

sys.path.insert(0, str(Path(__file__).parent.parent))
from supabase_writer import get_client, upsert_batch

# ── Cấu hình ──────────────────────────────────────────────────────────────────
LOOKBACK_DAYS  = 2
MAX_PAGES      = 30
WORKERS        = 4
CONTENT_DELAY  = 0.3

SITE_URL = "https://markettimes.vn"

# channelId của các chuyên mục tài chính/kinh doanh
CHANNELS = [
    ("tai-chinh",    195),
    ("kinh-doanh",   226),
    ("tieu-diem",    5),
    ("bat-dong-san", 272),
]

API_HEADERS = {
    "User-Agent":       "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
    "Accept":           "application/json, text/javascript, */*; q=0.01",
    "X-Requested-With": "XMLHttpRequest",
}

WEB_HEADERS = {
    "User-Agent":      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "vi-VN,vi;q=0.9",
    "Referer":         SITE_URL + "/",
}

_lock = threading.Lock()
_done = 0


# ── Parse ngày từ /Date(ms)/ ──────────────────────────────────────────────────

def parse_ms_timestamp(ts_str: str) -> datetime | None:
    try:
        m = re.search(r'/Date\((\d+)', str(ts_str))
        if m:
            return datetime.utcfromtimestamp(int(m.group(1)) / 1000)
    except Exception:
        pass
    return None


# ── Parse article từ HTML ─────────────────────────────────────────────────────

def parse_html_articles(html: str, cutoff: date) -> tuple[list[dict], int]:
    """
    Parse danh sách bài từ trang HTML category.
    Trả về (articles, last_pid) — last_pid dùng để gọi API trang tiếp.
    """
    soup = BeautifulSoup(html, "html.parser")
    articles = []

    # Lấy PID cuối cùng từ loadArticle elements
    load_articles = soup.select(".loadArticle[pid]")
    last_pid = 0
    if load_articles:
        try:
            last_pid = int(load_articles[-1].get("pid", 0))
        except (ValueError, TypeError):
            pass

    # Lấy danh sách bài từ link pattern
    seen_pids: set[int] = set()
    for a_tag in soup.select("a[href]"):
        href = a_tag.get("href", "")
        m = re.match(r"https://markettimes\.vn/([a-z0-9-]+-(\d+))\.html$", href)
        if not m:
            continue
        pid = int(m.group(2))
        if pid in seen_pids:
            continue
        seen_pids.add(pid)

        # Lấy title từ thẻ a hoặc thẻ tiêu đề gần nhất
        title = a_tag.get("title") or a_tag.get_text(strip=True)
        if not title or len(title) < 10:
            continue

        articles.append({
            "title":        title,
            "content":      "",
            "source":       "markettimes",
            "article_url":  href,
            "published_at": datetime.utcnow(),  # HTML listing không có timestamp chính xác
            "_pid":         pid,
        })

    return articles, last_pid


# ── Fetch API page ─────────────────────────────────────────────────────────────

def fetch_api_page(session: requests.Session, channel_id: int, publisher_id: int,
                   slug: str) -> list | None:
    url = f"{SITE_URL}/api/getMoreArticle/channel__{publisher_id}_{channel_id}_0"
    headers = {**API_HEADERS, "Referer": f"{SITE_URL}/{slug}"}
    try:
        resp = session.get(url, headers=headers, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        return data if isinstance(data, list) else None
    except Exception as e:
        print(f"  [!] API lỗi channel={channel_id} pid={publisher_id}: {e}")
        return None


def parse_api_items(items: list, cutoff: date) -> tuple[list[dict], bool, int]:
    """
    Parse API items → (articles, should_stop, last_pid)
    should_stop = True nếu gặp bài cũ hơn cutoff
    """
    articles = []
    should_stop = False
    last_pid = 0

    for item in items:
        pub_dt = parse_ms_timestamp(item.get("PublishedTime", ""))
        pid = item.get("PublisherId")
        if pid:
            last_pid = int(pid)

        if pub_dt and pub_dt.date() < cutoff:
            should_stop = True
            break

        friendly = item.get("FriendlyTitle", "")
        art_url = f"{SITE_URL}/{friendly}-{pid}.html" if friendly and pid else None
        title = (item.get("Title") or "").strip()
        if not title or not art_url:
            continue

        articles.append({
            "title":        title,
            "content":      "",
            "source":       "markettimes",
            "article_url":  art_url,
            "published_at": pub_dt,
            "_pid":         pid,
        })

    return articles, should_stop, last_pid


# ── Scrape 1 channel ──────────────────────────────────────────────────────────

def scrape_channel(session: requests.Session, slug: str, channel_id: int,
                   cutoff: date) -> list[dict]:
    articles = []
    seen_urls: set[str] = set()

    def add_unique(arts: list[dict]):
        for a in arts:
            url = a.get("article_url")
            if url and url not in seen_urls:
                seen_urls.add(url)
                articles.append(a)

    # Bước 1: Fetch HTML page 1
    try:
        resp = session.get(f"{SITE_URL}/{slug}", headers=WEB_HEADERS, timeout=15)
        html_arts, last_pid = parse_html_articles(resp.text, cutoff)
        add_unique(html_arts)
    except Exception as e:
        print(f"  [!] HTML lỗi {slug}: {e}")
        last_pid = 0

    if not last_pid:
        return articles

    # Bước 2: Phân trang qua API với last_pid
    for _ in range(MAX_PAGES):
        items = fetch_api_page(session, channel_id, last_pid, slug)
        if not items:
            break

        api_arts, should_stop, new_last_pid = parse_api_items(items, cutoff)
        add_unique(api_arts)

        if should_stop or not new_last_pid or new_last_pid == last_pid:
            break
        last_pid = new_last_pid
        time.sleep(0.5)

    return articles


# ── Bước 1: Scrape tất cả channels ───────────────────────────────────────────

def scrape_all_channels(lookback_days: int = LOOKBACK_DAYS) -> list[dict]:
    cutoff = date.today() - timedelta(days=lookback_days)
    session = requests.Session()
    all_articles: list[dict] = []
    seen_urls: set[str] = set()

    print(f"  Markettimes: lấy bài từ {cutoff.strftime('%d/%m/%Y')}")

    for slug, channel_id in CHANNELS:
        arts = scrape_channel(session, slug, channel_id, cutoff)
        new_count = 0
        for a in arts:
            url = a.get("article_url")
            if url and url not in seen_urls:
                seen_urls.add(url)
                all_articles.append(a)
                new_count += 1
        print(f"    {slug} (ch={channel_id}): {new_count} bài")

    print(f"  Tổng: {len(all_articles)} bài unique")
    return all_articles


# ── Bước 2: Enrich nội dung đầy đủ ───────────────────────────────────────────

def fetch_content(idx: int, url: str) -> tuple[int, str]:
    global _done
    if not url:
        return idx, ""
    try:
        resp = requests.get(url, headers=WEB_HEADERS, timeout=15)
        resp.raise_for_status()
        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "html.parser")

        article = (
            soup.select_one(".content-main-normal")
            or soup.select_one(".descriptionx")
            or soup.select_one(".c-news-detail")
        )
        if not article:
            return idx, ""

        for tag in article.select("script, style, .ads, [class*=ads], .related, .tags"):
            tag.decompose()

        paragraphs = article.select("p")
        texts = [p.get_text(separator=" ", strip=True) for p in paragraphs]
        content = "\n\n".join(t for t in texts if t)
        time.sleep(CONTENT_DELAY)
    except Exception:
        content = ""

    with _lock:
        _done += 1
        if _done % 50 == 0 or _done <= 3:
            print(f"  [{_done}] {url[:70]}")

    return idx, content


def enrich_content(articles: list[dict]) -> list[dict]:
    global _done
    _done = 0
    total = len(articles)
    if not total:
        return articles

    print(f"  Enrich nội dung {total} bài ({WORKERS} luồng)...")

    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = {
            executor.submit(fetch_content, i, a.get("article_url", "")): i
            for i, a in enumerate(articles)
        }
        for future in as_completed(futures):
            idx, content = future.result()
            articles[idx]["content"] = content

    return articles


# ── Bước 3: Upsert Supabase ───────────────────────────────────────────────────

def upsert_to_supabase(articles: list[dict]) -> int:
    if not articles:
        return 0

    records = []
    for a in articles:
        pub_ts = a.get("published_at")
        records.append({
            "title":        a.get("title", ""),
            "content":      a.get("content") or None,
            "source":       "markettimes",
            "article_url":  a.get("article_url"),
            "published_at": pub_ts.isoformat() if pub_ts else None,
        })

    try:
        sb = get_client()
        n = upsert_batch(sb, "market_news", records, "article_url")
        print(f"  Supabase: {n} rows upserted")
        return n
    except Exception as e:
        print(f"  Supabase loi: {e}")
        return 0


# ── Public entry point ────────────────────────────────────────────────────────

def run(lookback_days: int = LOOKBACK_DAYS) -> int:
    articles = scrape_all_channels(lookback_days)
    if not articles:
        return 0
    articles = enrich_content(articles)
    return upsert_to_supabase(articles)


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"\nMARKETTIMES SCRAPER — {datetime.now().strftime('%H:%M:%S')}\n")
    total = run(lookback_days=LOOKBACK_DAYS)
    print(f"\nHOAN THANH — {total} bai da luu")
