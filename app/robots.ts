import type { MetadataRoute } from "next";

// Keep crawlers off the whole demo; it's meant to be shared by link only.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
