import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { AdminData, AdminMetrics, MetricRange } from "../domain/admin";
import { computeAdminMetrics } from "../services/adminAnalytics";
import { useAdminData } from "../features/admin/useAdminData";
import { TimeSeriesChart } from "../features/admin/TimeSeriesChart";
import { BarChart } from "../features/admin/BarChart";
import { AiAdvisor } from "../features/admin/AiAdvisor";
import { API_MODE } from "../config/runtime";
import { formatMoneyMinor, formatPercent } from "../utils/formatMoneyMinor";

const RANGES: MetricRange[] = [7, 30, 90];
type ChartMetric = "revenueMinor" | "orders" | "units";

function shortDate(iso: string) {
  const date = new Date(iso);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    : "—";
}

function KpiCard({
  label,
  value,
  note,
  tone = "neutral",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "neutral" | "good" | "watch";
}) {
  return (
    <article className={`admin-kpi-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function Panel({
  eyebrow,
  title,
  children,
  wide = false,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <section className={`admin-panel${wide ? " admin-panel-wide" : ""}`}>
      <header>
        <p className="store-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  );
}

function exportOrders(data: AdminData, rangeDays: MetricRange) {
  const header = [
    "id",
    "created_at",
    "email",
    "status",
    "payment_status",
    "items",
    "subtotal_minor",
    "delivery_minor",
    "total_minor",
  ];
  const rows = data.orders.map((order) => [
    order.id,
    order.createdAt,
    order.email,
    order.status,
    order.paymentStatus,
    order.items.reduce((sum, item) => sum + item.quantity, 0),
    order.subtotalMinor,
    order.deliveryMinor,
    order.totalMinor,
  ]);
  const csv = [header, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `crewww-orders-${rangeDays}d.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Dashboard({
  data,
  metrics,
  rangeDays,
  currency,
}: {
  data: AdminData;
  metrics: AdminMetrics;
  rangeDays: MetricRange;
  currency: string;
}) {
  const [chartMetric, setChartMetric] = useState<ChartMetric>("revenueMinor");
  const money = (minor: number) => formatMoneyMinor(minor, currency);
  const kpis = metrics.kpis;

  return (
    <>
      <section
        className="admin-kpi-grid"
        aria-label="Key performance indicators"
      >
        <KpiCard
          label="PAID REVENUE"
          value={money(kpis.revenueMinor)}
          note={`${kpis.paidOrders} paid / ${kpis.orders} orders`}
          tone="good"
        />
        <KpiCard
          label="NET REVENUE"
          value={money(kpis.netRevenueMinor)}
          note="Cancelled and refunded excluded"
        />
        <KpiCard
          label="AVERAGE ORDER"
          value={money(kpis.aovMinor)}
          note="Paid revenue per paid order"
        />
        <KpiCard
          label="UNITS SOLD"
          value={String(kpis.units)}
          note="Paid item quantities"
        />
        <KpiCard
          label="CUSTOMERS"
          value={String(kpis.customers)}
          note={`${kpis.repeatCustomers} repeat · ${kpis.fitChecks} fit checks`}
        />
        <KpiCard
          label="CART → ORDER PROXY"
          value={formatPercent(kpis.conversionProxy)}
          note={
            data.carts.length
              ? "Paid orders / active carts + orders"
              : "No cart data exposed"
          }
          tone={
            kpis.conversionProxy < 0.35 && data.carts.length
              ? "watch"
              : "neutral"
          }
        />
        <KpiCard
          label="INVENTORY VALUE"
          value={money(kpis.inventoryValueMinor)}
          note={`${kpis.stockOnHand} units on hand`}
        />
        <KpiCard
          label="STOCK RISK"
          value={`${kpis.lowStockSkus + kpis.outOfStockSkus}`}
          note={`${kpis.lowStockSkus} low · ${kpis.outOfStockSkus} out`}
          tone={
            kpis.lowStockSkus + kpis.outOfStockSkus > 0 ? "watch" : "neutral"
          }
        />
      </section>

      <section className="admin-grid admin-grid-primary">
        <Panel
          eyebrow="TRADE / TREND"
          title="The last 30 days, without the guesswork."
          wide
        >
          <div
            className="admin-chart-toolbar"
            role="group"
            aria-label="Chart metric"
          >
            {(
              [
                ["revenueMinor", "REVENUE"],
                ["orders", "ORDERS"],
                ["units", "UNITS"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={chartMetric === key}
                onClick={() => setChartMetric(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <TimeSeriesChart
            points={metrics.trend}
            metric={chartMetric}
            currency={currency}
          />
          <div className="admin-chart-footer">
            <span>DAY 01</span>
            <span>DAY {metrics.trend.length}</span>
          </div>
        </Panel>

        <Panel eyebrow="MERCHANDISING / RANKING" title="What actually sold.">
          <BarChart
            rows={metrics.products}
            format={(row) => money(row.revenueMinor)}
            emptyLabel="No paid product sales in this range"
          />
        </Panel>
      </section>

      <section className="admin-grid admin-grid-secondary">
        <Panel eyebrow="COLLECTION MIX" title="Revenue by family.">
          <BarChart
            rows={metrics.collections}
            format={(row) => money(row.revenueMinor)}
          />
        </Panel>
        <Panel eyebrow="DROP INTEREST" title="Stories pulling attention.">
          <BarChart
            rows={metrics.drops}
            valueKey="count"
            format={(row) => `${row.count} signals`}
            emptyLabel="Enter a drop to start collecting signals"
          />
        </Panel>
        <Panel eyebrow="PRODUCT INTEREST" title="What people inspect.">
          <BarChart
            rows={metrics.productInterest}
            valueKey="count"
            format={(row) => `${row.count} signals`}
            emptyLabel="Open a product page to start collecting interest"
          />
        </Panel>
        <Panel eyebrow="SEARCH DEMAND" title="What they type in.">
          <BarChart
            rows={metrics.searches}
            valueKey="count"
            format={(row) => `${row.count} searches`}
            emptyLabel="Run a search to start collecting demand"
          />
        </Panel>
        <Panel eyebrow="SIZE MIX" title="What customers reach for.">
          <BarChart
            rows={metrics.sizes}
            valueKey="units"
            format={(row) => `${row.units} units`}
          />
        </Panel>
        <Panel eyebrow="COLOUR MIX" title="Colourway demand.">
          <BarChart
            rows={metrics.colors}
            valueKey="units"
            format={(row) => `${row.units} units`}
          />
        </Panel>
        <Panel eyebrow="ORDER STATE" title="Where orders sit.">
          <BarChart
            rows={metrics.statuses}
            valueKey="count"
            format={(row) => `${row.count} orders`}
          />
        </Panel>
        <Panel eyebrow="INVENTORY VALUE" title="Where the cash is held.">
          <BarChart
            rows={metrics.inventoryByCollection}
            format={(row) => money(row.revenueMinor)}
          />
        </Panel>
      </section>

      <section className="admin-insights" aria-label="Owner brief">
        <div className="admin-insights-heading">
          <p className="store-eyebrow">OWNER BRIEF / RULES-BASED</p>
          <h2>Three decisions worth making this week.</h2>
        </div>
        <div className="admin-insight-grid">
          {metrics.insights.length ? (
            metrics.insights.map((insight) => (
              <article
                key={insight.title}
                className={`admin-insight tone-${insight.tone}`}
              >
                <span>
                  {insight.tone === "good"
                    ? "GOOD SIGNAL"
                    : insight.tone === "watch"
                      ? "WATCH"
                      : "ACTION"}
                </span>
                <h3>{insight.title}</h3>
                <p>{insight.body}</p>
              </article>
            ))
          ) : (
            <p className="admin-empty-chart">
              No signals yet. The brief fills in as sales and drop interactions
              arrive.
            </p>
          )}
        </div>
      </section>

      <AiAdvisor
        signals={{
          rangeDays,
          kpis: metrics.kpis,
          products: metrics.products,
          collections: metrics.collections,
          drops: metrics.drops,
          searches: metrics.searches,
        }}
      />

      <section className="admin-tables">
        <article className="admin-table-panel">
          <header>
            <p className="store-eyebrow">ORDERS / RECENT</p>
            <h2>Latest activity.</h2>
          </header>
          <div className="admin-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ORDER</th>
                  <th>DATE</th>
                  <th>CUSTOMER</th>
                  <th>STATE</th>
                  <th className="align-right">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>{shortDate(order.createdAt)}</td>
                    <td>{order.email}</td>
                    <td>
                      <span className={`admin-status status-${order.status}`}>
                        {order.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="align-right">{money(order.totalMinor)}</td>
                  </tr>
                ))}
                {!metrics.recentOrders.length && (
                  <tr>
                    <td colSpan={5}>No orders in this range.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="admin-table-panel">
          <header>
            <p className="store-eyebrow">INVENTORY / RISK</p>
            <h2>Variants to watch.</h2>
          </header>
          <div className="admin-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>SIZE</th>
                  <th>COLOUR</th>
                  <th className="align-right">STOCK</th>
                </tr>
              </thead>
              <tbody>
                {metrics.lowStock.map((variant) => (
                  <tr key={variant.id}>
                    <td>{variant.sku}</td>
                    <td>{variant.size}</td>
                    <td>{variant.color}</td>
                    <td className="align-right">{variant.stockQuantity}</td>
                  </tr>
                ))}
                {!metrics.lowStock.length && (
                  <tr>
                    <td colSpan={4}>No low-stock variants.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="admin-table-panel">
          <header>
            <p className="store-eyebrow">CUSTOMERS / VALUE</p>
            <h2>Highest lifetime value.</h2>
          </header>
          <div className="admin-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>CUSTOMER</th>
                  <th className="align-right">ORDERS</th>
                  <th className="align-right">VALUE</th>
                  <th className="align-right">LAST</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topCustomers.map((customer) => (
                  <tr key={customer.email}>
                    <td>{customer.email}</td>
                    <td className="align-right">{customer.orders}</td>
                    <td className="align-right">
                      {money(customer.revenueMinor)}
                    </td>
                    <td className="align-right">
                      {shortDate(customer.lastOrderAt)}
                    </td>
                  </tr>
                ))}
                {!metrics.topCustomers.length && (
                  <tr>
                    <td colSpan={4}>No customer orders in this range.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="admin-dashboard-footer">
        <span>
          Metrics recomputed from {data.orders.length} orders,{" "}
          {data.products.length} products and {data.events.length} on-site
          signals.
        </span>
        <div>
          <Link to="/admin/system">SYSTEM STATUS ↗</Link>
          <button type="button" onClick={() => exportOrders(data, rangeDays)}>
            EXPORT ORDERS CSV ↗
          </button>
        </div>
      </section>
    </>
  );
}

export function AdminDashboardPage() {
  const [rangeDays, setRangeDays] = useState<MetricRange>(30);
  const query = useAdminData(rangeDays);
  const metrics = useMemo(
    () => (query.data ? computeAdminMetrics(query.data, rangeDays) : null),
    [query.data, rangeDays],
  );
  const currency = query.data?.orders[0]?.currency ?? "USD";

  return (
    <div className="storefront-page admin-dashboard-page">
      <section className="admin-dashboard-hero">
        <div>
          <p className="store-eyebrow">CREWWW / OWNER CONSOLE</p>
          <h1>
            Store <em>signals.</em>
          </h1>
          <p className="page-hero-copy">
            Revenue, stock, drops and customer behaviour in one place. Every
            number below is computed from the same data the store uses.
          </p>
        </div>
        <div className="admin-dashboard-controls">
          <span
            className={`admin-source-badge source-${query.data?.source ?? (API_MODE ? "api" : "demo")}`}
          >
            {query.data?.source === "api" ? "LIVE API DATA" : "LOCAL DEMO DATA"}
          </span>
          <div
            className="admin-range"
            role="group"
            aria-label="Metrics date range"
          >
            {RANGES.map((days) => (
              <button
                key={days}
                type="button"
                aria-pressed={rangeDays === days}
                onClick={() => setRangeDays(days)}
              >
                {days}D
              </button>
            ))}
          </div>
          <button
            type="button"
            className="admin-refresh"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            {query.isFetching ? "REFRESHING…" : "REFRESH ↗"}
          </button>
        </div>
      </section>

      <figure className="admin-console-visual">
        <img
          src="/images/admin/owner-console.svg"
          alt="Illustrated CREWWW studio rail with hoodies and folded denim beside a projected sales chart"
          width={1600}
          height={900}
          loading="lazy"
          decoding="async"
        />
        <figcaption>
          <span>OWNER VIEW / STUDIO FLOOR</span>
          <span>LIVE SIGNALS BELOW</span>
        </figcaption>
      </figure>

      {query.data?.limitations.length ? (
        <aside className="admin-data-note" aria-label="Data limitations">
          <strong>READ THIS FIRST</strong>
          <ul>
            {query.data.limitations.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </aside>
      ) : null}

      {query.isPending ? (
        <div className="catalog-skeleton" role="status" aria-busy="true">
          CALCULATING STORE SIGNALS…
        </div>
      ) : query.isError ? (
        <section className="catalog-empty" role="alert">
          <span>DATA UNAVAILABLE</span>
          <p>
            {query.error instanceof Error
              ? query.error.message
              : "The admin service could not be loaded."}
          </p>
          <button type="button" onClick={() => void query.refetch()}>
            RETRY ↗
          </button>
        </section>
      ) : query.data && metrics ? (
        <Dashboard
          data={query.data}
          metrics={metrics}
          rangeDays={rangeDays}
          currency={currency}
        />
      ) : null}
    </div>
  );
}
