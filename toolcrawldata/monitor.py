"""Wealbee monitoring — Telegram alerts, nhẹ hơn ELK, phù hợp scale hiện tại."""
import os
import logging
import requests
from datetime import datetime
from collections import Counter

logger = logging.getLogger(__name__)

TRUSTED_SOURCES = {"vnexpress.net", "vietstock.vn", "cafef.vn", "tinnhanhchungkhoan.vn"}


class WealbeeMonitor:
    def __init__(self):
        self.token = os.getenv("TELEGRAM_BOT_TOKEN")
        self.chat_id = os.getenv("TELEGRAM_CHAT_ID")
        self.metrics = {
            "crawled": 0,
            "labeled": 0,
            "emails_sent": 0,
            "errors": 0,
        }

    def alert(self, level: str, message: str):
        icons = {"INFO": "ℹ️", "WARNING": "⚠️", "CRITICAL": "🚨"}
        text = (
            f"{icons.get(level, '📢')} *Wealbee {level}*\n"
            f"{message}\n"
            f"_{datetime.now().strftime('%Y-%m-%d %H:%M')} ICT_"
        )
        if not self.token or not self.chat_id:
            logger.warning("Telegram credentials not set — alert skipped")
            return
        try:
            requests.post(
                f"https://api.telegram.org/bot{self.token}/sendMessage",
                json={"chat_id": self.chat_id, "text": text, "parse_mode": "Markdown"},
                timeout=5,
            )
        except Exception as e:
            logger.error(f"Telegram alert failed: {e}")

    def check_sentiment_anomaly(self, labels: list[str], window_label: str = "batch") -> bool:
        """Phát hiện spike bất thường: >80% cùng chiều trong 1 batch."""
        total = len(labels)
        if total < 10:
            return False
        counter = Counter(labels)
        neg_ratio = counter.get("negative", 0) / total
        pos_ratio = counter.get("positive", 0) / total
        if neg_ratio > 0.8 or pos_ratio > 0.8:
            direction = "negative" if neg_ratio > 0.8 else "positive"
            ratio = neg_ratio if neg_ratio > 0.8 else pos_ratio
            logger.critical(f"ANOMALY: {direction} spike {ratio:.0%} in {window_label}")
            self.alert(
                "CRITICAL",
                f"Sentiment spike phát hiện trong {window_label}\n"
                f"• {direction.upper()}: {ratio:.0%} ({counter.get(direction, 0)}/{total} bài)\n"
                f"Kiểm tra nguồn tin ngay!",
            )
            return True
        return False

    def validate_source_url(self, url: str) -> bool:
        """Chỉ cho phép crawl từ nguồn đã whitelist."""
        from urllib.parse import urlparse
        try:
            domain = urlparse(url).netloc.replace("www.", "")
            if domain not in TRUSTED_SOURCES:
                logger.warning(f"Untrusted source blocked: {domain}")
                self.metrics["errors"] += 1
                return False
            return True
        except Exception:
            return False

    def report_pipeline(self):
        m = self.metrics
        status = "✅ Thành công" if m["errors"] == 0 else f"⚠️ {m['errors']} lỗi"
        self.alert(
            "INFO",
            f"Pipeline hoàn thành — {status}\n"
            f"• Crawled: {m['crawled']} bài\n"
            f"• Labeled: {m['labeled']} bài\n"
            f"• Emails: {m['emails_sent']} đã gửi\n"
            f"• Errors: {m['errors']}",
        )

    def alert_key_leak(self, service: str):
        self.alert(
            "CRITICAL",
            f"🔑 Nghi ngờ lộ API key: *{service}*\n"
            f"1. Rotate key ngay tại dashboard\n"
            f"2. Cập nhật GitHub Secrets\n"
            f"3. Kiểm tra git log",
        )

    def alert_login_anomaly(self, user_email: str, ip: str):
        self.alert(
            "WARNING",
            f"Login bất thường\n"
            f"• Email: {user_email}\n"
            f"• IP: {ip}\n"
            f"Xem xét khóa tài khoản nếu cần.",
        )


monitor = WealbeeMonitor()
