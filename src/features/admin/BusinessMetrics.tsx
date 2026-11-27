import { useState } from "react";
import { BarChart } from "./BarChart";
import type { ServerMetrics } from "../../domain/admin";
import { formatMoneyMinor, formatPercent } from "../../utils/formatMoneyMinor";

const money = (value: number, currency: string) =>
  formatMoneyMinor(Math.round(value), currency);

function RevenueChart({
  metrics,
  currency,
}: {
  metrics: ServerMetrics;
  currency: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const points = metrics.trend;
  const width = 760;
  const height = 250;
  const padX = 46;
  const baseY = height - 30;
  const max = Math.max(
    1,
    ...points.map((point) =>
      Math.max(point.revenueMinor, point.moving_average_7d),
    ),
  );
  const step = points.length > 1 ? (width - padX * 2) / (points.length - 1) : 0;
  const y = (value: number) => baseY - (value / max) * (baseY - 18);
  const line = (key: "revenueMinor" | "moving_average_7d") =>
    points
      .map(
        (point, index) =>
          `${index ? "L" : "M"} ${(padX + index * step).toFixed(1)} ${y(point[key]).toFixed(1)}`,
      )
      .join(" ");
  const area = points.length
    ? `${line("revenueMinor")} L ${(padX + (points.length - 1) * step).toFixed(1)} ${baseY} L ${padX} ${baseY} Z`
    : "";
  const active = hover === null ? null : points[hover];

  return (
    <div className="admin-live-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Daily revenue and seven-day moving average"
      >
        <defs>
          <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b69cff" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#b69cff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((ratio) => (
          <g key={ratio}>
            <line
              x1={padX}
              x2={width - padX}
              y1={y(max * ratio)}
              y2={y(max * ratio)}
              className="admin-chart-grid"
            />
            <text x={4} y={y(max * ratio) + 4} className="admin-chart-axis">
              {money(max * ratio, currency)}
            </text>
          </g>
        ))}
        {area && <path d={area} fill="url(#revenue-fill)" />}
        <path
          d={line("revenueMinor")}
          className="admin-chart-line"
          stroke="#f2a0c4"
        />
        <path
          d={line("moving_average_7d")}
          className="admin-chart-average"
          stroke="#b69cff"
        />
        {points.map((point, index) => (
          <rect
            key={point.date}
            x={padX + index * step - Math.max(step / 2, 2)}
            y={0}
            width={Math.max(step, 4)}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHover(index)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        {active && hover !== null && (
          <g>
            <line
              x1={padX + hover * step}
              x2={padX + hover * step}
              y1={18}
              y2={baseY}
              stroke="#f2a0c4"
              strokeDasharray="3 3"
            />
            <circle
              cx={padX + hover * step}
              cy={y(active.revenueMinor)}
              r={5}
              fill="#f2a0c4"
            />
          </g>
        )}
        {points.map((point, index) =>
          index % Math.max(1, Math.ceil(points.length / 6)) === 0 ? (
            <text
              key={point.date}
              x={padX + index * step}
              y={height - 8}
              className="admin-chart-axis"
              textAnchor="middle"
            >
              {point.label}
            </text>
          ) : null,
        )}
      </svg>
      {active && (
        <p className="admin-live-tooltip">
          {active.date} · {money(active.revenueMinor, currency)} ·{" "}
          {active.orders} orders · 7d avg{" "}
          {money(active.moving_average_7d, currency)}
        </p>
      )}
    </div>
  );
}

export function BusinessMetrics({
  metrics,
  currency,
}: {
  metrics: ServerMetrics;
  currency: string;
}) {
  const k = metrics.kpis;
  const cards = [
    ["NET REVENUE", money(k.netRevenueMinor, currency)],
    ["AOV", money(k.aovMinor, currency)],
    ["REPEAT RATE", formatPercent(k.repeatRate)],
    ["CLV / CUSTOMER", money(k.clvMinor, currency)],
    ["SELL-THROUGH", formatPercent(k.sellThrough)],
    ["DAYS OF COVER", `${Math.round(k.daysOfCover)} days`],
  ];

  return (
    <section
      className="admin-business-metrics"
      aria-label="Server-computed business metrics"
    >
      <div className="admin-ai-heading">
        <div>
          <p className="store-eyebrow">COMMERCIAL MODEL / SERVER-SIDE</p>
          <h2>The numbers that decide the next drop.</h2>
          <p className="admin-ai-intro">
            Computed from paid order history, live stock and carts. Formulas are
            shown below so every figure can be audited.
          </p>
        </div>
        <span className="admin-source-badge source-api">LIVE MODEL</span>
      </div>

      <div className="admin-kpi-grid admin-model-kpi-grid">
        {cards.map(([label, value]) => (
          <article key={label} className="admin-kpi-card">
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{metrics.days}-day window</small>
          </article>
        ))}
      </div>

      <RevenueChart metrics={metrics} currency={currency} />

      <div className="admin-metric-columns">
        <div>
          <h3>Top SKUs by revenue</h3>
          <BarChart
            rows={metrics.breakdowns.products}
            format={(row) => money(row.revenueMinor, currency)}
          />
        </div>
        <div>
          <h3>Stock risk</h3>
          <ul className="admin-stock-risk">
            {metrics.low_stock.slice(0, 8).map((row) => (
              <li key={row.sku}>
                <span>{row.sku}</span>
                <b>{row.stock} left</b>
              </li>
            ))}
            {!metrics.low_stock.length && <li>No low-stock SKUs.</li>}
          </ul>
        </div>
      </div>

      <details className="admin-ai-sources">
        <summary>FORMULAS & ASSUMPTIONS / AUDIT THE MATH</summary>
        {Object.entries(metrics.formulas).map(([key, formula]) => (
          <div key={key}>
            <b>{key}</b>
            <p>{formula}</p>
          </div>
        ))}
        <div>
          <b>assumptions</b>
          <p>{JSON.stringify(metrics.assumptions, null, 2)}</p>
        </div>
      </details>
    </section>
  );
}
