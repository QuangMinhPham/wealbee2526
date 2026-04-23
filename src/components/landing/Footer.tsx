import wealbeeFooterPaths from "../../imports/Link-1/svg-raizh0jyhh";

export function Footer() {
  return (
    <footer className="bg-white border-t border-[#e8f2ff] py-8 sm:py-12 px-5 sm:px-6">
      <div className="max-w-[1216px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
        <div className="flex items-center gap-3">
          {/* Wealbee icon */}
          <div className="relative size-[44px] flex-shrink-0">
            <div className="absolute inset-[8.33%]">
              <svg
                className="absolute block size-full"
                fill="none"
                preserveAspectRatio="none"
                viewBox="0 0 36.6667 36.6667"
              >
                <path d={wealbeeFooterPaths.p2a75dcf0} fill="#0849AC" />
                <path d={wealbeeFooterPaths.p8351900} fill="#0849AC" />
              </svg>
            </div>
            <div className="absolute inset-[27.08%_31.25%_27.08%_27.08%]">
              <div className="absolute inset-[-2.48%_-2.73%]">
                <svg
                  className="block size-full"
                  fill="none"
                  preserveAspectRatio="none"
                  viewBox="0 0 19.3333 21.1667"
                >
                  <path
                    d={wealbeeFooterPaths.p2206f980}
                    fill="#0849AC"
                    stroke="#0849AC"
                  />
                  <path
                    d={wealbeeFooterPaths.p1f348500}
                    fill="#0849AC"
                    stroke="#0849AC"
                  />
                  <path
                    d={wealbeeFooterPaths.p14867f00}
                    fill="#0849AC"
                    stroke="#0849AC"
                  />
                </svg>
              </div>
            </div>
          </div>
          {/* Wealbee wordmark */}
          <span className="text-[20px] font-bold text-[#0849ac]">Wealbee</span>
        </div>
        <span className="text-[13px] sm:text-[14px] text-[#6b7280]">
          © 2026 Wealbee. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
