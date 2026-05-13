"""
daily_sampling.py
─────────────────
Chọn 20 bài từ market_news trong 24h gần nhất và lưu vào daily_review_samples.
Chạy mỗi ngày lúc 0:00 UTC (7:00 AM Vietnam) qua GitHub Actions.

Phân phối:
  4  top_impact      – abs(impact_score) cao nhất, mọi nhãn
  4  very_positive   – random trong pool very_positive
  3  positive        – random trong pool positive
  2  neutral         – random trong pool neutral
  3  negative        – random trong pool negative
  4  very_negative   – random trong pool very_negative
  → dedup → nếu thiếu thì fill bằng random_fill từ toàn bộ pool
"""

import os
import random
import logging
from datetime import datetime, timezone, timedelta

from supabase import create_client, Client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

TARGET_TOTAL = 20

SLOTS: list[tuple[str, int]] = [
    ("top_impact",    4),
    ("very_positive", 4),
    ("positive",      3),
    ("neutral",       2),
    ("negative",      3),
    ("very_negative", 4),
]

VALID_LABELS = {"very_positive", "positive", "neutral", "negative", "very_negative"}


def fetch_pool(sb: Client, since_iso: str) -> list[dict]:
    """Lấy toàn bộ news 24h gần nhất (bỏ trash, bỏ null label)."""
    resp = (
        sb.table("market_news")
        .select("id, label, impact_score")
        .not_.in_("label", ["trash"])
        .not_.is_("label", None)
        .gte("published_at", since_iso)
        .execute()
    )
    return resp.data or []


def sample_today(pool: list[dict]) -> list[tuple[str, str]]:
    """
    Trả về list (news_id, slot_type) đã dedup, tổng <= TARGET_TOTAL.
    """
    by_label: dict[str, list[str]] = {lbl: [] for lbl in VALID_LABELS}
    for row in pool:
        lbl = row.get("label")
        if lbl in by_label:
            by_label[lbl].append(row["id"])

    # Shuffle mỗi bucket
    for bucket in by_label.values():
        random.shuffle(bucket)

    selected: list[tuple[str, str]] = []  # (news_id, slot_type)
    used_ids: set[str] = set()

    # ── Top impact ────────────────────────────────────────────────────────────
    scored = [r for r in pool if r.get("impact_score") is not None]
    scored.sort(key=lambda r: abs(r["impact_score"]), reverse=True)
    for row in scored:
        if len([x for x in selected if x[1] == "top_impact"]) >= SLOTS[0][1]:
            break
        if row["id"] not in used_ids:
            selected.append((row["id"], "top_impact"))
            used_ids.add(row["id"])

    # ── Label buckets ─────────────────────────────────────────────────────────
    for slot_type, quota in SLOTS[1:]:   # skip top_impact already done
        count = 0
        for nid in by_label.get(slot_type, []):
            if count >= quota:
                break
            if nid not in used_ids:
                selected.append((nid, slot_type))
                used_ids.add(nid)
                count += 1

    # ── Random fill if still short ────────────────────────────────────────────
    remaining_ids = [r["id"] for r in pool if r["id"] not in used_ids]
    random.shuffle(remaining_ids)
    for nid in remaining_ids:
        if len(selected) >= TARGET_TOTAL:
            break
        selected.append((nid, "random_fill"))
        used_ids.add(nid)

    return selected[:TARGET_TOTAL]


def run():
    sb: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    today = datetime.now(timezone.utc).date()
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    since_iso = since.isoformat()

    log.info("Sample date: %s | Pool window: last 24h (since %s)", today, since_iso)

    # Kiểm tra đã sample hôm nay chưa
    existing = (
        sb.table("daily_review_samples")
        .select("id", count="exact")
        .eq("sample_date", today.isoformat())
        .execute()
    )
    if existing.count and existing.count > 0:
        log.info("Sample for %s already exists (%d rows). Skipping.", today, existing.count)
        return

    pool = fetch_pool(sb, since_iso)
    log.info("Pool size: %d articles", len(pool))

    if not pool:
        log.warning("No articles in pool — nothing to sample.")
        return

    sampled = sample_today(pool)
    log.info("Sampled %d articles", len(sampled))

    # Đếm phân phối thực tế
    from collections import Counter
    dist = Counter(slot for _, slot in sampled)
    for slot, quota in SLOTS:
        log.info("  %-16s quota=%d  actual=%d", slot, quota, dist.get(slot, 0))
    if dist.get("random_fill", 0):
        log.info("  %-16s (fill)    actual=%d", "random_fill", dist["random_fill"])

    rows = [
        {"sample_date": today.isoformat(), "news_id": nid, "slot_type": slot}
        for nid, slot in sampled
    ]

    sb.table("daily_review_samples").insert(rows).execute()
    log.info("Inserted %d rows into daily_review_samples for %s", len(rows), today)


if __name__ == "__main__":
    run()
