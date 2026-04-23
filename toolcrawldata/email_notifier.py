"""
Email Notifier — Query subscribers + tin tức mới label xong → gửi email.

Chạy:
  python email_notifier.py           <- gửi email cho tất cả subscribers
  python email_notifier.py --test EMAIL  <- gửi test 1 người
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

# ── Màu sắc theo label ────────────────────────────────────────────────────────
LABEL_VI     = {'positive': 'TICH CUC', 'negative': 'TIEU CUC', 'neutral': 'TRUNG LAP'}
LABEL_COLOR  = {'positive': '#2E7D32',  'negative': '#D4183D',  'neutral': '#F59E0B'}
LABEL_BG     = {'positive': '#E8F5E9',  'negative': '#FDE8EC',  'neutral': '#FEF3C7'}
LABEL_BORDER = {'positive': '#2E7D32',  'negative': '#D4183D',  'neutral': '#F59E0B'}


def fetch_subscribers(sb) -> list[dict]:
    result = sb.table('subscribers').select('email,holdings').execute()
    return result.data or []


def fetch_news_for_symbol(sb, symbol: str, since_date: str) -> list[dict]:
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


def _news_item_html(news: dict, symbol: str, quantity: int) -> str:
    label   = news.get('label', 'neutral')
    color   = LABEL_COLOR.get(label, '#F59E0B')
    bg      = LABEL_BG.get(label, '#FEF3C7')
    border  = LABEL_BORDER.get(label, '#F59E0B')
    badge   = LABEL_VI.get(label, 'TRUNG LAP')
    title   = news.get('title', '')
    url     = news.get('article_url', '#')
    source  = news.get('source', '')
    content = (news.get('content') or '')[:180].strip()
    if content:
        content += '...'
    ai_prompt = (
        f'Phan tich tac dong cua tin "{title[:60]}..." '
        f'den co phieu {symbol}. Toi dang nam giu {quantity:,} co phieu {symbol}.'
    )

    return f"""
        <tr>
          <td style="background:#ffffff;padding:8px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#F8F9FB;border-radius:10px;border-left:4px solid {border};padding:16px;">
                  <table cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
                    <tr>
                      <td style="background:{bg};color:{color};font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;">{badge}</td>
                      <td style="padding-left:10px;color:#717182;font-size:11px;">{source}</td>
                    </tr>
                  </table>
                  <a href="{url}" style="color:#030213;font-size:14px;font-weight:600;text-decoration:none;line-height:1.5;display:block;margin-bottom:8px;">{title}</a>
                  <p style="margin:0 0 12px;color:#717182;font-size:13px;line-height:1.55;">{content}</p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#EEF3FF;border-radius:8px;">
                    <tr>
                      <td style="padding:10px 14px;">
                        <p style="margin:0 0 6px;color:#1E6FD8;font-size:11px;font-weight:700;letter-spacing:0.5px;">PROMPT AI GOI Y</p>
                        <p style="margin:0;color:#4A5568;font-size:12px;line-height:1.5;font-style:italic;">"{ai_prompt}"</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>"""


def build_email_html(email: str, holdings: list[dict], news_by_symbol: dict) -> str:
    today_str  = date.today().strftime('%d/%m/%Y')
    now_str    = datetime.now().strftime('%H:%M')
    weekday_vi = ['Thu Hai','Thu Ba','Thu Tu','Thu Nam','Thu Sau','Thu Bay','Chu Nhat']
    weekday    = weekday_vi[date.today().weekday()]

    holding_blocks = ''
    for holding in holdings:
        symbol    = holding.get('symbol', '')
        quantity  = holding.get('quantity', 0)
        news_list = news_by_symbol.get(symbol, [])
        if not news_list:
            continue

        news_rows = ''.join(_news_item_html(n, symbol, quantity) for n in news_list)
        holding_blocks += f"""
        <tr>
          <td style="background:#ffffff;padding:20px 32px 8px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="color:#030213;font-size:18px;font-weight:700;">{symbol}</span>
                  <span style="color:#717182;font-size:14px;margin-left:8px;">{quantity:,} co phieu</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        {news_rows}
        <tr>
          <td style="background:#ffffff;padding:0 32px 16px;">
            <div style="border-top:1px solid #ECECF0;"></div>
          </td>
        </tr>"""

    if not holding_blocks:
        return ''

    return f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Wealbee - Ban tin buoi sang</title>
</head>
<body style="margin:0;padding:0;background:#F4F5F7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7;padding:32px 0;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- HEADER -->
        <tr>
          <td style="background:#030213;border-radius:12px 12px 0 0;padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align:middle;padding-right:10px;">
                        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="18" cy="18" r="17" stroke="#1E6FD8" stroke-width="2"/>
                          <circle cx="18" cy="12" r="3.5" stroke="#1E6FD8" stroke-width="1.5"/>
                          <circle cx="12" cy="22" r="3.5" stroke="#1E6FD8" stroke-width="1.5"/>
                          <circle cx="24" cy="22" r="3.5" stroke="#1E6FD8" stroke-width="1.5"/>
                          <line x1="18" y1="15.5" x2="12.5" y2="18.5" stroke="#1E6FD8" stroke-width="1.2"/>
                          <line x1="18" y1="15.5" x2="23.5" y2="18.5" stroke="#1E6FD8" stroke-width="1.2"/>
                          <line x1="13.5" y1="22" x2="20.5" y2="22" stroke="#1E6FD8" stroke-width="1.2"/>
                        </svg>
                      </td>
                      <td style="vertical-align:middle;">
                        <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Wealbee</span>
                      </td>
                    </tr>
                  </table>
                </td>
                <td align="right" style="vertical-align:middle;">
                  <span style="color:#717182;font-size:13px;">{weekday}, {today_str}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- HERO BAND -->
        <tr>
          <td style="background:#1E6FD8;padding:16px 32px;">
            <p style="margin:0;color:#ffffff;font-size:15px;font-weight:500;">
              Ban tin buoi sang &nbsp;·&nbsp; {now_str} SA
            </p>
          </td>
        </tr>

        <!-- GREETING -->
        <tr>
          <td style="background:#ffffff;padding:24px 32px 12px;">
            <p style="margin:0;color:#030213;font-size:15px;line-height:1.6;">
              Chao buoi sang! Duoi day la nhung tin tuc quan trong anh huong den danh muc cua ban hom nay.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:0 32px;">
            <div style="border-top:1px solid #ECECF0;"></div>
          </td>
        </tr>

        {holding_blocks}

        <!-- FOOTER -->
        <tr>
          <td style="background:#030213;border-radius:0 0 12px 12px;padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0 0 4px;color:#ffffff;font-size:13px;font-weight:600;">Wealbee</p>
                  <p style="margin:0;color:#717182;font-size:12px;">Ban tin tu dong · Khong tra loi email nay</p>
                </td>
                <td align="right" style="vertical-align:middle;">
                  <a href="https://wealbee.app/unsubscribe?email={email}" style="color:#717182;font-size:12px;text-decoration:none;">Huy dang ky</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>"""


def send_email(to: str, subject: str, html: str) -> bool:
    resend.api_key = RESEND_API_KEY
    try:
        result = resend.Emails.send({'from': EMAIL_FROM, 'to': [to], 'subject': subject, 'html': html})
        log.info(f'  Gui -> {to} | id={result.get("id","?")}')
        return True
    except Exception as e:
        log.error(f'  Loi gui {to}: {e}')
        return False


def run(test_email: str = None):
    if not RESEND_API_KEY:
        log.error('Thieu RESEND_API_KEY trong .env')
        return

    sb    = get_client()
    since = (datetime.now() - timedelta(hours=24)).isoformat()

    log.info('[1] Load subscribers...')
    subscribers = fetch_subscribers(sb)
    if test_email:
        subscribers = [s for s in subscribers if s['email'] == test_email]
        if not subscribers:
            subscribers = [{'email': test_email, 'holdings': [{'symbol': 'FPT', 'quantity': 100}]}]
    log.info(f'  -> {len(subscribers):,} subscribers')

    all_symbols = set()
    for sub in subscribers:
        for h in (sub.get('holdings') or []):
            if h.get('symbol'):
                all_symbols.add(h['symbol'])

    log.info(f'[2] Fetch tin tuc cho {len(all_symbols)} symbols...')
    news_by_symbol = {}
    for symbol in all_symbols:
        news_by_symbol[symbol] = fetch_news_for_symbol(sb, symbol, since)
        count = len(news_by_symbol[symbol])
        if count:
            log.info(f'  {symbol}: {count} bai')

    log.info('[3] Gui email...')
    ok = fail = skip = 0
    today_str = date.today().strftime('%d/%m/%Y')

    for sub in subscribers:
        email    = sub.get('email', '')
        holdings = sub.get('holdings') or []
        has_news = any(news_by_symbol.get(h.get('symbol')) for h in holdings if h.get('symbol'))
        if not has_news:
            skip += 1
            continue
        html = build_email_html(email, holdings, news_by_symbol)
        if not html:
            skip += 1
            continue
        success = send_email(to=email, subject=f'Wealbee · Ban tin buoi sang {today_str}', html=html)
        if success:
            ok += 1
        else:
            fail += 1

    log.info(f'=== XONG: Gui OK={ok} | Fail={fail} | Skip={skip} ===')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--test', metavar='EMAIL', help='Gui test den 1 email cu the')
    args = parser.parse_args()
    run(test_email=args.test)
