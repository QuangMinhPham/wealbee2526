import svgPaths from "../../imports/svg-vhxiijub25";

export function Logo({ size = 44 }: { size?: number }) {
  return (
    <div className="overflow-clip" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
        <rect width="44" height="44" fill="white" />
        <path
          d={svgPaths.p312c5800}
          fill="url(#logo-grad)"
        />
        <defs>
          <linearGradient id="logo-grad" gradientUnits="userSpaceOnUse" x1="6.6" x2="34.3059" y1="7.21312" y2="39.4047">
            <stop stopColor="#032D6B" />
            <stop offset="1" stopColor="#0849AC" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
