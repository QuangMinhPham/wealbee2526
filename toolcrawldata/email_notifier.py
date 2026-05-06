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
LABEL_VI = {
    'very_positive': 'RẤT TÍCH CỰC',
    'positive':      'TÍCH CỰC',
    'negative':      'TIÊU CỰC',
    'very_negative': 'RẤT TIÊU CỰC',
}
LABEL_COLOR = {
    'very_positive': '#1B5E20',
    'positive':      '#2E7D32',
    'negative':      '#D4183D',
    'very_negative': '#7B0D1E',
}
LABEL_BG = {
    'very_positive': '#C8E6C9',
    'positive':      '#E8F5E9',
    'negative':      '#FDE8EC',
    'very_negative': '#F8D7DA',
}
LABEL_BORDER = {
    'very_positive': '#1B5E20',
    'positive':      '#2E7D32',
    'negative':      '#D4183D',
    'very_negative': '#7B0D1E',
}

# Nhãn được gửi email (neutral và trash bị loại)
EMAIL_LABELS = ('very_positive', 'positive', 'negative', 'very_negative')

# ── Tag loại tin ──────────────────────────────────────────────────────────────
NEWS_TYPE_VI = {
    'vi_mo':        'Vĩ mô',
    'vi_mo_dn':     'Vĩ mô ngành',
    'hoat_dong_kd': 'Hoạt động KD',
    'phap_ly':      'Pháp lý',
    'thi_truong':   'Thị trường',
    'du_bao':       'Dự báo',
}


def fetch_subscribers(sb) -> list[dict]:
    result = sb.table('subscribers').select('email,holdings').execute()
    return result.data or []


def fetch_news_for_symbol(sb, symbol: str, since_published: str, since_labeled: str) -> list[dict]:
    seen_ids = set()
    results = []

    # 1. Bài có symbol khớp trực tiếp
    r1 = (
        sb.table('market_news')
        .select('id,title,content,content_summary,article_url,label,source,published_at,news_type,affected_symbols,impact_reasoning,impact_score')
        .eq('symbol', symbol)
        .in_('label', list(EMAIL_LABELS))
        .gte('published_at', since_published)
        .gte('labeled_at', since_labeled)
        .order('published_at', desc=True)
        .limit(20)
        .execute()
    )
    for row in (r1.data or []):
        seen_ids.add(row['id'])
        results.append(row)

    # 2. Bài LLM gán symbol vào affected_symbols (bài không có symbol trực tiếp)
    if len(results) < 20:
        r2 = (
            sb.table('market_news')
            .select('id,title,content,content_summary,article_url,label,source,published_at,news_type,affected_symbols,impact_reasoning,impact_score')
            .contains('affected_symbols', [symbol])
            .in_('label', list(EMAIL_LABELS))
            .gte('published_at', since_published)
            .gte('labeled_at', since_labeled)
            .order('published_at', desc=True)
            .limit(20)
            .execute()
        )
        for row in (r2.data or []):
            if row['id'] not in seen_ids:
                seen_ids.add(row['id'])
                results.append(row)

    # Sort theo |impact_score| giảm dần → bài ảnh hưởng mạnh nhất (tích cực hoặc tiêu cực) lên đầu
    results.sort(key=lambda x: abs(x.get('impact_score') or 0), reverse=True)
    return results[:3]


def _news_item_html(news: dict, symbol: str = '') -> str:
    import urllib.parse
    label     = news.get('label', 'positive')
    color     = LABEL_COLOR.get(label, '#2E7D32')
    bg        = LABEL_BG.get(label, '#E8F5E9')
    border    = LABEL_BORDER.get(label, '#2E7D32')
    badge     = LABEL_VI.get(label, label.upper())
    ntype     = news.get('news_type') or ''
    type_tag  = NEWS_TYPE_VI.get(ntype, '')
    title     = news.get('title', '')
    url       = news.get('article_url', '#')
    source    = news.get('source', '')
    summary   = (news.get('content_summary') or '').strip()
    if not summary:
        _raw = (news.get('content') or '').strip()
        summary = (_raw[:200] + '...') if _raw else ''
    reasoning = (news.get('impact_reasoning') or '').strip()

    type_html = (
        f'<td style="padding-left:6px;">'
        f'<span style="background:#F0F0F8;color:#5A5A7A;font-size:10px;font-weight:600;'
        f'padding:3px 8px;border-radius:20px;">{type_tag}</span></td>'
        if type_tag else ''
    )

    deep_prompt = (
        f"Tóm tắt bài báo: {url}\n"
        f"Phân tích tác động của tin này lên cổ phiếu {symbol}.\n"
        f"Bạn hãy research các thông tin cần thiết liên quan để tự cung cấp đủ context nhằm phân tích tin tức và cho tôi biết:\n"
        f"- Tin ảnh hưởng trực tiếp hay gián tiếp?\n"
        f"- Mức độ tác động (mạnh / vừa / yếu)\n"
        f"- Ngắn hạn vs dài hạn\n"
        f"- Thị trường đã phản ánh chưa?\n"
        f"- Kết luận: bullish hay bearish (kèm reasoning)"
    )
    chatgpt_url = f"https://chatgpt.com/?q={urllib.parse.quote(deep_prompt)}"
    chatgpt_btn = f"""
                        <div style="margin-top:10px;">
                          <a href="{chatgpt_url}" style="display:inline-flex;align-items:center;gap:6px;background:#0849AC;color:#ffffff;font-size:11px;font-weight:600;padding:7px 14px;border-radius:20px;text-decoration:none;">
                            Research sâu hơn →
                          </a>
                        </div>"""

    # Phần AI Reasoning (nếu có) hoặc placeholder — layout column
    if reasoning:
        bottom_block = f"""
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ECF2FF;border-radius:8px;">
                    <tr>
                      <td style="padding:12px 14px;">
                        <p style="margin:0 0 5px;color:#0849AC;font-size:11px;font-weight:700;letter-spacing:0.5px;">AI REASONING</p>
                        <p style="margin:0;color:#4A5568;font-size:12px;line-height:1.6;">{reasoning}</p>
                        {chatgpt_btn}
                      </td>
                    </tr>
                  </table>"""
    else:
        bottom_block = f"""
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FB;border-radius:8px;border:1px solid #ECECF0;">
                    <tr>
                      <td style="padding:12px 14px;">
                        <p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;font-style:italic;">Chưa có AI reasoning cho bài này.</p>
                        {chatgpt_btn}
                      </td>
                    </tr>
                  </table>"""

    return f"""
        <tr>
          <td style="background:#ffffff;padding:8px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#F8F9FB;border-radius:10px;border-left:4px solid {border};padding:16px;">
                  <table cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
                    <tr>
                      <td style="background:{bg};color:{color};font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;">{badge}</td>
                      {type_html}
                      <td style="padding-left:10px;color:#717182;font-size:11px;">{source}</td>
                    </tr>
                  </table>
                  <a href="{url}" style="color:#030213;font-size:14px;font-weight:600;text-decoration:none;line-height:1.5;display:block;margin-bottom:8px;">{title}</a>
                  <p style="margin:0 0 6px;color:#717182;font-size:13px;line-height:1.55;">{summary}</p>
                  <p style="margin:0 0 12px;"><a href="{url}" style="color:#0849AC;font-size:12px;font-weight:600;text-decoration:none;">Đọc bài báo gốc →</a></p>
                  {bottom_block}
                </td>
              </tr>
            </table>
          </td>
        </tr>"""


def build_email_html(email: str, holdings: list[dict], news_by_symbol: dict) -> str:
    from zoneinfo import ZoneInfo
    vn_now     = datetime.now(ZoneInfo('Asia/Ho_Chi_Minh'))
    today_str  = vn_now.strftime('%d/%m/%Y')
    now_str    = vn_now.strftime('%H:%M')
    weekday_vi = ['Thu Hai','Thu Ba','Thu Tu','Thu Nam','Thu Sau','Thu Bay','Chu Nhat']
    weekday    = weekday_vi[vn_now.weekday()]

    weekday_full = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']
    weekday_display = weekday_full[vn_now.weekday()]

    hour = vn_now.hour
    if 5 <= hour < 11:
        buoi = 'buổi sáng'
    elif 11 <= hour < 13:
        buoi = 'buổi trưa'
    elif 13 <= hour < 18:
        buoi = 'buổi chiều'
    else:
        buoi = 'buổi tối'
    buoi_cap = buoi.capitalize()

    # Phân loại cổ phiếu có / không có tin
    symbols_with_news    = [h.get('symbol') for h in holdings if h.get('symbol') and news_by_symbol.get(h.get('symbol'))]
    symbols_without_news = [h.get('symbol') for h in holdings if h.get('symbol') and not news_by_symbol.get(h.get('symbol'))]

    # Block tổng quan danh mục
    with_news_html = ''
    if symbols_with_news:
        chips = ''.join(
            f'<span style="display:inline-block;background:#E8F5E9;color:#2E7D32;font-size:11px;font-weight:700;'
            f'padding:3px 10px;border-radius:20px;margin:2px 3px 2px 0;">{s}</span>'
            for s in symbols_with_news
        )
        with_news_html = f"""
              <tr>
                <td style="padding-bottom:10px;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align:top;padding-top:4px;padding-right:8px;">
                        <span style="display:inline-block;width:8px;height:8px;background:#2E7D32;border-radius:50%;"></span>
                      </td>
                      <td>
                        <span style="color:#717182;font-size:12px;font-weight:600;">Có tin tức ảnh hưởng:&nbsp;</span>
                        {chips}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>"""

    without_news_html = ''
    if symbols_without_news:
        chips = ''.join(
            f'<span style="display:inline-block;background:#F3F4F6;color:#9CA3AF;font-size:11px;font-weight:700;'
            f'padding:3px 10px;border-radius:20px;margin:2px 3px 2px 0;">{s}</span>'
            for s in symbols_without_news
        )
        without_news_html = f"""
              <tr>
                <td>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align:top;padding-top:4px;padding-right:8px;">
                        <span style="display:inline-block;width:8px;height:8px;background:#D1D5DB;border-radius:50%;"></span>
                      </td>
                      <td>
                        <span style="color:#717182;font-size:12px;font-weight:600;">Không có tin tức:&nbsp;</span>
                        {chips}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>"""

    portfolio_summary_block = f"""
        <tr>
          <td style="background:#ffffff;padding:16px 32px 4px;">
            <p style="margin:0 0 12px;color:#030213;font-size:12px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">Danh mục hôm nay</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              {with_news_html}
              {without_news_html}
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:0 32px 16px;">
            <div style="border-top:1px solid #ECECF0;"></div>
          </td>
        </tr>"""

    # Blocks tin tức theo từng cổ phiếu
    holding_blocks = ''
    for holding in holdings:
        symbol    = holding.get('symbol', '')
        quantity  = holding.get('quantity', 0)
        news_list = news_by_symbol.get(symbol, [])
        if not news_list:
            continue

        news_rows = ''.join(_news_item_html(n, symbol) for n in news_list)
        holding_blocks += f"""
        <tr>
          <td style="background:#ffffff;padding:20px 32px 8px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="color:#030213;font-size:18px;font-weight:700;">{symbol}</span>
                  <span style="color:#717182;font-size:14px;margin-left:8px;">{quantity:,} cổ phiếu</span>
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

    # Nếu không có tin nào cho bất kỳ cổ phiếu nào → block thông báo
    if not holding_blocks:
        symbol_list = ' · '.join(f'<strong>{s}</strong>' for s in symbols_without_news) if symbols_without_news else 'các cổ phiếu trong danh mục'
        holding_blocks = f"""
        <tr>
          <td style="background:#ffffff;padding:8px 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#F8F9FB;border-radius:10px;border-left:4px solid #E5E7EB;padding:20px 18px;">
                  <p style="margin:0 0 8px;color:#374151;font-size:14px;font-weight:600;">Không có tin tức nổi bật hôm nay</p>
                  <p style="margin:0;color:#6B7280;font-size:13px;line-height:1.7;">
                    Trong 24 giờ qua, chưa ghi nhận tin tức nào ảnh hưởng đáng kể đến {symbol_list} trong danh mục của bạn.
                    Chúng tôi sẽ thông báo ngay khi có thông tin mới.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Wealbee - Bản tin {buoi}</title>
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
                  <!-- SVG removed: email clients block inline SVG -->
                  <svg style="display:none" width="120" height="48" viewBox="0 0 128 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M59.2449 37.3389L55.7649 26.8389H57.7899L60.8949 36.3339H59.8899L63.1149 26.8389H64.9149L68.0499 36.3339H67.0749L70.2549 26.8389H72.1149L68.6349 37.3389H66.5649L63.6999 28.7739H64.2399L61.3299 37.3389H59.2449ZM76.6879 37.4439C75.7979 37.4439 75.0179 37.2689 74.3479 36.9189C73.6879 36.5589 73.1729 36.0689 72.8029 35.4489C72.4429 34.8289 72.2629 34.1239 72.2629 33.3339C72.2629 32.5339 72.4379 31.8289 72.7879 31.2189C73.1479 30.5989 73.6379 30.1139 74.2579 29.7639C74.8879 29.4139 75.6029 29.2389 76.4029 29.2389C77.1829 29.2389 77.8779 29.4089 78.4879 29.7489C79.0979 30.0889 79.5779 30.5689 79.9279 31.1889C80.2779 31.8089 80.4529 32.5389 80.4529 33.3789C80.4529 33.4589 80.4479 33.5489 80.4379 33.6489C80.4379 33.7489 80.4329 33.8439 80.4229 33.9339H73.7479V32.6889H79.4329L78.6979 33.0789C78.7079 32.6189 78.6129 32.2139 78.4129 31.8639C78.2129 31.5139 77.9379 31.2389 77.5879 31.0389C77.2479 30.8389 76.8529 30.7389 76.4029 30.7389C75.9429 30.7389 75.5379 30.8389 75.1879 31.0389C74.8479 31.2389 74.5779 31.5189 74.3779 31.8789C74.1879 32.2289 74.0929 32.6439 74.0929 33.1239V33.4239C74.0929 33.9039 74.2029 34.3289 74.4229 34.6989C74.6429 35.0689 74.9529 35.3539 75.3529 35.5539C75.7529 35.7539 76.2129 35.8539 76.7329 35.8539C77.1829 35.8539 77.5879 35.7839 77.9479 35.6439C78.3079 35.5039 78.6279 35.2839 78.9079 34.9839L79.9129 36.1389C79.5529 36.5589 79.0979 36.8839 78.5479 37.1139C78.0079 37.3339 77.3879 37.4439 76.6879 37.4439ZM86.9692 37.3389V35.7189L86.8642 35.3739V32.5389C86.8642 31.9889 86.6992 31.5639 86.3692 31.2639C86.0392 30.9539 85.5392 30.7989 84.8692 30.7989C84.4192 30.7989 83.9742 30.8689 83.5342 31.0089C83.1042 31.1489 82.7392 31.3439 82.4392 31.5939L81.7042 30.2289C82.1342 29.8989 82.6442 29.6539 83.2342 29.4939C83.8342 29.3239 84.4542 29.2389 85.0942 29.2389C86.2542 29.2389 87.1492 29.5189 87.7792 30.0789C88.4192 30.6289 88.7392 31.4839 88.7392 32.6439V37.3389H86.9692ZM84.4492 37.4439C83.8492 37.4439 83.3242 37.3439 82.8742 37.1439C82.4242 36.9339 82.0742 36.6489 81.8242 36.2889C81.5842 35.9189 81.4642 35.5039 81.4642 35.0439C81.4642 34.5939 81.5692 34.1889 81.7792 33.8289C81.9992 33.4689 82.3542 33.1839 82.8442 32.9739C83.3342 32.7639 83.9842 32.6589 84.7942 32.6589H87.1192V33.9039H84.9292C84.2892 33.9039 83.8592 34.0089 83.6392 34.2189C83.4192 34.4189 83.3092 34.6689 83.3092 34.9689C83.3092 35.3089 83.4442 35.5789 83.7142 35.7789C83.9842 35.9789 84.3592 36.0789 84.8392 36.0789C85.2992 36.0789 85.7092 35.9739 86.0692 35.7639C86.4392 35.5539 86.7042 35.2439 86.8642 34.8339L87.1792 35.9589C86.9992 36.4289 86.6742 36.7939 86.2042 37.0539C85.7442 37.3139 85.1592 37.4439 84.4492 37.4439ZM91.1455 37.3389V26.2089H93.0205V37.3389H91.1455ZM99.9215 37.4439C99.2415 37.4439 98.6365 37.2939 98.1065 36.9939C97.5765 36.6939 97.1565 36.2439 96.8465 35.6439C96.5465 35.0339 96.3965 34.2639 96.3965 33.3339C96.3965 32.3939 96.5515 31.6239 96.8615 31.0239C97.1815 30.4239 97.6065 29.9789 98.1365 29.6889C98.6765 29.3889 99.2715 29.2389 99.9215 29.2389C100.711 29.2389 101.406 29.4089 102.006 29.7489C102.616 30.0889 103.096 30.5639 103.446 31.1739C103.806 31.7839 103.986 32.5039 103.986 33.3339C103.986 34.1639 103.806 34.8839 103.446 35.4939C103.096 36.1039 102.616 36.5839 102.006 36.9339C101.406 37.2739 100.711 37.4439 99.9215 37.4439ZM95.4815 37.3389V26.2089H97.3565V31.1889L97.2065 33.3189L97.2665 35.4489V37.3389H95.4815ZM99.7115 35.8389C100.161 35.8389 100.561 35.7389 100.911 35.5389C101.271 35.3389 101.556 35.0489 101.766 34.6689C101.976 34.2889 102.081 33.8439 102.081 33.3339C102.081 32.8139 101.976 32.3689 101.766 31.9989C101.556 31.6189 101.271 31.3289 100.911 31.1289C100.561 30.9289 100.161 30.8289 99.7115 30.8289C99.2615 30.8289 98.8565 30.9289 98.4965 31.1289C98.1365 31.3289 97.8515 31.6189 97.6415 31.9989C97.4315 32.3689 97.3265 32.8139 97.3265 33.3339C97.3265 33.8439 97.4315 34.2889 97.6415 34.6689C97.8515 35.0489 98.1365 35.3389 98.4965 35.5389C98.8565 35.7389 99.2615 35.8389 99.7115 35.8389ZM109.53 37.4439C108.64 37.4439 107.86 37.2689 107.19 36.9189C106.53 36.5589 106.015 36.0689 105.645 35.4489C105.285 34.8289 105.105 34.1239 105.105 33.3339C105.105 32.5339 105.28 31.8289 105.63 31.2189C105.99 30.5989 106.48 30.1139 107.1 29.7639C107.73 29.4139 108.445 29.2389 109.245 29.2389C110.025 29.2389 110.72 29.4089 111.33 29.7489C111.94 30.0889 112.42 30.5689 112.77 31.1889C113.12 31.8089 113.295 32.5389 113.295 33.3789C113.295 33.4589 113.29 33.5489 113.28 33.6489C113.28 33.7489 113.275 33.8439 113.265 33.9339H106.59V32.6889H112.275L111.54 33.0789C111.55 32.6189 111.455 32.2139 111.255 31.8639C111.055 31.5139 110.78 31.2389 110.43 31.0389C110.09 30.8389 109.695 30.7389 109.245 30.7389C108.785 30.7389 108.38 30.8389 108.03 31.0389C107.69 31.2389 107.42 31.5189 107.22 31.8789C107.03 32.2289 106.935 32.6439 106.935 33.1239V33.4239C106.935 33.9039 107.045 34.3289 107.265 34.6989C107.485 35.0689 107.795 35.3539 108.195 35.5539C108.595 35.7539 109.055 35.8539 109.575 35.8539C110.025 35.8539 110.43 35.7839 110.79 35.6439C111.15 35.5039 111.47 35.2839 111.75 34.9839L112.755 36.1389C112.395 36.5589 111.94 36.8839 111.39 37.1139C110.85 37.3339 110.23 37.4439 109.53 37.4439ZM118.861 37.4439C117.971 37.4439 117.191 37.2689 116.521 36.9189C115.861 36.5589 115.346 36.0689 114.976 35.4489C114.616 34.8289 114.436 34.1239 114.436 33.3339C114.436 32.5339 114.611 31.8289 114.961 31.2189C115.321 30.5989 115.811 30.1139 116.431 29.7639C117.061 29.4139 117.776 29.2389 118.576 29.2389C119.356 29.2389 120.051 29.4089 120.661 29.7489C121.271 30.0889 121.751 30.5689 122.101 31.1889C122.451 31.8089 122.626 32.5389 122.626 33.3789C122.626 33.4589 122.621 33.5489 122.611 33.6489C122.611 33.7489 122.606 33.8439 122.596 33.9339H115.921V32.6889H121.606L120.871 33.0789C120.881 32.6189 120.786 32.2139 120.586 31.8639C120.386 31.5139 120.111 31.2389 119.761 31.0389C119.421 30.8389 119.026 30.7389 118.576 30.7389C118.116 30.7389 117.711 30.8389 117.361 31.0389C117.021 31.2389 116.751 31.5189 116.551 31.8789C116.361 32.2289 116.266 32.6439 116.266 33.1239V33.4239C116.266 33.9039 116.376 34.3289 116.596 34.6989C116.816 35.0689 117.126 35.3539 117.526 35.5539C117.926 35.7539 118.386 35.8539 118.906 35.8539C119.356 35.8539 119.761 35.7839 120.121 35.6439C120.481 35.5039 120.801 35.2839 121.081 34.9839L122.086 36.1389C121.726 36.5589 121.271 36.8839 120.721 37.1139C120.181 37.3339 119.561 37.4439 118.861 37.4439Z" fill="white"/>
                    <path d="M23.4618 49.5552C27.2636 51.2822 31.3922 52.0619 35.461 51.9962C38.0386 51.9533 40.599 51.5685 43.053 50.847C44.4991 50.4216 45.908 49.8789 47.2565 49.2191C45.8429 49.711 44.3989 50.0834 42.9425 50.3442C40.4712 50.7864 37.9644 50.9087 35.4927 50.7303C31.5914 50.4468 27.7617 49.416 24.3374 47.6244C21.2231 45.9943 18.4364 43.7072 16.469 40.8395C14.7111 38.2908 13.6556 35.2675 13.619 32.1984C13.6188 32.1854 13.6186 32.1724 13.6184 32.1594C13.5733 29.0858 14.5536 26.0312 16.26 23.4427C18.1572 20.5476 20.8897 18.2187 23.9618 16.5432C27.3481 14.697 31.1548 13.6099 35.043 13.2669C37.5178 13.0497 40.0322 13.1344 42.5158 13.5391C43.9758 13.7772 45.4252 14.1266 46.8464 14.5946C45.4876 13.9576 44.071 13.4375 42.619 13.0347C40.149 12.3498 37.5773 12.0028 34.993 12C30.9323 11.9975 26.8226 12.8385 23.0554 14.6283C19.6401 16.2532 16.4851 18.6929 14.2194 21.9614C12.184 24.8764 10.9452 28.5071 11.0019 32.1928C11.0021 32.2083 11.0023 32.2239 11.0025 32.2394C11.0438 35.9199 12.3694 39.5036 14.4582 42.3665C16.7989 45.5957 20.0065 47.9831 23.4618 49.5552Z" fill="white"/>
                    <path d="M41.7116 17.0327C38.9303 15.5891 35.8353 14.911 32.801 14.9906C30.9352 15.0385 29.0901 15.3705 27.3466 15.9691C26.2455 16.347 25.185 16.831 24.1863 17.4131C25.2587 16.9951 26.3593 16.681 27.4705 16.4685C29.2301 16.132 31.016 16.0502 32.7656 16.2111C35.6115 16.472 38.3651 17.3792 40.7533 18.8573C43.0465 20.2735 44.9993 22.2248 46.3452 24.5351C47.6364 26.741 48.3573 29.2725 48.3821 31.8207C48.3821 31.8248 48.3822 31.8289 48.3822 31.833C48.412 34.3827 47.7441 36.9312 46.4958 39.1641C45.1982 41.4969 43.2858 43.4823 41.0227 44.9385C38.6638 46.4597 35.9285 47.4152 33.0902 47.7268C31.3416 47.9193 29.5525 47.869 27.7855 47.5638C26.6709 47.3713 25.5651 47.0773 24.4857 46.6793C25.4943 47.2427 26.5628 47.7073 27.67 48.0653C29.4251 48.6332 31.2776 48.9328 33.146 48.9471C36.1783 48.9722 39.2593 48.2395 42.0129 46.7446C44.653 45.3162 46.9894 43.1707 48.6092 40.4888C50.168 37.926 51.0365 34.8705 50.9988 31.8043C50.9988 31.7993 50.9987 31.7944 50.9987 31.7895C50.9709 28.7249 50.0394 25.6934 48.433 23.1662C46.7589 20.5147 44.3807 18.4132 41.7116 17.0327Z" fill="white"/>
                    <path d="M36.9604 42.6C37.1639 42.6 37.3877 42.478 37.5211 42.2199L39.4819 38.4246C39.6165 38.1647 39.6169 37.8367 39.4819 37.5754L37.5211 33.7801C37.3888 33.5228 37.165 33.4 36.9604 33.4H33.0396C32.8361 33.4 32.6123 33.522 32.4789 33.7801L30.5181 37.5754C30.3835 37.8352 30.3831 38.1633 30.5181 38.4246L31.4985 40.3223L32.4789 42.2199C32.6113 42.4772 32.835 42.6 33.0396 42.6H36.9604ZM33.0396 43L32.9676 42.9973C32.6099 42.9708 32.2858 42.7475 32.1058 42.3977L30.1445 38.6023L30.1108 38.5316C29.9526 38.1723 29.9638 37.7466 30.1445 37.3977L32.1058 33.6023C32.2987 33.2292 32.6548 33 33.0396 33H36.9604C37.3221 33 37.6577 33.2016 37.8564 33.5344L37.8942 33.6023L39.8555 37.3977C40.0482 37.7708 40.0482 38.2302 39.8555 38.6023L37.8942 42.3977C37.7013 42.7708 37.3452 43 36.9604 43H33.0396Z" fill="white" stroke="white"/>
                    <path d="M26.9604 36.6154C27.1549 36.6154 27.3807 36.498 27.5182 36.2319L29.479 32.4368L29.4794 32.4364C29.6178 32.1693 29.6178 31.8318 29.479 31.5632L27.5182 27.7681L27.5178 27.7674C27.3814 27.5021 27.1561 27.3846 26.9604 27.3846H23.0396C22.845 27.3846 22.6192 27.502 22.4817 27.7681L20.5209 31.5632L20.5205 31.5636C20.3822 31.8307 20.3821 32.1682 20.5209 32.4368L22.4817 36.2319L22.4821 36.2326L22.5086 36.2807C22.6465 36.5122 22.8561 36.6154 23.0396 36.6154H26.9604ZM23.0396 37L22.9675 36.9974C22.6099 36.9709 22.2858 36.7475 22.1057 36.3975L20.1445 32.6025L20.1108 32.5315C19.9526 32.1721 19.9638 31.7465 20.1445 31.3975L22.1057 27.6025C22.2986 27.2292 22.6547 27 23.0396 27H26.9604C27.322 27 27.6576 27.2014 27.8563 27.5341L27.8942 27.6025L29.8554 31.3975C30.0482 31.7707 30.0482 32.2302 29.8554 32.6025L27.8942 36.3975C27.7013 36.7708 27.3452 37 26.9604 37H23.0396Z" fill="white" stroke="white"/>
                    <path d="M36.9604 30.6C37.1639 30.6 37.3877 30.478 37.5211 30.2199L39.4819 26.4246L39.4823 26.4242C39.6169 26.1643 39.6169 25.8367 39.4819 25.5754L37.5211 21.7801L37.5207 21.7797C37.3884 21.5224 37.165 21.4 36.9604 21.4H33.0396C32.8361 21.4 32.6123 21.522 32.4789 21.7801L30.5181 25.5754L30.5177 25.5758C30.3831 25.8356 30.3831 26.1633 30.5181 26.4246L32.4789 30.2199L32.4793 30.2203C32.6117 30.4776 32.835 30.6 33.0396 30.6H36.9604ZM33.0396 31L32.9676 30.9973C32.6099 30.9708 32.2858 30.7475 32.1058 30.3977L30.1445 26.6023L30.1108 26.5316C29.9526 26.1723 29.9638 25.7466 30.1445 25.3977L32.1058 21.6023C32.2987 21.2292 32.6548 21 33.0396 21H36.9604C37.3221 21 37.6577 21.2016 37.8564 21.5344L37.8942 21.6023L39.8555 25.3977C40.0482 25.7708 40.0482 26.2302 39.8555 26.6023L37.8942 30.3977C37.7013 30.7708 37.3452 31 36.9604 31H33.0396Z" fill="white" stroke="white"/>
                  </svg>
                </td>
                <td align="right" style="vertical-align:middle;">
                  <span style="color:rgba(255,255,255,0.7);font-size:13px;">{weekday_display}, {today_str}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- HERO BAND -->
        <tr>
          <td style="background:#ECF2FF;padding:14px 32px;">
            <p style="margin:0;color:#0849AC;font-size:15px;font-weight:600;">
              Bản tin {buoi} &nbsp;·&nbsp; {now_str}
            </p>
          </td>
        </tr>

        <!-- GREETING -->
        <tr>
          <td style="background:#ffffff;padding:24px 32px 12px;">
            <p style="margin:0;color:#030213;font-size:15px;line-height:1.6;">
              Dưới đây là những tin tức quan trọng ảnh hưởng đến danh mục của bạn hôm nay.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:0 32px;">
            <div style="border-top:1px solid #ECECF0;"></div>
          </td>
        </tr>

        {portfolio_summary_block}

        {holding_blocks}

        <!-- FOOTER -->
        <tr>
          <td style="background:#0849AC;border-radius:0 0 12px 12px;padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0 0 4px;color:#ffffff;font-size:13px;font-weight:600;">Wealbee</p>
                  <p style="margin:0;color:rgba(255,255,255,0.6);font-size:12px;">Bản tin tự động · Không trả lời email này</p>
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


def run(test_email=None):
    if not RESEND_API_KEY:
        log.error('Thieu RESEND_API_KEY trong .env')
        return

    sb    = get_client()
    since_published = (datetime.now() - timedelta(hours=28)).isoformat()
    since_labeled   = (datetime.now() - timedelta(hours=24)).isoformat()

    log.info('[1] Load subscribers...')
    subscribers = fetch_subscribers(sb)
    if test_email:
        allowed = {test_email} if isinstance(test_email, str) else set(test_email)
        subscribers = [s for s in subscribers if s['email'] in allowed]
    log.info(f'  -> {len(subscribers):,} subscribers')

    all_symbols = set()
    for sub in subscribers:
        for h in (sub.get('holdings') or []):
            if h.get('symbol'):
                all_symbols.add(h['symbol'])

    log.info(f'[2] Fetch tin tuc cho {len(all_symbols)} symbols...')
    news_by_symbol = {}
    for symbol in all_symbols:
        news_by_symbol[symbol] = fetch_news_for_symbol(sb, symbol, since_published, since_labeled)
        count = len(news_by_symbol[symbol])
        if count:
            log.info(f'  {symbol}: {count} bai')

    log.info('[3] Gui email...')
    ok = fail = skip = 0
    from zoneinfo import ZoneInfo
    vn_now    = datetime.now(ZoneInfo('Asia/Ho_Chi_Minh'))
    today_str = vn_now.strftime('%d/%m/%Y')
    _hour = vn_now.hour
    if 5 <= _hour < 11:
        _buoi = 'Buổi Sáng'
    elif 11 <= _hour < 13:
        _buoi = 'Buổi Trưa'
    elif 13 <= _hour < 18:
        _buoi = 'Buổi Chiều'
    else:
        _buoi = 'Buổi Tối'

    for sub in subscribers:
        email    = sub.get('email', '')
        holdings = sub.get('holdings') or []
        if not holdings:
            log.info(f'  Skip {email} (khong co holdings)')
            skip += 1
            continue
        html = build_email_html(email, holdings, news_by_symbol)
        if not html:
            log.info(f'  Skip {email} (html rong)')
            skip += 1
            continue
        success = send_email(to=email, subject=f'Wealbee · Bản Tin {_buoi} {today_str}', html=html)
        if success:
            ok += 1
        else:
            fail += 1
        import time as _time; _time.sleep(0.6)

    log.info(f'=== XONG: Gui OK={ok} | Fail={fail} | Skip={skip} ===')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--test', metavar='EMAIL', help='Gui test den 1 email cu the')
    args = parser.parse_args()
    run(test_email=args.test)
