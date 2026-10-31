import { ImageResponse } from "next/og";

export const alt = "Tech Bucket — Technology that keeps Nepal running";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0e1316",
          color: "white",
          padding: "72px 80px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -220,
            top: -260,
            width: 760,
            height: 760,
            borderRadius: 9999,
            border: "60px solid #e8622a",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 44, height: 5, background: "#e8622a" }} />
          <div style={{ fontSize: 26, letterSpacing: 4, color: "#e4e8ea" }}>TECH BUCKET</div>
        </div>
        <div style={{ display: "flex", fontSize: 88, fontWeight: 700, lineHeight: 1, letterSpacing: -3, maxWidth: 900 }}>
          Technology that keeps Nepal running.
        </div>
        <div style={{ fontSize: 28, color: "#c9d0d4" }}>IT consulting · Cybersecurity · Managed services</div>
      </div>
    ),
    size,
  );
}
