/**
 * Utilities for formatting and sanitizing game presentation data.
 */

/**
 * Strips HTML tags, decodes HTML entities, and removes secondary language translations
 * (e.g. Español, Français, Deutsch, etc.) that are baked into descriptions by external APIs (like RAWG).
 */
export function cleanGameDescription(description?: string): string {
  if (!description) return "";

  // 1. Strip secondary foreign language sections commonly appended by RAWG
  const languagePattern = new RegExp(
    "(?:<p\\b[^>]*>|<h\\d\\b[^>]*>|<br\\s*\\/?>|[\\r\\n\\s]+)*(?:Español|Spanish|Français|French|Deutsch|German|Italiano|Italian|Русский|Russian|Português|Portuguese|日本語|Japanese)[\\s\\S]*$",
    "i"
  );
  let cleaned = description.replace(languagePattern, "").trim();
  if (cleaned.length < 50) {
    cleaned = description;
  }

  // 2. Convert block closing tags / breaks to newlines to preserve paragraph structure
  cleaned = cleaned
    .replace(/<\/(?:p|div|h[1-6]|li|section|article)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<hr\s*\/?>/gi, "\n\n");

  // 3. Strip all remaining HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, "");

  // 4. Decode common HTML entities
  cleaned = cleaned
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // 5. Clean up redundant spaces and multiple empty lines
  cleaned = cleaned
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();

  return cleaned;
}

/**
 * Formats a Unix epoch timestamp (seconds) into a readable unlock date string.
 */
export function formatUnlockTime(epochSec?: number): string {
  if (!epochSec || epochSec <= 0) return "";
  const date = new Date(epochSec * 1000);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
