import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Ask route reads data/*.json at request time, so ship those files with it.
  outputFileTracingIncludes: {
    "/api/ask": ["./data/**/*"],
  },
};

export default nextConfig;
