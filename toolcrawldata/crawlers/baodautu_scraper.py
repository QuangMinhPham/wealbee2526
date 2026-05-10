"""
Bao Dau Tu Scraper
Crawl tin tức từ baodautu.vn — chứng khoán, đầu tư, tài chính.
Upsert vào bảng market_news trên Supabase.

Chạy: python3 baodautu_scraper.py
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

# ── Cấu hình ──────────────────────────────────────────────────────────────────
LOOKBACK_DAYS = 2
MAX_PAGES     = 8
WORKERS       = 4
CONTENT_DELAY = 0.3

SITE_URL = "https://baodautu.vn"

# Các chuyên mục chứng khoán / tài chính / đầu tư
CATEGORIES = [
    "chung-khoan",
    "doanh-nghiep",
    "tai-chinh-ngan-hang",
    "bat-dong-san",
]

HEADERS = {
    "User-Agent":      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "vi-VN,vi;q=0.9",
    "Referer":         SITE_URL + "/",
}

_lock = threading.Lock()
_done = 0


def parse_date(text: str) -> datetime | None:
    if not text:
        return None
    today = date.today()
    # ISO 8601
    m = re.search(r'(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})', text)
    if m:
        try:
            dt = datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)),
                          int(m.group(4)), int(m.group(5)))
            if dt.date() <= today:
                return dt
        except ValueError:
            pass
    # dd/mm/yyyy HH:MM
    m = re.search(r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})[\s\-,]+(\d{1,2}):(\d{2})', text)
    if m:
        try:
            dt = datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)),
                          int(m.group(4)), int(m.group(5)))
            if dt.date() <= today:
                return dt
        except ValueError:
            pass
    # dd/mm/yyyy
    m = re.search(r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})', text)
    if m:
        try:
            dt = datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)))
            if dt.date() <= today:
                return dt
        except ValueError:
            pass
    return None


# ── Bước 1: Scrape danh sách bài ─────────────────────────────────────────────

def scrape_category(session: requests.Session, slug: str, cutoff: date) -> list[dict]:
    articles = []
    seen_urls: set[str] = set()

    for page in range(1, MAX_PAGES + 1):
        if page == 1:
            url = f"{SITE_URL}/{slug}"
        else:
            url = f"{SITE_URL}/{slug}/trang-{page}"

        try:
            resp = session.get(url, headers=HEADERS, timeout=15)
            if resp.status_code == 404:
                break
            resp.raise_for_status()
            resp.encoding = "utf-8"
            soup = BeautifulSoup(resp.text, "html.parser")
        except Exception as e:
            print(f"  [!] {slug} p{page} lỗi: {e}")
            break

        found = 0
        stop  = False

        # baodautu.vn dùng pattern URL: /ten-bai-viet-d123456.html hoặc /tin/ten-bai-d12345
        for a_tag in soup.find_all("a", href=True):
            href = a_tag.get("href", "")
            if not href:
                continue
            # Match article URLs: có suffix .html và chứa -d\d+ hoặc chỉ có ID dài
            if not re.search(r'(-d\d{4,}\.html|-\d{6,}\.html|/\d{6,}$)', href):
                continue
            if not href.startswith("http"):
                href = SITE_URL + href
            if not href.startswith(SITE_URL):
                continue
            if href in seen_urls:
                continue

            title = (a_tag.get("title") or a_tag.get_text(strip=True)).strip()
            if not title or len(title) < 10:
                continue

            # Tìm ngày từ DOM gần thẻ a
            pub_dt = None
            parent = a_tag.parent
            for _ in range(3):
                if parent is None:
                    break
                for candidate in parent.find_all(["time", "span", "p", "div"], limit=10):
                    cls = " ".join(candidate.get("class", []))
                    dt_attr = candidate.get("datetime") or candidate.get("content")
                    if dt_attr:
                        pub_dt = parse_date(dt_attr)
                        if pub_dt:
                            break
                    if any(kw in cls.lower() for kw in ("date", "time", "pub", "post")):
                        pub_dt = parse_date(candidate.get_text(strip=True))
                        if pub_dt:
                            break
                if pub_dt:
                    break
                parent = parent.parent

            if pub_dt and pub_dt.date() < cutoff:
                stop = True
                break

            seen_urls.add(href)
            articles.append({
                "title":        title,
                "content":      "",
                "source":       "baodautu",
                "article_url":  href,
                "published_at": pub_dt,
            })
            found += 1

        print(f"    [{slug}] trang {page}: +{found} bài (tổng: {len(articles)})")

        if stop or found == 0:
            break
        time.sleep(0.5)

    return articles


def scrape_all(lookback_days: int = LOOKBACK_DAYS) -> list[dict]:
    cutoff  = date.today() - timedelta(days=lookback_days)
    session = requests.Session()
    all_articles: list[dict] = []
    seen_urls: set[str] = set()

    print(f"  BaoDauTu: lấy bài từ {cutoff.strftime('%d/%m/%Y')}")

    for slug in CATEGORIES:
        arts = scrape_category(session, slug, cutoff)
        for a in arts:
            url = a.get("article_url")
            if url and url not in seen_urls:
                seen_urls.add(url)
                all_articles.append(a)

    print(f"  Tổng: {len(all_articles)} bài unique")
    return all_articles


# ── Bước 2: Enrich nội dung ───────────────────────────────────────────────────

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

        content_tag = (
            soup.select_one(".detail-content")
            or soup.select_one(".article-body")
            or soup.select_one(".article-content")
            or soup.select_one(".post-content")
            or soup.select_one("article")
        )
        if content_tag:
            for junk in content_tag.select("script, style, .ads, [class*=ads], .relate, .social, .tags"):
                junk.decompose()
            paras = content_tag.select("p")
            article["content"] = "\n\n".join(p.get_text(strip=True) for p in paras if p.get_text(strip=True))

        # Parse ngày từ trang bài viết
        for sel in [
            "meta[property='article:published_time']",
            "meta[name='pubdate']",
            "time[datetime]",
            "span.date", "span.time", "span.post-date",
            ".entry-date", ".publish-date", ".post-meta",
        ]:
            tag = soup.select_one(sel)
            if tag:
                dt_str = tag.get("datetime") or tag.get("content") or tag.get_text(strip=True)
                pub_dt = parse_date(dt_str)
                if pub_dt:
                    article["published_at"] = pub_dt
                    break

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

    print(f"  Enrich nội dung {len(articles)} bài ({WORKERS} luồng)...")
    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = {executor.submit(fetch_content, i, a): i for i, a in enumerate(articles)}
        for future in as_completed(futures):
            idx, enriched = future.result()
            articles[idx] = enriched

    return articles


# ── Bước 3: Upsert Supabase ───────────────────────────────────────────────────

def upsert_to_supabase(articles: list[dict]) -> int:
    if not articles:
        return 0
    records = []
    for a in articles:
        pub = a.get("published_at")
        records.append({
            "title":        a.get("title", ""),
            "content":      a.get("content") or None,
            "source":       "baodautu",
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


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"\nBAODAUTU SCRAPER — {datetime.now().strftime('%H:%M:%S')}\n")
    total = run(lookback_days=LOOKBACK_DAYS)
    print(f"\nHOAN THANH — {total} bai da luu")
