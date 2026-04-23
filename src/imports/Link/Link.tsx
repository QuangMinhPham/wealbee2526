import svgPaths from "./svg-brxci4i2gg";

function Group() {
  return (
    <div className="absolute inset-[8.33%]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 36.6667 36.6667">
        <g id="Group 2">
          <path d={svgPaths.p2a75dcf0} fill="var(--fill-0, #0849AC)" id="Vector (Stroke)" />
          <path d={svgPaths.p8351900} fill="var(--fill-0, #0849AC)" id="Vector (Stroke)_2" />
        </g>
      </svg>
    </div>
  );
}

function Group2() {
  return (
    <div className="absolute inset-[27.08%_31.25%_27.08%_27.08%]">
      <div className="absolute inset-[-2.48%_-2.73%]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 19.3333 21.1667">
          <g id="Group 4">
            <path d={svgPaths.p2206f980} fill="var(--fill-0, #0849AC)" id="Vector (Stroke)" stroke="var(--stroke-0, #0849AC)" />
            <path d={svgPaths.p1f348500} fill="var(--fill-0, #0849AC)" id="Vector (Stroke)_2" stroke="var(--stroke-0, #0849AC)" />
            <path d={svgPaths.p14867f00} fill="var(--fill-0, #0849AC)" id="Vector (Stroke)_3" stroke="var(--stroke-0, #0849AC)" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function Group1() {
  return (
    <div className="absolute contents inset-[8.33%]">
      <Group />
      <Group2 />
    </div>
  );
}

export default function Link() {
  return (
    <div className="relative size-full" data-name="Link">
      <div className="-translate-y-1/2 absolute flex flex-col font-['Montserrat:Bold',sans-serif] font-bold h-[28px] justify-center leading-[0] left-[50.5px] text-[#0849ac] text-[20px] top-[21.5px] w-[136.215px]">
        <p className="leading-[28px]">Wealbee</p>
      </div>
      <div className="absolute bg-[rgba(85,155,247,0.15)] blur-[6px] inset-[0_147.91px_0_0] opacity-0 rounded-[9999px]" data-name="Overlay+Blur" />
      <div className="-translate-y-1/2 absolute left-[0.5px] size-[44px] top-[calc(50%+0.5px)]" data-name="Icon/BRAND_NAME-logo-color">
        <Group1 />
      </div>
    </div>
  );
}