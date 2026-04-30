"""
Wealbee T1 Labeling — đọc bài chưa có nhãn từ Supabase, chạy GPT-4o-mini
classification + entity extraction, ghi kết quả trở lại Supabase.

Chạy:
    python3 run_labeling.py              # label tất cả bài trong 24h chưa được gán nhãn
    python3 run_labeling.py --hours 48   # mở rộng lookback ra 48h
    python3 run_labeling.py --all        # toàn bộ bài chưa label (không giới hạn thời gian)
"""

import sys
import os
import json
import time
import logging
from datetime import datetime, timedelta
from pathlib import Path

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE_DIR = Path(__file__).parent
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(BASE_DIR / 'crawlers'))

from dotenv import load_dotenv
load_dotenv(BASE_DIR / '.env')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s  %(message)s',
    datefmt='%H:%M:%S',
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger('t1')


# ── Prompt T1 ─────────────────────────────────────────────────────────────────

_T1_SYSTEM = """Bạn là hệ thống phân tích và phân loại tin tức tài chính chứng khoán Việt Nam.
Thị trường bạn phân tích: HOSE, HNX, UPCoM.

## NHIỆM VỤ
Xử lý batch bài báo, với mỗi bài: (1) đánh giá chất lượng, (2) trích xuất thực thể tài chính, (3) phân loại loại tin.

## TIÊU CHÍ LOẠI BỎ — loại bỏ nếu thuộc BẤT KỲ điều kiện nào:
- Không đề cập đến doanh nghiệp/ngành/chỉ số/chính sách tài chính Việt Nam
- Nội dung quảng cáo, advertorial, PR không có thông tin mới
- Tin chỉ tóm tắt lại bài cũ, không có dữ liệu hoặc sự kiện mới phát sinh
- Tin thị trường quốc tế không có liên hệ rõ ràng đến VN

## TIÊU CHÍ GIỮ LẠI — giữ nếu thuộc BẤT KỲ điều kiện nào:
- Kết quả kinh doanh (doanh thu, lợi nhuận, nợ xấu) của doanh nghiệp niêm yết
- Thay đổi chính sách của NHNN, Bộ Tài chính, SSC, Chính phủ
- Dữ liệu vĩ mô: GDP, CPI, PMI, lãi suất, tỷ giá, xuất nhập khẩu
- M&A, phát hành thêm, mua lại cổ phiếu, chia cổ tức, thay đổi lãnh đạo
- Khởi tố, điều tra, xử phạt liên quan doanh nghiệp/cá nhân trong thị trường
- Kết quả/dự báo từ công ty chứng khoán về cổ phiếu cụ thể

## PHÂN LOẠI LOẠI TIN — 6 NHÃN (chọn ĐÚNG 1)
Nhãn hợp lệ: "Vĩ mô" | "Ngành" | "Doanh nghiệp" | "Thị trường" | "Pháp lý" | "Sự kiện"

Vĩ mô: GDP, CPI, PMI, lạm phát, lãi suất NHNN/Fed, tỷ giá USD/VND, xuất nhập khẩu, FDI, ngân sách
Ngành: quy định/chính sách toàn ngành, giá nguyên liệu ngành, xu hướng cung/cầu (không phải 1 DN cụ thể)
Doanh nghiệp: KQKD, M&A, thay đổi lãnh đạo, mở rộng KD, khuyến nghị CTCK, phát hành trái phiếu (1-3 DN)
Thị trường: khối ngoại mua/bán ròng, thanh khoản bất thường, dư nợ margin, dòng tiền quỹ, VN-Index, ETF
Pháp lý: văn bản pháp luật mới, khởi tố/điều tra/bắt giam, xử phạt vi phạm CK, tranh chấp pháp lý
Sự kiện: lịch ĐHCĐ, ngày chốt cổ tức (kèm tỷ lệ + ngày thanh toán), niêm yết mới, IPO, phát hành quyền mua

QUY TẮC KHI TIN THUỘC NHIỀU LOẠI:
  "NHNN tăng lãi suất" → Vĩ mô (dù ảnh hưởng ngành NH)
  "SSC ban hành thông tư siết margin" → Pháp lý (văn bản pháp lý cụ thể)
  "VCB báo lãi Q2 + khối ngoại mua ròng VCB" → Doanh nghiệp (cốt lõi là KQKD)
  "Khối ngoại bán ròng 1.200 tỷ, tập trung VHM VCB" → Thị trường (cốt lõi là dòng tiền)

## QUY TẮC GÁN TICKER/NGÀNH
Ánh xạ tên → ticker: Vietcombank/VCB→"VCB", Hòa Phát/HPG→"HPG", Techcombank/TCB→"TCB", v.v.

Ngành hợp lệ:
  ngan_hang | bat_dong_san | chung_khoan | thep_vat_lieu | ban_le_tieu_dung |
  thuc_pham_do_uong | hang_khong_logistics | nang_luong_dau_khi |
  cong_nghe_vien_thong | det_may_xuat_khau | xay_dung_vlxd | duoc_pham_y_te | nong_nghiep_thuy_san

Scope: "company" (1-3 DN) | "sector" (toàn ngành) | "market" (toàn thị trường)

## OUTPUT FORMAT — JSON object bọc array, response_format json_object
{"results": [
  {"idx":1,"is_relevant":true,"rejection_reason":null,"news_type":"Doanh nghiệp","scope":"company",
   "tickers":["VCB"],"sectors":["ngan_hang"],"key_numbers":["lợi nhuận tăng 15%","NIM 3.2%"],
   "article_summary":"VCB báo lãi Q2/2025 đạt 12.500 tỷ đồng, tăng 15% so cùng kỳ."},
  {"idx":2,"is_relevant":false,"rejection_reason":"khong_lien_quan_tai_chinh","news_type":null,
   "scope":null,"tickers":[],"sectors":[],"key_numbers":[],"article_summary":null}
]}"""

VALID_TYPES  = {'Vĩ mô', 'Ngành', 'Doanh nghiệp', 'Thị trường', 'Pháp lý', 'Sự kiện'}
VALID_SCOPES = {'company', 'sector', 'market'}
BATCH_SIZE   = 5   # bài / lần gọi API


# ── Gọi GPT-4o-mini ───────────────────────────────────────────────────────────

def classify_batch(client, batch: list[dict]) -> list[dict]:
    """Gửi batch tối đa 5 bài → trả về list result dicts từ JSON."""
    lines = []
    for i, a in enumerate(batch, 1):
        title   = (a.get('title') or '').strip()
        content = (a.get('content') or '').strip()[:800]
        lines.append(f"[{i}] Tiêu đề: {title}\nNội dung: {content}")

    for attempt in range(3):
        try:
            resp = client.chat.completions.create(
                model='gpt-4o-mini',
                messages=[
                    {'role': 'system', 'content': _T1_SYSTEM},
                    {'role': 'user',   'content': '\n\n'.join(lines)},
                ],
                max_tokens=BATCH_SIZE * 200,
                temperature=0,
                response_format={'type': 'json_object'},
            )
            outer = json.loads(resp.choices[0].message.content.strip())
            return outer.get('results', [])
        except Exception as e:
            err = str(e)
            if '429' in err or 'rate_limit' in err:
                wait = 20 * (attempt + 1)
                log.warning(f'  Rate limit, chờ {wait}s ...')
                time.sleep(wait)
                continue
            log.warning(f'  API lỗi (attempt {attempt+1}): {e}')
            if attempt == 2:
                return []
    return []


# ── Ghi kết quả lên Supabase ──────────────────────────────────────────────────

def write_labels(sb, rec_id: str, item: dict):
    """Parse 1 kết quả từ T1 và UPDATE record trên Supabase."""
    is_rel  = bool(item.get('is_relevant', False))
    ntype   = item.get('news_type') if item.get('news_type') in VALID_TYPES else None
    scope   = item.get('scope')     if item.get('scope')     in VALID_SCOPES else None
    tickers  = [t for t in (item.get('tickers')     or []) if isinstance(t, str)][:5]
    sectors  = [s for s in (item.get('sectors')     or []) if isinstance(s, str)]
    key_nums = [k for k in (item.get('key_numbers') or []) if isinstance(k, str)]
    art_sum  = (item.get('article_summary') or '').strip()[:400]

    update = {
        'is_relevant':      is_rel,
        'rejection_reason': item.get('rejection_reason') if not is_rel else None,
        'news_type':        ntype,
        'scope':            scope,
        'tickers':          tickers  or None,
        'sectors':          sectors  or None,
        'key_numbers':      key_nums or None,
        'article_summary':  art_sum  or None,
        # backward-compat fields
        'affected_symbols': tickers,
        'summary':          art_sum  or None,
        'labeled_at':       datetime.now().isoformat(),
        'labeled_by':       'gpt-4o-mini-t1',
    }
    if not is_rel:
        update['label'] = 'trash'

    sb.table('market_news').update(update).eq('id', rec_id).execute()


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]
    label_only   = '--all'   in args
    lookback_hrs = 24

    # Parse --hours N
    if '--hours' in args:
        try:
            lookback_hrs = int(args[args.index('--hours') + 1])
        except (ValueError, IndexError):
            pass

    # Khởi tạo clients
    openai_key = os.getenv('OPENAI_API_KEY', '')
    if not openai_key or openai_key == 'your-openai-key':
        log.error('Thiếu OPENAI_API_KEY trong .env')
        sys.exit(1)

    from openai import OpenAI
    from supabase_writer import get_client

    client = OpenAI(api_key=openai_key, max_retries=1, timeout=30.0)
    sb     = get_client()

    # ── 1. Lấy danh sách ID bài chưa label ────────────────────────────────────
    log.info('=' * 60)
    log.info(f'  T1 LABELING — {datetime.now().strftime("%d/%m/%Y %H:%M:%S")}')
    log.info('=' * 60)

    query = sb.table('market_news').select('id').is_('is_relevant', 'null')
    if not label_only:
        since = (datetime.now() - timedelta(hours=lookback_hrs)).isoformat()
        query = query.gte('published_at', since)
        log.info(f'  Lookback: {lookback_hrs}h (từ {since[:16]})')
    else:
        log.info('  Mode: toàn bộ bài chưa label (không giới hạn thời gian)')

    unlabeled_ids: list[str] = []
    offset = 0
    while True:
        rows = query.range(offset, offset + 999).execute().data or []
        unlabeled_ids += [r['id'] for r in rows]
        if len(rows) < 1000:
            break
        offset += 1000

    log.info(f'  Bài chưa label: {len(unlabeled_ids)}')
    if not unlabeled_ids:
        log.info('  Không có bài nào cần label. Kết thúc.')
        return

    # ── 2. Xử lý theo chunk 50 → batch 5 ─────────────────────────────────────
    total_labeled = 0
    total_relevant = 0
    total_irrelevant = 0
    t0 = time.time()
    type_counter: dict[str, int] = {}

    for chunk_start in range(0, len(unlabeled_ids), 50):
        chunk_ids = unlabeled_ids[chunk_start:chunk_start + 50]

        # Lấy title + content cho chunk
        rows = (
            sb.table('market_news')
            .select('id,title,content,source')
            .in_('id', chunk_ids)
            .execute()
        ).data or []

        if not rows:
            continue

        # Xử lý batch 5
        for b_start in range(0, len(rows), BATCH_SIZE):
            batch   = rows[b_start:b_start + BATCH_SIZE]
            results = classify_batch(client, batch)

            for item in results:
                idx = item.get('idx', 0) - 1
                if idx < 0 or idx >= len(batch):
                    continue

                rec_id = batch[idx]['id']
                try:
                    write_labels(sb, rec_id, item)
                    total_labeled += 1

                    is_rel = bool(item.get('is_relevant', False))
                    if is_rel:
                        total_relevant += 1
                        nt = item.get('news_type') or 'unknown'
                        type_counter[nt] = type_counter.get(nt, 0) + 1
                    else:
                        total_irrelevant += 1
                except Exception as e:
                    log.warning(f'  Ghi lỗi {rec_id[:8]}: {e}')

            time.sleep(0.3)  # tránh rate limit

        progress = min(chunk_start + 50, len(unlabeled_ids))
        log.info(f'  {progress}/{len(unlabeled_ids)} — relevant: {total_relevant} | không liên quan: {total_irrelevant}')

    # ── 3. Tổng kết ───────────────────────────────────────────────────────────
    elapsed = time.time() - t0
    log.info('=' * 60)
    log.info(f'  XONG — {elapsed:.0f}s')
    log.info(f'  Đã label: {total_labeled}/{len(unlabeled_ids)} bài')
    log.info(f'  Liên quan (is_relevant=True):  {total_relevant}')
    log.info(f'  Không liên quan (is_relevant=False): {total_irrelevant}')
    if type_counter:
        log.info('  Phân bổ loại tin:')
        for nt, cnt in sorted(type_counter.items(), key=lambda x: -x[1]):
            log.info(f'    {nt:<18} {cnt:4d} bài')
    log.info('=' * 60)


if __name__ == '__main__':
    main()
