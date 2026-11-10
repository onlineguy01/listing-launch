/**
 * Brand settings. Override per deployment with NEXT_PUBLIC_SITE_NAME / APP_URL.
 * Default matches localbusinessbacklinks.com.
 */
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "Local Business Backlinks";
export const SITE_TAGLINE = "Free listing scan. Find where your business is missing or wrong online, then fix it once.";
/** One honest line used in the footer and every email. */
export const DISCLAIMER =
  "We find, create and correct your business listings. Directory listings are real citations and most include a link to your site, but we do not sell rankings or guarantee link counts.";
