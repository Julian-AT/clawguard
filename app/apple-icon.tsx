import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

function logoAbsoluteUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : siteConfig.url.replace(/\/$/, ""));
  return `${base}/logo.svg`;
}

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: ImageResponse only supports <img> for fetched assets */}
      <img
        src={logoAbsoluteUrl()}
        width={140}
        height={140}
        alt=""
        style={{ objectFit: "contain" }}
      />
    </div>,
    { ...size },
  );
}
