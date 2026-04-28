"""
Scraper cho nguoiquansat.vn — pure API, không scrape HTML.
API /api/getMoreArticle trả về title + headline + date + url, không bị Cloudflare chặn.
"""

import re
import sys
import time
import logging
from datetime import datetime, date, timedelta
from pathlib import Path

import requests

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, str(Path(__file__).parent))
from supabase_writer import get_client

BASE_URL   = 'https://nguoiquansat.vn'
START_DATE = date.today() - timedelta(days=1)

CHANNELS = [
    (388, 'chung-khoan/chuyen-dong-thi-truong'),
    (391, 'chung-khoan/doanh-nghiep-az'),
    (392, 'chung-khoan/cau-chuyen-dau-tu'),
    (6,   'chung-khoan'),
]

HEADERS = {
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
        # API trả UTC, cộng 7h ra giờ VN
        return datetime.utcfromtimestamp(ms / 1000) + timedelta(hours=7)
    except Exception:
        return None


def fetch_channel(channel_id: int, max_pages: int = 4) -> list[dict]:
    """Dùng API hoàn toàn — pid=0 lấy bài mới nhất, paginate bằng min(pid)."""
    articles = []
    seen_urls = set()
    last_pid = 0

    for _ in range(max_pages):
        api_url = f'{BASE_URL}/api/getMoreArticle/channel_empty_{last_pid}_{channel_id}_0'
        try:
            r = requests.get(api_url, headers=HEADERS, timeout=10)
            if r.status_code != 200:
                log.warning(f'  nguoiquansat API HTTP {r.status_code} channel {channel_id}')
                break
            data = r.json()
            if not data:
                break

            stop = False
            new_pids = []
            for item in data:
                pid = item.get('PublisherId')
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

                title = (item.get('Title') or '').strip()
                content = (item.get('Headlines') or item.get('HeadlinesCutOff2') or '').strip()
                symbol = extract_symbol(title) or extract_symbol(content)

                articles.append({
                    'title':        title,
                    'article_url':  link,
                    'content':      content,
                    'published_at': pub_dt.isoformat() if pub_dt else None,
                    'symbol':       symbol,
                    'source':       'nguoiquansat',
                    'author':       None,
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


def scrape_article_list() -> list[dict]:
    seen = set()
    articles = []
    for channel_id, _ in CHANNELS:
        for a in fetch_channel(channel_id):
            if a['article_url'] not in seen:
                seen.add(a['article_url'])
                articles.append(a)
    log.info(f'  nguoiquansat: {len(articles)} bài tìm thấy')
    return articles


def enrich_content(articles: list[dict]) -> list[dict]:
    # API đã có đủ title + content (headline) + date + symbol — không cần fetch HTML
    valid = [a for a in articles if a.get('content')]
    log.info(f'  nguoiquansat: {len(valid)} bài sau enrich')
    return valid


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
