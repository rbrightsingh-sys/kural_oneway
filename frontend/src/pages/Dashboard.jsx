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

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

// Shared by the table's date filter and the report panel's quick-range
// buttons. All ranges are inclusive, calendar-day, UTC.
function getPresetRange(key) {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);

  if (key === "yesterday") {
    start.setUTCDate(start.getUTCDate() - 1);
    end.setUTCDate(end.getUTCDate() - 1);
  } else if (key === "last7") {
    start.setUTCDate(start.getUTCDate() - 6);
  } else if (key === "last30") {
    start.setUTCDate(start.getUTCDate() - 29);
  } else if (key === "last365") {
    start.setUTCDate(start.getUTCDate() - 364);
  }
  // "today" (and any unknown key) leaves start === end.

  return { from: toISODate(start), to: toISODate(end) };
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

const DATE_RANGE_PRESETS = [
  { key: "last7", label: "Last week" },
  { key: "last30", label: "Last month" },
  { key: "last365", label: "Last year" },
];

function DateRangeFilter({ dateFrom, dateTo, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-ink/50">
      <span>Date</span>
      <input
        type="date"
        value={dateFrom}
        max={dateTo || undefined}
        onChange={(e) => onChange({ from: e.target.value, to: dateTo })}
        className="rounded-lg border border-mist bg-white px-2.5 py-1.5 text-sm text-ink outline-none focus-visible:border-harbor"
      />
      <span>to</span>
      <input
        type="date"
        value={dateTo}
        min={dateFrom || undefined}
        onChange={(e) => onChange({ from: dateFrom, to: e.target.value })}
        className="rounded-lg border border-mist bg-white px-2.5 py-1.5 text-sm text-ink outline-none focus-visible:border-harbor"
      />
      {DATE_RANGE_PRESETS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => onChange(getPresetRange(p.key))}
          className="rounded-full border border-mist px-2.5 py-1 font-medium text-ink/60 transition hover:bg-mist"
        >
          {p.label}
        </button>
      ))}
      {(dateFrom || dateTo) && (
        <button
          type="button"
          onClick={() => onChange({ from: "", to: "" })}
          className="rounded-full px-2.5 py-1 font-medium text-flag transition hover:bg-flag/10"
        >
          Clear
        </button>
      )}
    </div>
  );
}

const REPORT_PRESETS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "Last week" },
  { key: "last30", label: "Last month" },
];

function ReportPanel({ onGenerate, onClose }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  return (
    <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-2xl border border-mist bg-white p-4 shadow-card">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink/45">Quick range</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {REPORT_PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => {
              const range = getPresetRange(p.key);
              onGenerate(range.from, range.to);
              onClose();
            }}
            className="rounded-full border border-mist px-2.5 py-1 text-xs font-medium text-ink/70 transition hover:bg-mist"
          >
            {p.label}
          </button>
        ))}
      </div>

      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink/45">Custom range</p>
      <div className="flex flex-col gap-2">
        <input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-lg border border-mist bg-white px-2.5 py-1.5 text-sm text-ink outline-none focus-visible:border-harbor"
        />
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-lg border border-mist bg-white px-2.5 py-1.5 text-sm text-ink outline-none focus-visible:border-harbor"
        />
        <button
          type="button"
          disabled={!from || !to}
          onClick={() => {
            onGenerate(from, to);
            onClose();
          }}
          className="rounded-lg bg-harbor px-3 py-1.5 text-sm font-medium text-white transition hover:bg-harbor/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Download PDF
        </button>
      </div>
    </div>
  );
}

function ReportButton() {
  const [open, setOpen] = useState(false);

  const handleGenerate = (dateFrom, dateTo) => {
    const url = ENDPOINTS.dashboardReport({ date_from: dateFrom, date_to: dateTo });
    window.open(url, "_blank");
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border border-mist bg-white px-3.5 py-2 text-sm font-medium text-ink/70 shadow-card transition hover:bg-mist"
      >
        Download report
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <ReportPanel onGenerate={handleGenerate} onClose={() => setOpen(false)} />
        </>
      )}
    </div>
  );
}

function SubmissionsTable({
  items,
  total,
  page,
  pageSize,
  onPageChange,
  statusFilter,
  setStatusFilter,
  kindFilter,
  setKindFilter,
  dateFrom,
  dateTo,
  onDateChange,
}) {
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

      <div className="mb-4">
        <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChange={onDateChange} />
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
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
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
    );
    if (!res.ok) throw new Error("Failed to load submissions.");
    const data = await res.json();
    setTableItems(data.items);
    setTableTotal(data.total);
  }, [page, statusFilter, kindFilter, dateFrom, dateTo]);

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
  }, [statusFilter, kindFilter, dateFrom, dateTo]);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Header />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 pb-16">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-display text-2xl text-ink">Dashboard</p>
            <p className="text-sm text-ink/45">Feedback submissions for Pothys</p>
          </div>
          <ReportButton />
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
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateChange={({ from, to }) => {
                setDateFrom(from);
                setDateTo(to);
              }}
            />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}