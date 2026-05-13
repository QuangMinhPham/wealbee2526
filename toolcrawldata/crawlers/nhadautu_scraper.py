"""
NhaDauTu Scraper
Crawl tin tức từ nhadautu.vn — chứng khoán, tài chính, doanh nghiệp.
Upsert vào bảng market_news trên Supabase.

Chạy: python3 nhadautu_scraper.py
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

SITE_URL = "https://nhadautu.vn"

CATEGORIES = [
    "chung-khoan",
    "tai-chinh",
    "doanh-nghiep",
    "thi-truong",
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
    r'|\b(VNM|HPG|VIC|MSN|VHM|TCB|BID|CTG|VPB|MBB|ACB|STB|FPT|MWG|VRE|PLX|GAS|SAB|POW|HDB|EIB|SHB|LPB|OCB|TPB|SSI|VND|HCM|VCI|VIX|NVL|DGC|KBC|VCB|VCG|DRC|TCL)\b'
)


def extract_symbol(text: str) -> str | None:
    if not text:
        return None
    m = _SYM_RE.search(text)
    return m.group(1) or m.group(2) if m else None


def parse_date(text: str) -> datetime | None:
    if not text:
        return None
    # ISO 8601
    m = re.search(r'(\d{4})-(\d{2})-(\d{2})T?(\d{2}):(\d{2})', text)
    if m:
        try:
            return datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)),
                            int(m.group(4)), int(m.group(5)))
        except ValueError:
            pass
    # DD/MM/YYYY HH:MM
    m = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})\s+(\d{1,2}):(\d{2})', text)
    if m:
        try:
            return datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)),
                            int(m.group(4)), int(m.group(5)))
        except ValueError:
            pass
    # HH:MM DD/MM/YYYY — nhadautu.vn format (div.box_time)
    m = re.search(r'(\d{1,2}):(\d{2})\s+(\d{1,2})[/-](\d{1,2})[/-](\d{4})', text)
    if m:
        try:
            return datetime(int(m.group(5)), int(m.group(4)), int(m.group(3)),
                            int(m.group(1)), int(m.group(2)))
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

    pagination_formats = [
        lambda p: f"{SITE_URL}/{slug}/" if p == 1 else f"{SITE_URL}/{slug}/page/{p}/",
        lambda p: f"{SITE_URL}/{slug}/" if p == 1 else f"{SITE_URL}/{slug}/?page={p}",
        lambda p: f"{SITE_URL}/{slug}/" if p == 1 else f"{SITE_URL}/{slug}/trang-{p}/",
    ]
    chosen_fmt = pagination_formats[0]

    for page in range(1, MAX_PAGES + 1):
        url = chosen_fmt(page)

        try:
            resp = session.get(url, headers=HEADERS, timeout=15)
            if resp.status_code == 404 and page == 2:
                # Thử các format pagination khác
                for fmt in pagination_formats[1:]:
                    alt_url = fmt(page)
                    r2 = session.get(alt_url, headers=HEADERS, timeout=10)
                    if r2.status_code == 200:
                        resp = r2
                        chosen_fmt = fmt
                        url = alt_url
                        break
                else:
                    break
            elif resp.status_code == 404:
                break
            resp.raise_for_status()
            resp.encoding = "utf-8"
            soup = BeautifulSoup(resp.text, "html.parser")
        except Exception as e:
            print(f"  [!] {slug} p{page} lỗi: {e}")
            break

        found = 0
        stop  = False

        # NhaDauTu URL pattern: /slug-d[ID].html
        for a_tag in soup.find_all("a", href=re.compile(r'nhadautu\.vn/.*-d\d+\.html$')):
            href  = a_tag.get("href", "")
            if not href.startswith("http"):
                href = SITE_URL + href
            if href in seen_urls:
                continue

            title = (a_tag.get("title") or a_tag.get_text(strip=True)).strip()
            if not title or len(title) < 10:
                continue

            # Tìm ngày trong DOM gần thẻ a — chỉ leo tối đa 2 cấp,
            # chỉ đọc thẻ có class date/time/pub hoặc <time> để tránh
            # bắt ngày từ sidebar / related articles.
            pub_dt = None
            parent = a_tag.parent
            for _ in range(2):
                if parent is None:
                    break
                for tag in parent.find_all(["time", "span", "p"], limit=8):
                    cls = " ".join(tag.get("class", []))
                    dt_attr = tag.get("datetime") or tag.get("data-time") or tag.get("content")
                    if dt_attr:
                        pub_dt = parse_date(dt_attr)
                        if pub_dt:
                            break
                    if any(kw in cls.lower() for kw in ("date", "time", "publish", "post-meta")):
                        pub_dt = parse_date(tag.get_text(strip=True))
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
                "source":       "nhadautu",
                "article_url":  href,
                "published_at": pub_dt or datetime.now(),
                "symbol":       extract_symbol(title),
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

    print(f"  NhaDauTu: lấy bài từ {cutoff.strftime('%d/%m/%Y')}")

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
            soup.select_one("#main")
            or soup.select_one(".article-content")
            or soup.select_one(".post-content")
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

        # Lấy ngày chính xác
        for sel in ["meta[property='article:published_time']",
                    "div.box_time",
                    "time[datetime]", "span.date", ".publish-date", ".post-date"]:
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
            "source":       "nhadautu",
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
