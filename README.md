# Wealbee

Nền tảng tin tức tài chính thông minh cho nhà đầu tư chứng khoán Việt Nam — tự động thu thập, lọc, phân loại và đánh giá tác động của tin tức đến danh mục cổ phiếu, sau đó gửi digest email cá nhân hoá.

---

## Kiến trúc tổng quan

```
[Crawlers] → [Content Filter] → [Supabase: market_news]
                                        ↓
                              [T1 Labeling — GPT-4o-mini]
                              Phân loại loại tin + trích xuất ticker/ngành
                                        ↓
                              [T2 Impact Scoring — LLM]
                              Đánh giá tác động danh mục (−10..+10)
                                        ↓
                              [Email Digest — Resend]
                              Bản tin sáng cá nhân hoá theo holdings
```

---

## Cấu trúc thư mục

```
wealbee2526/
├── src/                        # Frontend React + TypeScript (Vite)
│   ├── components/             # UI components (NotificationBell, ...)
│   ├── pages/                  # App pages
│   └── ...
├── toolcrawldata/              # Backend Python — pipeline dữ liệu
│   ├── crawlers/               # Scrapers theo từng nguồn
│   │   ├── vnexpress_scraper.py
│   │   ├── vietstock_scraper.py
│   │   ├── cafef_scraper.py
│   │   ├── baodautu_scraper.py
│   │   ├── nhadautu_scraper.py
│   │   ├── tinnhanh_scraper.py
│   │   └── markettimes_scraper.py
│   ├── content_filter.py       # Lọc 3 tầng: chất lượng → tài chính → dedup
│   ├── run_labeling.py         # T1: GPT-4o-mini phân loại + entity extraction
│   ├── pipeline_runner.py      # T2: Đánh giá tác động danh mục (fund manager framework)
│   ├── email_notifier.py       # Gửi digest email qua Resend
│   ├── test_crawl_only.py      # Chạy toàn pipeline crawl → filter → upsert
│   ├── supabase_writer.py      # Helper upsert Supabase
│   └── populate_sectors.py     # Seed dữ liệu ngành
├── supabase/migrations/        # SQL migrations theo thứ tự
├── email-templates/
│   └── email_morning.html      # Template bản tin sáng
└── .env.example
```

---

## Data Pipeline

### Nguồn tin (7 crawlers)

| Nguồn | File | Danh mục crawl |
|---|---|---|
| VnExpress | `vnexpress_scraper.py` | Kinh doanh, chứng khoán |
| Vietstock | `vietstock_scraper.py` | Tin tức CK, KQKD |
| CafeF | `cafef_scraper.py` | Doanh nghiệp, thị trường |
| BaoDauTu | `baodautu_scraper.py` | Đầu tư, chính sách |
| NhaDauTu | `nhadautu_scraper.py` | Chứng khoán, tài chính |
| TinNhanhCK | `tinnhanh_scraper.py` | Chứng khoán, doanh nghiệp |
| MarketTimes | `markettimes_scraper.py` | Phân tích thị trường |

### Content Filter — 3 tầng (`content_filter.py`)

1. **Tầng 1 — Chất lượng**: Lọc bài quá ngắn, thiếu nội dung, trùng tiêu đề
2. **Tầng 2 — Tài chính**: Kiểm tra từ khoá liên quan CK/tài chính/doanh nghiệp VN
3. **Tầng 3 — Dedup**: Hash URL + title để tránh upsert trùng

### T1 Labeling (`run_labeling.py`)

Dùng **GPT-4o-mini** xử lý batch 5 bài/lần:
- Đánh giá tính liên quan (`is_relevant`)
- Phân loại loại tin: `Vĩ mô | Ngành | Doanh nghiệp | Thị trường | Pháp lý | Sự kiện`
- Trích xuất ticker, ngành, số liệu quan trọng, tóm tắt bài

```bash
python3 run_labeling.py              # 24h gần nhất
python3 run_labeling.py --hours 48   # mở rộng lookback
python3 run_labeling.py --all        # toàn bộ chưa label
```

### T2 Impact Scoring (`pipeline_runner.py`)

**Fund Manager Framework** — đánh giá tác động mỗi bài lên danh mục:

```
Bước 1: Kiểm tra exposure (cao / trung / thấp / không)
Bước 2: F1 (ngắn hạn, 55%) + F2 (dài hạn, 45%) × F3 (độ chắc chắn /10)
         Score = (F1×0.55 + F2×0.45) × F3/10
Bước 3: Điều chỉnh sentiment thị trường ±1–2
```

Kết quả ghi vào `market_news`:
- `label`: `positive | negative | neutral`
- `impact_score`: NUMERIC(4,1) từ −10 đến +10
- `impact_reasoning`: Giải thích ngắn bằng tiếng Việt

---

## Database Schema (`market_news`)

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | uuid | Primary key |
| `title` | text | Tiêu đề bài |
| `content` | text | Nội dung đầy đủ |
| `source` | text | Nguồn crawl |
| `article_url` | text | URL gốc (unique) |
| `published_at` | timestamptz | Thời gian đăng |
| `news_type` | text | Loại tin (T1) |
| `affected_symbols` | text[] | Tickers liên quan (T1) |
| `label` | text | `positive/negative/neutral` (T2) |
| `impact_score` | numeric(4,1) | Điểm tác động −10..+10 (T2) |
| `impact_reasoning` | text | Giải thích AI (T2) |
| `labeled_at` | timestamptz | Thời điểm T1 |
| `impact_scored_at` | timestamptz | Thời điểm T2 |
| `sector_impacts` | jsonb | Tác động theo ngành (T2 macro) |

### Migrations (theo thứ tự)

```
20260423000000_create_subscribers.sql
20260426000000_security_hardening.sql
20260428000002_alter_market_news_add_news_type.sql
20260429000001_alter_market_news_add_impact.sql
20260430000001_add_sector_and_macro_scoring.sql
```

---

## Email Digest (`email_notifier.py`)

Gửi bản tin sáng cá nhân hoá qua **Resend** theo template `email_morning.html`:

- Header/footer Wealbee branding (`#030213`)
- Mỗi cổ phiếu trong holdings: top 3 tin tác động mạnh nhất
- Badge phân loại: `TÍCH CỰC MẠNH / TÍCH CỰC / TIÊU CỰC / RẤT TIÊU CỰC`
- Box **"AI giải thích"** — nội dung từ `impact_reasoning` trong Supabase

---

## Cài đặt & Chạy

### Frontend

```bash
npm install
npm run dev
```

### Backend Python

```bash
cd toolcrawldata
pip install -r requirements.txt
cp .env.example .env   # điền các key
```

### Biến môi trường (`.env`)

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=...
OPENAI_API_KEY=...
RESEND_API_KEY=...
```

### Chạy pipeline đầy đủ

```bash
# 1. Crawl + filter + upsert tất cả nguồn
python3 test_crawl_only.py

# 2. T1 labeling
python3 run_labeling.py

# 3. T2 scoring (qua pipeline_runner)
python3 pipeline_runner.py

# 4. Gửi email digest
python3 email_notifier.py
```

---

## Chi phí API ước tính

| Task | Model | Token | Chi phí |
|---|---|---|---|
| T1 Labeling (19,600 bài) | GPT-4o-mini | 5.15M in / 1.57M out | ~$1.71 |
| T2 Scoring (1,031 bài) | GPT-4o | 0.11M in / 0.05M out | ~$0.78 |
| **Tổng mỗi lần chạy** | | | **~$2.50** |

> T2 có thể chạy bằng Claude VS Code subscription để tiết kiệm hoàn toàn chi phí.

---

## Branch hiện tại: `Test-prompt`

### Những gì đã thêm/thay đổi

| File | Thay đổi |
|---|---|
| `toolcrawldata/run_labeling.py` | **Mới** — T1 labeling pipeline với GPT-4o-mini |
| `toolcrawldata/content_filter.py` | **Mới** — Bộ lọc 3 tầng chất lượng + tài chính + dedup |
| `toolcrawldata/crawlers/cafef_scraper.py` | **Mới** — Scraper CafeF |
| `toolcrawldata/crawlers/baodautu_scraper.py` | **Mới** — Scraper BaoDauTu |
| `toolcrawldata/crawlers/nhadautu_scraper.py` | **Mới** — Scraper NhaDauTu |
| `toolcrawldata/crawlers/tinnhanh_scraper.py` | **Mới** — Scraper TinNhanhChungKhoan |
| `toolcrawldata/test_crawl_only.py` | **Mới** — Unified runner toàn bộ pipeline crawl |
| `toolcrawldata/test_filter_pipeline.py` | **Mới** — Standalone filter test |
| `toolcrawldata/populate_sectors.py` | **Mới** — Seed dữ liệu ngành |
| `toolcrawldata/pipeline_runner.py` | **Cập nhật** — T2 fund manager scoring framework |
| `toolcrawldata/email_notifier.py` | **Cập nhật** — Resend email digest theo template |
| `toolcrawldata/crawlers/vietstock_scraper.py` | **Cập nhật** — Cải thiện date parsing, dedup |
| `toolcrawldata/crawlers/markettimes_scraper.py` | **Cập nhật** — Minor fixes |
| `toolcrawldata/.env.example` | **Cập nhật** — Thêm RESEND_API_KEY |
| `supabase/migrations/20260430000001_...sql` | **Mới** — Thêm sector_impacts JSONB |
| `src/components/NotificationBell.tsx` | **Cập nhật** — UI polish |
