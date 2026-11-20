import type { NextConfig } from "next";

/** Static security headers. The Content-Security-Policy needs a per-request nonce, so proxy.ts sets it. */
const securityHeaders = [
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()", "autoplay=()", "bluetooth=()", "browsing-topics=()", "camera=()", "display-capture=()",
      "encrypted-media=()", "fullscreen=()", "geolocation=()", "gyroscope=()", "hid=()", "idle-detection=()",
      "local-fonts=()", "magnetometer=()", "microphone=()", "midi=()", "payment=()", "picture-in-picture=()",
      "publickey-credentials-get=()", "screen-wake-lock=()", "serial=()", "usb=()", "web-share=()", "xr-spatial-tracking=()",
    ].join(", "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
