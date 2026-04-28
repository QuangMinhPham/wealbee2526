"""
Weekly Digest — Bản tin tuần cho từng subscriber.

Logic:
  - Lấy tất cả bài trong 7 ngày qua đã được label (không phải trash)
  - Với mỗi symbol subscriber đang nắm, chọn top 3 bài có tác động mạnh nhất
    Score: positive/negative = 2pt, neutral = 1pt; tiebreak = published_at mới nhất
  - Build email dạng "Điểm nổi bật tuần" và gửi

Chạy:
  python weekly_digest.py --to pminh7794@gmail.com         <- gửi thử 1 email
  python weekly_digest.py                                  <- gửi cho toàn bộ subscribers
"""

import os
import sys
import logging
import argparse
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

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
        logging.FileHandler(LOG_DIR / 'weekly_digest.log', encoding='utf-8'),
    ],
)
log = logging.getLogger('weekly_digest')

LABEL_COLOR  = {'positive': '#2E7D32', 'negative': '#D4183D', 'neutral': '#F59E0B'}
LABEL_BG     = {'positive': '#E8F5E9', 'negative': '#FDE8EC', 'neutral': '#FEF3C7'}
LABEL_BORDER = {'positive': '#2E7D32', 'negative': '#D4183D', 'neutral': '#F59E0B'}
LABEL_VI     = {'positive': 'TÍCH CỰC', 'negative': 'TIÊU CỰC', 'neutral': 'TRUNG LẬP'}
LABEL_SCORE  = {'positive': 2, 'negative': 2, 'neutral': 1}

NEWS_TYPE_VI = {
    'vi_mo':        'Vĩ mô',
    'vi_mo_dn':     'Vĩ mô ngành',
    'hoat_dong_kd': 'Hoạt động KD',
    'phap_ly':      'Pháp lý',
    'thi_truong':   'Thị trường',
    'du_bao':       'Dự báo',
}

DAYS = 7


def fetch_subscribers(sb) -> list[dict]:
    result = sb.table('subscribers').select('email,holdings').execute()
    return result.data or []


def fetch_top_news_for_symbol(sb, symbol: str, since: str, top_n: int = 3) -> list[dict]:
    """Lấy top_n bài có tác động mạnh nhất cho symbol trong 7 ngày."""
    seen_ids = set()
    candidates = []

    fields = 'id,title,content,article_url,label,source,published_at,news_type,affected_symbols,impact_reasoning'

    # Direct symbol match
    r1 = (
        sb.table('market_news')
        .select(fields)
        .eq('symbol', symbol)
        .not_.is_('label', 'null')
        .neq('label', 'trash')
        .gte('published_at', since)
        .order('published_at', desc=True)
        .limit(20)
        .execute()
    )
    for row in (r1.data or []):
        seen_ids.add(row['id'])
        candidates.append(row)

    # Affected symbols match
    r2 = (
        sb.table('market_news')
        .select(fields)
        .contains('affected_symbols', [symbol])
        .not_.is_('label', 'null')
        .neq('label', 'trash')
        .gte('published_at', since)
        .order('published_at', desc=True)
        .limit(20)
        .execute()
    )
    for row in (r2.data or []):
        if row['id'] not in seen_ids:
            seen_ids.add(row['id'])
            candidates.append(row)

    # Score: positive/negative = 2, neutral = 1; tiebreak = published_at desc
    def score(row):
        s = LABEL_SCORE.get(row.get('label', 'neutral'), 1)
        return (s, row.get('published_at') or '')

    candidates.sort(key=score, reverse=True)
    return candidates[:top_n]


def _news_item_html(news: dict, symbol: str, quantity: int, rank: int) -> str:
    label   = news.get('label', 'neutral')
    color   = LABEL_COLOR.get(label, '#F59E0B')
    bg      = LABEL_BG.get(label, '#FEF3C7')
    border  = LABEL_BORDER.get(label, '#F59E0B')
    badge   = LABEL_VI.get(label, 'TRUNG LẬP')
    ntype   = news.get('news_type') or ''
    type_tag = NEWS_TYPE_VI.get(ntype, '')
    title   = news.get('title', '')
    url     = news.get('article_url', '#')
    source  = news.get('source', '')
    content = (news.get('content') or '')[:200].strip()
    if content:
        content += '...'

    pub_str = ''
    pub_raw = news.get('published_at')
    if pub_raw:
        try:
            pub_dt  = datetime.fromisoformat(pub_raw)
            pub_str = pub_dt.strftime('%d/%m/%Y')
        except Exception:
            pass

    type_html = (
        f'<td style="padding-left:6px;">'
        f'<span style="background:#F0F0F8;color:#5A5A7A;font-size:10px;font-weight:600;'
        f'padding:3px 8px;border-radius:20px;">{type_tag}</span></td>'
        if type_tag else ''
    )

    rank_html = f'<span style="color:#9CA3AF;font-size:11px;margin-right:8px;">#{rank}</span>'

    ai_prompt = (
        f'Phân tích tác động của tin "{title[:60]}..." '
        f'đến cổ phiếu {symbol}. Tôi đang nắm giữ {quantity:,} cổ phiếu {symbol}.'
    )

    return f"""
        <tr>
          <td style="background:#ffffff;padding:6px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#F8F9FB;border-radius:10px;border-left:4px solid {border};padding:16px;">
                  <table cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
                    <tr>
                      <td style="color:#9CA3AF;font-size:11px;font-weight:700;padding-right:8px;">#{rank}</td>
                      <td style="background:{bg};color:{color};font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;">{badge}</td>
                      {type_html}
                      <td style="padding-left:10px;color:#717182;font-size:11px;">{source}</td>
                      <td style="padding-left:10px;color:#AAAAAA;font-size:11px;">{pub_str}</td>
                    </tr>
                  </table>
                  <a href="{url}" style="color:#030213;font-size:14px;font-weight:600;text-decoration:none;line-height:1.5;display:block;margin-bottom:8px;">{title}</a>
                  <p style="margin:0 0 12px;color:#717182;font-size:13px;line-height:1.55;">{content}</p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ECF2FF;border-radius:8px;">
                    <tr>
                      <td style="padding:10px 14px;">
                        <p style="margin:0 0 6px;color:#0849AC;font-size:11px;font-weight:700;letter-spacing:0.5px;">PROMPT AI GỢI Ý</p>
                        <p style="margin:0;color:#4A5568;font-size:12px;line-height:1.5;font-style:italic;">"{ai_prompt}"</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>"""


def build_weekly_email(email: str, holdings: list[dict], news_by_symbol: dict,
                       week_start: str, week_end: str) -> str:
    vn_now = datetime.now(ZoneInfo('Asia/Ho_Chi_Minh'))

    holding_blocks = ''
    total_news = 0
    for holding in holdings:
        symbol   = holding.get('symbol', '')
        quantity = holding.get('quantity', 0)
        news_list = news_by_symbol.get(symbol, [])
        if not news_list:
            continue
        total_news += len(news_list)

        news_rows = ''.join(
            _news_item_html(n, symbol, quantity, i + 1)
            for i, n in enumerate(news_list)
        )

        n_positive = sum(1 for n in news_list if n.get('label') == 'positive')
        n_negative = sum(1 for n in news_list if n.get('label') == 'negative')
        trend_color = '#2E7D32' if n_positive > n_negative else ('#D4183D' if n_negative > n_positive else '#F59E0B')
        trend_text  = 'Xu hướng tích cực' if n_positive > n_negative else ('Xu hướng tiêu cực' if n_negative > n_positive else 'Trung lập')

        holding_blocks += f"""
        <tr>
          <td style="background:#ffffff;padding:20px 32px 8px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="color:#030213;font-size:20px;font-weight:700;">{symbol}</span>
                  <span style="color:#717182;font-size:14px;margin-left:8px;">{quantity:,} cổ phiếu</span>
                </td>
                <td align="right">
                  <span style="color:{trend_color};font-size:12px;font-weight:600;">{trend_text}</span>
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
  <title>Wealbee - Bản tin tuần</title>
</head>
<body style="margin:0;padding:0;background:#F4F5F7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7;padding:32px 0;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- HEADER -->
        <tr>
          <td style="background:#0849AC;border-radius:12px 12px 0 0;padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;">
                  <img src="https://xpoucdxmowaeopotclli.supabase.co/storage/v1/object/public/assets/wealbee_logo.png" alt="Wealbee" height="40" style="display:block;"/>
                </td>
                <td align="right" style="vertical-align:middle;">
                  <span style="color:rgba(255,255,255,0.7);font-size:13px;">Chủ Nhật, {week_end}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- HERO BAND -->
        <tr>
          <td style="background:#ECF2FF;padding:14px 32px;">
            <p style="margin:0;color:#0849AC;font-size:15px;font-weight:600;">
              Bản tin tuần &nbsp;·&nbsp; {week_start} – {week_end}
            </p>
          </td>
        </tr>

        <!-- GREETING -->
        <tr>
          <td style="background:#ffffff;padding:24px 32px 8px;">
            <p style="margin:0 0 12px;color:#030213;font-size:15px;line-height:1.6;">
              Chào buổi sáng! Đây là <strong>top 3 tin tức quan trọng nhất tuần qua</strong>
              có tác động mạnh đến danh mục của bạn.
            </p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#F0F7FF;border-radius:8px;padding:10px 16px;">
                  <span style="color:#0849AC;font-size:13px;">
                    Tổng <strong>{total_news}</strong> bài nổi bật từ {week_start} đến {week_end}
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:12px 32px 0;">
            <div style="border-top:1px solid #ECECF0;"></div>
          </td>
        </tr>

        {holding_blocks}

        <!-- FOOTER -->
        <tr>
          <td style="background:#0849AC;border-radius:0 0 12px 12px;padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0 0 4px;color:#ffffff;font-size:13px;font-weight:600;">Wealbee</p>
                  <p style="margin:0;color:rgba(255,255,255,0.6);font-size:12px;">Bản tin tuần · Không trả lời email này</p>
                </td>
                <td align="right" style="vertical-align:middle;">
                  <a href="https://wealbee.app/unsubscribe?email={email}" style="color:rgba(255,255,255,0.6);font-size:12px;text-decoration:none;">Huỷ đăng ký</a>
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


def run(to_email: str = None, days: int = DAYS) -> dict:
    """
    Chạy weekly digest.
    to_email: gửi thử 1 email cụ thể (nếu None → gửi cho tất cả subscribers)
    Trả về dict thống kê.
    """
    if not RESEND_API_KEY:
        log.error('Thieu RESEND_API_KEY')
        return {'error': 'Thieu RESEND_API_KEY'}

    sb = get_client()

    vn_now     = datetime.now(ZoneInfo('Asia/Ho_Chi_Minh'))
    since_dt   = vn_now - timedelta(days=days)
    since      = since_dt.isoformat()
    week_start = since_dt.strftime('%d/%m/%Y')
    week_end   = vn_now.strftime('%d/%m/%Y')

    log.info(f'Weekly digest: {week_start} -> {week_end}')

    # Subscribers
    subs = fetch_subscribers(sb)
    if to_email:
        match = [s for s in subs if s['email'] == to_email]
        if match:
            subs = match
        else:
            # Gửi thử với danh mục mặc định nếu email chưa đăng ký
            subs = [{'email': to_email, 'holdings': [
                {'symbol': 'FPT', 'quantity': 100},
                {'symbol': 'VNM', 'quantity': 200},
                {'symbol': 'HPG', 'quantity': 150},
            ]}]
            log.info(f'  Email {to_email} chua co trong DB, dung danh muc mac dinh FPT/VNM/HPG')

    log.info(f'  {len(subs)} subscribers')

    # Collect symbols
    all_symbols = {h['symbol'] for s in subs for h in (s.get('holdings') or []) if h.get('symbol')}

    # Fetch news
    log.info(f'  Fetch top news cho {len(all_symbols)} symbols...')
    news_by_symbol = {}
    for sym in all_symbols:
        news = fetch_top_news_for_symbol(sb, sym, since, top_n=3)
        news_by_symbol[sym] = news
        log.info(f'    {sym}: {len(news)} bai')

    # Send
    ok = fail = skip = 0
    import time as _time
    for sub in subs:
        email    = sub.get('email', '')
        holdings = sub.get('holdings') or []
        html = build_weekly_email(email, holdings, news_by_symbol, week_start, week_end)
        if not html:
            skip += 1
            log.info(f'  Skip {email} (khong co tin)')
            continue
        subject = f'Wealbee · Bản tin tuần {week_start} – {week_end}'
        if send_email(email, subject, html):
            ok += 1
        else:
            fail += 1
        _time.sleep(0.6)

    log.info(f'=== Xong: OK={ok} Fail={fail} Skip={skip} ===')
    return {
        'ok': ok, 'fail': fail, 'skip': skip,
        'week_start': week_start, 'week_end': week_end,
        'symbols': {sym: len(v) for sym, v in news_by_symbol.items()},
    }


def preview_html(to_email: str = 'preview@test.com', days: int = DAYS) -> str:
    """Trả về HTML email để preview trong browser (không gửi)."""
    sb = get_client()

    vn_now     = datetime.now(ZoneInfo('Asia/Ho_Chi_Minh'))
    since_dt   = vn_now - timedelta(days=days)
    since      = since_dt.isoformat()
    week_start = since_dt.strftime('%d/%m/%Y')
    week_end   = vn_now.strftime('%d/%m/%Y')

    subs = fetch_subscribers(sb)
    match = [s for s in subs if s['email'] == to_email]
    if match:
        holdings = match[0].get('holdings') or []
    else:
        holdings = [
            {'symbol': 'FPT', 'quantity': 100},
            {'symbol': 'VNM', 'quantity': 200},
            {'symbol': 'HPG', 'quantity': 150},
        ]

    all_symbols = {h['symbol'] for h in holdings if h.get('symbol')}
    news_by_symbol = {}
    for sym in all_symbols:
        news_by_symbol[sym] = fetch_top_news_for_symbol(sb, sym, since, top_n=3)

    return build_weekly_email(to_email, holdings, news_by_symbol, week_start, week_end)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Wealbee Weekly Digest')
    parser.add_argument('--to', metavar='EMAIL', help='Gui thu den 1 email cu the')
    parser.add_argument('--days', type=int, default=DAYS, help=f'So ngay nhin lai (default {DAYS})')
    args = parser.parse_args()
    run(to_email=args.to, days=args.days)
