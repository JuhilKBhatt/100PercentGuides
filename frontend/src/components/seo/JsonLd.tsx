import React from "react";

interface JsonLdProps {
  data: Record<string, any>;
}

export default function JsonLd({ data }: JsonLdProps) {
  // Prevent XSS script breakout by escaping `<` and `-->`
  const jsonString = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/-->/g, "--\\>");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonString }}
    />
  );
}
