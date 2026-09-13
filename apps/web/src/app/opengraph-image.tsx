import { ImageResponse } from "next/og";

export const alt = "Manisa private hair and nail studio in Toronto";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ alignItems: "center", background: "linear-gradient(135deg,#160f0e 0%,#4a2e27 58%,#a83d5e 100%)", color: "#fff3e8", display: "flex", height: "100%", justifyContent: "center", padding: "72px", width: "100%" }}>
      <div style={{ alignItems: "center", border: "2px solid rgba(255,243,232,.24)", borderRadius: "56px", display: "flex", flexDirection: "column", height: "100%", justifyContent: "center", textAlign: "center", width: "100%" }}>
        <div style={{ color: "#f2a0b7", display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: 7 }}>PRIVATE STUDIO · TORONTO</div>
        <div style={{ display: "flex", fontFamily: "serif", fontSize: 104, marginTop: 28 }}>Manisa</div>
        <div style={{ display: "flex", fontSize: 38, marginTop: 18 }}>Hair &amp; Nail Studio</div>
      </div>
    </div>,
    size,
  );
}
