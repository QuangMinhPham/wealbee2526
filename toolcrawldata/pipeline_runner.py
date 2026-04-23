"""
Wealbee Pipeline Runner — chạy toàn bộ luồng tự động.

Luồng:
  [1] Crawl tin tức 24h gần nhất → INSERT Supabase (upsert, không trùng)
  [2] Gán nhãn bằng GPT-4o-mini → chỉ label bài mới crawl + có symbol
  [3] Gửi email cho subscribers

Chạy thủ công:
  python pipeline_runner.py

Chạy qua GitHub Actions (7h sáng mỗi ngày):
  Xem .github/workflows/pipeline.yml
"""

import sys
import time
import logging
from datetime import datetime, date, timedelta
from pathlib import Path

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / '.env')

BASE_DIR     = Path(__file__).parent
CRAWLERS_DIR = BASE_DIR / 'crawlers'
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(CRAWLERS_DIR))

LOG_DIR = BASE_DIR / 'logs'
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_DIR / 'pipeline.log', encoding='utf-8'),
    ],
)
log = logging.getLogger('pipeline')


def step_header(step: int, title: str):
    log.info('=' * 55)
    log.info(f'  BƯỚC {step}: {title}')
    log.info('=' * 55)


# ── Bước 1: Crawl ──────────────────────────────────────────────────────────────

def run_crawl() -> list[str]:
    """
    Crawl VnExpress + Vietstock trong 24h gần nhất.
    Upsert theo article_url → không trùng lặp.
    Trả về list ID các bài mới được INSERT (chưa tồn tại trước đó).
    """
    step_header(1, 'CRAWL TIN TỨC (24h)')

    from supabase_writer import get_client
    sb = get_client()
    since = (datetime.utcnow() - timedelta(hours=24)).isoformat()

    # Lấy danh sách article_url đã có trong DB trước khi crawl
    existing = set()
    offset = 0
    while True:
        rows = sb.table('market_news').select('article_url').gte('created_at', since).range(offset, offset + 999).execute()
        for r in (rows.data or []):
            if r.get('article_url'):
                existing.add(r['article_url'])
        if len(rows.data or []) < 1000:
            break
        offset += 1000
    log.info(f'  Đã có sẵn {len(existing)} bài trong 24h qua')

    all_new_ids = []

    # VnExpress
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location('vnexpress_scraper', CRAWLERS_DIR / 'vnexpress_scraper.py')
        mod  = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)

        mod.START_DATE = date.today() - timedelta(days=1)
        mod.MAX_PAGES  = 10
        mod.WORKERS    = 5

        articles = mod.scrape_article_list()
        if articles:
            articles = mod.enrich_content(articles)
            # Lọc bài chưa có trong DB
            new_articles = [a for a in articles if a.get('article_url') not in existing]
            if new_articles:
                mod.upsert_to_supabase(new_articles)
                # Lấy ID các bài vừa upsert
                urls = [a['article_url'] for a in new_articles if a.get('article_url')]
                rows = sb.table('market_news').select('id,article_url').in_('article_url', urls[:500]).execute()
                all_new_ids += [r['id'] for r in (rows.data or [])]
            log.info(f'  VnExpress: {len(articles)} crawl, {len(new_articles)} bài mới')
        else:
            log.warning('  VnExpress: không có bài nào')
    except Exception as e:
        log.error(f'  VnExpress lỗi: {e}')

    # Vietstock
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location('vietstock_scraper', CRAWLERS_DIR / 'vietstock_scraper.py')
        mod  = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)

        mod.START_DATE = date.today() - timedelta(days=1)

        articles = mod.scrape_article_list()
        if articles:
            articles = mod.enrich_content(articles)
            new_articles = [a for a in articles if a.get('article_url') not in existing]
            if new_articles:
                mod.upsert_news_to_supabase(new_articles)
                urls = [a['article_url'] for a in new_articles if a.get('article_url')]
                rows = sb.table('market_news').select('id,article_url').in_('article_url', urls[:500]).execute()
                all_new_ids += [r['id'] for r in (rows.data or [])]
            log.info(f'  Vietstock: {len(articles)} crawl, {len(new_articles)} bài mới')
        else:
            log.warning('  Vietstock: không có bài nào')
    except Exception as e:
        log.error(f'  Vietstock lỗi: {e}')

    log.info(f'  Tổng bài mới: {len(all_new_ids)}')
    return all_new_ids


# ── Bước 2: Label ──────────────────────────────────────────────────────────────

def run_label(new_ids: list[str]) -> int:
    """
    Gán nhãn chỉ những bài mới crawl, có symbol, chưa có label.
    Trả về số bài đã label.
    """
    step_header(2, 'GÁN NHÃN GPT-4o-mini')

    if not new_ids:
        log.info('  Không có bài mới → bỏ qua label')
        return 0

    try:
        import os
        from openai import OpenAI
        from supabase_writer import get_client
        from concurrent.futures import ThreadPoolExecutor, as_completed

        client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'), max_retries=1, timeout=10.0)
        sb     = get_client()

        SYSTEM_PROMPT = """Bạn là chuyên gia phân tích tin tức tài chính Việt Nam.
Phân loại bài báo theo đúng một trong 4 nhãn:
- positive: tin tốt, tích cực
- negative: tin xấu, tiêu cực
- neutral: thông tin trung tính
- trash: không có giá trị tin tức

Chỉ trả lời đúng một từ: positive / negative / neutral / trash"""

        VALID_LABELS = {'positive', 'negative', 'neutral', 'trash'}

        def label_one(article):
            text = f"Tiêu đề: {article.get('title','')}\nNội dung: {(article.get('content') or '')[:1500]}"
            try:
                resp = client.chat.completions.create(
                    model='gpt-4o-mini',
                    messages=[
                        {'role': 'system', 'content': SYSTEM_PROMPT},
                        {'role': 'user',   'content': text},
                    ],
                    max_tokens=5,
                    temperature=0,
                )
                raw = resp.choices[0].message.content.strip().lower()
                return article['id'], next((l for l in VALID_LABELS if l in raw), 'neutral')
            except Exception as e:
                err = str(e)
                if '429' in err or 'rate_limit' in err:
                    raise  # bubble up để dừng toàn bộ label step
                log.warning(f'  API lỗi {article["id"][:8]}: {e}')
                return article['id'], 'neutral'

        total_labeled = 0
        batch_size    = 50

        # Chỉ lấy bài trong new_ids, có symbol, chưa label
        for i in range(0, len(new_ids), batch_size):
            chunk_ids = new_ids[i:i + batch_size]
            result = (
                sb.table('market_news')
                .select('id,title,content')
                .in_('id', chunk_ids)
                .is_('label', 'null')
                .not_.is_('symbol', 'null')
                .execute()
            )
            articles = result.data or []
            if not articles:
                continue

            log.info(f'  Đang label {len(articles)} bài...')
            with ThreadPoolExecutor(max_workers=5) as executor:
                futures = {executor.submit(label_one, a): a for a in articles}
                for future in as_completed(futures):
                    rec_id, label = future.result()
                    sb.table('market_news').update({
                        'label':      label,
                        'labeled_at': datetime.now().isoformat(),
                        'labeled_by': 'gpt-4o-mini',
                    }).eq('id', rec_id).execute()
                    total_labeled += 1

        log.info(f'  Đã label: {total_labeled} bài')
        return total_labeled

    except Exception as e:
        log.error(f'  Label lỗi: {e}')
        return 0


# ── Bước 3: Email ──────────────────────────────────────────────────────────────

def run_email():
    """Gửi email cho tất cả subscribers."""
    step_header(3, 'GỬI EMAIL THÔNG BÁO')
    try:
        from email_notifier import run
        run()
    except Exception as e:
        log.error(f'  Email lỗi: {e}')


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    start = time.time()

    log.info('=' * 55)
    log.info(f'  WEALBEE PIPELINE — {datetime.now().strftime("%d/%m/%Y %H:%M:%S")}')
    log.info('=' * 55)

    new_ids = run_crawl()
    time.sleep(2)

    n_label = run_label(new_ids)
    time.sleep(2)

    if n_label > 0:
        run_email()
    else:
        log.info('  Không có bài mới có nhãn → bỏ qua gửi email')

    elapsed = time.time() - start
    log.info('=' * 55)
    log.info(f'  HOÀN THÀNH — {elapsed:.0f}s')
    log.info(f'  Crawl mới: {len(new_ids)} bài | Label: {n_label} bài')
    log.info('=' * 55)


if __name__ == '__main__':
    main()
