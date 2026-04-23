import svgPaths from "./svg-pxcy942h2t";
import imgImage1 from "figma:asset/7945e59725703ef8bb910492da66c8766f79578d.png";
import imgTempImage8TTfku1 from "figma:asset/c4d6b71deeb64e5bf802897e88e8542be3c4d384.png";
import imgTempImageVb3KLq1 from "figma:asset/6edb82a03bdccd69a227f9ab636133bd81027e87.png";
import imgTempImages97X8Y1 from "figma:asset/37946a40da81879b78f096619ee988a7e70af500.png";

function BloombergLogoLogo() {
  return (
    <div className="absolute h-[46px] left-[891.5px] top-[164.61px] w-[284px]" data-name="Bloomberg_logo logo">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 284 46">
        <g clipPath="url(#clip0_6_26)" id="Bloomberg_logo logo">
          <path d={svgPaths.p3ad9c080} fill="var(--fill-0, #010101)" id="Vector" />
          <path d="M39.481 34.5542V0" id="Vector_2" stroke="var(--stroke-0, #010101)" strokeMiterlimit="10" strokeWidth="7.5" />
          <path d={svgPaths.p27fd3c80} fill="var(--fill-0, #010101)" id="Vector_3" />
          <path d={svgPaths.p2f27700} fill="var(--fill-0, #010101)" id="Vector_4" />
          <path d={svgPaths.p3034fa00} fill="var(--fill-0, #010101)" id="Vector_5" />
          <path d={svgPaths.p3efd5080} fill="var(--fill-0, #010101)" id="Vector_6" />
          <path d={svgPaths.p2408a600} fill="var(--fill-0, #010101)" id="Vector_7" />
          <path d={svgPaths.p18a42f80} fill="var(--fill-0, #010101)" id="Vector_8" />
          <path d={svgPaths.p3722ec00} fill="var(--fill-0, #010101)" id="Vector_9" />
        </g>
        <defs>
          <clipPath id="clip0_6_26">
            <rect fill="white" height="46" width="284" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Group() {
  return (
    <div className="absolute contents left-[889.5px] top-[85.61px]">
      <BloombergLogoLogo />
      <div className="absolute h-[53px] left-[890.5px] top-[86.61px] w-[254px]" data-name="image 1">
        <img alt="" className="absolute block max-w-none size-full" height="53" src={imgImage1} width="254" />
      </div>
    </div>
  );
}

function BackgroundBorder() {
  return (
    <div className="absolute bg-white border border-[rgba(232,240,255,0.5)] border-solid h-[246px] left-[352px] right-[352px] rounded-[24px] top-[112px]" data-name="Background+Border">
      <div className="absolute bg-[rgba(255,255,255,0)] inset-[-1px] rounded-[24px] shadow-[0px_20px_25px_-5px_rgba(168,85,247,0.05),0px_8px_10px_-6px_rgba(168,85,247,0.05)]" data-name="Overlay+Shadow" />
      <div className="-translate-x-1/2 -translate-y-1/2 absolute flex flex-col font-['Montserrat:Regular',sans-serif] font-normal h-[20px] justify-center leading-[0] left-[calc(50%+0.1px)] text-[#6b7280] text-[14px] text-center top-[58px] tracking-[0.7px] uppercase w-[416.01px]">
        <p className="leading-[20px]">các trang tin tức tài chính được xác thưc</p>
      </div>
      <Group />
      <div className="absolute h-[143px] left-[18.5px] top-[67.61px] w-[354px]" data-name="tempImage8TTfku 1">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img alt="" className="absolute h-[200%] left-[-27.14%] max-w-none top-[-49.67%] w-[154.1%]" src={imgTempImage8TTfku1} />
        </div>
      </div>
      <div className="absolute h-[56px] left-[638.5px] top-[108.61px] w-[228px]" data-name="tempImageVb3KLq 1">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img alt="" className="absolute h-[231.59%] left-[-4.99%] max-w-none top-[-56.48%] w-[110.34%]" src={imgTempImageVb3KLq1} />
        </div>
      </div>
      <div className="absolute h-[101px] left-[345.5px] top-[91.61px] w-[262px]" data-name="tempImages97X8y 1">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img alt="" className="absolute h-[280.25%] left-[-4.58%] max-w-none top-[-87.65%] w-[108.02%]" src={imgTempImages97X8Y1} />
        </div>
      </div>
    </div>
  );
}

export default function Section() {
  return (
    <div className="bg-gradient-to-b from-white relative size-full to-[rgba(245,249,255,0.5)]" data-name="Section">
      <BackgroundBorder />
    </div>
  );
}