import { useNavigate } from "react-router";
import { useEffect, useRef, useCallback } from "react";
import { Navbar } from "../../components/landing/Navbar";
import { Footer } from "../../components/landing/Footer";
import svgPaths from "../../imports/svg-vhxiijub25";
import featureSvg from "../../imports/Section/svg-d24cca693u";
import aiSvg from "../../imports/Container/svg-0n0t81sdr8";
import newAiSvg from "../../imports/Section-1/svg-6f1l47tsvh";
import aiSectionSvg from "../../imports/Section-2/svg-46aj7qy4t9";
import imgRealTimeAlerts from "../../imports/Section/834961204e240443644ce70b59970abf0dc3af5b.png";
import imgSoc2Type2 from "../../imports/Section/cb716844d3cec62ad20e328fc0a5df8fb8d32aaf.png";
import imgDeepAnalysisEngine from "../../imports/Section/76308b5c25f0b5dafab9fd121dca8badb1f764ff.png";
import imgVerifiedDataSources from "../../imports/Section/c4dc00b90779e60d687dea49d61fd9d536f617fa.png";
import imgAuditableAnalysis from "../../imports/Section/09e631da66c049a42b4fb49cd4a34e7baaa39d81.png";
import imgPrivateInfrastructure from "../../imports/Section/6877ba691ce4eb3d9047a49667891b4987a1501f.png";

const imgInvestingCom = "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Investing.com_logo.svg/320px-Investing.com_logo.svg.png";
const imgVietstockCafef = "https://vietstock.vn/favicon.ico";
const imgCafef = "https://cafef.vn/favicon.ico";
const imgVnEconomy = "https://baodautu.vn/favicon.ico";

/* ─────────────────────────────────────────────
   HERO
───────────────────────────────────────────── */
function HeroSection() {
  const navigate = useNavigate();
  return (
    <section className="relative pt-8 sm:pt-10 pb-16 sm:pb-20 overflow-hidden">
      {/* Decorative dots – hidden on very small screens */}
      <div className="hidden sm:block absolute w-[10px] h-[10px] bg-[#84aefc] rounded-full opacity-60 top-16 left-[10%]" />
      <div className="hidden sm:block absolute w-[8px] h-[8px] border border-[rgba(132,166,252,0.5)] rounded-full top-32 right-[15%]" />
      <div className="hidden sm:block absolute w-[6px] h-[6px] bg-[rgba(85,142,247,0.35)] rounded-full bottom-24 left-[18%]" />
      <div className="hidden sm:block absolute w-[6px] h-[6px] border border-[rgba(59,130,246,0.25)] rounded-full top-[28%] right-[8%]" />

      {/* Badge */}
      <div className="flex justify-center mb-8 sm:mb-10">
        <div className="bg-[#e8f2ff] border border-[rgba(132,166,252,0.15)] rounded-full px-4 py-2 sm:px-5 sm:py-2.5 shadow-sm flex items-center gap-2">
          <div className="w-[8px] h-[8px] bg-[#0849ac] rounded-full flex-shrink-0" />
          <span className="text-[11px] sm:text-[12px] text-[#032d6b] text-center">
            Tin tức cá nhân hoá cho từng tài sản
          </span>
        </div>
      </div>

      {/* Heading */}
      <div className="text-center max-w-[820px] mx-auto px-5 sm:px-6 mb-5 sm:mb-6">
        <h1 className="text-[30px] sm:text-[42px] lg:text-[65px] font-bold text-[#111827] leading-[1.2] tracking-[-1.5px] sm:tracking-[-2px] lg:tracking-[-2.4px]">
          Hiểu điều gì tác động đến danh mục của bạn hàng ngày
        </h1>
      </div>

      {/* Subtext */}
      <div className="text-center max-w-[600px] mx-auto px-5 sm:px-6 mb-8 sm:mb-10">
        <p className="text-[15px] sm:text-[18px] text-[#4b5563] leading-[26px] sm:leading-[28px]">
          <span className="font-bold">Wealbee </span>
          tổng hợp tin tức từ các nguồn xác thực cho từng tài sản trong danh mục
          của bạn, gửi thẳng cho bạn qua mail trước khi thị trường mở cửa
        </p>
      </div>

      {/* CTA Button */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => navigate("/login")}
          className="bg-gradient-to-r from-[#0849ac] to-[#2563eb] text-white px-7 py-3.5 sm:px-8 sm:py-4 rounded-xl text-[16px] sm:text-[18px] font-semibold flex items-center gap-3 hover:opacity-90 transition-opacity shadow-[0px_4px_20px_rgba(8,73,172,0.3)]"
        >
          Bắt đầu miễn phí
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d={svgPaths.p2c3d3e0}
              fill="white"
              fillRule="evenodd"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <div className="flex items-center gap-1.5 mt-1">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <g clipPath="url(#check-clip-hero)">
              <path d={newAiSvg.p1ccd2d00} fill="#032D6B" />
            </g>
            <defs>
              <clipPath id="check-clip-hero">
                <rect width="14" height="14" fill="white" />
              </clipPath>
            </defs>
          </svg>
          <span className="text-[13px] sm:text-[14px] text-[#6b7280]">
            Huỷ bất cứ lúc nào
          </span>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FEATURE CARD
───────────────────────────────────────────── */
function FeatureCard({
  icon,
  title,
  description,
  footerSvgPath,
  footerText,
  footerColor,
  hasPro = false,
}: {
  icon: string;
  title: string;
  description: string;
  footerSvgPath: string;
  footerText: string;
  footerColor: string;
  hasPro?: boolean;
}) {
  return (
    <div className="relative bg-white border border-[rgba(232,240,255,0.5)] rounded-[16px] shadow-[0px_1px_3px_0px_rgba(147,51,234,0.04),0px_4px_12px_0px_rgba(147,51,234,0.04)] h-auto md:h-[333px] overflow-hidden flex flex-col p-6 sm:p-8">
      {/* PRO yellow blur */}
      {hasPro && (
        <div className="absolute bg-[rgba(251,191,36,0.2)] blur-[32px] right-0 top-0 rounded-full size-[128px] pointer-events-none" />
      )}

      {/* Icon + PRO badge row */}
      <div className="flex items-start justify-between mb-0">
        <div className="relative size-[56px] rounded-[16px] flex-shrink-0">
          <img
            alt=""
            src={icon}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[70px] object-contain"
          />
        </div>
        {hasPro && (
          <div className="relative h-[28px] w-[52px] rounded-full bg-gradient-to-r from-[#fbbf24] to-[#f97316] flex items-center justify-center shadow-[0px_10px_15px_-3px_rgba(245,158,11,0.25),0px_4px_6px_-4px_rgba(245,158,11,0.25)]">
            <span className="text-[12px] font-bold text-white tracking-[0.3px] leading-[16px]">
              PRO
            </span>
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="font-bold text-[18px] sm:text-[20px] text-[#111827] leading-[28px] mt-[15px] mb-0">
        {title}
      </h3>

      {/* Description */}
      <p className="text-[14px] sm:text-[16px] text-[#4b5563] leading-[24px] sm:leading-[26px] mt-[6px] flex-1">
        {description}
      </p>

      {/* Footer */}
      <div className="border-t border-[#e8f2ff] pt-[13px] mt-4 flex items-center gap-[8px]">
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className="flex-shrink-0"
        >
          <g clipPath="url(#feat-clip)">
            <path d={footerSvgPath} fill={footerColor} />
          </g>
          <defs>
            <clipPath id="feat-clip">
              <rect width="14" height="14" fill="white" />
            </clipPath>
          </defs>
        </svg>
        <span
          className="text-[13px] sm:text-[14px] leading-[20px]"
          style={{ color: footerColor }}
        >
          {footerText}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FEATURES SECTION
───────────────────────────────────────────── */
function FeaturesSection() {
  const cards = [
    {
      icon: imgRealTimeAlerts,
      title: "Cập nhật hàng ngày",
      description:
        "Nhận các bản tin cá nhân hóa gửi thẳng vào email của bạn lúc 8h sáng và 18h tối, gửi cảnh báo khi có sự kiện rủi ro lớn tác động đến danh mục",
      footerSvgPath: featureSvg.p1ccd2d00,
      footerText: "Được gửi lúc 8:00 sáng, 18:00 chiều",
      footerColor: "#0849AC",
      hasPro: false,
    },
    {
      icon: imgSoc2Type2,
      title: "Bảo mật danh mục đầu tư",
      description:
        "Chúng tôi không lưu trữ thông tin cá nhân, chỉ ghi nhận danh mục cổ phiếu bạn cho phép và mọi dữ liệu đều được mã hóa 100%",
      footerSvgPath: featureSvg.p1ccd2d00,
      footerText: "Được mã hóa đầu cuối",
      footerColor: "#2563EB",
      hasPro: false,
    },
    {
      icon: imgDeepAnalysisEngine,
      title: "AI phân tích sâu",
      description:
        "AI độc quyền giúp phân tích mức độ tác động của tin tức liên quan đến danh mục đầu tư của bạn với độ sâu chưa từng có.",
      footerSvgPath: featureSvg.p3f5c5480,
      footerText: "Được vận hành bởi AI tiên tiến",
      footerColor: "#D97706",
      hasPro: true,
    },
    {
      icon: imgVerifiedDataSources,
      title: "Nguồn dữ liệu được xác thực",
      description:
        "Sử dụng nguồn dữ liệu cấp độ tổ chức từ các đơn vị uy tín hàng đầu như: Vietstock, VNeconomy, Yahoo Finance, Investing.com",
      footerSvgPath: featureSvg.p1ccd2d00,
      footerText: "Dữ liệu đã kiểm duyệt",
      footerColor: "#0849AC",
      hasPro: false,
    },
    {
      icon: imgAuditableAnalysis,
      title: "Phân tích có thể kiểm chứng",
      description:
        "Mọi phân tích chuyên sâu đều có thể truy xuất nguồn gốc dữ liệu kèm theo đánh giá chất lượng.",
      footerSvgPath: featureSvg.p1ccd2d00,
      footerText: "Truy xuất và kiểm chứng",
      footerColor: "#2563EB",
      hasPro: false,
    },
    {
      icon: imgPrivateInfrastructure,
      title: 'Loại bỏ "ảo giác" AI',
      description:
        "Tự động phát hiện khoảng trống dữ liệu và báo cáo độ tin cậy, loại bỏ hoàn toàn các thông tin không có cơ sở",
      footerSvgPath: featureSvg.p3f5c5480,
      footerText: "Không đưa ra thông tin sai lệch",
      footerColor: "#D97706",
      hasPro: true,
    },
  ];

  return (
    <section className="bg-white py-16 sm:py-24">
      {/* Header */}
      <div className="text-center mb-10 sm:mb-16 px-5">
        <p className="text-[13px] sm:text-[14px] font-semibold text-[#0849ac] tracking-[0.7px] uppercase mb-3 sm:mb-4 leading-[20px]">
          Tính năng
        </p>
        <h2 className="text-[32px] sm:text-[40px] lg:text-[48px] font-bold text-[#111827] leading-[1.2] mb-3 sm:mb-4">
          Tại sao là Wealbee
        </h2>
        <p className="text-[15px] sm:text-[18px] text-[#4b5563] leading-[26px] sm:leading-[28px] max-w-[565px] mx-auto">
          Hiểu những gì sẽ tác động đến danh mục của bạn vào mỗi sáng
        </p>
      </div>

      {/* 3×2 Grid → 1 col on mobile, 2 col on sm, 3 col on md+ */}
      <div className="max-w-[1216px] mx-auto px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {cards.map((card, i) => (
          <FeatureCard key={i} {...card} />
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   DOT GRID (desktop only connector)
───────────────────────────────────────────── */
function DotGrid() {
  return (
    <div
      className="hidden lg:flex flex-col justify-center gap-[7px] px-2 flex-shrink-0"
      style={{ marginTop: "31px" }}
    >
      {Array.from({ length: 5 }).map((_, r) => (
        <div key={r} className="flex gap-[7px]">
          {Array.from({ length: 4 }).map((_, c) => (
            <div
              key={c}
              className="w-[5px] h-[5px] rounded-full"
              style={{
                backgroundColor: "rgba(251,191,36,0.5)",
                opacity: 0.3 + ((r * 4 + c) % 5) * 0.08,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MOBILE FLOW ARROW (between AI columns)
───────────────────────────────────────────── */
function MobileFlowArrow() {
  return (
    <div className="flex lg:hidden items-center justify-center py-1">
      <div className="flex flex-col items-center gap-1">
        <div className="w-px h-5 bg-gradient-to-b from-[rgba(132,166,252,0.5)] to-[rgba(85,155,247,0.8)]" />
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
          <path
            d="M1 1L6 7L11 1"
            stroke="rgba(85,155,247,0.8)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   AI SECTION
───────────────────────────────────────────── */
function AISection() {
  const inputItems = [
    {
      name: "Market Prices",
      desc: "Cổ phiếu, ETFs",
      color: "#497F78",
      bgColor: "rgba(73,127,120,0.1)",
      borderColor: "rgba(73,127,120,0.4)",
      iconPath: aiSectionSvg.p39ee6532,
      strokeColor: "#497F78",
      viewBox: "0 0 16 16",
      clipId: "ai-clip-1",
      hasClip: true,
      extraPaths: [aiSectionSvg.p14d10c00],
    },
    {
      name: "Fundamentals",
      desc: "Chỉ số doanh nghiệp",
      color: "#9A88B1",
      bgColor: "rgba(154,136,177,0.1)",
      borderColor: "rgba(154,136,177,0.4)",
      iconPath: aiSectionSvg.pda21400,
      strokeColor: "#9A88B1",
      viewBox: "0 0 16 16",
      clipId: "ai-clip-2",
      hasClip: true,
      extraPaths: [
        aiSectionSvg.p1be36900,
        aiSectionSvg.pa8d100,
        "M6.66667 4H9.33333",
        "M6.66667 6.66667H9.33333",
        "M6.66667 9.33333H9.33333",
        "M6.66667 12H9.33333",
      ],
    },
    {
      name: "Macro Data",
      desc: "Thông tin kinh tế vĩ mô",
      color: "#B89960",
      bgColor: "rgba(184,153,96,0.1)",
      borderColor: "rgba(184,153,96,0.4)",
      iconPath: aiSectionSvg.p3227a460,
      strokeColor: "#B89960",
      viewBox: "0 0 16 16",
      clipId: "ai-clip-3",
      hasClip: true,
      extraPaths: [],
    },
    {
      name: "News & Media",
      desc: "Gom thông tin tài chính liên quan",
      color: "#C97078",
      bgColor: "rgba(201,112,120,0.1)",
      borderColor: "rgba(201,112,120,0.4)",
      iconPath: aiSectionSvg.p19416e00,
      strokeColor: "#C97078",
      viewBox: "0 0 16 16",
      clipId: "ai-clip-4",
      hasClip: false,
      extraPaths: [
        aiSectionSvg.p3e059a80,
        "M6.66667 6H5.33333",
        "M10.6667 8.66667H5.33333",
        "M10.6667 11.3333H5.33333",
      ],
    },
  ];

  return (
    <section className="py-12 sm:py-16 overflow-hidden">
      {/* Gradient divider */}
      <div
        className="w-full h-[2px] mb-12 sm:mb-16"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(132,166,252,0.4) 30%, rgba(85,155,247,0.5) 50%, rgba(132,166,252,0.4) 70%, transparent 100%)",
        }}
      />

      <div className="max-w-[1216px] mx-auto px-4 sm:px-6">
        {/* Title */}
        <h2 className="text-[26px] sm:text-[36px] lg:text-[48px] font-bold text-black text-center leading-[1.25] tracking-[-1px] sm:tracking-[-1.2px] mb-3 sm:mb-4">
          Sức mạnh AI trên nền dữ liệu thời gian thực
        </h2>
        <p className="text-[14px] sm:text-[18px] text-[rgba(0,0,0,0.6)] text-center max-w-[500px] mx-auto mb-10 sm:mb-12 leading-[22px] sm:leading-[28px]">
          Wealbee tổng hợp dữ liệu tài chính, phân tích thông minh và phản hồi
          bằng ngôn ngữ tự nhiên dễ hiểu
        </p>

        {/* ── 3-column layout: row on lg+, column on mobile ── */}
        <div className="flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-0">

          {/* ── INPUT column ── */}
          <div className="w-full max-w-[360px] lg:max-w-none lg:flex-shrink-0 lg:w-[280px]">
            <div className="bg-[#2563eb] rounded-[10px] px-3 py-1.5 inline-block mb-4">
              <span className="text-white text-[12px] font-bold tracking-[0.6px] uppercase">
                Input
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {inputItems.map((item, i) => (
                <div
                  key={i}
                  className="backdrop-blur-[4px] rounded-[10px] border px-3 py-3 flex items-center gap-3"
                  style={{
                    backgroundColor: item.bgColor,
                    borderColor: item.borderColor,
                  }}
                >
                  <div className="w-[32px] h-[32px] rounded-[8px] bg-[rgba(255,255,255,0.05)] flex items-center justify-center flex-shrink-0">
                    <svg
                      width="16"
                      height="16"
                      viewBox={item.viewBox}
                      fill="none"
                    >
                      {item.hasClip ? (
                        <g clipPath={`url(#${item.clipId})`}>
                          <path
                            d={item.iconPath}
                            stroke={item.strokeColor}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.33333"
                          />
                          {item.extraPaths.map((p, j) => (
                            <path
                              key={j}
                              d={p}
                              stroke={item.strokeColor}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.33333"
                            />
                          ))}
                        </g>
                      ) : (
                        <g>
                          <path
                            d={item.iconPath}
                            stroke={item.strokeColor}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.33333"
                          />
                          {item.extraPaths.map((p, j) => (
                            <path
                              key={j}
                              d={p}
                              stroke={item.strokeColor}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.33333"
                            />
                          ))}
                        </g>
                      )}
                      {item.hasClip && (
                        <defs>
                          <clipPath id={item.clipId}>
                            <rect width="16" height="16" fill="white" />
                          </clipPath>
                        </defs>
                      )}
                    </svg>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-[#032d6b]">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-[rgba(0,0,0,0.5)]">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dot connector left (desktop only) */}
          <DotGrid />

          {/* Mobile flow arrow */}
          <MobileFlowArrow />

          {/* ── CENTER – Intelligence Layer ── */}
          <div className="w-full max-w-[360px] lg:max-w-none lg:flex-shrink-0 lg:w-[300px] flex flex-col items-center justify-center">
            <div
              className="w-full rounded-[14px] border-2 border-[rgba(85,155,247,0.15)] p-5 relative"
              style={{
                backgroundImage:
                  "linear-gradient(-60deg, rgb(73, 127, 120) 0%, rgb(8, 73, 172) 100%)",
              }}
            >
              {/* Header badge */}
              <div className="bg-[#2563eb] border border-[rgba(85,155,247,0.15)] rounded-[10px] px-3 py-1.5 flex items-center gap-2 mx-auto w-fit mb-4">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <g clipPath="url(#intel-clip)">
                    {[
                      aiSectionSvg.p24618370,
                      aiSectionSvg.p23b41d00,
                      aiSectionSvg.p135f6300,
                      aiSectionSvg.p14a79a00,
                      aiSectionSvg.p2b7f500,
                      aiSectionSvg.p1cc8e380,
                      aiSectionSvg.p21c95a8,
                      aiSectionSvg.p3a62ef00,
                      aiSectionSvg.pba2de80,
                    ].map((p, i) => (
                      <path
                        key={i}
                        d={p}
                        stroke="#FBBF24"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.16667"
                      />
                    ))}
                  </g>
                  <defs>
                    <clipPath id="intel-clip">
                      <rect width="14" height="14" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
                <span className="text-white text-[11px] sm:text-[12px] font-bold tracking-[0.6px] uppercase">
                  The Intelligence Layer
                </span>
              </div>

              {/* Description */}
              <p className="text-[13px] sm:text-[14px] text-[rgba(255,249,248,0.8)] text-center leading-[22px] mb-4">
                Hệ thống hóa dữ liệu tài chính thông minh: dữ liệu được làm
                sạch, chuẩn hóa và xâu chuỗi thông minh
              </p>

              {/* Dot legend */}
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-[8px] h-[8px] rounded-full bg-[#13b7a2] flex-shrink-0" />
                  <span className="text-[10px] text-[rgba(255,255,255,0.75)]">
                    Làm sạch
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-[8px] h-[8px] rounded-full bg-[#8258b7] flex-shrink-0" />
                  <span className="text-[10px] text-[rgba(255,255,255,0.75)]">
                    Cấu trúc
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-[8px] h-[8px] rounded-full bg-[#fbbf24] flex-shrink-0" />
                  <span className="text-[10px] text-[rgba(255,255,255,0.75)]">
                    Xâu chuỗi
                  </span>
                </div>
              </div>

              {/* Divider + spinner */}
              <div className="border-t border-[rgba(255,255,255,0.1)] pt-4 flex items-center justify-center gap-3">
                <div className="relative w-[28px] h-[28px] flex-shrink-0">
                  <div className="absolute inset-0 rounded-full border-[2px] border-[rgba(255,255,255,0.15)]" />
                  <div
                    className="absolute inset-0 rounded-full border-[2px] border-transparent animate-spin"
                    style={{
                      borderTopColor: "#4a90d9",
                      borderLeftColor: "rgba(74,144,217,0.5)",
                    }}
                  />
                </div>
                <span className="text-[11px] text-[rgba(255,255,255,0.85)] tracking-[1px] uppercase">
                  Đang Xử lý
                </span>
              </div>
            </div>
          </div>

          {/* Dot connector right (desktop only) */}
          <DotGrid />

          {/* Mobile flow arrow */}
          <MobileFlowArrow />

          {/* ── OUTPUT column ── */}
          <div className="w-full max-w-[360px] lg:max-w-none lg:flex-shrink-0 lg:w-[280px] relative">
            <div className="bg-[#c97078] rounded-[10px] px-3 py-1.5 inline-block mb-4">
              <span className="text-white text-[12px] font-bold tracking-[0.6px] uppercase">
                Output
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {/* Portfolio-aware insights */}
              <div
                className="backdrop-blur-[4px] rounded-[10px] border px-3 py-3 flex items-center gap-3"
                style={{
                  backgroundColor: "rgba(73,127,120,0.2)",
                  borderColor: "rgba(73,127,120,0.4)",
                  backgroundImage:
                    "linear-gradient(90deg, rgba(73,127,120,0.2) 0%, rgba(73,127,120,0.05) 100%)",
                }}
              >
                <div className="w-[32px] h-[32px] rounded-[8px] bg-[#13b7a2] flex items-center justify-center flex-shrink-0 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1)]">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d={aiSectionSvg.pea6a680}
                      stroke="#032D6B"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.33333"
                    />
                    <path
                      d={aiSectionSvg.p3155f180}
                      stroke="#032D6B"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.33333"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-[#032d6b]">
                    Portfolio-aware insights
                  </p>
                  <p className="text-[10px] text-[rgba(0,0,0,0.5)]">
                    Lọc theo danh mục của bạn
                  </p>
                </div>
              </div>

              {/* Impact score */}
              <div
                className="backdrop-blur-[4px] rounded-[10px] border px-3 py-3 flex items-center gap-3"
                style={{
                  backgroundColor: "rgba(154,136,177,0.2)",
                  borderColor: "rgba(154,136,177,0.4)",
                  backgroundImage:
                    "linear-gradient(90deg, rgba(154,136,177,0.2) 0%, rgba(154,136,177,0.05) 100%)",
                }}
              >
                <div className="w-[32px] h-[32px] rounded-[8px] bg-[#8258b7] flex items-center justify-center flex-shrink-0 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1)]">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d={aiSectionSvg.p8efac80} fill="#032D6B" />
                  </svg>
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-[#032d6b]">
                    Impact score
                  </p>
                  <p className="text-[10px] text-[rgba(0,0,0,0.5)]">
                    Lượng hoá sự tác động
                  </p>
                </div>
              </div>

              {/* AI explainable */}
              <div
                className="backdrop-blur-[4px] rounded-[10px] border px-3 py-3 flex items-center gap-3"
                style={{
                  backgroundColor: "rgba(184,153,96,0.2)",
                  borderColor: "rgba(184,153,96,0.4)",
                  backgroundImage:
                    "linear-gradient(90deg, rgba(184,153,96,0.2) 0%, rgba(184,153,96,0.05) 100%)",
                }}
              >
                <div className="w-[32px] h-[32px] rounded-[8px] bg-[#fcd34d] flex items-center justify-center flex-shrink-0 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1)]">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <g clipPath="url(#ai-exp-clip)">
                      <path
                        d={aiSectionSvg.p874e300}
                        stroke="#032D6B"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.33333"
                      />
                      <path
                        d="M13.3333 2V4.66667"
                        stroke="#032D6B"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.33333"
                      />
                      <path
                        d="M14.6667 3.33333H12"
                        stroke="#032D6B"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.33333"
                      />
                      <path
                        d="M2.66667 11.3333V12.6667"
                        stroke="#032D6B"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.33333"
                      />
                      <path
                        d="M3.33333 12H2"
                        stroke="#032D6B"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.33333"
                      />
                    </g>
                    <defs>
                      <clipPath id="ai-exp-clip">
                        <rect width="16" height="16" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-[#032d6b]">
                    AI explainable
                  </p>
                  <p className="text-[10px] text-[rgba(0,0,0,0.5)]">
                    Giải thích suy luận của AI
                  </p>
                </div>
              </div>
            </div>

            {/* ── Floating cards: desktop only ── */}
            <div
              className="hidden lg:flex absolute -right-4 -top-[10px] rounded-[12px] border border-[rgba(92,136,246,0.3)] px-3 py-2 items-center gap-2 shadow-[0px_4px_24px_-1px_rgba(147,51,234,0.08)]"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgb(219,231,255) 100%)",
                width: "130px",
              }}
            >
              <div
                className="w-[36px] h-[36px] rounded-[12px] flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #0849ac 0%, #2563eb 100%)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <g clipPath="url(#report-clip)">
                    <path
                      d={aiSectionSvg.p1aed1e00}
                      fill="white"
                      fillRule="evenodd"
                      clipRule="evenodd"
                    />
                  </g>
                  <defs>
                    <clipPath id="report-clip">
                      <rect width="16" height="16" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              </div>
              <div>
                <p className="text-[10px] text-[#6b7280]">Daily Report</p>
                <p className="text-[12px] font-bold text-[#111827]">+12.4%</p>
              </div>
            </div>

            <div
              className="hidden lg:flex absolute -right-2 bottom-[10px] rounded-[12px] border border-[rgba(92,136,246,0.3)] px-3 py-2 items-center gap-2 shadow-[0px_4px_24px_-1px_rgba(147,51,234,0.08)]"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgb(232,242,255) 100%)",
                width: "122px",
              }}
            >
              <div
                className="w-[36px] h-[36px] rounded-[12px] flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #fbbf24 0%, #f97316 100%)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <g clipPath="url(#bolt-clip)">
                    <path d={aiSectionSvg.p35ec0300} fill="white" />
                  </g>
                  <defs>
                    <clipPath id="bolt-clip">
                      <rect width="16" height="16" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              </div>
              <div>
                <p className="text-[10px] text-[#6b7280]">AI Insights</p>
                <p className="text-[12px] font-bold text-[#111827]">Ready</p>
              </div>
            </div>

            {/* ── Inline insight cards for mobile (replaces floating cards) ── */}
            <div className="lg:hidden mt-4 flex gap-3">
              <div
                className="flex-1 rounded-[12px] border border-[rgba(92,136,246,0.3)] px-3 py-2.5 flex items-center gap-2 shadow-sm"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgb(219,231,255) 100%)",
                }}
              >
                <div
                  className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, #0849ac 0%, #2563eb 100%)",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <g clipPath="url(#report-clip-m)">
                      <path
                        d={aiSectionSvg.p1aed1e00}
                        fill="white"
                        fillRule="evenodd"
                        clipRule="evenodd"
                      />
                    </g>
                    <defs>
                      <clipPath id="report-clip-m">
                        <rect width="16" height="16" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                </div>
                <div>
                  <p className="text-[9px] text-[#6b7280]">Daily Report</p>
                  <p className="text-[12px] font-bold text-[#111827]">+12.4%</p>
                </div>
              </div>
              <div
                className="flex-1 rounded-[12px] border border-[rgba(92,136,246,0.3)] px-3 py-2.5 flex items-center gap-2 shadow-sm"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgb(232,242,255) 100%)",
                }}
              >
                <div
                  className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, #fbbf24 0%, #f97316 100%)",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <g clipPath="url(#bolt-clip-m)">
                      <path d={aiSectionSvg.p35ec0300} fill="white" />
                    </g>
                    <defs>
                      <clipPath id="bolt-clip-m">
                        <rect width="16" height="16" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                </div>
                <div>
                  <p className="text-[9px] text-[#6b7280]">AI Insights</p>
                  <p className="text-[12px] font-bold text-[#111827]">Ready</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   TRUSTED SECTION — Infinite seamless marquee
   
   Kỹ thuật: mỗi logo được bọc trong padding px-10 (40px hai bên).
   Khoảng cách giữa bất kỳ 2 logo = 40px + divider 1px + 40px = 81px
   đều nhau cả TRONG set lẫn GIỮA hai set → loop hoàn toàn liền mạch.
───────────────────────────────────────────── */

// Hàm render (không phải React component) để tránh unmount/remount
function renderLogoTrack(keyPrefix: string) {
  return (
    <div
      key={keyPrefix}
      className="flex items-center flex-shrink-0"
      aria-hidden={keyPrefix === "b" ? "true" : undefined}
    >
      {/* ── Vietstock & CafeF ── */}
      <div className="px-10 flex items-center flex-shrink-0">
        <div className="relative overflow-hidden flex-shrink-0" style={{ width: "140px", height: "56px" }}>
          <img
            alt="Vietstock & CafeF"
            src={imgVietstockCafef}
            className="absolute max-w-none pointer-events-none"
            style={{ height: "200%", width: "154.1%", left: "-27.14%", top: "-49.67%" }}
          />
        </div>
      </div>
      <div className="w-px h-8 bg-[rgba(209,213,219,0.6)] flex-shrink-0" />

      {/* ── CafeF ── */}
      <div className="px-10 flex items-center flex-shrink-0">
        <div className="relative overflow-hidden flex-shrink-0" style={{ width: "105px", height: "40px" }}>
          <img
            alt="CafeF"
            src={imgCafef}
            className="absolute max-w-none pointer-events-none"
            style={{ height: "280.25%", width: "108.02%", left: "-4.58%", top: "-87.65%" }}
          />
        </div>
      </div>
      <div className="w-px h-8 bg-[rgba(209,213,219,0.6)] flex-shrink-0" />

      {/* ── VnEconomy ── */}
      <div className="px-10 flex items-center flex-shrink-0">
        <div className="relative overflow-hidden flex-shrink-0" style={{ width: "100px", height: "24px" }}>
          <img
            alt="VnEconomy"
            src={imgVnEconomy}
            className="absolute max-w-none pointer-events-none"
            style={{ height: "231.59%", width: "110.34%", left: "-4.99%", top: "-56.48%" }}
          />
        </div>
      </div>
      <div className="w-px h-8 bg-[rgba(209,213,219,0.6)] flex-shrink-0" />

      {/* ── Investing.com ── */}
      <div className="px-10 flex items-center flex-shrink-0">
        <img
          alt="Investing.com"
          src={imgInvestingCom}
          style={{ height: "44px", width: "210px", display: "block" }}
        />
      </div>
      <div className="w-px h-8 bg-[rgba(209,213,219,0.6)] flex-shrink-0" />

      {/* ── Yahoo Finance ── */}
      <div className="px-10 flex items-center flex-shrink-0">
        <svg
          viewBox="0 0 220 40"
          fill="none"
          style={{ width: "175px", height: "32px", display: "block" }}
          preserveAspectRatio="xMidYMid meet"
        >
          <text x="0" y="32" fontFamily="'Arial Black','Arial',sans-serif" fontWeight="900" fontSize="34" fill="#6001D2" letterSpacing="-1">Yahoo!</text>
          <text x="130" y="32" fontFamily="'Arial',sans-serif" fontWeight="400" fontSize="22" fill="#6001D2">Finance</text>
        </svg>
      </div>
      {/* Trailing divider — khoảng cách từ logo cuối set này sang logo đầu set kế
          hoàn toàn giống khoảng cách giữa 2 logo bất kỳ trong set */}
      <div className="w-px h-8 bg-[rgba(209,213,219,0.6)] flex-shrink-0" />
    </div>
  );
}

function TrustedSection() {
  const trackRef = useRef<HTMLDivElement>(null);
  // Tất cả state animation dùng ref để không gây re-render
  const stateRef = useRef({
    x: 0,          // vị trí hiện tại (px)
    lastTs: 0,     // timestamp frame trước (ms)
    paused: false, // đang hover → pause
    halfW: 0,      // độ rộng 1 set logo (px) — điểm reset seamless
  });

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const s = stateRef.current;

    // Đo độ rộng track sau khi layout xong
    const measure = () => { s.halfW = el.scrollWidth / 2; };
    const timer = setTimeout(measure, 80); // chờ font/image load

    // Re-đo khi resize cửa sổ
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    // ── Animation loop ──
    // SPEED = 120 px/s (nhanh, liên tục)
    // Để tăng thêm: đổi thành 150, 180, ...
    const SPEED = 120;
    let raf = 0;

    const tick = (ts: number) => {
      if (!s.paused && s.halfW > 0) {
        if (s.lastTs > 0) {
          // Giới hạn delta tối đa 100ms phòng tab bị ẩn rồi focus lại
          const dt = Math.min((ts - s.lastTs) / 1000, 0.1);
          s.x -= SPEED * dt;
          // Khi đã cuộn đúng 1 set → reset về 0 (seamless, vô hình)
          if (s.x <= -s.halfW) s.x += s.halfW;
          el.style.transform = `translateX(${s.x}px)`;
        }
        s.lastTs = ts;
      } else if (s.paused) {
        // Reset lastTs để khi unpause không bị nhảy vị trí
        s.lastTs = 0;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      clearTimeout(timer);
    };
  }, []);

  const handleMouseEnter = useCallback(() => { stateRef.current.paused = true; }, []);
  const handleMouseLeave = useCallback(() => { stateRef.current.paused = false; }, []);

  return (
    <section className="bg-gradient-to-b from-white to-[rgba(245,249,255,0.5)] py-14 sm:py-20">
      <div className="max-w-[1216px] mx-auto px-4 sm:px-6">
        <div className="bg-white border border-[rgba(232,240,255,0.5)] rounded-[24px] relative overflow-hidden">
          {/* shadow overlay */}
          <div className="absolute inset-[-1px] rounded-[24px] shadow-[0px_20px_25px_-5px_rgba(168,85,247,0.05),0px_8px_10px_-6px_rgba(168,85,247,0.05)] pointer-events-none z-10" />

          {/* Label */}
          <p className="text-[13px] sm:text-[14px] font-normal text-[#6b7280] tracking-[0.7px] uppercase text-center pt-[30px] sm:pt-[38px] pb-[20px] sm:pb-[28px] px-4">
            các trang tin tức tài chính được xác thực
          </p>

          {/* ── Fade edges ── */}
          <div
            className="absolute left-0 top-0 bottom-0 w-12 sm:w-20 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to right, white 0%, transparent 100%)" }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-12 sm:w-20 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to left, white 0%, transparent 100%)" }}
          />

          {/* ── Marquee ── */}
          <div
            className="overflow-hidden pb-[28px] sm:pb-[34px]"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/*
              2 bản copy kề nhau → translateX(0 → -halfW) là seamless.
              Animation drive bởi rAF: không bao giờ reset hay gián đoạn.
            */}
            <div
              ref={trackRef}
              className="flex items-center"
              style={{ willChange: "transform" }}
            >
              {renderLogoTrack("a")}
              {renderLogoTrack("b")}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   CTA SECTION
───────────────────────────────────────────── */
function CTASection() {
  const navigate = useNavigate();
  return (
    <section
      className="relative overflow-hidden py-20 sm:py-28"
      style={{
        backgroundImage:
          "linear-gradient(163deg, rgb(37, 99, 235) 0%, rgb(8, 73, 172) 50%, rgb(3, 45, 107) 100%)",
      }}
    >
      <div className="absolute inset-0 bg-[rgba(139,187,250,0.2)] blur-[50px] rounded-full w-[40%] h-[384px] left-1/4 top-0 pointer-events-none" />
      <div className="absolute inset-0 bg-[rgba(92,136,246,0.3)] blur-[50px] rounded-full w-[40%] h-[384px] right-0 bottom-0 ml-auto pointer-events-none" />
      <div className="relative text-center max-w-[646px] mx-auto px-5 sm:px-6">
        <h2 className="text-[28px] sm:text-[38px] lg:text-[50px] font-bold text-white leading-[1.2] mb-5 sm:mb-6">
          Sẵn sàng nâng tầm danh mục đầu tư của bạn chưa?
        </h2>
        <p className="text-[16px] sm:text-[20px] text-[#90bcf5] leading-[26px] sm:leading-[28px] mb-8 sm:mb-10">
          Bắt đầu miễn phí, nâng cấp bất cứ lúc nào.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="bg-white text-[#032d6b] px-7 py-4 sm:px-8 sm:py-5 rounded-xl text-[16px] sm:text-[18px] font-bold flex items-center gap-3 mx-auto hover:bg-[#f0f4ff] transition-colors"
        >
          Bắt đầu miễn phí
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d={svgPaths.p2c3d3e0}
              fill="#032D6B"
              fillRule="evenodd"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FOOTER
───────────────────────────────────────────── */
/* ─────────────────────────────────────────────
   PAGE ROOT
───────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[rgba(245,251,255,0.3)] to-white relative">
      {/* Background blurs */}
      <div className="absolute top-[-120px] right-[-192px] w-[400px] sm:w-[500px] h-[400px] sm:h-[500px] bg-[rgba(232,240,255,0.5)] blur-[50px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-[-192px] w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] bg-[rgba(132,166,252,0.1)] blur-[40px] rounded-full pointer-events-none" />

      <Navbar />
      <HeroSection />
      <AISection />
      <FeaturesSection />
      <TrustedSection />
      <CTASection />
      <Footer />
    </div>
  );
}