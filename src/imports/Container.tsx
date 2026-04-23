export default function Container() {
  return (
    <div className="relative size-full" data-name="Container">
      <div className="absolute bg-[rgba(232,240,255,0.5)] blur-[50px] right-[-192px] rounded-[9999px] size-[500px] top-[-120px]" data-name="Overlay+Blur" />
      <div className="absolute bg-[rgba(132,166,252,0.1)] blur-[40px] bottom-[-120px] left-[-192px] rounded-[9999px] size-[400px]" data-name="Overlay+Blur" />
    </div>
  );
}