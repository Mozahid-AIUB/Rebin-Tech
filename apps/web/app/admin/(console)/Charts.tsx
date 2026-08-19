/**
 * The overview's charts.
 *
 * Every figure here is read from the database at request time. Nothing is
 * seeded, sampled or illustrative -- an operator making a decision from a
 * dashboard has to be able to trust that what it draws is what is there.
 *
 * All three answer the same shape of question, "compare magnitude, low to
 * high", which is the case a **sequential** ramp exists for: one hue, more is
 * darker. Categorical hues were tried first and rejected -- six brand-derived
 * hues cannot be told apart pairwise under deuteranopia (the validator put the
 * worst pair at ΔE 1.8, against a floor of 8), and a legend of six swatches
 * that a colourblind reader cannot separate is worse than no colour at all.
 * Rank is carried by lightness, which every reader can see.
 */

/** Copper, light to dark. Darker means more, in every chart on this page. */
const RAMP = ["#F3E0CE", "#E4BC96", "#D2965F", "#B4703A", "#8E5528", "#6B3D19"];

function rampStep(index: number, total: number): string {
  if (total <= 1) return RAMP[3]!;
  // Highest value gets the darkest step, so the ramp reads as an ordering
  // rather than as an arbitrary assignment of shades.
  const t = index / (total - 1);
  return RAMP[Math.round(t * (RAMP.length - 1))]!;
}

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * A ranked horizontal bar chart.
 *
 * Horizontal because the labels are component names -- rotated text under
 * vertical columns is the single most common way a readable chart becomes an
 * unreadable one. Each bar is directly labelled with its value, which is also
 * what discharges the validator's contrast warning on the lighter steps: the
 * number never depends on the fill being legible.
 */
export function RankedBars({
  title,
  note,
  rows,
  format = (n) => String(n),
}: {
  title: string;
  note?: string;
  rows: { label: string; value: number }[];
  format?: (n: number) => string;
}) {
  if (rows.length === 0) return null;

  const max = Math.max(...rows.map((r) => r.value));

  return (
    <div className="panel chart-panel">
      <h2 className="panel-title">{title}</h2>
      {note && <p className="chart-note">{note}</p>}

      <div className="bars">
        {rows.map((row, i) => (
          <div key={row.label} className="bar-row">
            <span className="bar-label">{row.label}</span>
            <span className="bar-track">
              <span
                className="bar-fill"
                style={{
                  // Percentage of the largest value, floored so a small value
                  // is still a visible mark rather than a sliver reading as
                  // zero.
                  width: `${Math.max((row.value / max) * 100, 2)}%`,
                  background: rampStep(rows.length - 1 - i, rows.length),
                }}
              />
            </span>
            <span className="bar-value">{format(row.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * A single ratio against its whole.
 *
 * A meter rather than a two-slice pie: the reader's job is "how far along",
 * which is a length, and a pie asks them to compare two angles instead.
 */
export function Meter({
  title,
  note,
  value,
  total,
  format = (n) => String(n),
}: {
  title: string;
  note?: string;
  value: number;
  total: number;
  format?: (n: number) => string;
}) {
  if (total === 0) return null;
  const pct = Math.min((value / total) * 100, 100);

  return (
    <div className="panel chart-panel">
      <h2 className="panel-title">{title}</h2>
      {note && <p className="chart-note">{note}</p>}

      <p className="meter-figure">
        {format(value)}
        <span className="meter-of">of {format(total)}</span>
      </p>

      <span className="meter-track">
        <span className="meter-fill" style={{ width: `${Math.max(pct, 1.5)}%` }} />
      </span>
      <p className="meter-pct">{pct.toFixed(pct < 10 ? 1 : 0)}%</p>
    </div>
  );
}

export { money };
