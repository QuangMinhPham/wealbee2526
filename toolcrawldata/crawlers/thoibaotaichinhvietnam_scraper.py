"""
Thoi Bao Tai Chinh Viet Nam Scraper
Crawl tin tức từ thoibaotaichinhvietnam.vn
Upsert vào bảng market_news trên Supabase.
"""

import sys
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import re
import time
import threading
from datetime import datetime, date, timedelta
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).parent.parent))
from supabase_writer import get_client, upsert_batch

LOOKBACK_DAYS = 1
WORKERS       = 4
CONTENT_DELAY = 0.3
SITE_URL      = "https://thoibaotaichinhvietnam.vn"

# Không có pagination URL — mỗi category chỉ có 1 trang listing
CATEGORIES = [
    "chung-khoan",
    "tai-chinh",
    "doanh-nghiep",
    "kinh-te-vi-mo",
]

HEADERS = {
    "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
    "Referer":         SITE_URL + "/",
}

_lock = threading.Lock()
_done = 0

# Article URL pattern: /slug-123456.html (ID ≥ 6 chữ số)
_ART_RE = re.compile(r'thoibaotaichinhvietnam\.vn/[a-z0-9][a-z0-9\-]+-\d{5,}\.html$')


def parse_date(text: str) -> datetime | None:
    if not text:
        return None
    today = date.today()
    # "17:49 | 08/05/2026"
    m = re.search(r'(\d{1,2}):(\d{2})\s*\|?\s*(\d{1,2})/(\d{1,2})/(\d{4})', text)
    if m:
        try:
            dt = datetime(int(m.group(5)), int(m.group(4)), int(m.group(3)),
                          int(m.group(1)), int(m.group(2)))
            if dt.date() <= today:
                return dt
        except ValueError:
            pass
    # ISO: 2026-05-08T17:49
    m = re.search(r'(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})', text)
    if m:
        try:
            dt = datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)),
                          int(m.group(4)), int(m.group(5)))
            if dt.date() <= today:
                return dt
        except ValueError:
            pass
    # "08/05/2026 17:49"
    m = re.search(r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})[\s,\-]+(\d{1,2}):(\d{2})', text)
    if m:
        try:
            dt = datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)),
                          int(m.group(4)), int(m.group(5)))
            if dt.date() <= today:
                return dt
        except ValueError:
            pass
    return None


def scrape_category(session: requests.Session, slug: str, cutoff: date) -> list[dict]:
    articles = []
    seen_urls: set[str] = set()
    url = f"{SITE_URL}/{slug}"

    try:
        resp = session.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "html.parser")
    except Exception as e:
        print(f"  [!] {slug} lỗi: {e}")
        return articles

    for a_tag in soup.find_all("a", href=_ART_RE):
        href = a_tag.get("href", "")
        if not href.startswith("http"):
            href = SITE_URL + href
        if href in seen_urls:
            continue

        title = (a_tag.get("title") or a_tag.get_text(strip=True)).strip()
        if not title or len(title) < 10:
            continue

        seen_urls.add(href)
        articles.append({
            "title":        title,
            "content":      "",
            "source":       "thoibaotaichinhvietnam",
            "article_url":  href,
            "published_at": None,
        })

    print(f"    [{slug}]: {len(articles)} bài")
    return articles


def scrape_all(lookback_days: int = LOOKBACK_DAYS) -> list[dict]:
    cutoff  = date.today() - timedelta(days=lookback_days)
    session = requests.Session()
    all_articles: list[dict] = []
    seen_urls: set[str] = set()

    print(f"  ThoiBaoTaiChinhVN: lấy bài từ {cutoff.strftime('%d/%m/%Y')}")

    for slug in CATEGORIES:
        for a in scrape_category(session, slug, cutoff):
            url = a.get("article_url")
            if url and url not in seen_urls:
                seen_urls.add(url)
                all_articles.append(a)

    print(f"  Tổng listing: {len(all_articles)} bài unique")
    return all_articles


def fetch_content(idx: int, article: dict) -> tuple[int, dict]:
    global _done
    url = article.get("article_url", "")
    if not url:
        return idx, article
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "html.parser")

        # Date: meta → time[datetime] → text search "HH:MM | DD/MM/YYYY"
        pub_dt = None
        meta = soup.select_one("meta[property='article:published_time'], meta[name='pubdate']")
        if meta:
            pub_dt = parse_date(meta.get("content", ""))
        if not pub_dt:
            t = soup.select_one("time[datetime]")
            if t:
                pub_dt = parse_date(t.get("datetime", ""))
        if not pub_dt:
            # Tìm text chứa pattern giờ | ngày trong 500 ký tự đầu body
            body_text = soup.get_text(" ", strip=True)[:500]
            pub_dt = parse_date(body_text)
        if pub_dt:
            article["published_at"] = pub_dt

        # Content — MasterCMS selectors
        content_tag = (
            soup.select_one(".article-detail-content")
            or soup.select_one(".__MASTERCMS_CONTENT")
            or soup.select_one(".article-detail-main")
            or soup.select_one(".article-content")
            or soup.select_one("article")
        )
        if content_tag:
            for junk in content_tag.select("script,style,.ads,[class*=ads],.relate,.tags,.social"):
                junk.decompose()
            paras = content_tag.select("p")
            article["content"] = "\n\n".join(p.get_text(strip=True) for p in paras if p.get_text(strip=True))

        time.sleep(CONTENT_DELAY)
    except Exception:
        pass

    with _lock:
        _done += 1
        if _done <= 3 or _done % 50 == 0:
            print(f"  [{_done}] {url[:70]}")

    return idx, article


def enrich_content(articles: list[dict]) -> list[dict]:
    global _done
    _done = 0
    if not articles:
        return articles
    print(f"  Enrich {len(articles)} bài ({WORKERS} luồng)...")
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futures = {ex.submit(fetch_content, i, a): i for i, a in enumerate(articles)}
        for f in as_completed(futures):
            idx, enriched = f.result()
            articles[idx] = enriched
    return articles


def upsert_to_supabase(articles: list[dict]) -> int:
    if not articles:
        return 0
    records = []
    for a in articles:
        pub = a.get("published_at")
        records.append({
            "title":        a.get("title", ""),
            "content":      a.get("content") or None,
            "source":       "thoibaotaichinhvietnam",
            "article_url":  a.get("article_url"),
            "published_at": pub.isoformat() if isinstance(pub, datetime) else None,
        })
    try:
        sb = get_client()
        n = upsert_batch(sb, "market_news", records, "article_url")
        print(f"  Supabase: {n} rows upserted")
        return n
    except Exception as e:
        print(f"  Supabase lỗi: {e}")
        return 0


def run(lookback_days: int = LOOKBACK_DAYS) -> int:
    articles = scrape_all(lookback_days)
    if not articles:
        return 0
    articles = enrich_content(articles)
    return upsert_to_supabase(articles)


if __name__ == "__main__":
    print(f"\nTHOIBAOTAICHINHVIETNAM — {datetime.now().strftime('%H:%M:%S')}\n")
    total = run()
    print(f"\nHOAN THANH — {total} bai da luu")
