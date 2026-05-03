"""Re-label bai trong 24h voi prompt moi."""
import sys, time, logging, json, os, threading
from datetime import datetime, timedelta
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / '.env')
sys.path.insert(0, str(Path(__file__).parent))

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s', datefmt='%H:%M:%S', handlers=[logging.StreamHandler(sys.stdout)])
log = logging.getLogger('relabel')

from openai import OpenAI
from supabase_writer import get_client

client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'), max_retries=1, timeout=30.0)
sb = get_client()

since = (datetime.now() - timedelta(hours=24)).isoformat()
new_ids = []
offset = 0
while True:
    result = sb.table('market_news').select('id').is_('label', 'null').gte('published_at', since).range(offset, offset+999).execute()
    rows = result.data or []
    new_ids += [r['id'] for r in rows]
    if len(rows) < 1000: break
    offset += 1000
log.info(f'Bai can label lai: {len(new_ids)}')

SYSTEM_PROMPT = """Bạn là chuyên gia phân tích tài chính Việt Nam, tư duy như fund manager kỳ cựu.

## BƯỚC 1 — LỌC BÀI RÁC
Gán "trash": true nếu thuộc BẤT KỲ điều kiện nào:
- Nội dung rỗng, quá ngắn, chỉ có link/file đính kèm
- Thông báo hành chính thuần túy không có số liệu mới (giải trình, đính chính)
- Thông báo sự kiện DN (ngày ĐKCC, chốt quyền cổ tức, ĐHCĐ) mà KHÔNG có số liệu
  cụ thể: tỷ lệ cổ tức, số tiền/cổ phiếu, ngày thanh toán, chương trình nghị sự
  NGOẠI LỆ: khởi công, động thổ, ký kết hợp đồng có quy mô vốn/giá trị cụ thể → KHÔNG phải trash
- Quảng cáo, advertorial, PR không có thông tin mới
- Tin chỉ tóm tắt lại bài cũ, không có sự kiện mới phát sinh
  NGOẠI LỆ: cập nhật số liệu mới theo kỳ (lãi suất tháng X, giá vàng ngày X, KQKD quý X) → KHÔNG phải trash
- Tin quốc tế không có liên hệ rõ ràng đến Việt Nam
Nếu "trash": true → trả về ngay với các trường còn lại = null.

## BƯỚC 2 — PHÂN LOẠI LOẠI TIN (news_type)
Chọn đúng 1 nhãn:
- "vi_mo": GDP, CPI, lãi suất NHNN, tỷ giá, xuất nhập khẩu, ngân sách nhà nước
- "vi_mo_dn": chính sách/xu hướng ngành ảnh hưởng nhiều DN cùng ngành
- "hoat_dong_kd": KQKD, lợi nhuận, M&A, thay đổi lãnh đạo của 1 DN cụ thể
- "phap_ly": luật/nghị định/thông tư mới, khởi tố, xử phạt, phát hành cổ phiếu
- "thi_truong": VN-Index, khối ngoại mua/bán ròng, margin, dòng tiền, ETF
- "du_bao": khuyến nghị CTCK, target price, phân tích kỹ thuật

## BƯỚC 3 — MÃ CỔ PHIẾU BỊ ẢNH HƯỞNG (affected_symbols)
Tối đa 5 mã viết hoa. Mảng rỗng [] nếu không xác định được.
Chỉ gán mã khi CÓ THỂ diễn giải rõ cơ chế tác động cụ thể đến doanh thu/lợi nhuận/chi phí của DN đó trong reasoning.
- Tin DN cụ thể: chỉ mã đó
- Tin vĩ mô/ngành: chỉ gán mã nếu tin ảnh hưởng trực tiếp đến ngành/sản phẩm chính của DN (VD: lãi suất → ngân hàng, giá thép → HPG, tỷ giá → doanh nghiệp xuất khẩu lớn). KHÔNG gán blue-chip đại diện một cách chung chung.

## BƯỚC 4 — CHẤM ĐIỂM TÁC ĐỘNG (impact_score)
Thang -10 đến +10, bước 0.5. Xét theo thứ tự:
1. Tin ảnh hưởng trực tiếp hay gián tiếp đến doanh thu/lợi nhuận DN?
   - Trực tiếp, chiếm >30% DT/LN → biên độ đầy đủ
   - Gián tiếp hoặc <10% DT/LN → tối đa ±2
2. Ngắn hạn (1-2 quý) hay thay đổi cấu trúc dài hạn?
3. Tin đã được thị trường kỳ vọng trước? → giảm biên độ 40-60%
4. Yếu tố đặc thù VN: biên độ cứng 7%/10%, retail panic, margin cascade (thép/BDS/CK), SOE discount 20%

Ngưỡng nhãn:
- score > +5.0  → label = "very_positive"
- +1.5 < score ≤ +5.0 → label = "positive"
- -1.5 ≤ score ≤ +1.5 → label = "neutral"
- -5.0 ≤ score < -1.5 → label = "negative"
- score < -5.0 → label = "very_negative"

## BƯỚC 5 — REASONING (đúng 2 câu, bắt buộc)
CÂU 1 — Cơ chế + số:
"[Sự kiện cụ thể] → [cơ chế tác động] → [chỉ số tài chính bị ảnh hưởng + ước lượng định lượng]"
CÂU 2 — Bối cảnh DN (nếu có thông tin DN) hoặc hệ quả ngắn hạn cho nhà đầu tư.

NGÔN NGỮ BẮT BUỘC:
✅ Dùng: thu hẹp, kéo giảm, gây áp lực, đẩy tăng, xói mòn, siết chặt, hỗ trợ, tạo dư địa
✅ Dùng số cụ thể: ~25bps, 8-12%, 1.200 tỷ đồng, NIM, CASA, EBITDA margin, biên GP
❌ Tuyệt đối không dùng: "có thể", "có lẽ", "đáng lo ngại", "cần theo dõi", "đáng kể", "nhìn chung"

## OUTPUT — JSON STRICT (không có text ngoài JSON)
Nếu trash:
{"trash":true,"news_type":null,"affected_symbols":null,"impact_score":null,"label":"trash","impact_reasoning":null}
Nếu không trash:
{"trash":false,"news_type":"hoat_dong_kd","affected_symbols":["VNM"],"impact_score":-3.5,"label":"negative","impact_reasoning":"Câu 1. Câu 2."}"""

VALID_LABELS = {'very_positive','positive','neutral','negative','very_negative','trash'}
VALID_TYPES  = {'vi_mo','vi_mo_dn','hoat_dong_kd','phap_ly','thi_truong','du_bao'}
stock_cache  = {}
lock = threading.Lock()

def get_stock_context(symbol):
    if not symbol: return ''
    with lock:
        if symbol in stock_cache: return stock_cache[symbol]
    for attempt in range(4):
        try:
            r = sb.table('stocks').select('company_context,beta').eq('symbol', symbol).limit(1).execute()
            val = ''
            if r.data:
                row = r.data[0]
                ctx = (row.get('company_context') or '')[:800]
                beta = row.get('beta')
                val = f"{ctx}\nBeta so VN-Index: {beta}".strip() if beta else ctx
            with lock: stock_cache[symbol] = val
            return val
        except Exception as e:
            if attempt == 3: return ''
            time.sleep(1.5 ** attempt)

def score_to_label(score):
    if score > 5.0:    return 'very_positive'
    elif score > 1.5:  return 'positive'
    elif score >= -1.5: return 'neutral'
    elif score >= -5.0: return 'negative'
    else:              return 'very_negative'

def process_one(article):
    content = (article.get('content') or '').strip()
    if len(content) < 150:
        return article['id'], {'label':'trash','news_type':None,'affected_symbols':None,'impact_score':None,'impact_reasoning':None}
    symbol   = article.get('symbol') or ''
    affected = article.get('affected_symbols') or []
    main_sym = symbol or (affected[0] if affected else '')
    stock_ctx = get_stock_context(main_sym)
    user_text = f"Tiêu đề: {article.get('title','')}\nNội dung: {content[:1500]}"
    if main_sym:  user_text += f"\nMã CK chính: {main_sym}"
    if stock_ctx: user_text += f"\nThông tin doanh nghiệp:\n{stock_ctx}"
    try:
        resp = client.chat.completions.create(
            model='gpt-4.1-mini',
            messages=[{'role':'system','content':SYSTEM_PROMPT},{'role':'user','content':user_text}],
            max_tokens=300, temperature=0, response_format={'type':'json_object'},
        )
        data = json.loads(resp.choices[0].message.content.strip())
        if data.get('trash'):
            return article['id'], {'label':'trash','news_type':None,'affected_symbols':None,'impact_score':None,'impact_reasoning':None}
        score     = data.get('impact_score')
        label     = score_to_label(float(score)) if isinstance(score,(int,float)) else data.get('label','neutral')
        ntype     = data.get('news_type','thi_truong')
        syms      = data.get('affected_symbols') or []
        reasoning = (data.get('impact_reasoning') or '').strip()
        if label not in VALID_LABELS: label = 'neutral'
        if ntype not in VALID_TYPES:  ntype = 'thi_truong'
        if not isinstance(syms,list): syms = []
        syms = [s for s in syms if isinstance(s,str) and len(s)<=10][:5]
        return article['id'], {'label':label,'news_type':ntype,'affected_symbols':syms,'impact_score':float(score) if isinstance(score,(int,float)) else None,'impact_reasoning':reasoning or None}
    except Exception as e:
        err = str(e)
        if '429' in err or 'rate_limit' in err: raise
        log.warning(f'  API loi {article["id"][:8]}: {e}')
        return article['id'], {'label':'neutral','news_type':'thi_truong','affected_symbols':[],'impact_score':None,'impact_reasoning':None}

total = 0
for i in range(0, len(new_ids), 50):
    chunk_ids = new_ids[i:i+50]
    articles = (sb.table('market_news').select('id,title,content,symbol,affected_symbols').in_('id',chunk_ids).execute()).data or []
    if not articles: continue
    log.info(f'  Batch {i//50+1}: {len(articles)} bai...')
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(process_one,a): a for a in articles}
        for future in as_completed(futures):
            rec_id, fields = future.result()
            payload = {**fields,'labeled_at':datetime.now().isoformat(),'labeled_by':'gpt-4.1-mini','impact_scored_at':datetime.now().isoformat() if fields.get('impact_score') is not None else None}
            for attempt in range(5):
                try:
                    sb.table('market_news').update(payload).eq('id',rec_id).execute()
                    break
                except Exception as e:
                    if attempt==4: log.error(f'  Update fail {rec_id[:8]}: {e}')
                    else: time.sleep(2**attempt)
            log.info(f'  {rec_id[:8]}... -> {fields["label"]} (score={fields.get("impact_score")})')
            total += 1

log.info(f'Hoan thanh: {total} bai')
