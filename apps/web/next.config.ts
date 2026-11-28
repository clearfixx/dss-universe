import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    // Editor uploads travel through a server action: attachments are up to
    // 25 MiB (Media upload policy), plus multipart overhead.
    serverActions: { bodySizeLimit: "26mb" },
    proxyClientMaxBodySize: "26mb",
  },
};

export default nextConfig;
