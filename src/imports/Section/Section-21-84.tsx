import svgPaths from "./svg-d24cca693u";
import imgRealTimeAlerts from "./834961204e240443644ce70b59970abf0dc3af5b.png";
import imgSoc2Type2 from "./cb716844d3cec62ad20e328fc0a5df8fb8d32aaf.png";
import imgDeepAnalysisEngine from "./76308b5c25f0b5dafab9fd121dca8badb1f764ff.png";
import imgVerifiedDataSources from "./c4dc00b90779e60d687dea49d61fd9d536f617fa.png";
import imgAuditableAnalysis from "./09e631da66c049a42b4fb49cd4a34e7baaa39d81.png";
import imgPrivateInfrastructure from "./6877ba691ce4eb3d9047a49667891b4987a1501f.png";

function RealTimeAlerts() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute left-[calc(50%+2px)] size-[66px] top-[calc(50%-9.11px)]" data-name="Real-Time Alerts">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img alt="" className="absolute left-0 max-w-none size-full top-0" src={imgRealTimeAlerts} />
      </div>
    </div>
  );
}

function Background() {
  return (
    <div className="absolute left-[32px] rounded-[16px] size-[56px] top-[32.11px]" data-name="Background">
      <RealTimeAlerts />
    </div>
  );
}

function Svg() {
  return (
    <div className="-translate-y-1/2 absolute left-0 size-[14px] top-[calc(50%+12px)]" data-name="SVG">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g clipPath="url(#clip0_21_92)" id="SVG">
          <path d={svgPaths.p1ccd2d00} fill="var(--fill-0, #0849AC)" id="Vector" />
        </g>
        <defs>
          <clipPath id="clip0_21_92">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function HorizontalBorder() {
  return (
    <div className="absolute border-[#e8f2ff] border-solid border-t h-[45px] left-[32px] right-[32px] top-[267px]" data-name="HorizontalBorder">
      <Svg />
      <div className="-translate-y-1/2 absolute flex flex-col font-['Montserrat:Regular',sans-serif] font-normal h-[20px] justify-center leading-[0] left-[22px] text-[#0849ac] text-[14px] top-[34px] w-[296px]">
        <p className="leading-[20px]">{`Được gửi lúc 8:00 sáng, 18:00 chiều `}</p>
      </div>
    </div>
  );
}

function BackgroundBorderShadow() {
  return (
    <div className="absolute bg-white border border-[rgba(232,240,255,0.5)] border-solid h-[333px] left-[352px] right-[1184px] rounded-[16px] shadow-[0px_1px_3px_0px_rgba(147,51,234,0.04),0px_4px_12px_0px_rgba(147,51,234,0.04)] top-[374px]" data-name="Background+Border+Shadow">
      <Background />
      <div className="-translate-y-1/2 absolute flex flex-col font-['Montserrat:Bold',sans-serif] font-bold h-[37px] justify-center leading-[0] left-[33px] text-[#111827] text-[20px] top-[121.5px] w-[283px]">
        <p className="leading-[28px]">Cập nhật hàng ngày</p>
      </div>
      <p className="absolute font-['Montserrat:Regular',sans-serif] font-normal h-[103px] leading-[26px] left-[33px] text-[#4b5563] text-[16px] top-[141px] w-[308px]">Nhận các bản tin cá nhân hóa gửi thẳng vào email của bạn lúc 8h sáng và 18h tối, gửi cảnh báo khi có sự kiện rủi ro lớn tác động đến danh mục</p>
      <HorizontalBorder />
    </div>
  );
}

function Soc2Type() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[70px] top-[calc(50%+0.11px)]" data-name="SOC 2 Type 2">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img alt="" className="absolute left-0 max-w-none size-full top-0" src={imgSoc2Type2} />
      </div>
    </div>
  );
}

function Background1() {
  return (
    <div className="absolute left-[32px] rounded-[16px] size-[56px] top-[32px]" data-name="Background">
      <Soc2Type />
    </div>
  );
}

function Svg1() {
  return (
    <div className="-translate-y-1/2 absolute left-0 size-[14px] top-[calc(50%+12px)]" data-name="SVG">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g clipPath="url(#clip0_21_89)" id="SVG">
          <path d={svgPaths.p1ccd2d00} fill="var(--fill-0, #2563EB)" id="Vector" />
        </g>
        <defs>
          <clipPath id="clip0_21_89">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function HorizontalBorder1() {
  return (
    <div className="absolute border-[#e8f2ff] border-solid border-t h-[45px] left-[32px] right-[32px] top-[267px]" data-name="HorizontalBorder">
      <Svg1 />
      <div className="-translate-y-1/2 absolute flex flex-col font-['Montserrat:Regular',sans-serif] font-normal h-[20px] justify-center leading-[0] left-[22px] text-[#2563eb] text-[14px] top-[34px] w-[161.37px]">
        <p className="leading-[20px]">Được mã hóa đầu cuối</p>
      </div>
    </div>
  );
}

function BackgroundBorderShadow1() {
  return (
    <div className="absolute bg-white border border-[rgba(232,240,255,0.5)] border-solid h-[333px] left-[768px] right-[768px] rounded-[16px] shadow-[0px_1px_3px_0px_rgba(147,51,234,0.04),0px_4px_12px_0px_rgba(147,51,234,0.04)] top-[374px]" data-name="Background+Border+Shadow">
      <Background1 />
      <div className="-translate-y-1/2 absolute flex flex-col font-['Montserrat:Bold',sans-serif] font-bold h-[37px] justify-center leading-[0] left-[33px] text-[#111827] text-[20px] top-[121.5px] w-[299px]">
        <p className="leading-[28px]">Bảo mật danh mục đầu tư</p>
      </div>
      <p className="absolute font-['Montserrat:Regular',sans-serif] font-normal h-[103px] leading-[26px] left-[32px] text-[#4b5563] text-[16px] top-[141px] w-[305px]">Chúng tôi không lưu trữ thông tin cá nhân, chỉ ghi nhận danh mục cổ phiếu bạn cho phép và mọi dữ liệu đều được mã hóa 100%</p>
      <HorizontalBorder1 />
    </div>
  );
}

function Svg2() {
  return (
    <div className="-translate-y-1/2 absolute left-0 size-[14px] top-[calc(50%+12px)]" data-name="SVG">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g clipPath="url(#clip0_21_95)" id="SVG">
          <path d={svgPaths.p3f5c5480} fill="var(--fill-0, #D97706)" id="Vector" />
        </g>
        <defs>
          <clipPath id="clip0_21_95">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function HorizontalBorder2() {
  return (
    <div className="absolute border-[#e8f2ff] border-solid border-t h-[45px] left-[32px] right-[32px] top-[267px]" data-name="HorizontalBorder">
      <Svg2 />
      <div className="-translate-y-1/2 absolute flex flex-col font-['Montserrat:Regular',sans-serif] font-normal h-[20px] justify-center leading-[0] left-[22.5px] text-[#d97706] text-[14px] top-[33.61px] w-[228px]">
        <p className="leading-[20px]">Được vận hành bởi AI tiên tiến</p>
      </div>
    </div>
  );
}

function DeepAnalysisEngine() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[70px] top-[calc(50%+0.11px)]" data-name="Deep Analysis Engine">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img alt="" className="absolute left-0 max-w-none size-full top-0" src={imgDeepAnalysisEngine} />
      </div>
    </div>
  );
}

function Background2() {
  return (
    <div className="absolute left-[32px] rounded-[16px] size-[56px] top-[32px]" data-name="Background">
      <DeepAnalysisEngine />
    </div>
  );
}

function Background3() {
  return (
    <div className="absolute bg-gradient-to-r from-[#fbbf24] h-[28px] left-[298.06px] rounded-[9999px] to-[#f97316] top-[32px] w-[51.94px]" data-name="Background">
      <div className="absolute bg-[rgba(255,255,255,0)] inset-0 rounded-[9999px] shadow-[0px_10px_15px_-3px_rgba(245,158,11,0.25),0px_4px_6px_-4px_rgba(245,158,11,0.25)]" data-name="Overlay+Shadow" />
      <div className="-translate-y-1/2 absolute flex flex-col font-['Montserrat:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] left-[12px] text-[12px] text-white top-[13.5px] tracking-[0.3px] w-[28.308px]">
        <p className="leading-[16px]">PRO</p>
      </div>
    </div>
  );
}

function BackgroundBorderShadow2() {
  return (
    <div className="absolute bg-white border border-[rgba(232,240,255,0.5)] border-solid h-[333px] left-[1184px] overflow-clip right-[352px] rounded-[16px] shadow-[0px_1px_3px_0px_rgba(147,51,234,0.04),0px_4px_12px_0px_rgba(147,51,234,0.04)] top-[374px]" data-name="Background+Border+Shadow">
      <HorizontalBorder2 />
      <div className="absolute bg-[rgba(251,191,36,0.2)] blur-[32px] right-0 rounded-[9999px] size-[128px] top-0" data-name="Overlay+Blur" />
      <Background2 />
      <Background3 />
      <div className="-translate-y-1/2 absolute flex flex-col font-['Montserrat:Bold',sans-serif] font-bold h-[37px] justify-center leading-[0] left-[32px] text-[#111827] text-[20px] top-[121.5px] w-[195px]">
        <p className="leading-[28px]">{`AI phân tích sâu `}</p>
      </div>
      <p className="absolute font-['Montserrat:Regular',sans-serif] font-normal h-[103px] leading-[26px] left-[32px] text-[#4b5563] text-[16px] top-[141px] w-[297px]">AI độc quyền giúp phân tích mức độ tác động của tin tin tức liên quan đến danh mục đầu tư của bạn với độ sâu chưa từng có.</p>
    </div>
  );
}

function VerifiedDataSources() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[70px] top-[calc(50%-15px)]" data-name="Verified Data Sources">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img alt="" className="absolute left-0 max-w-none size-full top-0" src={imgVerifiedDataSources} />
      </div>
    </div>
  );
}

function Background4() {
  return (
    <div className="absolute left-[32px] rounded-[16px] size-[56px] top-[32px]" data-name="Background">
      <VerifiedDataSources />
    </div>
  );
}

function Svg3() {
  return (
    <div className="-translate-y-1/2 absolute left-0 size-[14px] top-[calc(50%+12px)]" data-name="SVG">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g clipPath="url(#clip0_21_92)" id="SVG">
          <path d={svgPaths.p1ccd2d00} fill="var(--fill-0, #0849AC)" id="Vector" />
        </g>
        <defs>
          <clipPath id="clip0_21_92">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function HorizontalBorder3() {
  return (
    <div className="absolute border-[#e8f2ff] border-solid border-t h-[45px] left-[32px] right-[32px] top-[254px]" data-name="HorizontalBorder">
      <Svg3 />
      <div className="-translate-y-1/2 absolute flex flex-col font-['Montserrat:Regular',sans-serif] font-normal h-[20px] justify-center leading-[0] left-[22px] text-[#0849ac] text-[14px] top-[34px] w-[179.45px]">
        <p className="leading-[20px]">Dữ liệu đã kiểm duyệt</p>
      </div>
    </div>
  );
}

function BackgroundBorderShadow3() {
  return (
    <div className="absolute bg-white border border-[rgba(232,240,255,0.5)] border-solid h-[333px] left-[352px] right-[1184px] rounded-[16px] shadow-[0px_1px_3px_0px_rgba(147,51,234,0.04),0px_4px_12px_0px_rgba(147,51,234,0.04)] top-[748px]" data-name="Background+Border+Shadow">
      <Background4 />
      <div className="-translate-y-1/2 absolute flex flex-col font-['Montserrat:Bold',sans-serif] font-bold h-[37px] justify-center leading-[0] left-[33px] text-[#333] text-[20px] top-[121.5px] w-[308px]">
        <p className="leading-[28px]">Nguồn dữ liệu được xác thực</p>
      </div>
      <p className="absolute font-['Montserrat:Regular',sans-serif] font-normal h-[73px] leading-[25.6px] left-[32px] text-[#333] text-[16px] top-[139px] w-[295.29px]">Sử dụng nguồn dữ liệu cấp độ tổ chức từ các đơn vị uy tín hàng đầu như: Vietstock, VNeconomy, Yahoo Finance, Investing.com</p>
      <HorizontalBorder3 />
    </div>
  );
}

function AuditableAnalysis() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[70px] top-1/2" data-name="Auditable Analysis">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img alt="" className="absolute h-[112.72%] left-[-4.34%] max-w-none top-[-2.95%] w-[108.67%]" src={imgAuditableAnalysis} />
      </div>
    </div>
  );
}

function Background5() {
  return (
    <div className="absolute left-[32px] rounded-[16px] size-[56px] top-[32px]" data-name="Background">
      <AuditableAnalysis />
    </div>
  );
}

function Svg4() {
  return (
    <div className="-translate-y-1/2 absolute left-0 size-[14px] top-[calc(50%+12px)]" data-name="SVG">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g clipPath="url(#clip0_21_89)" id="SVG">
          <path d={svgPaths.p1ccd2d00} fill="var(--fill-0, #2563EB)" id="Vector" />
        </g>
        <defs>
          <clipPath id="clip0_21_89">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function HorizontalBorder4() {
  return (
    <div className="absolute border-[#e8f2ff] border-solid border-t h-[45px] left-[32px] right-[32px] top-[254px]" data-name="HorizontalBorder">
      <Svg4 />
      <div className="-translate-y-1/2 absolute flex flex-col font-['Montserrat:Regular',sans-serif] font-normal h-[20px] justify-center leading-[0] left-[22px] text-[#2563eb] text-[14px] top-[34px] w-[225px]">
        <p className="leading-[20px]">Truy xuất và kiểm chứng</p>
      </div>
    </div>
  );
}

function BackgroundBorderShadow4() {
  return (
    <div className="absolute bg-white border border-[rgba(232,240,255,0.5)] border-solid h-[333px] left-[768px] right-[768px] rounded-[16px] shadow-[0px_1px_3px_0px_rgba(147,51,234,0.04),0px_4px_12px_0px_rgba(147,51,234,0.04)] top-[748px]" data-name="Background+Border+Shadow">
      <Background5 />
      <div className="-translate-y-1/2 absolute flex flex-col font-['Montserrat:Bold',sans-serif] font-bold h-[37px] justify-center leading-[0] left-[33px] text-[#333] text-[20px] top-[121.5px] w-[317px]">
        <p className="leading-[28px]">{`Phân tích có thể kiểm chứng `}</p>
      </div>
      <p className="absolute font-['Montserrat:Regular',sans-serif] font-normal h-[73px] leading-[25.6px] left-[32.5px] text-[#333] text-[16px] top-[139px] w-[305.58px]">Mọi phân tích chuyên sâu đều có thể truy xuất nguồn gốc dữ liệu kèm theo đánh giá chất lượng.</p>
      <HorizontalBorder4 />
    </div>
  );
}

function Svg5() {
  return (
    <div className="-translate-y-1/2 absolute left-0 size-[14px] top-[calc(50%+12px)]" data-name="SVG">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g clipPath="url(#clip0_21_95)" id="SVG">
          <path d={svgPaths.p3f5c5480} fill="var(--fill-0, #D97706)" id="Vector" />
        </g>
        <defs>
          <clipPath id="clip0_21_95">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function HorizontalBorder5() {
  return (
    <div className="absolute border-[#e8f2ff] border-solid border-t h-[45px] left-[32px] right-[32px] top-[254px]" data-name="HorizontalBorder">
      <Svg5 />
      <div className="-translate-y-1/2 absolute flex flex-col font-['Montserrat:Regular',sans-serif] font-normal h-[20px] justify-center leading-[0] left-[22.5px] text-[#d97706] text-[14px] top-[33.61px] w-[228px]">
        <p className="leading-[20px]">Không đưa ra thông tin sai lệch</p>
      </div>
    </div>
  );
}

function PrivateInfrastructure() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[70px] top-1/2" data-name="Private Infrastructure">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img alt="" className="absolute h-[119.72%] left-[-7.34%] max-w-none top-[-4.69%] w-[113.21%]" src={imgPrivateInfrastructure} />
      </div>
    </div>
  );
}

function Background6() {
  return (
    <div className="absolute left-[32px] rounded-[16px] size-[56px] top-[32px]" data-name="Background">
      <PrivateInfrastructure />
    </div>
  );
}

function Background7() {
  return (
    <div className="absolute bg-gradient-to-r from-[#fbbf24] h-[28px] left-[298.06px] rounded-[9999px] to-[#f97316] top-[32px] w-[51.94px]" data-name="Background">
      <div className="absolute bg-[rgba(255,255,255,0)] inset-0 rounded-[9999px] shadow-[0px_10px_15px_-3px_rgba(245,158,11,0.25),0px_4px_6px_-4px_rgba(245,158,11,0.25)]" data-name="Overlay+Shadow" />
      <div className="-translate-y-1/2 absolute flex flex-col font-['Montserrat:Bold',sans-serif] font-bold h-[15px] justify-center leading-[0] left-[12px] text-[12px] text-white top-[13.5px] tracking-[0.3px] w-[28.308px]">
        <p className="leading-[16px]">PRO</p>
      </div>
    </div>
  );
}

function BackgroundBorderShadow5() {
  return (
    <div className="absolute bg-white border border-[rgba(232,240,255,0.5)] border-solid h-[333px] left-[1184px] overflow-clip right-[352px] rounded-[16px] shadow-[0px_1px_3px_0px_rgba(147,51,234,0.04),0px_4px_12px_0px_rgba(147,51,234,0.04)] top-[748px]" data-name="Background+Border+Shadow">
      <HorizontalBorder5 />
      <div className="absolute bg-[rgba(251,191,36,0.2)] blur-[32px] right-0 rounded-[9999px] size-[128px] top-0" data-name="Overlay+Blur" />
      <Background6 />
      <Background7 />
      <div className="-translate-y-1/2 absolute flex flex-col font-['Montserrat:Bold',sans-serif] font-bold h-[37px] justify-center leading-[0] left-[32px] text-[#333] text-[20px] top-[121.5px] w-[222px]">
        <p className="leading-[28px]">{`Loại bỏ "ảo giác" AI`}</p>
      </div>
      <p className="absolute font-['Montserrat:Regular',sans-serif] font-normal h-[100px] leading-[26px] left-[32px] text-[#4b5563] text-[16px] top-[139px] w-[312px]">Tự động phát hiện khoảng trống dữ liệu và báo cáo độ tin cậy, loại bỏ hoàn toàn các thông tin không có cơ sở</p>
    </div>
  );
}

export default function Section() {
  return (
    <div className="bg-white relative size-full" data-name="Section">
      <div className="-translate-x-1/2 -translate-y-1/2 absolute flex flex-col font-['Montserrat:SemiBold',sans-serif] font-semibold h-[20px] justify-center leading-[0] left-1/2 text-[#0849ac] text-[20px] text-center top-[140px] tracking-[0.7px] uppercase w-[134px]">
        <p className="leading-[20px]">Tính năng</p>
      </div>
      <div className="-translate-x-1/2 -translate-y-1/2 absolute flex flex-col font-['Montserrat:Bold',sans-serif] font-bold h-[48px] justify-center leading-[0] left-[calc(50%+0.16px)] text-[#111827] text-[48px] text-center top-[190px] w-[652.557px]">
        <p className="leading-[48px]">Tại sao là Wealbee</p>
      </div>
      <div className="-translate-x-1/2 -translate-y-1/2 absolute flex flex-col font-['Montserrat:Regular',sans-serif] font-normal h-[50px] justify-center leading-[0] left-[calc(50%+0.1px)] text-[#4b5563] text-[18px] text-center top-[266px] w-[565.6px]">
        <p className="leading-[28px]">Hiểu những gì sẽ tác động đến danh mục của bạn vào mỗi sáng</p>
      </div>
      <BackgroundBorderShadow />
      <BackgroundBorderShadow1 />
      <BackgroundBorderShadow2 />
      <BackgroundBorderShadow3 />
      <BackgroundBorderShadow4 />
      <BackgroundBorderShadow5 />
    </div>
  );
}