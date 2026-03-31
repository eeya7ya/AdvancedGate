export function VideoPanel() {
  return (
    <div
      className="relative hidden lg:flex lg:w-3/5 xl:w-[60%] overflow-hidden"
      style={{ background: "linear-gradient(135deg,#0d1424 0%,#111827 100%)" }}
    >
      <video
        src="/background.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        // @ts-expect-error — fetchpriority is a valid HTML attribute not yet typed
        fetchpriority="high"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Subtle edge gradients only — no text overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#080c14]/80" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#080c14]/40 via-transparent to-transparent" />
    </div>
  );
}
