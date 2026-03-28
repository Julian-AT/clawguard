import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.name} — ${siteConfig.description}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function logoAbsoluteUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : siteConfig.url.replace(/\/$/, ""));
  return `${base}/logo.svg`;
}

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 72,
        background: "linear-gradient(145deg, #0a0a0a 0%, #171717 45%, #0f172a 100%)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28, marginBottom: 36 }}>
        {/* biome-ignore lint/performance/noImgElement: ImageResponse only supports <img> for fetched assets */}
        <img
          src={logoAbsoluteUrl()}
          width={112}
          height={112}
          alt=""
          style={{ objectFit: "contain" }}
        />
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            color: "#fafafa",
            lineHeight: 1.1,
          }}
        >
          {siteConfig.name}
        </div>
      </div>
      <div
        style={{
          fontSize: 32,
          color: "#a3a3a3",
          maxWidth: 900,
          lineHeight: 1.35,
          fontWeight: 400,
        }}
      >
        {siteConfig.description}
      </div>
    </div>,
    { ...size },
  );
}
