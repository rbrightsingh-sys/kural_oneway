import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import { ENDPOINTS, DASHBOARD_REFRESH_MS } from "../config/api";

const PAGE_SIZE = 10;

const STATUS_STYLES = {
  completed: "bg-signal/10 text-signal-dark",
  processing: "bg-harbor/10 text-harbor",
  failed: "bg-flag/10 text-flag",
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
        STATUS_STYLES[status] || "bg-mist text-ink/60"
      }`}
    >
      {status === "processing" && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-harbor" />
      )}
      {status}
    </span>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-mist bg-white/60 p-5 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-ink/45">{label}</p>
      <p className={`mt-2 font-display text-3xl text-ink ${accent || ""}`}>{value}</p>
    </div>
  );
}

function formatDayLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

function formatTimestamp(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function TrendChart({ trend }) {
  const data = trend.map((t) => ({ ...t, label: formatDayLabel(t.date) }));

  return (
    <div className="rounded-2xl border border-mist bg-white/60 p-5 shadow-card">
      <p className="mb-4 font-display text-lg text-ink">Submissions per day</p>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#12B7A6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#12B7A6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#E4E7EE" />
            <XAxis
              dataKey="label"
              tick={{ fill: "#12141C", fontSize: 11, opacity: 0.55 }}
              axisLine={{ stroke: "#E4E7EE" }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "#12141C", fontSize: 11, opacity: 0.55 }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              contentStyle={{
                background: "#F5F6F2",
                border: "1px solid #E4E7EE",
                borderRadius: 10,
                fontSize: 12,
              }}
              labelStyle={{ color: "#12141C", fontWeight: 600 }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#0C8A7D"
              strokeWidth={2}
              fill="url(#trendFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RecentFeed({ items }) {
  return (
    <div className="rounded-2xl border border-mist bg-white/60 p-5 shadow-card">
      <p className="mb-4 font-display text-lg text-ink">Latest feedback</p>
      {items.length === 0 ? (
        <p className="text-sm text-ink/45">No submissions yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.job_id} className="rounded-xl bg-paper p-3.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium uppercase tracking-wide text-ink/40">
                  {item.kind}
                </span>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-1.5 line-clamp-2 text-sm text-ink/80">
                {item.summary || item.transcript_text || (item.error ?? "—")}
              </p>
              <p className="mt-1.5 text-xs text-ink/35">{formatTimestamp(item.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, options, label }) {
  return (
    <label className="flex items-center gap-2 text-xs text-ink/50">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-mist bg-white px-2.5 py-1.5 text-sm text-ink outline-none focus-visible:border-harbor"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SubmissionsTable({ items, total, page, pageSize, onPageChange, statusFilter, setStatusFilter, kindFilter, setKindFilter }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="rounded-2xl border border-mist bg-white/60 p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-lg text-ink">All submissions</p>
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All" },
              { value: "completed", label: "Completed" },
              { value: "processing", label: "Processing" },
              { value: "failed", label: "Failed" },
            ]}
          />
          <FilterSelect
            label="Type"
            value={kindFilter}
            onChange={setKindFilter}
            options={[
              { value: "all", label: "All" },
              { value: "audio", label: "Audio" },
              { value: "text", label: "Text" },
            ]}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-mist text-left text-xs uppercase tracking-wide text-ink/40">
              <th className="py-2 pr-4 font-medium">Time</th>
              <th className="py-2 pr-4 font-medium">Type</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 pr-4 font-medium">Transcript</th>
              <th className="py-2 pr-4 font-medium">Summary</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-ink/40">
                  No submissions match these filters.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.job_id} className="border-b border-mist/70 align-top last:border-0">
                  <td className="py-3 pr-4 whitespace-nowrap text-ink/60">
                    {formatTimestamp(item.created_at)}
                  </td>
                  <td className="py-3 pr-4 capitalize text-ink/60">{item.kind}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td
                    className="max-w-[240px] truncate py-3 pr-4 text-ink/75"
                    title={item.transcript_text || ""}
                  >
                    {item.transcript_text || "—"}
                  </td>
                  <td
                    className="max-w-[240px] truncate py-3 pr-4 text-ink/75"
                    title={item.summary || item.error || ""}
                  >
                    {item.summary || (item.status === "failed" ? item.error : "—")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-ink/45">
        <span>
          Page {page} of {totalPages} · {total} total
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded-lg border border-mist px-3 py-1.5 font-medium text-ink/70 transition hover:bg-mist disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="rounded-lg border border-mist px-3 py-1.5 font-medium text-ink/70 transition hover:bg-mist disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [tableItems, setTableItems] = useState([]);
  const [tableTotal, setTableTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStatsAndRecent = useCallback(async () => {
    const [statsRes, recentRes] = await Promise.all([
      fetch(ENDPOINTS.dashboardStats),
      fetch(ENDPOINTS.dashboardSubmissions({ page: 1, page_size: 5 })),
    ]);
    if (!statsRes.ok || !recentRes.ok) throw new Error("Failed to load dashboard data.");
    const statsData = await statsRes.json();
    const recentData = await recentRes.json();
    setStats(statsData);
    setRecent(recentData.items);
  }, []);

  const loadTable = useCallback(async () => {
    const res = await fetch(
      ENDPOINTS.dashboardSubmissions({
        page,
        page_size: PAGE_SIZE,
        status: statusFilter,
        kind: kindFilter,
      })
    );
    if (!res.ok) throw new Error("Failed to load submissions.");
    const data = await res.json();
    setTableItems(data.items);
    setTableTotal(data.total);
  }, [page, statusFilter, kindFilter]);

  // Initial load + periodic refresh of the overview/recent feed.
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        await Promise.all([loadStatsAndRecent(), loadTable()]);
        if (!cancelled) setError(null);
      } catch (err) {
        if (!cancelled) setError(err.message || "Something went wrong.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    const interval = setInterval(() => {
      loadStatsAndRecent().catch(() => {});
    }, DASHBOARD_REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch the table whenever page/filters change.
  useEffect(() => {
    loadTable().catch((err) => setError(err.message || "Something went wrong."));
  }, [loadTable]);

  // Reset to page 1 when filters change.
  useEffect(() => {
    setPage(1);
  }, [statusFilter, kindFilter]);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Header />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 pb-16">
        <div>
          <p className="font-display text-2xl text-ink">Dashboard</p>
          <p className="text-sm text-ink/45">Feedback submissions for Pothys</p>
        </div>

        {loading && <p className="text-sm text-ink/45">Loading…</p>}

        {error && !loading && (
          <div className="rounded-xl border border-flag/30 bg-flag/5 px-4 py-3 text-sm text-flag">
            {error}
          </div>
        )}

        {stats && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Total" value={stats.total} />
              <StatCard label="Completed" value={stats.completed} accent="text-signal-dark" />
              <StatCard label="Processing" value={stats.processing} accent="text-harbor" />
              <StatCard label="Failed" value={stats.failed} accent="text-flag" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatCard label="Audio submissions" value={stats.audio_count} />
              <StatCard label="Text submissions" value={stats.text_count} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
              <TrendChart trend={stats.trend} />
              <RecentFeed items={recent} />
            </div>

            <SubmissionsTable
              items={tableItems}
              total={tableTotal}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              kindFilter={kindFilter}
              setKindFilter={setKindFilter}
            />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
