"""
Wealbee Content Filter — bộ lọc chung cho toàn bộ pipeline.

Ba tầng lọc (áp dụng theo thứ tự):
  1. CHẤT LƯỢNG   — loại bài quá ngắn, tiêu đề rác, spam
  2. LIÊN QUAN    — loại bài không có giá trị phân tích đầu tư
  3. TRÙNG LẶP    — khi 2 nguồn viết cùng câu chuyện, giữ nguồn uy tín hơn

Quan điểm lọc: nhà phân tích SSI 10 năm kinh nghiệm — chỉ giữ tin
thực sự tác động đến quyết định mua/bán/giữ cổ phiếu.
"""

import re
import unicodedata
from datetime import datetime


# ══════════════════════════════════════════════════════════════════════════════
# 1. ĐỘ ƯU TIÊN NGUỒN
# ══════════════════════════════════════════════════════════════════════════════

# Thứ hạng uy tín — số nhỏ = uy tín cao hơn.
# Cơ sở: chuyên môn tài chính, độ chính xác số liệu, kiểm duyệt biên tập.
SOURCE_PRIORITY: dict[str, int] = {
    "vietstock":           1,   # dữ liệu chuẩn sàn, biên tập chuyên sâu
    "tinnhanhchungkhoan":  2,   # chuyên biệt TTCK, chất lượng bài tốt
    "cafef":               3,   # phủ rộng, biên tập khá
    "vnexpress":           4,   # uy tín đại chúng, TTCK không chuyên bằng
    "nhadautu":            5,   # tập trung đầu tư, chất lượng vừa
    "baodautu":            6,   # tổng hợp đầu tư, khá chung chung
    "markettimes":         7,   # mới, chưa kiểm chứng nhiều
}

DEFAULT_PRIORITY = 8


# ══════════════════════════════════════════════════════════════════════════════
# 2. BỘ LỌC CHẤT LƯỢNG (tầng 1)
# ══════════════════════════════════════════════════════════════════════════════

MIN_TITLE_LEN   = 20    # ký tự — tiêu đề "VNM tăng" là rác
MIN_CONTENT_LEN = 150   # ký tự — bài dưới 150 ký tự không có gì để đọc

# Tiêu đề chứa các pattern này → loại bỏ ngay
TITLE_TRASH_PATTERNS = [
    r'\bxổ số\b',
    r'\bkết quả xổ\b',
    r'\bsoi cầu\b',
    r'\bgiải mã giấc mơ\b',
    r'\btử vi\b',
    r'\bbóng đá\b',
    r'\bgiải vô địch\b',
    r'\bworld cup\b',
    r'\bgiải bóng\b',
    r'\blịch thi đấu\b',
    r'\bca nhạc\b',
    r'\bsao việt\b',
    r'\bcelebrity\b',
    r'\bđám cưới\b',
    r'\bly hôn\b',
    r'\bphim\b.{0,10}\b(chiếu|ra mắt|hay|mới)\b',
    r'\bthời tiết\b',
    r'\bbão\b.{0,15}\b(đổ bộ|xuất hiện|mạnh)\b',
    r'\bẩm thực\b',
    r'\bdu lịch\b.{0,15}\b(mùa|điểm đến|đẹp)\b',
    r'\bsức khỏe\b.{0,20}\b(mẹo|bí quyết|lợi ích)\b',
    r'\btuyển dụng\b',
    r'\btuyển sinh\b',
    r'\btrúng thưởng\b',
    r'\bgiải thưởng\b.{0,10}\b(nghệ thuật|âm nhạc|điện ảnh)\b',
]
_TRASH_RE = re.compile('|'.join(TITLE_TRASH_PATTERNS), re.IGNORECASE)


def _is_quality(article: dict) -> tuple[bool, str]:
    title   = (article.get('title') or '').strip()
    content = (article.get('content') or '').strip()

    if len(title) < MIN_TITLE_LEN:
        return False, f"title_too_short({len(title)})"

    if _TRASH_RE.search(title):
        return False, "title_trash_pattern"

    if content and len(content) < MIN_CONTENT_LEN:
        return False, f"content_too_short({len(content)})"

    return True, ""


# ══════════════════════════════════════════════════════════════════════════════
# 3. BỘ LỌC LIÊN QUAN ĐẦU TƯ (tầng 2)
# ══════════════════════════════════════════════════════════════════════════════

# Từ khóa tích cực — bài chứa ≥ 1 từ này → GIỮ ngay
FINANCIAL_KEYWORDS_KEEP = [
    # Kết quả kinh doanh
    "lợi nhuận", "doanh thu", "kqkd", "kết quả kinh doanh",
    "lãi trước thuế", "lãi sau thuế", "lãi ròng", "lỗ ròng",
    "biên lợi nhuận", "ebitda", "ebit", "eps", "roe", "roa",
    # Cổ tức & cổ phiếu
    "cổ tức", "chia cổ tức", "trả cổ tức", "tỷ lệ cổ tức",
    "phát hành cổ phiếu", "cổ phiếu thưởng", "quyền mua",
    "buyback", "mua lại cổ phiếu", "huỷ cổ phiếu quỹ",
    "room ngoại", "khối ngoại", "nước ngoài mua", "nước ngoài bán",
    # Thị trường
    "vn-index", "vn index", "hn-index", "vn30", "upcom",
    "thanh khoản", "điểm số", "phiên giao dịch", "phiên sáng", "phiên chiều",
    "margin", "ký quỹ", "cắt lỗ", "chốt lời", "bán tháo",
    "dòng tiền", "khớp lệnh", "mua ròng", "bán ròng",
    # Phân tích
    "khuyến nghị", "mua vào", "nắm giữ", "bán ra",
    "target price", "giá mục tiêu", "định giá", "p/e", "p/b",
    "kỹ thuật", "sóng elliott", "fibonacci", "hỗ trợ", "kháng cự",
    "breakout", "đảo chiều", "xu hướng",
    # Doanh nghiệp sự kiện
    "đại hội cổ đông", "đhđcđ", "hội đồng quản trị", "hđqt",
    "tổng giám đốc", "chủ tịch hđqt", "bổ nhiệm", "từ chức",
    "thâu tóm", "sáp nhập", "m&a", "mua lại", "thoái vốn",
    "phát hành trái phiếu", "trái phiếu doanh nghiệp", "lô trái phiếu",
    "niêm yết", "huỷ niêm yết", "ipo", "chuyển sàn",
    "cổ đông lớn", "cổ đông nội bộ", "insider", "tỷ lệ sở hữu",
    # Vĩ mô ảnh hưởng thị trường
    "lãi suất", "fed", "ngân hàng nhà nước", "nhnn",
    "tỷ giá", "usd/vnd", "tỷ giá usd", "dự trữ ngoại hối",
    "lạm phát", "cpi", "gdp", "tăng trưởng kinh tế",
    "chính sách tiền tệ", "nới lỏng", "thắt chặt",
    "thuế quan", "tariff", "trump", "thương chiến",
    "nâng hạng thị trường", "ftse", "msci",
    # Tín dụng & ngân hàng
    "nợ xấu", "npl", "tín dụng", "huy động vốn", "cho vay",
    "bảo hiểm tiền gửi", "vốn điều lệ", "tăng vốn",
    "room tín dụng", "hạn mức tín dụng",
    # Hàng hóa liên quan
    "giá vàng", "giá dầu", "giá thép", "giá đồng",
    "giá phân bón", "giá gas", "giá điện",
]
_KEEP_RE = re.compile(
    '|'.join(re.escape(kw) for kw in FINANCIAL_KEYWORDS_KEEP),
    re.IGNORECASE
)

# Từ khóa tiêu cực — bài KHÔNG chứa từ keep VÀ chứa từ này → LOẠI
NOISE_KEYWORDS_DROP = [
    "nông nghiệp", "trồng trọt", "chăn nuôi", "thuỷ sản", "cá tra",
    "xuất khẩu rau", "xuất khẩu gạo", "cà phê rang xay", "trái cây",
    "du lịch biển", "điểm du lịch", "khách sạn mới",
    "ẩm thực", "món ngon", "công thức nấu",
    "thể thao", "bóng đá", "cầu lông", "marathon",
    "sức khoẻ", "dinh dưỡng", "bệnh viện", "chữa bệnh",
    "học sinh", "sinh viên", "tuyển sinh", "học bổng",
    "giao thông", "kẹt xe", "tai nạn", "cầu đường",
    "thời tiết", "nhiệt độ", "mưa bão",
    "hôn nhân", "ly hôn", "đám cưới", "gia đình",
    "giải trí", "phim ảnh", "âm nhạc", "ca sĩ",
]
_DROP_RE = re.compile(
    '|'.join(re.escape(kw) for kw in NOISE_KEYWORDS_DROP),
    re.IGNORECASE
)

# Điểm relevance tối thiểu khi không có từ khóa keep cứng
MIN_RELEVANCE_SCORE = 1

def _relevance_score(text: str) -> int:
    """Đếm số lần xuất hiện từ khóa tài chính trong title+content."""
    return len(_KEEP_RE.findall(text))


def _is_relevant(article: dict) -> tuple[bool, str]:
    title   = (article.get('title') or '')
    content = (article.get('content') or '')
    full    = f"{title} {content}"

    # Có mã CK cụ thể → luôn giữ (bất kể content)
    if article.get('symbol') or article.get('affected_symbols'):
        return True, ""

    score = _relevance_score(full)
    if score >= MIN_RELEVANCE_SCORE:
        return True, ""

    # Không có từ khóa keep nhưng có từ khóa nhiễu
    if _DROP_RE.search(title):
        return False, f"noise_title(score={score})"

    # Không từ khóa nào — xem content
    if not content:
        return False, "no_content_no_keywords"

    return False, f"low_relevance(score={score})"


# ══════════════════════════════════════════════════════════════════════════════
# 4. DEDUPLICATION CROSS-SOURCE (tầng 3)
# ══════════════════════════════════════════════════════════════════════════════

DEDUP_SIMILARITY_THRESHOLD = 0.55  # Jaccard trên bag-of-words title


def _normalize_title(title: str) -> set[str]:
    """Lowercase, bỏ dấu, tách từ → set."""
    title = title.lower()
    # Bỏ dấu tiếng Việt
    title = unicodedata.normalize('NFD', title)
    title = ''.join(c for c in title if unicodedata.category(c) != 'Mn')
    # Giữ chữ, số, khoảng trắng
    title = re.sub(r'[^\w\s]', ' ', title)
    words = title.split()
    # Bỏ stopwords ngắn (< 2 ký tự)
    return {w for w in words if len(w) > 2}


def _jaccard(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def _dedup_by_title(articles: list[dict]) -> list[dict]:
    """
    Với mỗi cặp bài có tiêu đề tương tự (Jaccard >= threshold),
    giữ bài từ nguồn uy tín hơn. Chạy O(n²) nhưng n thường < 500.
    """
    n = len(articles)
    keep = [True] * n

    # Cache normalized titles
    norm = [_normalize_title(a.get('title', '')) for a in articles]

    for i in range(n):
        if not keep[i]:
            continue
        for j in range(i + 1, n):
            if not keep[j]:
                continue
            sim = _jaccard(norm[i], norm[j])
            if sim >= DEDUP_SIMILARITY_THRESHOLD:
                # Giữ nguồn có priority thấp hơn (uy tín cao hơn)
                pri_i = SOURCE_PRIORITY.get(articles[i].get('source', ''), DEFAULT_PRIORITY)
                pri_j = SOURCE_PRIORITY.get(articles[j].get('source', ''), DEFAULT_PRIORITY)
                if pri_i <= pri_j:
                    keep[j] = False
                else:
                    keep[i] = False
                    break  # i đã bị loại, chuyển sang i+1

    return [a for a, k in zip(articles, keep) if k]


# ══════════════════════════════════════════════════════════════════════════════
# 5. ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

def run_quality_filter(articles: list[dict]) -> list[dict]:
    """
    Chỉ áp dụng tầng 1 (chất lượng) — không cần content.
    Dùng để pre-filter trước khi enrich, tránh enrich bài rác rõ ràng.
    """
    passed = []
    for a in articles:
        ok, _ = _is_quality(a)
        if ok:
            passed.append(a)
    return passed


def run_filter(articles: list[dict], verbose: bool = True) -> list[dict]:
    """
    Áp dụng toàn bộ 3 tầng lọc.
    Trả về list bài sạch, sắp xếp theo source priority → published_at mới nhất.
    """
    before = len(articles)

    # Tầng 1: chất lượng
    passed_q, dropped_q = [], []
    for a in articles:
        ok, reason = _is_quality(a)
        if ok:
            passed_q.append(a)
        else:
            dropped_q.append((a.get('title', '')[:50], a.get('source', ''), reason))

    # Tầng 2: liên quan
    passed_r, dropped_r = [], []
    for a in passed_q:
        ok, reason = _is_relevant(a)
        if ok:
            passed_r.append(a)
        else:
            dropped_r.append((a.get('title', '')[:50], a.get('source', ''), reason))

    # Tầng 3: dedup cross-source
    passed_d = _dedup_by_title(passed_r)
    n_dedup = len(passed_r) - len(passed_d)

    if verbose:
        print(f"\n  ── CONTENT FILTER ──────────────────────────────────────")
        print(f"  Đầu vào:       {before:4d} bài")
        print(f"  Sau chất lượng:{len(passed_q):4d} bài  (loại {len(dropped_q)} — ngắn/rác)")
        print(f"  Sau liên quan: {len(passed_r):4d} bài  (loại {len(dropped_r)} — không tài chính)")
        print(f"  Sau dedup:     {len(passed_d):4d} bài  (loại {n_dedup} bài trùng)")
        print(f"  ────────────────────────────────────────────────────────")

        if dropped_q:
            print(f"\n  [Chất lượng — loại {len(dropped_q)} bài]")
            for title, src, reason in dropped_q[:10]:
                print(f"    {src:<22} {reason:<30} {title}")
            if len(dropped_q) > 10:
                print(f"    ... và {len(dropped_q)-10} bài khác")

        if dropped_r:
            print(f"\n  [Không liên quan — loại {len(dropped_r)} bài]")
            for title, src, reason in dropped_r[:10]:
                print(f"    {src:<22} {reason:<30} {title}")
            if len(dropped_r) > 10:
                print(f"    ... và {len(dropped_r)-10} bài khác")

    # Sắp xếp: uy tín cao → mới nhất
    def sort_key(a):
        pri = SOURCE_PRIORITY.get(a.get('source', ''), DEFAULT_PRIORITY)
        pub = a.get('published_at')
        if isinstance(pub, datetime):
            ts = pub.timestamp()
        elif isinstance(pub, str) and pub:
            try:
                ts = datetime.fromisoformat(pub).timestamp()
            except Exception:
                ts = 0.0
        else:
            ts = 0.0
        return (pri, -ts)

    passed_d.sort(key=sort_key)
    return passed_d


# ── Thống kê nhanh theo nguồn ─────────────────────────────────────────────────

def print_source_stats(articles: list[dict], label: str = "Sau filter"):
    from collections import Counter
    counts = Counter(a.get('source', 'unknown') for a in articles)
    print(f"\n  [{label}]")
    for src in sorted(counts, key=lambda s: SOURCE_PRIORITY.get(s, DEFAULT_PRIORITY)):
        print(f"    {src:<24} {counts[src]:3d} bài")
    print(f"    {'TỔNG':<24} {sum(counts.values()):3d} bài")
