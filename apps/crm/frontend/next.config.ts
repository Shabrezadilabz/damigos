import type { NextConfig } from "next";

const crmApiOrigin = process.env.CRM_API_PROXY_TARGET ?? "http://127.0.0.1:4001";

const nextConfig: NextConfig = {
  transpilePackages: ["@damigos/domain"],
  async rewrites() {
    return [{ source: "/api/crm/:path*", destination: `${crmApiOrigin}/:path*` }];
  },
};

export default nextConfig;
