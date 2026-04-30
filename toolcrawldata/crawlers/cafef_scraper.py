"""
CafeF News Scraper
Crawl tin tức từ cafef.vn — chứng khoán, doanh nghiệp, vĩ mô.
Upsert vào bảng market_news trên Supabase.

Chạy: python3 cafef_scraper.py
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
MAX_PAGES     = 5
WORKERS       = 4
CONTENT_DELAY = 0.3

SITE_URL = "https://cafef.vn"

# Các chuyên mục chứng khoán / tài chính
CATEGORIES = [
    "thi-truong-chung-khoan",
    "doanh-nghiep",
    "vi-mo-dau-tu",
]

HEADERS = {
    "User-Agent":      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "vi-VN,vi;q=0.9",
    "Referer":         SITE_URL + "/",
}

_lock = threading.Lock()
_done = 0

# Regex phát hiện mã CK: (VNM), [HPG], hoặc các blue-chip nổi tiếng
_SYM_RE = re.compile(
    r'[\(\[]([A-Z]{2,5})[\)\]]'
    r'|\b(VNM|HPG|VIC|MSN|VHM|TCB|BID|CTG|VPB|MBB|ACB|STB|FPT|MWG|VRE|PLX|GAS|SAB|POW|HDB|EIB|SHB|LPB|OCB|TPB|SSI|VND|HCM|VCI|VIX|NVL|STG|DGC|MWG|KBC|VCB|VCG|CTD|PDR)\b'
)


def extract_symbol(text: str) -> str | None:
    if not text:
        return None
    m = _SYM_RE.search(text)
    return m.group(1) or m.group(2) if m else None


def parse_date(text: str) -> datetime | None:
    """Parse ngày từ CafeF — chỉ chấp nhận ngày <= hôm nay (loại ngày cổ tức tương lai)."""
    if not text:
        return None
    today = date.today()
    m = re.search(r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})[\s\-,]+(\d{1,2}):(\d{2})', text)
    if m:
        try:
            dt = datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)),
                          int(m.group(4)), int(m.group(5)))
            if dt.date() <= today:
                return dt
        except ValueError:
            pass
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
            url = f"{SITE_URL}/{slug}.chn"
        else:
            url = f"{SITE_URL}/{slug}/p{page}.chn"

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

        # Lấy tất cả link bài viết .chn (trừ category links)
        for a_tag in soup.find_all("a", href=re.compile(r'.*-\d{10,}\.chn$')):
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
                for candidate in parent.find_all(["time", "span", "p"], limit=8):
                    cls = " ".join(candidate.get("class", []))
                    dt_attr = candidate.get("datetime") or candidate.get("content")
                    if dt_attr:
                        pub_dt = parse_date(dt_attr)
                        if pub_dt:
                            break
                    if any(kw in cls.lower() for kw in ("date", "time", "pub")):
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
                "source":       "cafef",
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

    print(f"  CafeF: lấy bài từ {cutoff.strftime('%d/%m/%Y')}")

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

        # Nội dung chính
        content_tag = (
            soup.select_one(".detail-content")
            or soup.select_one(".knc-content")
            or soup.select_one("#detail_content")
            or soup.select_one("article")
        )
        if content_tag:
            for junk in content_tag.select("script, style, .ads, [class*=ads], .relate, .social, .knc-tag"):
                junk.decompose()
            paras = content_tag.select("p")
            article["content"] = "\n\n".join(p.get_text(strip=True) for p in paras if p.get_text(strip=True))

        # Cập nhật ngày từ bài chi tiết nếu chưa có
        if not article.get("published_at") or article["published_at"] == datetime.now().date():
            for sel in ["span.pdate", "span.time", ".entry-date", "time[datetime]", "meta[property='article:published_time']"]:
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
            "source":       "cafef",
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
