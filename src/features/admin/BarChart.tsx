import type { BreakdownRow } from "../../domain/admin";

type ValueKey = "revenueMinor" | "units" | "count";

type Props = {
  rows: BreakdownRow[];
  valueKey?: ValueKey;
  format: (row: BreakdownRow) => string;
  limit?: number;
  emptyLabel?: string;
};

export function BarChart({
  rows,
  valueKey = "revenueMinor",
  format,
  limit = 6,
  emptyLabel = "No data in this range",
}: Props) {
  const visible = rows.filter((row) => row[valueKey] > 0).slice(0, limit);
  if (!visible.length) return <p className="admin-empty-chart">{emptyLabel}</p>;
  const max = Math.max(...visible.map((row) => row[valueKey]));

  return (
    <ol className="admin-bar-list">
      {visible.map((row, index) => (
        <li key={row.key} className="admin-bar-row">
          <div className="admin-bar-label">
            <span>{index + 1}</span>
            <strong>{row.label}</strong>
            <em>{format(row)}</em>
          </div>
          <div className="admin-bar-track">
            <span
              style={{
                width: `${Math.max(2, (row[valueKey] / max) * 100)}%`,
                background: row.color ?? "#c9ef68",
              }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
