/**
 * Brand-token-derived chart palette.
 *
 * Hex values mirror the tokens in `apps/web/src/styles/tokens/grizzly-systems-theme.css`.
 * Recharts passes these directly to SVG fill/stroke; CSS variables can be unreliable
 * across some Recharts internals, so hex literals are used here with comments
 * indicating their token of origin.
 *
 * Series-color rule: pitch-black is primary, taupe secondary, then tonal variants
 * via alpha. Goldenrod is the accent — rationed to ONCE PER VIEW per the design
 * system. Only use it for a single high-emphasis series per page, or skip it.
 */

export const BRAND = {
  pitchBlack: "#1a1812",
  taupe: "#454039",
  bone: "#e8e2d2",
  floralWhite: "#f9f7f0",
  goldenrod: "#d99e30",
} as const;

/**
 * Ordered series palette — primary to least prominent.
 * Use `chartSeries.slice(0, n)` where n is your series count.
 */
export const chartSeries = [
  BRAND.pitchBlack,
  BRAND.taupe,
  "rgba(26, 24, 18, 0.55)", // pitch-black at 55% — tertiary tone
  "rgba(69, 64, 57, 0.55)", // taupe at 55% — quaternary tone
  BRAND.goldenrod, // accent — sparingly
] as const;

/** Recharts <Tooltip> contentStyle for light-theme dashboards. */
export const tooltipStyle = {
  background: BRAND.floralWhite,
  border: `1px solid ${BRAND.bone}`,
  borderRadius: 8,
  color: BRAND.pitchBlack,
  fontFamily: "var(--font-ui)",
  fontSize: 12,
} as const;

/** Stroke colors for chart axes and gridlines. */
export const axisStroke = BRAND.taupe;
export const gridStroke = "rgba(69, 64, 57, 0.18)"; // taupe at 18%

/** Heatmap intensity ramp — taupe with varying alpha. */
export const heatmapColor = (intensity: number): string => {
  const clamped = Math.max(0, Math.min(1, intensity));
  const alpha = 0.08 + clamped * 0.58;
  return `rgba(69, 64, 57, ${alpha})`;
};
