import { useState, useEffect, useMemo } from "react";
import { pipelineSupabase } from "../lib/supabase/pipeline-client";
import {
  TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp,
  Zap, ExternalLink, RefreshCw, CheckCircle2, XCircle,
  ClipboardList, AlertTriangle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Label5 = "very_positive" | "positive" | "neutral" | "negative" | "very_negative";

interface ReviewArticle {
  // from daily_review_samples
  sample_id: string;
  slot_type: string;
  // from market_news (joined)
  id: string;
  title: string;
  content: string | null;
  content_summary: string | null;
  article_url: string;
  label: Label5;
  impact_score: number | null;
  impact_reasoning: string | null;
  affected_symbols: string[] | null;
  source: string;
  published_at: string;
  news_type: string | null;
  expert_label: Label5 | null;
  expert_reason: string | null;
}

interface ExpertState {
  verdict: "correct" | "wrong" | null;   // null = chưa review
  chosenLabel: Label5 | null;            // chỉ dùng khi verdict = "wrong"
  reason: string;
  saving: boolean;
  saved: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LABEL_VI: Record<Label5, string> = {
  very_positive: "Rất tích cực",
  positive:      "Tích cực",
  neutral:       "Trung lập",
  negative:      "Tiêu cực",
  very_negative: "Rất tiêu cực",
};

const LABEL_COLOR: Record<Label5, { text: string; bg: string; border: string }> = {
  very_positive: { text: "#059669", bg: "rgba(16,185,129,0.12)", border: "#10b981" },
  positive:      { text: "#16a34a", bg: "rgba(22,163,74,0.10)",  border: "#16a34a" },
  neutral:       { text: "#64748b", bg: "rgba(100,116,139,0.08)", border: "#94a3b8" },
  negative:      { text: "#dc2626", bg: "rgba(220,38,38,0.10)",  border: "#dc2626" },
  very_negative: { text: "#b91c1c", bg: "rgba(185,28,28,0.12)",  border: "#ef4444" },
};

const SLOT_LABEL: Record<string, string> = {
  top_impact:    "Top tác động",
  very_positive: "Rất tích cực",
  positive:      "Tích cực",
  neutral:       "Trung lập",
  negative:      "Tiêu cực",
  very_negative: "Rất tiêu cực",
  random_fill:   "Random fill",
};

const SOURCE_LABEL: Record<string, string> = {
  vietstock:           "Vietstock",
  markettimes:         "Markettimes",
  thoibaotaichinhvietnam: "Thời báo TCVN",
  baodautu:            "Báo Đầu tư",
  stockbiz:            "Stockbiz",
  kinhtechungkhoan:    "KT Chứng khoán",
  nhadautu:            "Nhà đầu tư",
  tinnhanhchungkhoan:  "Tin nhanh CK",
  cafef:               "CafeF",
};

const NEWS_TYPE_VI: Record<string, string> = {
  vi_mo:       "Vĩ mô",
  vi_mo_dn:    "Vĩ mô ngành",
  hoat_dong_kd:"Hoạt động KD",
  phap_ly:     "Pháp lý",
  thi_truong:  "Thị trường",
  du_bao:      "Dự báo",
};

const ALL_LABELS: Label5[] = ["very_positive", "positive", "neutral", "negative", "very_negative"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function srcLabel(s: string) { return SOURCE_LABEL[s] || s; }

function formatDatetime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function todayVietnam(): string {
  // Returns YYYY-MM-DD in UTC+7
  const now = new Date();
  const vn = new Date(now.getTime() + 7 * 3600 * 1000);
  return vn.toISOString().slice(0, 10);
}

function borderColor(label: Label5): string {
  return LABEL_COLOR[label]?.border ?? "#94a3b8";
}

// ── Data fetch ────────────────────────────────────────────────────────────────

async function fetchSamples(date: string): Promise<ReviewArticle[]> {
  // daily_review_samples JOIN market_news via news_id
  const { data, error } = await pipelineSupabase
    .from("daily_review_samples")
    .select(`
      id,
      slot_type,
      market_news (
        id, title, content, content_summary, article_url,
        label, impact_score, impact_reasoning,
        affected_symbols, source, published_at, news_type,
        expert_label, expert_reason
      )
    `)
    .eq("sample_date", date)
    .order("slot_type");

  if (error) throw error;

  return ((data ?? []) as any[]).map((row) => ({
    sample_id: row.id,
    slot_type:  row.slot_type,
    ...row.market_news,
  }));
}

async function upsertExpertReview(
  newsId: string,
  expertLabel: Label5,
  expertReason: string
) {
  const { error } = await pipelineSupabase
    .from("market_news")
    .update({ expert_label: expertLabel, expert_reason: expertReason || null })
    .eq("id", newsId);
  if (error) throw error;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AdminDailyReview() {
  const [articles, setArticles] = useState<ReviewArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // expertStates keyed by news_id
  const [expertStates, setExpertStates] = useState<Record<string, ExpertState>>({});

  const today = todayVietnam();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSamples(today);
      setArticles(data);

      // Pre-fill states từ DB (đã review phiên trước)
      const init: Record<string, ExpertState> = {};
      for (const a of data) {
        if (a.expert_label) {
          const wasCorrect = a.expert_label === a.label;
          init[a.id] = {
            verdict:     wasCorrect ? "correct" : "wrong",
            chosenLabel: wasCorrect ? null : a.expert_label,
            reason:      a.expert_reason ?? "",
            saving: false,
            saved: true,
          };
        } else {
          init[a.id] = { verdict: null, chosenLabel: null, reason: "", saving: false, saved: false };
        }
      }
      setExpertStates(init);
    } catch (e: any) {
      setError(e?.message ?? "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setField = (newsId: string, patch: Partial<ExpertState>) =>
    setExpertStates((prev) => ({ ...prev, [newsId]: { ...prev[newsId], ...patch } }));

  const handleVerdict = (article: ReviewArticle, verdict: "correct" | "wrong") => {
    setField(article.id, {
      verdict,
      chosenLabel: verdict === "correct" ? null : (expertStates[article.id]?.chosenLabel ?? null),
      saved: false,
    });
    // Nếu đánh "đúng", tự save ngay (label = AI label)
    if (verdict === "correct") {
      saveReview(article, verdict, null, expertStates[article.id]?.reason ?? "");
    }
  };

  const saveReview = async (
    article: ReviewArticle,
    verdict: "correct" | "wrong",
    chosenLabel: Label5 | null,
    reason: string
  ) => {
    const finalLabel: Label5 = verdict === "correct" ? article.label : (chosenLabel ?? article.label);
    setField(article.id, { saving: true });
    try {
      await upsertExpertReview(article.id, finalLabel, reason);
      setField(article.id, { saving: false, saved: true });
    } catch (e: any) {
      setField(article.id, { saving: false });
      alert("Lưu thất bại: " + (e?.message ?? "unknown error"));
    }
  };

  const reviewedCount = useMemo(
    () => Object.values(expertStates).filter((s) => s.saved).length,
    [expertStates]
  );

  if (loading) return <LoadingState />;
  if (error)   return <ErrorState message={error} onRetry={load} />;

  const noSample = articles.length === 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList style={{ width: 18, height: 18, color: "#0849ac" }} />
            <h1>Gán nhãn chuyên gia</h1>
          </div>
          <p className="text-muted-foreground" style={{ fontSize: "0.875rem" }}>
            {today} · Review và xác nhận nhãn AI để xây dựng dataset chất lượng
          </p>
        </div>
        <button
          onClick={load}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 8,
            border: "1px solid rgba(8,73,172,0.15)",
            background: "#ffffff", cursor: "pointer",
            fontSize: "0.8125rem", color: "#0849ac",
          }}
        >
          <RefreshCw style={{ width: 13, height: 13 }} />
          Làm mới
        </button>
      </div>

      {/* Progress bar */}
      {!noSample && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
              Tiến độ hôm nay
            </span>
            <span style={{ fontSize: "0.875rem", fontWeight: 700, color: reviewedCount === articles.length ? "#059669" : "#0849ac" }}>
              {reviewedCount}/{articles.length}
            </span>
          </div>
          <div style={{ height: 8, background: "rgba(8,73,172,0.08)", borderRadius: 99, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${articles.length > 0 ? (reviewedCount / articles.length) * 100 : 0}%`,
                background: reviewedCount === articles.length ? "#10b981" : "#0849ac",
                borderRadius: 99,
                transition: "width 0.4s ease",
              }}
            />
          </div>
          {reviewedCount === articles.length && (
            <p style={{ fontSize: "0.8125rem", color: "#059669", fontWeight: 600, marginTop: 8 }}>
              Hoàn thành! Tất cả {articles.length} bài đã được review.
            </p>
          )}
        </div>
      )}

      {noSample ? (
        <NoSampleState date={today} />
      ) : (
        <div className="space-y-4">
          {articles.map((article, idx) => {
            const st = expertStates[article.id] ?? { verdict: null, chosenLabel: null, reason: "", saving: false, saved: false };
            const isExpanded = expandedId === article.id;
            const aiColor = LABEL_COLOR[article.label];
            const SentIcon = ["positive","very_positive"].includes(article.label) ? TrendingUp
                           : ["negative","very_negative"].includes(article.label) ? TrendingDown
                           : Minus;

            return (
              <div
                key={article.id}
                style={{
                  borderTop:    `1px solid ${st.saved ? "rgba(16,185,129,0.25)" : "rgba(0,0,0,0.07)"}`,
                  borderRight:  `1px solid ${st.saved ? "rgba(16,185,129,0.25)" : "rgba(0,0,0,0.07)"}`,
                  borderBottom: `1px solid ${st.saved ? "rgba(16,185,129,0.25)" : "rgba(0,0,0,0.07)"}`,
                  borderLeft:   `3px solid ${borderColor(article.label)}`,
                  borderRadius: "0 10px 10px 0",
                  background:   st.saved ? "rgba(16,185,129,0.02)" : "var(--card)",
                  transition:   "all 0.2s",
                }}
              >
                {/* ── Card header (clickable) ── */}
                <div
                  style={{ padding: "14px 16px", cursor: "pointer" }}
                  onClick={() => setExpandedId(isExpanded ? null : article.id)}
                >
                  {/* Meta row */}
                  <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 8 }}>
                    {/* Index */}
                    <span style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: "rgba(8,73,172,0.08)", color: "#0849ac",
                      fontSize: "0.6875rem", fontWeight: 700,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {idx + 1}
                    </span>

                    {/* AI label pill */}
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "2px 8px 2px 6px", borderRadius: 20,
                      background: aiColor.bg, color: aiColor.text,
                      fontSize: "0.6875rem", fontWeight: 700,
                    }}>
                      <SentIcon style={{ width: 11, height: 11 }} />
                      {LABEL_VI[article.label]}
                    </span>

                    {/* Slot type */}
                    <span style={{
                      padding: "2px 7px", borderRadius: 4,
                      background: "rgba(8,73,172,0.06)", color: "#0849ac",
                      fontSize: "0.625rem", fontWeight: 500,
                    }}>
                      {SLOT_LABEL[article.slot_type] ?? article.slot_type}
                    </span>

                    {/* News type */}
                    {article.news_type && NEWS_TYPE_VI[article.news_type] && (
                      <span style={{
                        padding: "2px 7px", borderRadius: 4,
                        background: "#f0f0f8", color: "#5a5a7a",
                        fontSize: "0.625rem", fontWeight: 500,
                      }}>
                        {NEWS_TYPE_VI[article.news_type]}
                      </span>
                    )}

                    <span style={{ fontSize: "0.75rem", color: "#94a3b8", marginLeft: 2 }}>
                      {srcLabel(article.source)}
                    </span>
                    <span style={{ fontSize: "0.6875rem", color: "#cbd5e1" }}>·</span>
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                      {formatDatetime(article.published_at)}
                    </span>

                    {/* Impact score */}
                    {article.impact_score !== null && (
                      <span style={{
                        marginLeft: "auto",
                        fontSize: "0.6875rem", fontWeight: 700,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: aiColor.text,
                      }}>
                        {article.impact_score > 0 ? "+" : ""}{article.impact_score.toFixed(1)}
                      </span>
                    )}

                    {/* Review status badge */}
                    {st.saved && (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 3,
                        padding: "2px 8px", borderRadius: 20,
                        background: "rgba(16,185,129,0.12)", color: "#059669",
                        fontSize: "0.625rem", fontWeight: 700,
                        marginLeft: article.impact_score !== null ? 6 : "auto",
                      }}>
                        <CheckCircle2 style={{ width: 10, height: 10 }} />
                        Đã duyệt
                      </span>
                    )}

                    <div style={{ marginLeft: st.saved || article.impact_score !== null ? 4 : "auto" }}>
                      {isExpanded
                        ? <ChevronUp style={{ width: 15, height: 15, color: "#94a3b8" }} />
                        : <ChevronDown style={{ width: 15, height: 15, color: "#94a3b8" }} />
                      }
                    </div>
                  </div>

                  {/* Title */}
                  <p style={{
                    fontSize: "0.9375rem", fontWeight: 600, lineHeight: 1.45,
                    marginBottom: (article.affected_symbols ?? []).length > 0 ? 8 : 0,
                  }}>
                    {article.title}
                  </p>

                  {/* Ticker chips */}
                  {(article.affected_symbols ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(article.affected_symbols ?? []).slice(0, 6).map((t) => (
                        <span key={t} style={{
                          padding: "1px 6px", borderRadius: 4,
                          background: "rgba(8,73,172,0.08)", color: "#0849ac",
                          fontSize: "0.6875rem", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
                        }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Expanded content ── */}
                {isExpanded && (
                  <div
                    style={{ padding: "0 16px 16px 16px" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "0 0 14px 0" }} />

                    {/* Full content */}
                    {(article.content_summary || article.content) && (
                      <div style={{ marginBottom: 12 }}>
                        <p style={{ fontSize: "0.7rem", fontWeight: 600, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Nội dung tóm tắt
                        </p>
                        <p style={{ fontSize: "0.8125rem", lineHeight: 1.7, color: "#334155" }}>
                          {article.content_summary
                            ? article.content_summary
                            : `${article.content!.slice(0, 600)}${article.content!.length > 600 ? "…" : ""}`}
                        </p>
                      </div>
                    )}

                    {/* Full article content */}
                    {article.content && (
                      <div style={{ marginBottom: 12 }}>
                        <p style={{ fontSize: "0.7rem", fontWeight: 600, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Nội dung đầy đủ
                        </p>
                        <div style={{
                          maxHeight: 260, overflowY: "auto",
                          background: "#f8fafc", borderRadius: 8,
                          padding: "10px 14px",
                          border: "1px solid rgba(0,0,0,0.06)",
                          fontSize: "0.8125rem", lineHeight: 1.7, color: "#475569",
                        }}>
                          {article.content}
                        </div>
                      </div>
                    )}

                    {/* AI reasoning */}
                    {article.impact_reasoning && (
                      <div style={{
                        background: "rgba(8,73,172,0.04)", border: "1px solid rgba(8,73,172,0.1)",
                        borderRadius: 8, padding: "10px 14px", marginBottom: 12,
                      }}>
                        <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                          <Zap style={{ width: 13, height: 13, color: "#0849ac" }} />
                          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#0849ac" }}>
                            Phân tích tác động AI
                          </span>
                        </div>
                        <p style={{ fontSize: "0.8125rem", lineHeight: 1.65, color: "#334155" }}>
                          {article.impact_reasoning}
                        </p>
                      </div>
                    )}

                    {/* Source link */}
                    <a
                      href={article.article_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        fontSize: "0.8125rem", fontWeight: 500, color: "#0849ac",
                        textDecoration: "none", marginBottom: 20,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                    >
                      <ExternalLink style={{ width: 13, height: 13 }} />
                      Đọc bài gốc tại {srcLabel(article.source)}
                    </a>

                    {/* ── Expert review panel ── */}
                    <div style={{
                      background: "#f8fafc",
                      border: "1.5px solid rgba(8,73,172,0.12)",
                      borderRadius: 10,
                      padding: "14px 16px",
                    }}>
                      <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0849ac", marginBottom: 12 }}>
                        Đánh giá của chuyên gia
                      </p>

                      {/* Verdict buttons */}
                      <div className="flex gap-3 mb-4">
                        <button
                          onClick={() => handleVerdict(article, "correct")}
                          style={{
                            flex: 1,
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                            padding: "9px 0",
                            borderRadius: 8,
                            border: `1.5px solid ${st.verdict === "correct" ? "#10b981" : "rgba(0,0,0,0.1)"}`,
                            background: st.verdict === "correct" ? "rgba(16,185,129,0.1)" : "#fff",
                            cursor: "pointer",
                            fontSize: "0.875rem", fontWeight: 600,
                            color: st.verdict === "correct" ? "#059669" : "#475569",
                            transition: "all 0.15s",
                          }}
                        >
                          <CheckCircle2 style={{ width: 15, height: 15 }} />
                          AI đúng — {LABEL_VI[article.label]}
                        </button>

                        <button
                          onClick={() => handleVerdict(article, "wrong")}
                          style={{
                            flex: 1,
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                            padding: "9px 0",
                            borderRadius: 8,
                            border: `1.5px solid ${st.verdict === "wrong" ? "#dc2626" : "rgba(0,0,0,0.1)"}`,
                            background: st.verdict === "wrong" ? "rgba(220,38,38,0.07)" : "#fff",
                            cursor: "pointer",
                            fontSize: "0.875rem", fontWeight: 600,
                            color: st.verdict === "wrong" ? "#dc2626" : "#475569",
                            transition: "all 0.15s",
                          }}
                        >
                          <XCircle style={{ width: 15, height: 15 }} />
                          AI sai — Chọn lại nhãn
                        </button>
                      </div>

                      {/* Relabel options — chỉ hiện khi verdict = "wrong" */}
                      {st.verdict === "wrong" && (
                        <div style={{ marginBottom: 14 }}>
                          <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 8, fontWeight: 500 }}>
                            Nhãn đúng theo chuyên gia:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {ALL_LABELS.map((lbl) => {
                              const c = LABEL_COLOR[lbl];
                              const active = st.chosenLabel === lbl;
                              return (
                                <button
                                  key={lbl}
                                  onClick={() => setField(article.id, { chosenLabel: lbl, saved: false })}
                                  style={{
                                    padding: "5px 12px", borderRadius: 20,
                                    border: `1.5px solid ${active ? c.border : "rgba(0,0,0,0.1)"}`,
                                    background: active ? c.bg : "#fff",
                                    color: active ? c.text : "#64748b",
                                    cursor: "pointer",
                                    fontSize: "0.8125rem", fontWeight: active ? 700 : 500,
                                    transition: "all 0.15s",
                                  }}
                                >
                                  {LABEL_VI[lbl]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Reason textarea */}
                      {st.verdict !== null && (
                        <div style={{ marginBottom: 12 }}>
                          <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 6, fontWeight: 500 }}>
                            Lý do / ghi chú (tuỳ chọn):
                          </p>
                          <textarea
                            value={st.reason}
                            onChange={(e) => setField(article.id, { reason: e.target.value, saved: false })}
                            placeholder="Nhập lý do hoặc nhận xét của bạn..."
                            rows={3}
                            style={{
                              width: "100%", resize: "vertical",
                              padding: "8px 12px", borderRadius: 8,
                              border: "1px solid rgba(8,73,172,0.15)",
                              background: "#fff", fontSize: "0.8125rem",
                              color: "#334155", lineHeight: 1.6,
                              outline: "none", boxSizing: "border-box",
                            }}
                          />
                        </div>
                      )}

                      {/* Save button — ẩn nếu verdict=correct (auto-save) hoặc chưa chọn verdict */}
                      {st.verdict === "wrong" && (
                        <button
                          disabled={!st.chosenLabel || st.saving}
                          onClick={() => saveReview(article, "wrong", st.chosenLabel, st.reason)}
                          style={{
                            padding: "8px 20px", borderRadius: 8,
                            border: "none",
                            background: !st.chosenLabel ? "#e2e8f0" : "#0849ac",
                            color: !st.chosenLabel ? "#94a3b8" : "#fff",
                            cursor: !st.chosenLabel || st.saving ? "not-allowed" : "pointer",
                            fontSize: "0.875rem", fontWeight: 600,
                            transition: "all 0.15s",
                            opacity: st.saving ? 0.7 : 1,
                          }}
                        >
                          {st.saving ? "Đang lưu…" : "Lưu nhãn chuyên gia"}
                        </button>
                      )}

                      {/* Saved confirmation */}
                      {st.saved && (
                        <div style={{
                          marginTop: st.verdict === "wrong" ? 10 : 0,
                          display: "flex", alignItems: "center", gap: 6,
                          color: "#059669", fontSize: "0.8125rem", fontWeight: 600,
                        }}>
                          <CheckCircle2 style={{ width: 14, height: 14 }} />
                          {st.verdict === "correct"
                            ? `Đã xác nhận nhãn AI (${LABEL_VI[article.label]}) là đúng`
                            : `Đã lưu nhãn: ${LABEL_VI[st.chosenLabel!]}`
                          }
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Helper sub-components ─────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-secondary animate-pulse" />
        <div className="w-48 h-6 rounded bg-secondary animate-pulse" />
      </div>
      <div className="h-16 bg-card border border-border rounded-lg animate-pulse" />
      {[0,1,2].map((i) => (
        <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="flex gap-2">
            <div className="w-20 h-5 rounded-full bg-secondary animate-pulse" />
            <div className="w-16 h-5 rounded bg-secondary animate-pulse" />
          </div>
          <div className="w-full h-5 rounded bg-secondary animate-pulse" />
          <div className="w-2/3 h-4 rounded bg-secondary animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-card border border-border rounded-lg p-10 text-center">
      <AlertTriangle className="w-8 h-8 text-chart-5 mx-auto mb-3" />
      <p style={{ fontSize: "0.9rem", fontWeight: 600 }}>Không thể tải dữ liệu</p>
      <p className="text-muted-foreground mt-1 mb-4" style={{ fontSize: "0.8125rem" }}>{message}</p>
      <button
        onClick={onRetry}
        style={{ padding: "8px 20px", borderRadius: 8, background: "#0849ac", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}
      >
        Thử lại
      </button>
    </div>
  );
}

function NoSampleState({ date }: { date: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-10 text-center">
      <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
      <p style={{ fontSize: "0.9rem", fontWeight: 600 }}>Chưa có mẫu cho ngày {date}</p>
      <p className="text-muted-foreground mt-1" style={{ fontSize: "0.8125rem" }}>
        Pipeline sampling chạy lúc 7:00 AM Vietnam. Bạn có thể trigger thủ công trên GitHub Actions.
      </p>
    </div>
  );
}
