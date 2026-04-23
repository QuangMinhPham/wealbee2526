"""
Shared Supabase writer dùng chung cho tất cả scrapers.

Cách dùng:
    from supabase_writer import get_client

    sb = get_client()
    sb.table("market_data_stocks").upsert(records, on_conflict="symbol").execute()

Biến môi trường cần thiết (đặt trong toolcrawldata/.env hoặc export):
    SUPABASE_URL         — ví dụ: https://xpoucdxmowaeopotclli.supabase.co
    SUPABASE_SERVICE_KEY — service_role key (không dùng anon key, cần bypass RLS)
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Tự động load .env từ cùng thư mục với file này
_env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(_env_path)


def get_client() -> Client:
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_KEY", "").strip()

    if not url:
        raise EnvironmentError(
            "Thiếu SUPABASE_URL. Thêm vào toolcrawldata/.env hoặc export biến môi trường."
        )
    if not key:
        raise EnvironmentError(
            "Thiếu SUPABASE_SERVICE_KEY. Dùng service_role key từ Supabase Dashboard → Settings → API."
        )

    return create_client(url, key)


def upsert_batch(client: Client, table: str, records: list[dict], on_conflict: str) -> int:
    """
    Upsert một batch records vào bảng, chia nhỏ thành chunk 500 rows.
    Trả về tổng số rows đã upsert thành công.
    """
    if not records:
        return 0

    chunk_size = 500
    total = 0
    for i in range(0, len(records), chunk_size):
        chunk = records[i : i + chunk_size]
        client.table(table).upsert(chunk, on_conflict=on_conflict).execute()
        total += len(chunk)

    return total
