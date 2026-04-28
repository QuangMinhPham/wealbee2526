"""
Scraper cho nguoiquansat.vn — crawl tin tức chứng khoán.
"""

import re
import sys
import time
import logging
from datetime import datetime, date, timedelta
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from bs4 import BeautifulSoup

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, str(Path(__file__).parent))
from supabase_writer import get_client

BASE_URL   = 'https://nguoiquansat.vn'
CATEGORIES = [
    '/chung-khoan/chuyen-dong-thi-truong',
    '/chung-khoan/doanh-nghiep-az',
    '/chung-khoan/cau-chuyen-dau-tu',
    '/chung-khoan',
]
START_DATE = date.today() - timedelta(days=1)
WORKERS    = 8
HEADERS    = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://nguoiquansat.vn',
}

log = logging.getLogger('nguoiquansat_scraper')


SYMBOL_RE = re.compile(
    r'[\(\[]([A-Z]{2,5})[\)\]]'
    r'|\b(VNM|HPG|VIC|MSN|VHM|TCB|BID|CTG|VPB|MBB|ACB|STB|FPT|MWG|VRE|PLX'
    r'|GAS|SAB|POW|HDB|EIB|SHB|LPB|OCB|TPB|SSI|VND|HCM|MBS|VCI|OIL|PVD'
    r'|PVS|BSR|DGC|DPM|DCM|GMD|HAH|REE|PC1|SJS|NLG|KDH|DXG|PDR|VHG|BCM'
    r'|GVR|VCG|HVN|ACV|VJC|HNG|BAF|GTN|VGC|VCS|TDM|BWE|TIP|ANV|CMG'
    r'|FMC|IDI|MPC|VHC|CII|FCN|HBC|HTN|LCG|PTB|VCB|BVH|MML)\b'
)


def extract_symbol(text: str):
    if not text:
        return None
    m = SYMBOL_RE.search(text)
    if m:
        return m.group(1) or m.group(2)
    return None


def parse_date(text: str):
    """Parse date từ nguoiquansat: '28/04/2026 - 09:37', '28/04/2026 15:31' hoặc ISO."""
    if not text:
        return None
    text = text.strip()
    for fmt in ['%d/%m/%Y - %H:%M', '%d/%m/%Y %H:%M', '%d/%m/%Y', '%m/%d/%Y %I:%M:%S %p', '%Y-%m-%dT%H:%M:%S']:
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    # Regex fallback: tìm pattern ngày giờ bất kỳ trong chuỗi
    m = re.search(r'(\d{2}/\d{2}/\d{4})\s*[-–]?\s*(\d{2}:\d{2})', text)
    if m:
        try:
            return datetime.strptime(f"{m.group(1)} {m.group(2)}", '%d/%m/%Y %H:%M')
        except Exception:
            pass
    m = re.search(r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})', text)
    if m:
        try:
            return datetime.fromisoformat(m.group(1))
        except Exception:
            pass
    return None


def get_article_list(cat_url: str, pages: int = 10) -> list[dict]:
    articles = []
    for page in range(1, pages + 1):
        url = f'{BASE_URL}{cat_url}' if page == 1 else f'{BASE_URL}{cat_url}/trang-{page}'
        try:
            r = requests.get(url, headers=HEADERS, timeout=10)
            if r.status_code != 200:
                break
            soup = BeautifulSoup(r.text, 'html.parser')
            found = False
            for a in soup.select('h2 a[href], h3 a[href]'):
                href = a.get('href', '')
                title = a.get_text(strip=True)
                if not href or not title:
                    continue
                if not href.startswith('http'):
                    href = BASE_URL + href
                # Bỏ qua link danh mục
                if href.rstrip('/') in [BASE_URL + c for c in CATEGORIES]:
                    continue
                articles.append({'title': title, 'article_url': href})
                found = True
            if not found:
                break
            time.sleep(0.3)
        except Exception as e:
            log.warning(f'  Lỗi lấy danh sách {url}: {e}')
            break
    return articles


def enrich_article(article: dict) -> dict | None:
    url = article['article_url']
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code != 200:
            return None
        soup = BeautifulSoup(r.text, 'html.parser')

        # Title
        title_tag = soup.select_one('h1')
        title = title_tag.get_text(strip=True) if title_tag else article['title']

        # Date
        pub_dt = None
        date_tag = soup.select_one('time[datetime], .date, .time, .post-date, .article-date')
        if date_tag:
            raw = date_tag.get('datetime') or date_tag.get_text(strip=True)
            pub_dt = parse_date(raw)
        if not pub_dt:
            m = re.search(r'(\d{2}/\d{2}/\d{4}\s*[-–]\s*\d{2}:\d{2})', r.text)
            if m:
                pub_dt = parse_date(m.group(1))

        # Filter theo ngày
        if pub_dt and pub_dt.date() < START_DATE:
            return None

        # Content
        content_div = soup.select_one('.b-maincontent, .entry, .article-content, .detail-content, .post-content, .entry-content, .c-news-detail-scroll__right')
        if not content_div:
            return None
        # Xóa script/style/breadcrumb/author/date header
        for tag in content_div.select('script, style, .advertisement, .ads, h1, .c-breadcrumb, .b-author, .b-date, .c-related-posts, .c-box'):
            tag.decompose()
        content = content_div.get_text(separator=' ', strip=True)
        content = re.sub(r'\s+', ' ', content).strip()
        # Bỏ title ở đầu nếu còn sót
        if title and content.startswith(title):
            content = content[len(title):].strip()
        # Bỏ pattern: "Danh mục Tác giả • DD/MM/YYYY - HH:MM" ở đầu
        content = re.sub(
            r'^[\w\s\-]+ [A-ZÀ-Ỹa-zà-ỹ\s]+ •\s*\d{2}/\d{2}/\d{4}\s*[-–]?\s*\d{2}:\d{2}\s*',
            '', content
        ).strip()

        # Symbol
        symbol = extract_symbol(title) or extract_symbol(content[:500])

        return {
            'title':        title,
            'article_url':  url,
            'content':      content[:5000],
            'published_at': pub_dt.isoformat() if pub_dt else None,
            'symbol':       symbol,
            'source':       'nguoiquansat',
            'author':       None,
        }
    except Exception as e:
        log.warning(f'  Lỗi enrich {url}: {e}')
        return None


def scrape_article_list() -> list[dict]:
    seen = set()
    articles = []
    for cat in CATEGORIES:
        for a in get_article_list(cat):
            if a['article_url'] not in seen:
                seen.add(a['article_url'])
                articles.append(a)
    log.info(f'  nguoiquansat: {len(articles)} bài tìm thấy')
    return articles


def enrich_content(articles: list[dict]) -> list[dict]:
    results = []
    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = {executor.submit(enrich_article, a): a for a in articles}
        for future in as_completed(futures):
            result = future.result()
            if result:
                results.append(result)
    log.info(f'  nguoiquansat: {len(results)} bài sau enrich')
    return results


def upsert_to_supabase(articles: list[dict]):
    if not articles:
        return
    sb = get_client()
    sb.table('market_news').upsert(
        articles,
        on_conflict='article_url'
    ).execute()
    log.info(f'  nguoiquansat: upsert {len(articles)} bài')


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
    articles = scrape_article_list()
    articles = enrich_content(articles)
    print(f'Tổng: {len(articles)} bài')
    for a in articles[:3]:
        print(f"  {a['title'][:60]} | {a['symbol']} | {a['published_at']}")
    upsert_to_supabase(articles)
