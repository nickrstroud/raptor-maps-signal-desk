"use client";

import { useState } from "react";

export default function CompanyLogo({ website, size = 18 }: { website: string; size?: number }) {
  const [failed, setFailed] = useState(false);

  let domain: string;
  try {
    domain = new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }

  if (failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="rounded-sm shrink-0"
      onError={() => setFailed(true)}
    />
  );
}
