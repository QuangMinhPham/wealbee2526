"""
VnExpress Finance News Scraper
Crawl tin tức tài chính từ vnexpress.net/kinh-doanh/chung-khoan
Upsert vào Supabase market_news.

Chạy: python vnexpress_scraper.py
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
START_DATE  = date.today() - timedelta(days=730)  # 2 năm
MAX_PAGES   = 500
WORKERS     = 5
DELAY       = 0.5

CATEGORIES = [
    "https://vnexpress.net/kinh-doanh/chung-khoan",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "vi-VN,vi;q=0.9",
    "Referer": "https://vnexpress.net/",
}

_lock = threading.Lock()
_done = 0


# ── Helpers ───────────────────────────────────────────────────────────────────

def extract_symbol(text: str) -> str | None:
    if not text:
        return None
    m = re.search(r"[\(\[]([A-Z]{2,5})[\)\]]|\b(VNM|HPG|VIC|MSN|VHM|TCB|BID|CTG|VPB|MBB|ACB|STB|FPT|MWG|VRE|PLX|GAS|SAB|POW|HDB|EIB|SHB|LPB|OCB|TPB|SSI|VND|HCM|MBS|VCI|BSI|AGR|SBS|APS|BVS|CTS|DSC|FTS|IVS|KIS|MAS|PSI|SBS|TVS|VDS|VFS|VIX|WSS)\b", text)
    if m:
        return m.group(1) or m.group(2)
    return None


def parse_date_vnexpress(soup) -> datetime | None:
    # Thử nhiều selector ngày
    for sel in ["span.date", "span.time-count", "time[datetime]", "meta[property='article:published_time']"]:
        tag = soup.select_one(sel)
        if not tag:
            continue
        dt_str = tag.get("datetime") or tag.get("content") or tag.get_text(strip=True)
        try:
            # ISO format
            return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        except Exception:
            pass
        # Định dạng VnExpress: "Chủ nhật, 6/4/2026, 20:51 (GMT+7)"
        m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4}),?\s*(\d{1,2}):(\d{2})", dt_str)
        if m:
            try:
                return datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)),
                                int(m.group(4)), int(m.group(5)))
            except Exception:
                pass
    return None


# ── Bước 1: Danh sách bài ─────────────────────────────────────────────────────

def fetch_list_page(session: requests.Session, base_url: str, page: int) -> list[dict]:
    url = f"{base_url}-p{page}" if page > 1 else base_url
    try:
        resp = session.get(url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "html.parser")

        articles = []
        for item in soup.select("article.item-news"):
            title_tag = item.select_one("h3 a, h2 a, .title-news a")
            if not title_tag:
                continue

            title = title_tag.get_text(strip=True)
            href  = title_tag.get("href", "")
            if not href or not href.startswith("http"):
                continue

            # Ngày từ thẻ time trong list
            time_tag = item.select_one("span.time-count, span[class*='time'], span.time")
            pub_dt   = None
            if time_tag:
                txt = time_tag.get_text(strip=True)
                # dd/mm/yyyy
                m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", txt)
                if m:
                    try:
                        pub_dt = datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)))
                    except Exception:
                        pass
                if not pub_dt:
                    # "X phút/giờ trước" → hôm nay
                    if re.search(r'\d+\s*(phút|giờ|giay)\s*trước', txt, re.I):
                        pub_dt = datetime.now()
                    # "Hôm qua"
                    elif re.search(r'hôm qua', txt, re.I):
                        pub_dt = datetime.now() - timedelta(days=1)

            articles.append({
                "title":       title,
                "article_url": href,
                "symbol":      extract_symbol(title),
                "_dt":         pub_dt,
            })
        return articles

    except Exception as e:
        print(f"  [!] Lỗi trang {page}: {e}")
        return []


def scrape_article_list() -> list[dict]:
    session      = requests.Session()
    all_articles = []
    seen_urls    = set()

    print(f"{'='*55}")
    print(f"  BƯỚC 1: Tải danh sách bài từ {START_DATE.strftime('%d/%m/%Y')}")
    print(f"{'='*55}")

    for cat_url in CATEGORIES:
        print(f"\n  [{cat_url.split('/')[-1]}]")

        for page in range(1, MAX_PAGES + 1):
            print(f"  Trang {page}...", end=" ", flush=True)
            items = fetch_list_page(session, cat_url, page)

            if not items:
                print("Hết dữ liệu.")
                break

            count = 0
            stop  = False
            for item in items:
                pub_dt = item.get("_dt")
                if pub_dt and pub_dt.date() < START_DATE:
                    print(f"\n  -> Gặp bài ngày {pub_dt.date()}, dừng.")
                    stop = True
                    break

                url = item["article_url"]
                if url in seen_urls:
                    continue
                seen_urls.add(url)
                all_articles.append(item)
                count += 1

            print(f"Thêm {count} bài (tổng: {len(all_articles)})")
            if stop:
                break
            time.sleep(DELAY)

    print(f"\n  -> Tổng {len(all_articles)} bài viết\n")
    return all_articles


# ── Bước 2: Tải nội dung ──────────────────────────────────────────────────────

def fetch_content(row_idx: int, article: dict) -> tuple[int, dict]:
    global _done
    url = article.get("article_url", "")
    if not url:
        return row_idx, article

    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "html.parser")

        # Nội dung — VnExpress dùng <article class="fck_detail"> chứa các <p class="Normal">
        content_tag = soup.select_one("article.fck_detail") or soup.select_one(".sidebar-1 article") or soup.select_one("#fck_detail")
        if content_tag:
            # Xóa các phần không phải nội dung chính (related, share, caption ảnh)
            for junk in content_tag.select(".box-tinlienquan, .related-news, .fig-caption, .embed, script, style, .Social, [class*='share']"):
                junk.decompose()
            paras = content_tag.select("p.Normal, p")
            if paras:
                content = "\n\n".join(p.get_text(strip=True) for p in paras if p.get_text(strip=True))
            else:
                content = content_tag.get_text(separator="\n", strip=True)
        else:
            content = ""

        # Tác giả
        author_tag = soup.select_one(".author_mail strong, .author strong, [class*='author']")
        author = author_tag.get_text(strip=True) if author_tag else None

        # Ngày chính xác từ trang bài
        pub_dt = parse_date_vnexpress(soup) or article.get("_dt")

        # Symbol — tìm thêm trong content
        symbol = (
            article.get("symbol") or
            extract_symbol(article.get("title", "")) or
            extract_symbol(content[:300] if content else "")
        )

        article.update({
            "content": content,
            "author":  author,
            "symbol":  symbol,
            "_dt":     pub_dt,
        })

    except Exception:
        pass

    with _lock:
        _done += 1
        if _done % 100 == 0:
            total = article.get("_total", "?")
            print(f"  [{_done}/{total}] {url[:70]}")

    time.sleep(DELAY)
    return row_idx, article


def enrich_content(articles: list[dict]) -> list[dict]:
    global _done
    _done = 0
    total = len(articles)

    print(f"{'='*55}")
    print(f"  BƯỚC 2: Tải nội dung {total} bài ({WORKERS} luồng)")
    print(f"{'='*55}")

    for a in articles:
        a["_total"] = total

    start    = time.time()
    contents = [None] * total

    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = {executor.submit(fetch_content, i, a): i for i, a in enumerate(articles)}
        for future in as_completed(futures):
            idx, enriched = future.result()
            contents[idx] = enriched

    elapsed = time.time() - start
    print(f"\n  -> Hoàn thành trong {elapsed:.0f}s\n")
    return [a for a in contents if a is not None]


# ── Bước 3: Upsert Supabase ───────────────────────────────────────────────────

def upsert_to_supabase(articles: list[dict]) -> None:
    records   = []
    seen_urls = set()

    for a in articles:
        url = a.get("article_url") or None
        if not url or url in seen_urls:
            continue
        seen_urls.add(url)

        pub_dt = a.get("_dt")
        records.append({
            "symbol":       a.get("symbol") or None,
            "title":        a.get("title", ""),
            "content":      a.get("content") or None,
            "author":       a.get("author") or None,
            "source":       "vnexpress",
            "article_url":  url,
            "published_at": pub_dt.isoformat() if pub_dt else None,
        })

    print(f"{'='*55}")
    print(f"  BƯỚC 3: Upsert {len(records)} bài lên Supabase")
    print(f"{'='*55}")

    try:
        sb = get_client()
        n  = upsert_batch(sb, "market_news", records, "article_url")
        print(f"  ✓ Supabase market_news: {n} rows upserted\n")
    except Exception as e:
        print(f"  ✗ Supabase lỗi: {e}\n")


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"\nVNEXPRESS SCRAPER — bắt đầu lúc {datetime.now().strftime('%H:%M:%S')}\n")

    articles = scrape_article_list()
    if not articles:
        print("[!] Không lấy được bài nào.")
        sys.exit(1)

    articles = enrich_content(articles)
    upsert_to_supabase(articles)

    print(f"HOÀN THÀNH lúc {datetime.now().strftime('%H:%M:%S')}")
