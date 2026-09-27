/**
 * Utilities for formatting and sanitizing game presentation data.
 */

/**
 * Strips secondary language translations (e.g. Español, Français, Deutsch, etc.)
 * that are baked into descriptions by external APIs (like RAWG).
 */
export function cleanGameDescription(description?: string): string {
  if (!description) return "";

  // Common language section delimiters found in RAWG aggregated descriptions
  const languagePattern = new RegExp(
    "(?:<p\\b[^>]*>|<h\\d\\b[^>]*>|<br\\s*\\/?>|[\\r\\n\\s]+)*(?:Español|Spanish|Français|French|Deutsch|German|Italiano|Italian|Русский|Russian|Português|Portuguese|日本語|Japanese)[\\s\\S]*$",
    "i"
  );

  const cleaned = description.replace(languagePattern, "").trim();

  // If cleaning stripped almost everything (e.g. single-language non-English title), fall back to original
  return cleaned.length > 50 ? cleaned : description;
}
