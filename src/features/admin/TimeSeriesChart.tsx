import { useId } from 'react';
import type { TimePoint } from '../../domain/admin';
import { formatMoneyMinor } from '../../utils/formatMoneyMinor';

type Props = {
  points: TimePoint[];
  metric: 'revenueMinor' | 'orders' | 'units';
  currency?: string;
};

const WIDTH = 720;
const HEIGHT = 230;
const PAD_X = 42;
const PAD_Y = 24;
const BASE_Y = HEIGHT - 34;

function compact(value: number, metric: Props['metric'], currency: string) {
  if (metric !== 'revenueMinor') return String(Math.round(value));
  if (value >= 100_000) return `${formatMoneyMinor(Math.round(value / 1000), currency, 0)}k`;
  return formatMoneyMinor(value, currency, 0);
}

export function TimeSeriesChart({ points, metric, currency = 'USD' }: Props) {
  const titleId = useId();
  const values = points.map((point) => point[metric]);
  const max = Math.max(1, ...values);
  const stepX = points.length > 1 ? (WIDTH - PAD_X * 2) / (points.length - 1) : 0;
  const coordinates = values.map((value, index) => ({
    x: PAD_X + index * stepX,
    y: BASE_Y - (value / max) * (BASE_Y - PAD_Y),
  }));
  const line = coordinates.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const area = coordinates.length > 1
    ? `${line} L ${coordinates.at(-1)!.x.toFixed(1)} ${BASE_Y} L ${coordinates[0].x.toFixed(1)} ${BASE_Y} Z`
    : '';
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));

  return <svg className="admin-time-series" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-labelledby={titleId} preserveAspectRatio="none">
    <title id={titleId}>{metric === 'revenueMinor' ? 'Revenue' : metric === 'orders' ? 'Orders' : 'Units'} over the last {points.length} days</title>
    <desc>{points.map((point) => `${point.label}: ${compact(point[metric], metric, currency)}`).join(', ')}</desc>
    {[0, 0.5, 1].map((ratio) => {
      const y = BASE_Y - ratio * (BASE_Y - PAD_Y);
      return <g key={ratio}>
        <line x1={PAD_X} x2={WIDTH - PAD_X} y1={y} y2={y} className="admin-chart-grid" />
        <text x={4} y={y + 4} className="admin-chart-axis">{compact(max * ratio, metric, currency)}</text>
      </g>;
    })}
    {area && <path d={area} className="admin-chart-area" />}
    {line && <path d={line} className="admin-chart-line" />}
    {coordinates.map((point, index) => <circle key={points[index].date} cx={point.x} cy={point.y} r={index === coordinates.length - 1 ? 4 : 2.5} className="admin-chart-dot" />)}
    {points.map((point, index) => index % labelEvery === 0 || index === points.length - 1
      ? <text key={point.date} x={coordinates[index]?.x ?? PAD_X} y={HEIGHT - 8} textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'} className="admin-chart-axis">{point.label}</text>
      : null)}
  </svg>;
}
