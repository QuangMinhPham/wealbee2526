"""
AI Labeler — Lắng nghe Supabase, gán nhãn bài pending bằng GPT-4o-mini.

Thay thế VPS GPU (Ollama + Qwen) bằng OpenAI API để chạy local.

Chạy:
  python ai_labeler.py            <- chạy liên tục (poll + realtime)
  python ai_labeler.py --once     <- xử lý hết pending rồi thoát
  python ai_labeler.py --dry-run  <- in ra nhãn nhưng không UPDATE Supabase
"""

import sys
import os
import time
import logging
import argparse
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / '.env')

sys.path.insert(0, str(Path(__file__).parent))
from supabase_writer import get_client

from openai import OpenAI

# ── Config ─────────────────────────────────────────────────────────────────────
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
POLL_INTERVAL  = 30        # poll mỗi 30s nếu không dùng Realtime
BATCH_SIZE     = 50        # số bài xử lý mỗi lần poll
WORKERS        = 5         # số luồng song song gọi API
MODEL          = 'gpt-4o-mini'

SYSTEM_PROMPT = """Bạn là chuyên gia phân tích tin tức tài chính Việt Nam.
Phân loại bài báo theo đúng một trong 4 nhãn:

- positive: tin tốt, tích cực (tăng trưởng, lợi nhuận cao, cơ hội đầu tư)
- negative: tin xấu, tiêu cực (suy giảm, thua lỗ, rủi ro, cảnh báo, vi phạm)
- neutral: thông tin trung tính có giá trị phân tích (kế hoạch, số liệu, nhận định)
- trash: không có giá trị (thông báo hành chính thuần túy, quảng cáo, quá sơ sài)

Chỉ trả lời đúng một từ: positive / negative / neutral / trash"""

VALID_LABELS = {'positive', 'negative', 'neutral', 'trash'}

# ── Logging ────────────────────────────────────────────────────────────────────
LOG_DIR = Path(__file__).parent / 'logs'
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_DIR / 'ai_labeler.log', encoding='utf-8'),
    ],
)
log = logging.getLogger('ai_labeler')


# ── OpenAI ─────────────────────────────────────────────────────────────────────

def label_one(client: OpenAI, article: dict) -> tuple[str, str]:
    """Gọi GPT-4o-mini để gán nhãn 1 bài. Trả về (id, label)."""
    title   = article.get('title', '')
    content = article.get('content') or ''
    text    = f"Tiêu đề: {title}\nNội dung: {content[:1500]}"

    try:
        resp = client.chat.completions.create(
            model=MODEL,
            messages=[
                {'role': 'system', 'content': SYSTEM_PROMPT},
                {'role': 'user',   'content': text},
            ],
            max_tokens=5,
            temperature=0,
        )
        raw = resp.choices[0].message.content.strip().lower()
        label = next((l for l in VALID_LABELS if l in raw), 'neutral')
    except Exception as e:
        log.warning(f'  API lỗi cho {article["id"][:8]}: {e}')
        label = 'neutral'

    return article['id'], label


# ── Supabase ───────────────────────────────────────────────────────────────────

def fetch_pending(sb, limit: int = BATCH_SIZE) -> list[dict]:
    """Lấy các bài có status='pending' hoặc label=null."""
    result = (
        sb.table('market_news')
        .select('id,title,content')
        .is_('label', 'null')
        .limit(limit)
        .execute()
    )
    return result.data or []


def update_label(sb, rec_id: str, label: str, dry_run: bool = False):
    """UPDATE label + status vào Supabase."""
    if dry_run:
        return
    sb.table('market_news').update({
        'label':  label,
        'status': 'labeled',
    }).eq('id', rec_id).execute()


# ── Main loop ──────────────────────────────────────────────────────────────────

def process_batch(sb, client: OpenAI, articles: list[dict], dry_run: bool) -> tuple[int, int]:
    """Xử lý 1 batch bài, trả về (ok, fail)."""
    ok = fail = 0

    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = {executor.submit(label_one, client, a): a for a in articles}
        for future in as_completed(futures):
            try:
                rec_id, label = future.result()
                update_label(sb, rec_id, label, dry_run)
                ok += 1
                log.info(f'  ✓ {rec_id[:8]}... → {label}')
            except Exception as e:
                fail += 1
                log.warning(f'  ✗ Lỗi: {e}')

    return ok, fail


def run_once(sb, client: OpenAI, dry_run: bool):
    """Xử lý hết tất cả bài pending rồi dừng."""
    total_ok = total_fail = 0
    round_num = 0

    while True:
        articles = fetch_pending(sb, limit=BATCH_SIZE)
        if not articles:
            log.info('✓ Không còn bài pending.')
            break

        round_num += 1
        log.info(f'--- Round {round_num}: {len(articles)} bài ---')
        ok, fail = process_batch(sb, client, articles, dry_run)
        total_ok   += ok
        total_fail += fail
        log.info(f'  Round {round_num}: OK={ok} Fail={fail}')

    log.info(f'=== XONG: Tổng OK={total_ok} | Fail={total_fail} ===')


def run_continuous(sb, client: OpenAI, dry_run: bool):
    """Chạy liên tục, poll mỗi POLL_INTERVAL giây."""
    log.info('=' * 50)
    log.info('AI LABELER — chạy liên tục')
    log.info(f'  Model       : {MODEL}')
    log.info(f'  Poll interval: {POLL_INTERVAL}s')
    log.info(f'  Batch size  : {BATCH_SIZE}')
    log.info(f'  Workers     : {WORKERS}')
    log.info(f'  Dry run     : {dry_run}')
    log.info('  Ctrl+C để dừng')
    log.info('=' * 50)

    while True:
        try:
            articles = fetch_pending(sb, limit=BATCH_SIZE)
            if articles:
                log.info(f'[{datetime.now().strftime("%H:%M:%S")}] {len(articles)} bài pending')
                ok, fail = process_batch(sb, client, articles, dry_run)
                log.info(f'  → OK={ok} | Fail={fail}')
            else:
                log.info(f'[{datetime.now().strftime("%H:%M:%S")}] Không có bài pending, chờ {POLL_INTERVAL}s...')

            time.sleep(POLL_INTERVAL)

        except KeyboardInterrupt:
            log.info('Đã dừng.')
            break
        except Exception as e:
            log.error(f'Lỗi vòng lặp: {e}')
            time.sleep(10)


# ── Entry ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--once',    action='store_true', help='Xử lý hết pending rồi thoát')
    parser.add_argument('--dry-run', action='store_true', help='Không UPDATE Supabase, chỉ in nhãn')
    args = parser.parse_args()

    if not OPENAI_API_KEY:
        log.error('Thiếu OPENAI_API_KEY trong .env')
        sys.exit(1)

    sb     = get_client()
    client = OpenAI(api_key=OPENAI_API_KEY)

    # Kiểm tra bao nhiêu bài đang pending
    pending = fetch_pending(sb, limit=1000)
    log.info(f'Bài đang pending: {len(pending)} (hiển thị tối đa 1000)')

    if args.once or args.dry_run:
        run_once(sb, client, dry_run=args.dry_run)
    else:
        run_continuous(sb, client, dry_run=args.dry_run)


if __name__ == '__main__':
    main()
