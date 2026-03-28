import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.name} — ${siteConfig.description}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
        {/* Satori-friendly: paths only, no clipPath */}
        <svg width="120" height="68" viewBox="0 0 42 24" fill="none">
          <title>ClawGuard</title>
          <path
            d="M22.3546 0.96832C22.9097 0.390834 23.6636 0.0664062 24.4487 0.0664062C27.9806 0.0664062 31.3091 0.066408 34.587 0.0664146C41.1797 0.0664284 44.481 8.35854 39.8193 13.2082L29.6649 23.7718C29.1987 24.2568 28.4016 23.9133 28.4016 23.2274V13.9234L29.5751 12.7025C30.5075 11.7326 29.8472 10.0742 28.5286 10.0742H13.6016L22.3546 0.96832Z"
            fill="oklch(0.488 0.243 264.376)"
          />
          <path
            d="M19.6469 23.0305C19.0919 23.608 18.338 23.9324 17.5529 23.9324C14.021 23.9324 10.6925 23.9324 7.41462 23.9324C0.821896 23.9324 -2.47942 15.6403 2.18232 10.7906L12.3367 0.227022C12.8029 -0.257945 13.6 0.0855283 13.6 0.771372L13.6 10.0754L12.4265 11.2963C11.4941 12.2662 12.1544 13.9246 13.473 13.9246L28.4001 13.9246L19.6469 23.0305Z"
            fill="oklch(0.696 0.17 162.48)"
          />
        </svg>
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
