"""
Email Notifier — Query subscribers + tin tức mới → gửi email thông minh.

Chạy:
  python email_notifier.py                 <- gửi tất cả subscribers
  python email_notifier.py --test EMAIL    <- gửi test 1 người
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

# ── Label mappings (new Vietnamese + backward compat) ─────────────────────────
LABEL_VI = {
    'Rất tích cực': 'RẤT TÍCH CỰC',
    'Tích cực':     'TÍCH CỰC',
    'Tiêu cực':     'TIÊU CỰC',
    'Rất tiêu cực': 'RẤT TIÊU CỰC',
    'positive':     'TÍCH CỰC',
    'negative':     'TIÊU CỰC',
    'neutral':      'TRUNG LẬP',
}
LABEL_COLOR = {
    'Rất tích cực': '#1B5E20',
    'Tích cực':     '#2E7D32',
    'Tiêu cực':     '#C62828',
    'Rất tiêu cực': '#880E4F',
    'positive':     '#2E7D32',
    'negative':     '#C62828',
    'neutral':      '#6B7280',
}
LABEL_BG = {
    'Rất tích cực': '#C8E6C9',
    'Tích cực':     '#E8F5E9',
    'Tiêu cực':     '#FFEBEE',
    'Rất tiêu cực': '#FCE4EC',
    'positive':     '#E8F5E9',
    'negative':     '#FFEBEE',
    'neutral':      '#F3F4F6',
}
LABEL_BORDER = {
    'Rất tích cực': '#1B5E20',
    'Tích cực':     '#2E7D32',
    'Tiêu cực':     '#C62828',
    'Rất tiêu cực': '#880E4F',
    'positive':     '#2E7D32',
    'negative':     '#C62828',
    'neutral':      '#6B7280',
}
NEWS_TYPE_VI = {
    'Vĩ mô':        'Vĩ mô',
    'Ngành':        'Ngành',
    'Doanh nghiệp': 'Doanh nghiệp',
    'Thị trường':   'Thị trường',
    'Pháp lý':      'Pháp lý',
    'Sự kiện':      'Sự kiện',
    # backward compat slugs
    'vi_mo':        'Vĩ mô',
    'vi_mo_dn':     'Vĩ mô ngành',
    'hoat_dong_kd': 'Hoạt động KD',
    'phap_ly':      'Pháp lý',
    'thi_truong':   'Thị trường',
    'du_bao':       'Dự báo',
}

_FIELDS = (
    'id,title,article_url,source,published_at,news_type,scope,'
    'score_final,label,confidence,'
    'article_summary,summary,key_numbers,'
    'impact_reasoning,chatgpt_prompt,'
    'tickers,affected_symbols,sector_impacts'
)


# ── Data fetching ──────────────────────────────────────────────────────────────

def fetch_subscribers(sb) -> list[dict]:
    result = sb.table('subscribers').select('email,holdings').execute()
    return result.data or []


def fetch_news_for_symbol(sb, symbol: str, since_date: str) -> list[dict]:
    """
    Lấy tối đa 5 bài liên quan đến symbol, sắp xếp theo |score_final| giảm dần.
    Query theo: symbol column → tickers JSONB → affected_symbols TEXT[] (fallback).
    Chỉ lấy bài is_relevant=true + có score_final + published trong 24h.
    """
    seen_ids: set[str] = set()
    results:  list[dict] = []

    def _query(extra_filter):
        q = (
            sb.table('market_news')
            .select(_FIELDS)
            .eq('is_relevant', True)
            .not_.is_('score_final', 'null')
            .gte('published_at', since_date)
        )
        return extra_filter(q).order('published_at', desc=True).limit(8).execute()

    # 1. Direct symbol column match
    r1 = _query(lambda q: q.eq('symbol', symbol))
    for row in (r1.data or []):
        seen_ids.add(row['id'])
        results.append(row)

    # 2. JSONB tickers array (Tier 1 entity extraction)
    import json as _json
    if len(results) < 5:
        r2 = _query(lambda q: q.contains('tickers', _json.dumps([symbol])))
        for row in (r2.data or []):
            if row['id'] not in seen_ids:
                seen_ids.add(row['id'])
                results.append(row)

    # 3. Fallback: old TEXT[] affected_symbols (migration period)
    if len(results) < 3:
        r3 = (
            sb.table('market_news')
            .select(_FIELDS)
            .eq('is_relevant', True)
            .gte('published_at', since_date)
            .contains('affected_symbols', [symbol])
            .order('published_at', desc=True)
            .limit(5)
            .execute()
        )
        for row in (r3.data or []):
            if row['id'] not in seen_ids:
                seen_ids.add(row['id'])
                results.append(row)

    # Sort by |score_final| desc — most impactful first
    results.sort(key=lambda x: abs(float(x.get('score_final') or 0)), reverse=True)

    # Only show articles with meaningful impact (threshold ±1.0, đồng bộ với macro path)
    meaningful = [r for r in results if abs(float(r.get('score_final') or 0)) > 1.0]
    return (meaningful or results)[:5]


def fetch_macro_news_for_sector(sb, sector_slug: str, since_date: str,
                                beta: float, sector_name: str) -> list[dict]:
    """
    Lấy tin vĩ mô/thị trường ảnh hưởng đến sector_slug trong 24h.
    Tính effective_score = sector_score × clamp(beta, 0.3, 2.5).
    Chỉ trả bài có |effective_score| > 1.0.
    """
    if not sector_slug:
        return []

    clamped_beta = max(0.3, min(2.5, float(beta or 1.0)))

    try:
        # Query: articles có sector_impacts chứa {"sector": sector_slug}
        r = (
            sb.table('market_news')
            .select(_FIELDS)
            .eq('is_relevant', True)
            .not_.is_('sector_impacts', 'null')
            .gte('published_at', since_date)
            .order('published_at', desc=True)
            .limit(10)
            .execute()
        )
        articles = r.data or []
    except Exception:
        return []

    enriched = []
    for art in articles:
        impacts = art.get('sector_impacts') or []
        if not isinstance(impacts, list):
            continue
        match = next((s for s in impacts if s.get('sector') == sector_slug), None)
        if not match:
            continue

        sector_score    = float(match.get('score', 0))
        effective_score = round(sector_score * clamped_beta, 1)
        if abs(effective_score) < 1.0:
            continue

        # Enrich article with macro-specific display fields
        art = dict(art)
        art['_macro_effective_score'] = effective_score
        art['_macro_sector_name']     = sector_name
        art['_macro_transmission']    = match.get('transmission', '')
        art['_macro_exposure_note']   = match.get('exposure_note', '')
        art['_macro_label']           = match.get('label', '')
        art['_macro_confidence']      = match.get('confidence', 'medium')
        enriched.append(art)

    enriched.sort(key=lambda x: abs(x['_macro_effective_score']), reverse=True)
    return enriched[:3]


# ── HTML helpers ───────────────────────────────────────────────────────────────

def _score_badge_html(score_final) -> str:
    if score_final is None:
        return ''
    score = float(score_final)
    sign  = '+' if score > 0 else ''
    color = LABEL_COLOR.get('Tích cực' if score > 0 else 'Tiêu cực', '#6B7280')
    bg    = LABEL_BG.get('Tích cực' if score > 0 else 'Tiêu cực', '#F3F4F6')
    return (
        f'<span style="background:{bg};color:{color};font-size:11px;font-weight:800;'
        f'padding:3px 8px;border-radius:10px;font-family:monospace;letter-spacing:0.5px;">'
        f'{sign}{score:.1f}</span>'
    )


def _confidence_badge_html(confidence: str) -> str:
    cfg = {
        'high':   ('#065F46', '#D1FAE5', '● Độ tin cậy cao'),
        'medium': ('#92400E', '#FEF3C7', '◑ Vừa'),
        'low':    ('#6B7280', '#F3F4F6', '○ Thấp'),
    }
    color, bg, label = cfg.get(confidence, ('#6B7280', '#F3F4F6', ''))
    if not label:
        return ''
    return (
        f'<span style="background:{bg};color:{color};font-size:10px;font-weight:600;'
        f'padding:2px 7px;border-radius:8px;">{label}</span>'
    )


def _key_numbers_html(key_numbers) -> str:
    if not key_numbers or not isinstance(key_numbers, list):
        return ''
    chips = ''.join(
        f'<span style="display:inline-block;background:#EFF6FF;color:#1D4ED8;'
        f'font-size:11px;font-weight:600;padding:3px 9px;border-radius:10px;'
        f'margin:2px 4px 2px 0;border:1px solid #BFDBFE;">{n}</span>'
        for n in key_numbers[:4]
    )
    return f'<div style="margin:8px 0 6px;line-height:2;">{chips}</div>'


def _news_item_html(news: dict, symbol: str) -> str:
    import urllib.parse

    is_macro    = '_macro_effective_score' in news
    label       = news.get('label') or 'neutral'

    if is_macro:
        # Use macro-computed effective score + label for display
        eff_score   = news['_macro_effective_score']
        macro_label = news.get('_macro_label', '')
        # Map macro label → color scheme
        _macro_color_map = {
            'Tích cực':      'Tích cực',
            'Tích cực nhẹ':  'Tích cực',
            'Tiêu cực nhẹ':  'Tiêu cực',
            'Tiêu cực':      'Tiêu cực',
        }
        display_label = _macro_color_map.get(macro_label, 'neutral')
        score_f    = eff_score
        confidence = news.get('_macro_confidence') or ''
    else:
        display_label = label
        score_f    = news.get('score_final')
        confidence = news.get('confidence') or ''

    color      = LABEL_COLOR.get(display_label, '#6B7280')
    bg         = LABEL_BG.get(display_label, '#F3F4F6')
    border     = LABEL_BORDER.get(display_label, '#6B7280')
    badge      = LABEL_VI.get(display_label, display_label.upper())
    ntype      = NEWS_TYPE_VI.get(news.get('news_type') or '', 'Vĩ mô' if is_macro else '')
    title      = news.get('title', '')
    url        = news.get('article_url', '#')
    source     = news.get('source', '')

    if is_macro:
        # Macro: reasoning = transmission + exposure_note
        transmit = (news.get('_macro_transmission') or '').strip()
        exp_note = (news.get('_macro_exposure_note') or '').strip()
        reasoning = f"{transmit} {exp_note}".strip()
        sector_name_vi = news.get('_macro_sector_name', '')
    else:
        reasoning = (news.get('impact_reasoning') or '').strip()
        sector_name_vi = ''

    # article_summary ưu tiên, fallback sang summary
    summary = (
        (news.get('article_summary') or news.get('summary') or '').strip()
    )

    key_nums   = news.get('key_numbers') or []

    # Thời gian đăng
    pub = news.get('published_at')
    try:
        pub_dt  = datetime.fromisoformat(str(pub).replace('Z', '+00:00'))
        pub_str = pub_dt.strftime('%d/%m %H:%M')
    except Exception:
        pub_str = ''

    # Tags row — macro articles show "Vĩ mô → Ngành: X" tag
    if is_macro and sector_name_vi:
        macro_sector_tag = (
            f'<span style="background:#FEF3C7;color:#92400E;font-size:10px;font-weight:600;'
            f'padding:2px 8px;border-radius:20px;margin-left:6px;">'
            f'Vĩ mô → {sector_name_vi}</span>'
        )
        eff_note = (
            f'<span style="color:#9CA3AF;font-size:10px;margin-left:6px;">'
            f'beta-adjusted</span>'
        )
    else:
        macro_sector_tag = ''
        eff_note = ''

    type_html = (
        f'<span style="background:#F0F0F8;color:#5A5A7A;font-size:10px;font-weight:600;'
        f'padding:2px 8px;border-radius:20px;margin-left:6px;">{ntype}</span>'
        if ntype and not is_macro else ''
    )
    pub_html = (
        f'<span style="color:#9CA3AF;font-size:11px;margin-left:8px;">{pub_str}</span>'
        if pub_str else ''
    )
    conf_html = _confidence_badge_html(confidence)

    # Score badge
    score_html = _score_badge_html(score_f)

    # Key numbers
    key_html = _key_numbers_html(key_nums)

    # ChatGPT button — ưu tiên chatgpt_prompt từ DB, fallback build inline
    cgpt_prompt = (news.get('chatgpt_prompt') or '').strip()
    if not cgpt_prompt:
        cgpt_prompt = (
            f'{summary or title} {url}\n'
            f'Bạn là chuyên gia tài chính Việt Nam. '
            f'Hãy phân tích tác động đến {symbol}: '
            f'(1) xu hướng giá 1-5 phiên tới, (2) điểm vào/ra hợp lý, (3) rủi ro cần theo dõi.'
        )
    chatgpt_url = 'https://chatgpt.com/?q=' + urllib.parse.quote(cgpt_prompt[:1200])

    chatgpt_btn = (
        f'<a href="{chatgpt_url}" style="display:inline-flex;align-items:center;gap:6px;'
        f'background:#000000;color:#ffffff;font-size:11px;font-weight:600;'
        f'padding:7px 14px;border-radius:20px;text-decoration:none;margin-top:10px;">'
        f'<img src="https://cdn.oaistatic.com/assets/favicon-o20kmmos.svg" width="13" height="13" '
        f'style="vertical-align:middle;" alt=""/> Research sâu hơn với ChatGPT'
        f'</a>'
    )

    # AI Reasoning block
    if reasoning:
        bottom_block = f"""
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ECF2FF;border-radius:8px;">
                    <tr>
                      <td style="padding:12px 14px;">
                        <p style="margin:0 0 5px;color:#0849AC;font-size:11px;font-weight:700;letter-spacing:0.5px;">AI REASONING</p>
                        <p style="margin:0;color:#374151;font-size:12px;line-height:1.7;">{reasoning}</p>
                        {chatgpt_btn}
                      </td>
                    </tr>
                  </table>"""
    else:
        bottom_block = f"""
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FB;border-radius:8px;border:1px solid #ECECF0;">
                    <tr>
                      <td style="padding:12px 14px;text-align:center;">
                        {chatgpt_btn}
                      </td>
                    </tr>
                  </table>"""

    # Summary block
    summary_html = (
        f'<p style="margin:0 0 4px;color:#374151;font-size:13px;line-height:1.6;font-weight:500;">'
        f'{summary}</p>'
        if summary else ''
    )

    return f"""
        <tr>
          <td style="background:#ffffff;padding:6px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#F8F9FB;border-radius:10px;border-left:4px solid {border};padding:16px;">
                  <!-- Tags -->
                  <div style="margin-bottom:10px;line-height:2;">
                    <span style="background:{bg};color:{color};font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;">{badge}</span>
                    {score_html}
                    {macro_sector_tag}
                    {eff_note}
                    {type_html}
                    {pub_html}
                    <span style="margin-left:6px;">{conf_html}</span>
                    <span style="color:#9CA3AF;font-size:11px;margin-left:8px;">{source}</span>
                  </div>
                  <!-- Title -->
                  <a href="{url}" style="color:#030213;font-size:14px;font-weight:700;text-decoration:none;line-height:1.5;display:block;margin-bottom:8px;">{title}</a>
                  <!-- Summary -->
                  {summary_html}
                  <!-- Key numbers -->
                  {key_html}
                  <!-- AI Reasoning + ChatGPT -->
                  {bottom_block}
                </td>
              </tr>
            </table>
          </td>
        </tr>"""


def build_email_html(email: str, holdings: list[dict], news_by_symbol: dict) -> str:
    from zoneinfo import ZoneInfo
    vn_now      = datetime.now(ZoneInfo('Asia/Ho_Chi_Minh'))
    today_str   = vn_now.strftime('%d/%m/%Y')
    now_str     = vn_now.strftime('%H:%M')
    weekday_vi  = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']
    weekday_str = weekday_vi[vn_now.weekday()]

    holding_blocks = ''
    for holding in holdings:
        symbol    = holding.get('symbol', '')
        quantity  = holding.get('quantity', 0)
        news_list = news_by_symbol.get(symbol, [])
        if not news_list:
            continue

        news_rows = ''.join(_news_item_html(n, symbol) for n in news_list)

        # Count positive vs negative
        pos = sum(1 for n in news_list if float(n.get('score_final') or 0) > 0)
        neg = sum(1 for n in news_list if float(n.get('score_final') or 0) < 0)
        sentiment_html = ''
        if pos and neg:
            sentiment_html = f'<span style="color:#6B7280;font-size:12px;margin-left:10px;">▲{pos} tích cực · ▼{neg} tiêu cực</span>'
        elif pos:
            sentiment_html = f'<span style="color:#2E7D32;font-size:12px;margin-left:10px;">▲{pos} tích cực</span>'
        elif neg:
            sentiment_html = f'<span style="color:#C62828;font-size:12px;margin-left:10px;">▼{neg} tiêu cực</span>'

        holding_blocks += f"""
        <tr>
          <td style="background:#ffffff;padding:20px 32px 8px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="color:#030213;font-size:18px;font-weight:700;">{symbol}</span>
                  <span style="color:#717182;font-size:13px;margin-left:8px;">{quantity:,} cổ phiếu</span>
                  {sentiment_html}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        {news_rows}
        <tr>
          <td style="background:#ffffff;padding:4px 32px 16px;">
            <div style="border-top:1px solid #ECECF0;margin-top:10px;"></div>
          </td>
        </tr>"""

    if not holding_blocks:
        return ''

    return f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Wealbee - Bản tin buổi sáng</title>
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
                  <span style="color:rgba(255,255,255,0.7);font-size:13px;">{weekday_str}, {today_str}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- HERO BAND -->
        <tr>
          <td style="background:#ECF2FF;padding:14px 32px;">
            <p style="margin:0;color:#0849AC;font-size:15px;font-weight:600;">
              Bản tin buổi sáng &nbsp;·&nbsp; {now_str} &nbsp;·&nbsp; Quét tin 24h qua
            </p>
          </td>
        </tr>

        <!-- GREETING -->
        <tr>
          <td style="background:#ffffff;padding:20px 32px 12px;">
            <p style="margin:0;color:#374151;font-size:14px;line-height:1.7;">
              Chào buổi sáng! Dưới đây là những tin tức có tác động đến danh mục của bạn,
              được phân tích bởi AI theo framework <strong>Fund Manager</strong>.
              Bài được sắp xếp theo mức độ tác động giảm dần.
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
          <td style="background:#0849AC;border-radius:0 0 12px 12px;padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0 0 4px;color:#ffffff;font-size:13px;font-weight:600;">Wealbee</p>
                  <p style="margin:0;color:rgba(255,255,255,0.6);font-size:12px;">
                    Phân tích bởi AI · Không phải khuyến nghị đầu tư · Không trả lời email này
                  </p>
                </td>
                <td align="right" style="vertical-align:middle;">
                  <a href="https://wealbee.app/unsubscribe?email={email}"
                     style="color:rgba(255,255,255,0.6);font-size:12px;text-decoration:none;">
                    Huỷ đăng ký
                  </a>
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


# ── Send ───────────────────────────────────────────────────────────────────────

def send_email(to: str, subject: str, html: str) -> bool:
    resend.api_key = RESEND_API_KEY
    try:
        result = resend.Emails.send({'from': EMAIL_FROM, 'to': [to], 'subject': subject, 'html': html})
        log.info(f'  Gui -> {to} | id={result.get("id", "?")}')
        return True
    except Exception as e:
        log.error(f'  Loi gui {to}: {e}')
        return False


# ── Main ───────────────────────────────────────────────────────────────────────

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

    all_symbols: set[str] = set()
    for sub in subscribers:
        for h in (sub.get('holdings') or []):
            if h.get('symbol'):
                all_symbols.add(h['symbol'])

    # Load sector_slug + beta cho tất cả symbols (dùng cho macro lookup)
    log.info(f'[2] Load sector/beta info cho {len(all_symbols)} symbols...')
    stock_info: dict[str, dict] = {}
    for symbol in all_symbols:
        try:
            r = sb.table('stocks').select('symbol,sector_slug,sector_name,beta').eq('symbol', symbol).limit(1).execute()
            if r.data:
                row = r.data[0]
                stock_info[symbol] = {
                    'sector_slug': row.get('sector_slug') or '',
                    'sector_name': row.get('sector_name') or '',
                    'beta':        float(row.get('beta') or 1.0),
                }
            else:
                stock_info[symbol] = {'sector_slug': '', 'sector_name': '', 'beta': 1.0}
        except Exception:
            stock_info[symbol] = {'sector_slug': '', 'sector_name': '', 'beta': 1.0}

    log.info(f'[3] Fetch tin tuc cho {len(all_symbols)} symbols (24h qua)...')
    news_by_symbol: dict[str, list] = {}
    for symbol in all_symbols:
        articles = fetch_news_for_symbol(sb, symbol, since)

        # Merge macro/sector news dựa trên sector_slug của stock
        info        = stock_info.get(symbol, {})
        sector_slug = info.get('sector_slug', '')
        sector_name = info.get('sector_name', '')
        beta        = info.get('beta', 1.0)
        if sector_slug:
            macro_arts   = fetch_macro_news_for_sector(sb, sector_slug, since, beta, sector_name)
            existing_ids = {a['id'] for a in articles}
            articles     = articles + [a for a in macro_arts if a['id'] not in existing_ids]

        # Sort combined: |effective_score| hoặc |score_final| desc
        articles.sort(key=lambda a: abs(float(
            a['_macro_effective_score'] if '_macro_effective_score' in a
            else (a.get('score_final') or 0)
        )), reverse=True)
        articles = articles[:5]

        news_by_symbol[symbol] = articles
        if articles:
            scores = []
            for a in articles:
                s = a['_macro_effective_score'] if '_macro_effective_score' in a else a.get('score_final', 0)
                scores.append(f"{float(s):+.1f}{'M' if '_macro_effective_score' in a else ''}")
            log.info(f'  {symbol}: {len(articles)} bai | scores: {", ".join(scores)}')

    log.info('[4] Gui email...')
    ok = fail = skip = 0
    today_str = date.today().strftime('%d/%m/%Y')

    for sub in subscribers:
        email    = sub.get('email', '')
        holdings = sub.get('holdings') or []
        has_news = any(news_by_symbol.get(h.get('symbol')) for h in holdings if h.get('symbol'))
        if not has_news:
            skip += 1
            log.info(f'  Skip {email} (khong co tin lien quan)')
            continue

        html = build_email_html(email, holdings, news_by_symbol)
        if not html:
            skip += 1
            continue

        success = send_email(
            to=email,
            subject=f'Wealbee · Ban tin buoi sang {today_str}',
            html=html,
        )
        if success:
            ok += 1
        else:
            fail += 1

        import time as _time
        _time.sleep(0.6)

    log.info(f'=== XONG: GUI OK={ok} | FAIL={fail} | SKIP={skip} ===')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--test', metavar='EMAIL', help='Gui test den 1 email cu the')
    args = parser.parse_args()
    run(test_email=args.test)
