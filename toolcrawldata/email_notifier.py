"""
Email Notifier — Query subscribers + tin tức mới label xong → gửi email.

Chạy sau ai_labeler.py trong pipeline_runner.py.
Gửi email tóm tắt tin tức theo symbol mà user đăng ký.

Chạy:
  python email_notifier.py           <- gửi email cho tất cả subscribers
  python email_notifier.py --test    <- gửi test email 1 người
"""

import sys
import os
import logging
import argparse
from datetime import datetime, date, timedelta
from pathlib import Path

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / '.env')

sys.path.insert(0, str(Path(__file__).parent))
from supabase_writer import get_client

import resend

RESEND_API_KEY = os.getenv('RESEND_API_KEY')
EMAIL_FROM     = os.getenv('EMAIL_FROM', 'Wealbee <no-reply@wealbee.app>')

LOG_DIR = Path(__file__).parent / 'logs'
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_DIR / 'email_notifier.log', encoding='utf-8'),
    ],
)
log = logging.getLogger('email_notifier')

LABEL_VI = {
    'positive': 'Tích cực',
    'negative': 'Tiêu cực',
    'neutral':  'Trung lập',
}
LABEL_COLOR = {
    'positive': '#16a34a',
    'negative': '#dc2626',
    'neutral':  '#6b7280',
}
LABEL_BG = {
    'positive': '#f0fdf4',
    'negative': '#fef2f2',
    'neutral':  '#f9fafb',
}


def fetch_subscribers(sb) -> list[dict]:
    """Lấy tất cả subscribers từ Supabase."""
    result = sb.table('subscribers').select('email,holdings').execute()
    return result.data or []


def fetch_news_for_symbol(sb, symbol: str, since_date: str) -> list[dict]:
    """Lấy tin tức của 1 symbol được label hôm nay."""
    result = (
        sb.table('market_news')
        .select('id,title,content,article_url,label,source,published_at')
        .eq('symbol', symbol)
        .not_.is_('label', 'null')
        .neq('label', 'trash')
        .gte('labeled_at', since_date)
        .order('published_at', desc=True)
        .limit(5)
        .execute()
    )
    return result.data or []


def build_email_html(email: str, holdings: list[dict], news_by_symbol: dict) -> str:
    """Tạo HTML email từ danh sách tin tức theo symbol."""
    today = date.today().strftime('%d/%m/%Y')
    now   = datetime.now().strftime('%H:%M')

    symbol_blocks = ""
    for holding in holdings:
        symbol = holding.get('symbol', '')
        news_list = news_by_symbol.get(symbol, [])
        if not news_list:
            continue

        news_items = ""
        for news in news_list:
            label     = news.get('label', 'neutral')
            label_text  = LABEL_VI.get(label, label)
            label_color = LABEL_COLOR.get(label, '#6b7280')
            label_bg    = LABEL_BG.get(label, '#f9fafb')
            title   = news.get('title', '')
            url     = news.get('article_url', '#')
            source  = news.get('source', '')
            content = (news.get('content') or '')[:200].strip()
            if content:
                content += '...'

            news_items += f"""
            <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-bottom:10px;background:#fff;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <span style="background:{label_bg};color:{label_color};font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;border:1px solid {label_color}22;">
                  {label_text}
                </span>
                <span style="color:#9ca3af;font-size:11px;">{source}</span>
              </div>
              <a href="{url}" style="color:#111827;font-size:14px;font-weight:600;text-decoration:none;line-height:1.4;">
                {title}
              </a>
              <p style="color:#6b7280;font-size:13px;margin:6px 0 0;line-height:1.5;">{content}</p>
            </div>"""

        if not news_items:
            continue

        quantity = holding.get('quantity', 0)
        symbol_blocks += f"""
        <div style="margin-bottom:24px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
            <span style="background:#0849ac;color:#fff;font-size:13px;font-weight:700;padding:4px 10px;border-radius:6px;">{symbol}</span>
            <span style="color:#6b7280;font-size:13px;">{quantity:,} cổ phiếu</span>
          </div>
          {news_items}
        </div>"""

    if not symbol_blocks:
        return ""

    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:#0849ac;border-radius:12px 12px 0 0;padding:24px;text-align:center;">
      <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0;">🐝 Wealbee</h1>
      <p style="color:#bfd4ff;font-size:13px;margin:6px 0 0;">Bản tin buổi sáng · {today} · {now}</p>
    </div>

    <!-- Body -->
    <div style="background:#f9fafb;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
      <p style="color:#374151;font-size:14px;margin:0 0 20px;">
        Chào bạn, đây là tin tức mới nhất về danh mục của bạn hôm nay:
      </p>

      {symbol_blocks}

      <div style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:8px;text-align:center;">
        <a href="https://wealbee.app" style="background:#0849ac;color:#fff;font-size:13px;font-weight:600;padding:10px 24px;border-radius:8px;text-decoration:none;display:inline-block;">
          Xem đầy đủ trên Wealbee →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:16px;">
      Bạn nhận email này vì đã đăng ký theo dõi tại wealbee.app<br>
      <a href="https://wealbee.app/unsubscribe?email={email}" style="color:#9ca3af;">Hủy đăng ký</a>
    </p>
  </div>
</body>
</html>"""


def send_email(to: str, subject: str, html: str) -> bool:
    resend.api_key = RESEND_API_KEY
    try:
        result = resend.Emails.send({"from": EMAIL_FROM, "to": [to], "subject": subject, "html": html})
        log.info(f'  ✓ Gửi → {to} | id={result.get("id", "?")}')
        return True
    except Exception as e:
        log.error(f'  ✗ Lỗi gửi {to}: {e}')
        return False


def run(test_email: str = None):
    if not RESEND_API_KEY:
        log.error('Thiếu RESEND_API_KEY trong .env')
        return

    sb = get_client()
    since = (datetime.now() - timedelta(hours=24)).isoformat()

    log.info('[1] Load subscribers...')
    subscribers = fetch_subscribers(sb)
    if test_email:
        subscribers = [s for s in subscribers if s['email'] == test_email]
        if not subscribers:
            subscribers = [{'email': test_email, 'holdings': [{'symbol': 'FPT', 'quantity': 100}]}]
    log.info(f'  -> {len(subscribers):,} subscribers')

    # Collect all symbols cần query
    all_symbols = set()
    for sub in subscribers:
        for h in (sub.get('holdings') or []):
            if h.get('symbol'):
                all_symbols.add(h['symbol'])

    log.info(f'[2] Fetch tin tức cho {len(all_symbols)} symbols...')
    news_by_symbol = {}
    for symbol in all_symbols:
        news_by_symbol[symbol] = fetch_news_for_symbol(sb, symbol, since)
        count = len(news_by_symbol[symbol])
        if count:
            log.info(f'  {symbol}: {count} bài')

    log.info('[3] Gửi email...')
    ok = fail = skip = 0
    today_str = date.today().strftime('%d/%m/%Y')

    for sub in subscribers:
        email    = sub.get('email', '')
        holdings = sub.get('holdings') or []

        # Check xem subscriber có tin gì không
        has_news = any(
            news_by_symbol.get(h.get('symbol'))
            for h in holdings if h.get('symbol')
        )
        if not has_news:
            skip += 1
            continue

        html = build_email_html(email, holdings, news_by_symbol)
        if not html:
            skip += 1
            continue

        success = send_email(
            to=email,
            subject=f'Wealbee · Bản tin buổi sáng {today_str}',
            html=html,
        )
        if success:
            ok += 1
        else:
            fail += 1

    log.info(f'=== XONG: Gửi OK={ok} | Fail={fail} | Skip={skip} ===')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--test', metavar='EMAIL', help='Gửi test đến 1 email cụ thể')
    args = parser.parse_args()
    run(test_email=args.test)
