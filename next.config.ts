import type { NextConfig } from "next";

// `npm run dev -- -H 0.0.0.0` lets your phone open the app, but Next.js blocks its dev
// resources (including hot reload) for any host other than localhost unless the host is
// listed here. Without them the page renders but the buttons do nothing. The usual home
// network ranges are covered; add anything else to DEV_ORIGINS (comma-separated).
const devOrigins = (process.env.DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local", ...devOrigins],
};

export default nextConfig;
