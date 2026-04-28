"""
Scraper cho nguoiquansat.vn — hybrid approach:
- Trang đầu: parse HTML (đã render sẵn, không cần JS)
- Trang 2+: dùng internal API /api/getMoreArticle (không bị Cloudflare chặn)
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
START_DATE = date.today() - timedelta(days=1)
WORKERS    = 6

CHANNELS = [
    (388, 'chung-khoan/chuyen-dong-thi-truong'),
    (391, 'chung-khoan/doanh-nghiep-az'),
    (392, 'chung-khoan/cau-chuyen-dau-tu'),
    (6,   'chung-khoan'),
]

HEADERS_HTML = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': BASE_URL,
}
HEADERS_API = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': BASE_URL,
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'X-Requested-With': 'XMLHttpRequest',
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


def parse_ms_timestamp(ts: str) -> datetime | None:
    try:
        ms = int(re.search(r'\d+', ts).group())
        # API trả UTC, cộng 7h để ra giờ VN
        from datetime import timezone, timedelta as td
        return datetime.utcfromtimestamp(ms / 1000) + td(hours=7)
    except Exception:
        return None


def fetch_channel(channel_id: int, channel_slug: str, max_pages: int = 4) -> list[dict]:
    """Dùng API hoàn toàn — pid=0 lấy bài mới nhất, sau đó paginate bằng pid nhỏ nhất."""
    articles = []
    seen_urls = set()
    last_pid = 0  # pid=0 = lấy bài mới nhất

    for _ in range(max_pages):
        api_url = f'{BASE_URL}/api/getMoreArticle/channel_empty_{last_pid}_{channel_id}_0'
        try:
            r = requests.get(api_url, headers=HEADERS_API, timeout=10)
            if r.status_code != 200:
                log.warning(f'  nguoiquansat API HTTP {r.status_code} channel {channel_id}')
                break
            data = r.json()
            if not data:
                break

            stop = False
            new_pids = []
            for item in data:
                pid = str(item.get('PublisherId', ''))
                pub_dt = parse_ms_timestamp(item.get('PublishedTime', ''))
                if pub_dt and pub_dt.date() < START_DATE:
                    stop = True
                    break
                link = item.get('LinktoMe') or item.get('LinktoMe2') or ''
                if not link or link in seen_urls:
                    if pid:
                        new_pids.append(int(pid))
                    continue
                seen_urls.add(link)
                if pid:
                    new_pids.append(int(pid))
                articles.append({
                    'title':        item.get('Title', '').strip(),
                    'article_url':  link,
                    'published_at': pub_dt.isoformat() if pub_dt else None,
                    '_pid':         pid,
                    '_headline':    item.get('Headlines', '') or item.get('HeadlinesCutOff2', ''),
                })

            if new_pids:
                last_pid = str(min(new_pids))
            if stop or not new_pids:
                break
            time.sleep(0.3)

        except Exception as e:
            log.warning(f'  nguoiquansat API error channel {channel_id}: {e}')
            break

    return articles


def enrich_article(article: dict) -> dict | None:
    url = article['article_url']
    try:
        r = requests.get(url, headers=HEADERS_HTML, timeout=15)
        if r.status_code != 200:
            content = article.get('_headline', '')
            if not content:
                return None
            return {
                'title':        article['title'],
                'article_url':  url,
                'content':      content,
                'published_at': article.get('published_at'),
                'symbol':       extract_symbol(article['title']) or extract_symbol(content[:500]),
                'source':       'nguoiquansat',
                'author':       None,
            }

        soup = BeautifulSoup(r.text, 'html.parser')

        title_tag = soup.select_one('h1')
        title = title_tag.get_text(strip=True) if title_tag else article['title']

        # Date — ưu tiên từ API, fallback từ HTML
        pub_dt_str = article.get('published_at')
        if not pub_dt_str:
            date_tag = soup.select_one('time[datetime], .date, .time, .post-date, .article-date')
            if date_tag:
                raw = date_tag.get('datetime') or date_tag.get_text(strip=True)
                m = re.search(r'(\d{2}/\d{2}/\d{4})\s*[-–]?\s*(\d{2}:\d{2})', raw)
                if m:
                    try:
                        pub_dt_str = datetime.strptime(f"{m.group(1)} {m.group(2)}", '%d/%m/%Y %H:%M').isoformat()
                    except Exception:
                        pass
            if not pub_dt_str:
                m2 = re.search(r'(\d{2}/\d{2}/\d{4})\s*[-–]?\s*(\d{2}:\d{2})', r.text)
                if m2:
                    try:
                        pub_dt_str = datetime.strptime(f"{m2.group(1)} {m2.group(2)}", '%d/%m/%Y %H:%M').isoformat()
                    except Exception:
                        pass

        # Filter ngày
        if pub_dt_str:
            try:
                if datetime.fromisoformat(pub_dt_str).date() < START_DATE:
                    return None
            except Exception:
                pass

        content_div = soup.select_one('.b-maincontent, .entry, .article-content, .detail-content, .post-content, .entry-content')
        if content_div:
            for tag in content_div.select('script, style, .advertisement, .ads, h1, .c-breadcrumb, .b-author, .b-date, .c-related-posts, .c-box'):
                tag.decompose()
            content = content_div.get_text(separator=' ', strip=True)
            content = re.sub(r'\s+', ' ', content).strip()
            if title and content.startswith(title):
                content = content[len(title):].strip()
            content = re.sub(
                r'^[\w\s\-]+ [A-ZÀ-Ỹa-zà-ỹ\s]+ •\s*\d{2}/\d{2}/\d{4}\s*[-–]?\s*\d{2}:\d{2}\s*',
                '', content
            ).strip()
        else:
            content = article.get('_headline', '')

        if not content:
            return None

        return {
            'title':        title,
            'article_url':  url,
            'content':      content[:5000],
            'published_at': pub_dt_str,
            'symbol':       extract_symbol(title) or extract_symbol(content[:500]),
            'source':       'nguoiquansat',
            'author':       None,
        }
    except Exception as e:
        log.warning(f'  Lỗi enrich {url}: {e}')
        return None


def scrape_article_list() -> list[dict]:
    seen = set()
    articles = []
    for channel_id, slug in CHANNELS:
        for a in fetch_channel(channel_id, slug):
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
    sb.table('market_news').upsert(articles, on_conflict='article_url').execute()
    log.info(f'  nguoiquansat: upsert {len(articles)} bài')


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
    articles = scrape_article_list()
    enriched = enrich_content(articles)
    print(f'Tổng: {len(enriched)} bài')
    for a in enriched[:5]:
        print(f"  {a['title'][:60]} | {a['symbol']} | {a['published_at']}")
    upsert_to_supabase(enriched)
