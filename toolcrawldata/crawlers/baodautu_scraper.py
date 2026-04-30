"""
BaoDauTu Scraper
Crawl tin tức từ baodautu.vn — chứng khoán, doanh nghiệp.
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
LOOKBACK_DAYS = 1
MAX_PAGES     = 4
WORKERS       = 4
CONTENT_DELAY = 0.3

SITE_URL = "https://baodautu.vn"

# (slug, tên hiển thị)
CATEGORIES = [
    "chung-khoan-d8",
    "doanh-nghiep-d5",
    "tai-chinh-ngan-hang-d68",
]

HEADERS = {
    "User-Agent":      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "vi-VN,vi;q=0.9",
    "Referer":         SITE_URL + "/",
}

_lock = threading.Lock()
_done = 0

_SYM_RE = re.compile(
    r'[\(\[]([A-Z]{2,5})[\)\]]'
    r'|\b(VNM|HPG|VIC|MSN|VHM|TCB|BID|CTG|VPB|MBB|ACB|STB|FPT|MWG|VRE|PLX|GAS|SAB|POW|HDB|EIB|SHB|LPB|OCB|TPB|SSI|VND|HCM|VCI|VIX|NVL|DGC|KBC|VCB|VCG)\b'
)


def extract_symbol(text: str) -> str | None:
    if not text:
        return None
    m = _SYM_RE.search(text)
    return m.group(1) or m.group(2) if m else None


def parse_date(text: str) -> datetime | None:
    """Parse DD/MM/YYYY HH:MM hoặc Author - DD/MM/YYYY HH:MM."""
    if not text:
        return None
    m = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})\s+(\d{1,2}):(\d{2})', text)
    if m:
        try:
            return datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)),
                            int(m.group(4)), int(m.group(5)))
        except ValueError:
            pass
    m = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})', text)
    if m:
        try:
            return datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)))
        except ValueError:
            pass
    return None


# ── Bước 1: Scrape danh sách bài ─────────────────────────────────────────────

def scrape_category(session: requests.Session, slug: str, cutoff: date) -> list[dict]:
    articles = []
    seen_urls: set[str] = set()

    for page in range(1, MAX_PAGES + 1):
        if page == 1:
            url = f"{SITE_URL}/{slug}/"
        else:
            url = f"{SITE_URL}/{slug}/p{page}"

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

        # BaoDauTu dùng div.article-item > a hoặc h3 > a
        # Article URL pattern: /slug-d[ID].html
        for a_tag in soup.find_all("a", href=re.compile(r'baodautu\.vn/.*-d\d+\.html$')):
            href  = a_tag.get("href", "")
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
                "source":       "baodautu",
                "article_url":  href,
                "published_at": datetime.now(),  # sẽ được enrich chính xác nếu có; fallback = now
                "symbol":       extract_symbol(title),
            })
            found += 1

        print(f"    [{slug}] trang {page}: +{found} bài (tổng: {len(articles)})")

        if found == 0:
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

    print(f"  Tổng trước filter: {len(all_articles)} bài")
    return all_articles


# ── Bước 2: Enrich nội dung + lấy ngày từ bài ───────────────────────────────

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

        # Nội dung bài
        content_tag = (
            soup.select_one("#content_detail_news")
            or soup.select_one(".main_content")
            or soup.select_one(".article-content")
            or soup.select_one("article")
        )
        if content_tag:
            for junk in content_tag.select("script, style, .ads, [class*=ads], .relate, .social, .tag, h1"):
                junk.decompose()
            paras = content_tag.select("p")
            text = "\n\n".join(p.get_text(strip=True) for p in paras if len(p.get_text(strip=True)) > 30)
            if not text:
                text = content_tag.get_text(separator="\n", strip=True)
            article["content"] = text

        # Ngày đăng — BaoDauTu dùng <span class="post-time">- DD/MM/YYYY HH:MM</span>
        pub_dt = None
        for sel in ["meta[property='article:published_time']",
                    "span.post-time",
                    "time[datetime]", "span.date", ".publish-date",
                    ".author-date", ".article-date", ".post-meta"]:
            tag = soup.select_one(sel)
            if tag:
                dt_str = tag.get("datetime") or tag.get("content") or tag.get_text(strip=True)
                pub_dt = parse_date(dt_str)
                if pub_dt:
                    break

        article["published_at"] = pub_dt or datetime.now()
        time.sleep(CONTENT_DELAY)
    except Exception:
        if not article.get("published_at"):
            article["published_at"] = datetime.now()

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

    # Filter bài cũ hơn lookback sau khi có ngày chính xác
    cutoff = date.today() - timedelta(days=LOOKBACK_DAYS)
    before = len(articles)
    articles = [
        a for a in articles
        if isinstance(a.get("published_at"), datetime) and a["published_at"].date() >= cutoff
    ]
    print(f"  Sau filter ngày: {len(articles)}/{before} bài (từ {cutoff.strftime('%d/%m/%Y')})")
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
            "symbol":       a.get("symbol") or None,
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


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    articles = scrape_all(lookback_days=1)
    articles = enrich_content(articles)
    upsert_to_supabase(articles)
