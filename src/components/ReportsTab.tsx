import { Fragment, useMemo, useState } from "react";
import {
  BarChart3,
  BookmarkCheck,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  PieChart as PieChartIcon,
  Printer,
  Save,
  TrendingUp,
} from "lucide-react";
import {
  CURRENT_MONTH_MTD_BASE,
  PAST_MONTHS_ANALYTICS,
} from "../data/initialData";
import type { MandiState, MonthlyComparisonPoint } from "../types";
import {
  downloadDailyExcelReport,
  downloadOverallCsvReport,
  downloadOverallPrintableReport,
  getTodayIsoDate,
} from "../utils/exportReports";

interface ReportsTabProps {
  state: MandiState;
  onSaveTodayClosing: () => void;
}

interface PieSlice {
  id: string;
  label: string;
  subLabel?: string;
  value: number;
  color: string;
}

const SLICE_COLORS = [
  "#059669", // emerald-600
  "#2563eb", // blue-600
  "#d97706", // amber-600
  "#7c3aed", // violet-600
  "#db2777", // pink-600
  "#0891b2", // cyan-600
  "#ea580c", // orange-600
];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describePieArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M",
    cx,
    cy,
    "L",
    start.x,
    start.y,
    "A",
    r,
    r,
    0,
    largeArc,
    0,
    end.x,
    end.y,
    "Z",
  ].join(" ");
}

interface InteractivePieCardProps {
  title: string;
  subtitle: string;
  metricMode: "sales" | "profit";
  onMetricChange: (mode: "sales" | "profit") => void;
  slices: PieSlice[];
  emptyMessage: string;
}

function InteractivePieCard({
  title,
  subtitle,
  metricMode,
  onMetricChange,
  slices,
  emptyMessage,
}: InteractivePieCardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const positiveSlices = slices.filter((s) => s.value > 0);
  const total = positiveSlices.reduce((acc, s) => acc + s.value, 0);

  const activeSlice =
    positiveSlices.find((s) => s.id === selectedId) ?? positiveSlices[0] ?? null;

  let currentAngle = 0;
  const computedArcs = positiveSlices.map((slice) => {
    const share = total > 0 ? slice.value / total : 0;
    const sweep = share * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweep;
    currentAngle = endAngle;
    return {
      ...slice,
      sharePct: Math.round(share * 1000) / 10,
      startAngle,
      endAngle,
    };
  });

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-1.5">
            <PieChartIcon className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{title}</span>
          </h3>
          <p className="text-xs text-slate-600 font-medium mt-0.5">{subtitle}</p>
        </div>

        <div className="inline-flex rounded-xl bg-slate-100 p-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              onMetricChange("sales");
              setSelectedId(null);
            }}
            className={`min-h-[34px] px-2.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              metricMode === "sales"
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:text-slate-900"
            }`}
          >
            Sales (₹)
          </button>
          <button
            type="button"
            onClick={() => {
              onMetricChange("profit");
              setSelectedId(null);
            }}
            className={`min-h-[34px] px-2.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              metricMode === "profit"
                ? "bg-emerald-700 text-white"
                : "text-slate-700 hover:text-slate-900"
            }`}
          >
            Profit (₹)
          </button>
        </div>
      </div>

      {positiveSlices.length === 0 || total <= 0 ? (
        <div className="py-10 text-center text-sm font-semibold text-slate-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          {/* Interactive SVG Donut/Pie */}
          <div className="sm:col-span-5 flex flex-col items-center">
            <svg
              viewBox="0 0 200 200"
              className="w-44 h-44 select-none"
              role="img"
              aria-label={title}
            >
              {computedArcs.length === 1 ? (
                <circle
                  cx={100}
                  cy={100}
                  r={88}
                  fill={computedArcs[0].color}
                  className="cursor-pointer transition-opacity"
                  onClick={() => setSelectedId(computedArcs[0].id)}
                />
              ) : (
                computedArcs.map((arc) => {
                  const isActive = activeSlice?.id === arc.id;
                  const pathD = describePieArc(
                    100,
                    100,
                    isActive ? 92 : 86,
                    arc.startAngle,
                    arc.endAngle - 0.5
                  );
                  return (
                    <path
                      key={arc.id}
                      d={pathD}
                      fill={arc.color}
                      stroke="#ffffff"
                      strokeWidth={2}
                      opacity={activeSlice && !isActive ? 0.72 : 1}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setSelectedId(arc.id)}
                      onClick={() => setSelectedId(arc.id)}
                    />
                  );
                })
              )}
              <circle cx={100} cy={100} r={46} fill="#ffffff" />
              <text
                x={100}
                y={94}
                textAnchor="middle"
                className="fill-slate-500 text-[10px] font-bold"
              >
                {metricMode === "sales" ? "TOTAL SALES" : "TOTAL PROFIT"}
              </text>
              <text
                x={100}
                y={114}
                textAnchor="middle"
                className="fill-slate-900 text-[15px] font-extrabold font-mono-num"
              >
                ₹{total.toLocaleString("en-IN")}
              </text>
            </svg>

            {activeSlice && (
              <div className="mt-2 w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-center">
                <p className="text-xs font-extrabold text-slate-900 truncate">
                  {activeSlice.label}
                  {activeSlice.subLabel ? ` · ${activeSlice.subLabel}` : ""}
                </p>
                <p className="font-mono-num text-sm font-extrabold text-emerald-700 mt-0.5">
                  ₹{activeSlice.value.toLocaleString("en-IN")} (
                  {Math.round((activeSlice.value / total) * 1000) / 10}%)
                </p>
              </div>
            )}
          </div>

          {/* Interactive Legend */}
          <div className="sm:col-span-7 space-y-1.5">
            {computedArcs.map((arc) => {
              const isActive = activeSlice?.id === arc.id;
              return (
                <button
                  key={arc.id}
                  type="button"
                  onClick={() => setSelectedId(arc.id)}
                  onMouseEnter={() => setSelectedId(arc.id)}
                  className={`w-full min-h-[40px] px-3 py-2 rounded-xl border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    isActive
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-900 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: arc.color }}
                    />
                    <span className="text-xs sm:text-sm font-bold truncate">
                      {arc.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono-num text-xs sm:text-sm font-extrabold">
                    <span>₹{arc.value.toLocaleString("en-IN")}</span>
                    <span
                      className={
                        isActive ? "text-emerald-300" : "text-slate-500"
                      }
                    >
                      {arc.sharePct}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function formatKg(val: number): string {
  return String(Math.round(val * 100) / 100);
}

export function ReportsTab({ state, onSaveTodayClosing }: ReportsTabProps) {
  const [todayMetric, setTodayMetric] = useState<"sales" | "profit">("sales");
  const [monthlyMetric, setMonthlyMetric] = useState<"sales" | "profit">("sales");
  const [historyRange, setHistoryRange] = useState<"all" | "3d" | "7d">("all");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("");
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);

  const todayIso = getTodayIsoDate(state.shopProfile);
  const todaySavedRecord = useMemo(
    () => (state.dailyHistory ?? []).find((d) => d.date === todayIso) ?? null,
    [state.dailyHistory, todayIso]
  );

  const stockTableRows = useMemo(() => {
    return state.stocks.map((s) => {
      const avgBuyRate =
        s.boughtKg > 0 ? Math.round(s.boughtCostInr / s.boughtKg) : 0;
      const costOfSold =
        s.boughtKg > 0 ? (s.soldKg * s.boughtCostInr) / s.boughtKg : 0;
      const netProfit = Math.round(s.soldRevenueInr - costOfSold);
      const sellRates = s.sellRates ?? [];
      return {
        ...s,
        avgBuyRate,
        netProfit,
        sellRates,
      };
    });
  }, [state.stocks]);

  const tableTotals = useMemo(() => {
    return stockTableRows.reduce(
      (acc, r) => ({
        soldKg: Math.round((acc.soldKg + r.soldKg) * 100) / 100,
        totalSales: acc.totalSales + r.soldRevenueInr,
        netProfit: acc.netProfit + r.netProfit,
      }),
      { soldKg: 0, totalSales: 0, netProfit: 0 }
    );
  }, [stockTableRows]);

  const sortedHistory = useMemo(() => {
    return [...(state.dailyHistory ?? [])].sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  }, [state.dailyHistory]);

  const filteredHistory = useMemo(() => {
    if (selectedDateFilter) {
      return sortedHistory.filter((d) => d.date === selectedDateFilter);
    }
    if (historyRange === "3d") return sortedHistory.slice(0, 3);
    if (historyRange === "7d") return sortedHistory.slice(0, 7);
    return sortedHistory;
  }, [sortedHistory, historyRange, selectedDateFilter]);

  const historyTotals = useMemo(() => {
    return filteredHistory.reduce(
      (acc, d) => ({
        kharid: acc.kharid + d.totalKharid,
        bikri: acc.bikri + d.totalBikri,
        profit: acc.profit + d.netProfit,
      }),
      { kharid: 0, bikri: 0, profit: 0 }
    );
  }, [filteredHistory]);

  const monthlyComparisonData: MonthlyComparisonPoint[] = useMemo(() => {
    const todayProfit = Math.max(0, tableTotals.netProfit);
    return [
      ...PAST_MONTHS_ANALYTICS,
      {
        month: CURRENT_MONTH_MTD_BASE.month,
        shortLabel: CURRENT_MONTH_MTD_BASE.shortLabel,
        salesInr: CURRENT_MONTH_MTD_BASE.salesInr + state.totalBikri,
        profitInr: CURRENT_MONTH_MTD_BASE.profitInr + todayProfit,
        isCurrent: true,
      },
    ];
  }, [state.totalBikri, tableTotals.netProfit]);

  const todaySlices: PieSlice[] = useMemo(() => {
    return stockTableRows
      .filter((r) => (todayMetric === "sales" ? r.soldRevenueInr > 0 : r.netProfit > 0))
      .map((r, idx) => ({
        id: r.id,
        label: r.name,
        subLabel: `${formatKg(r.soldKg)} kg sold`,
        value: todayMetric === "sales" ? r.soldRevenueInr : r.netProfit,
        color: SLICE_COLORS[idx % SLICE_COLORS.length],
      }));
  }, [stockTableRows, todayMetric]);

  const monthlySlices: PieSlice[] = useMemo(() => {
    return monthlyComparisonData.map((m, idx) => ({
      id: m.month,
      label: m.month,
      subLabel: m.isCurrent ? "Includes today's live sales" : "Past month",
      value: monthlyMetric === "sales" ? m.salesInr : Math.max(0, m.profitInr),
      color: SLICE_COLORS[idx % SLICE_COLORS.length],
    }));
  }, [monthlyComparisonData, monthlyMetric]);

  return (
    <div className="space-y-4">
      {/* Daily Closing Save + Multi-Sheet Excel (.xlsx) Export Bar */}
      <div className="rounded-2xl bg-slate-900 text-white p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Daily Closing &amp; Excel Reports · रिपोर्ट व एक्सेल</span>
            </h2>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              5-Sheet Excel (.xlsx): Today Sales, History, Udhaar, Stock &amp; Customer Bills
            </p>
          </div>
          {todaySavedRecord && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 shrink-0">
              <BookmarkCheck className="w-4 h-4" />
              <span>Today saved at {todaySavedRecord.savedAt}</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSaveTodayClosing}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 text-xs sm:text-sm font-extrabold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Today&apos;s Closing Report · आज का हिसाब सेव करें</span>
          </button>

          <button
            type="button"
            onClick={() => downloadDailyExcelReport(state)}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Daily Excel Report (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => downloadOverallCsvReport(state, monthlyComparisonData)}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={() => downloadOverallPrintableReport(state, monthlyComparisonData)}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Printable</span>
          </button>
        </div>
      </div>

      {/* Section A: Today's Sales & Profit Detail Table */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-700" />
              <span>Section A · Today&apos;s Sales &amp; Profit Detail ({todayIso})</span>
            </h3>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Item-wise qty sold, average buy rate, multi-rate sell prices &amp; net profit
            </p>
          </div>
          <span className="font-mono-num text-xs font-extrabold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
            {stockTableRows.length} items
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] sm:text-xs font-extrabold text-slate-600 uppercase tracking-wide">
                <th className="py-2.5 px-3.5">Item</th>
                <th className="py-2.5 px-3 text-right">Qty Sold</th>
                <th className="py-2.5 px-3 text-right">Avg Buy Rate</th>
                <th className="py-2.5 px-3">Sell Rate(s)</th>
                <th className="py-2.5 px-3 text-right">Sales (₹)</th>
                <th className="py-2.5 px-3.5 text-right">Profit (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {stockTableRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-3.5">
                    <p className="font-extrabold text-slate-900">{row.name}</p>
                    {row.hindiName && (
                      <p className="text-[11px] font-semibold text-slate-500">
                        {row.hindiName} · Left {formatKg(row.remainingKg)} kg
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono-num font-bold text-slate-800">
                    {formatKg(row.soldKg)} kg
                  </td>
                  <td className="py-3 px-3 text-right font-mono-num font-semibold text-slate-700">
                    {row.avgBuyRate > 0 ? `₹${row.avgBuyRate}/kg` : "—"}
                  </td>
                  <td className="py-3 px-3">
                    {row.sellRates.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {row.sellRates.map((sr) => (
                          <span
                            key={sr.id}
                            className="inline-block font-mono-num text-[11px] font-bold bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded-md whitespace-nowrap"
                          >
                            ₹{sr.ratePerKg}/kg ({formatKg(sr.qtyKg)}kg)
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 font-semibold">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono-num font-extrabold text-blue-800">
                    ₹{row.soldRevenueInr.toLocaleString("en-IN")}
                  </td>
                  <td
                    className={`py-3 px-3.5 text-right font-mono-num font-extrabold ${
                      row.netProfit > 0
                        ? "text-emerald-700"
                        : row.netProfit < 0
                        ? "text-rose-700"
                        : "text-slate-500"
                    }`}
                  >
                    {row.soldKg <= 0
                      ? "₹0"
                      : `${row.netProfit >= 0 ? "+" : "-"}₹${Math.abs(row.netProfit).toLocaleString("en-IN")}`}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100/90 border-t-2 border-slate-200 text-xs sm:text-sm font-extrabold text-slate-900">
                <td className="py-3 px-3.5">Today Total · कुल</td>
                <td className="py-3 px-3 text-right font-mono-num">
                  {formatKg(tableTotals.soldKg)} kg
                </td>
                <td className="py-3 px-3" />
                <td className="py-3 px-3" />
                <td className="py-3 px-3 text-right font-mono-num text-blue-900">
                  ₹{tableTotals.totalSales.toLocaleString("en-IN")}
                </td>
                <td
                  className={`py-3 px-3.5 text-right font-mono-num ${
                    tableTotals.netProfit >= 0 ? "text-emerald-800" : "text-rose-700"
                  }`}
                >
                  {tableTotals.netProfit >= 0 ? "+" : "-"}₹
                  {Math.abs(tableTotals.netProfit).toLocaleString("en-IN")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Section B: Previous Days Sales & Profit History Table */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-4 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span>Section B · Previous Days History · पिछले दिनों का हिसाब</span>
            </h3>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Saved daily closings &amp; past 7 days records (tap any row to view item rates)
            </p>
          </div>

          {/* Date Range / Specific Date Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "all", label: `All (${sortedHistory.length})` },
                { id: "7d", label: "7 Days" },
                { id: "3d", label: "3 Days" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setHistoryRange(opt.id);
                  setSelectedDateFilter("");
                }}
                className={`min-h-[36px] px-2.5 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap cursor-pointer ${
                  !selectedDateFilter && historyRange === opt.id
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {opt.label}
              </button>
            ))}

            <input
              type="date"
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              aria-label="Filter previous days by date"
              className="min-h-[36px] px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-mono-num font-bold text-slate-800"
            />
            {selectedDateFilter && (
              <button
                type="button"
                onClick={() => setSelectedDateFilter("")}
                className="min-h-[36px] px-2.5 rounded-lg bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[580px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] sm:text-xs font-extrabold text-slate-600 uppercase tracking-wide">
                <th className="py-2.5 px-3.5">Date</th>
                <th className="py-2.5 px-3 text-right">Total Kharid (₹)</th>
                <th className="py-2.5 px-3 text-right">Total Bikri (₹)</th>
                <th className="py-2.5 px-3 text-right">Net Profit (₹)</th>
                <th className="py-2.5 px-3.5">Top Sold Vegetable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-sm font-semibold text-slate-500"
                  >
                    Is tarikh ka koi hisab record nahi mila.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((day) => {
                  const isExpanded = expandedDayId === day.id;
                  const hasItems = day.items && day.items.length > 0;
                  const isToday = day.date === todayIso;
                  return (
                    <Fragment key={day.id}>
                      <tr
                        onClick={() =>
                          hasItems &&
                          setExpandedDayId((prev) =>
                            prev === day.id ? null : day.id
                          )
                        }
                        className={`${
                          hasItems ? "cursor-pointer hover:bg-slate-50" : ""
                        } ${isToday ? "bg-emerald-50/40" : ""}`}
                      >
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-1.5">
                            {hasItems &&
                              (isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              ))}
                            <div>
                              <p className="font-extrabold text-slate-900">
                                {day.displayDate}
                                {isToday ? " (Today)" : ""}
                              </p>
                              <p className="font-mono-num text-[11px] font-semibold text-slate-500">
                                {day.date} · Saved {day.savedAt}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num font-bold text-orange-700">
                          ₹{day.totalKharid.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num font-extrabold text-blue-800">
                          ₹{day.totalBikri.toLocaleString("en-IN")}
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-mono-num font-extrabold ${
                            day.netProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {day.netProfit >= 0 ? "+" : "-"}₹
                          {Math.abs(day.netProfit).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-3.5 font-bold text-slate-800">
                          {day.topSoldVegetable}
                        </td>
                      </tr>

                      {isExpanded && hasItems && (
                        <tr className="bg-slate-50/90">
                          <td colSpan={5} className="px-4 py-2.5">
                            <p className="text-[11px] font-extrabold text-slate-600 mb-1.5">
                              Rate &amp; Item Snapshot for {day.displayDate}:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {day.items!.map((it, idx) => (
                                <div
                                  key={`${day.id}-it-${idx}`}
                                  className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-xs"
                                >
                                  <span className="font-extrabold text-slate-900">
                                    {it.name}
                                  </span>{" "}
                                  <span className="font-mono-num text-slate-600">
                                    ({formatKg(it.soldKg)}kg · Buy ₹{it.avgBuyRate}/kg · Sell{" "}
                                    {it.sellRatesSummary})
                                  </span>{" "}
                                  <span className="font-mono-num font-bold text-emerald-700">
                                    = ₹{it.salesInr.toLocaleString("en-IN")} (Profit{" "}
                                    {it.profitInr >= 0 ? "+" : "-"}₹
                                    {Math.abs(it.profitInr).toLocaleString("en-IN")})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
            {filteredHistory.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/90 border-t-2 border-slate-200 text-xs sm:text-sm font-extrabold text-slate-900">
                  <td className="py-3 px-3.5">
                    History Total ({filteredHistory.length} days)
                  </td>
                  <td className="py-3 px-3 text-right font-mono-num text-orange-800">
                    ₹{historyTotals.kharid.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 px-3 text-right font-mono-num text-blue-900">
                    ₹{historyTotals.bikri.toLocaleString("en-IN")}
                  </td>
                  <td
                    className={`py-3 px-3 text-right font-mono-num ${
                      historyTotals.profit >= 0 ? "text-emerald-800" : "text-rose-700"
                    }`}
                  >
                    {historyTotals.profit >= 0 ? "+" : "-"}₹
                    {Math.abs(historyTotals.profit).toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 px-3.5" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Two Interactive SVG Pie Charts */}
      <div className="grid grid-cols-1 gap-4">
        <InteractivePieCard
          title="Today's Vegetable Breakdown · आज का हिस्सा"
          subtitle="Tap any slice to inspect today's sales or realized profit share"
          metricMode={todayMetric}
          onMetricChange={setTodayMetric}
          slices={todaySlices}
          emptyMessage="Aaj abhi tak kisi sabzi par bikri/munafa darj nahi hai."
        />

        <InteractivePieCard
          title="Monthly Comparison (Past 3 Months vs Nov Now)"
          subtitle="Tracks monthly revenue & profit growth including today's live sales"
          metricMode={monthlyMetric}
          onMetricChange={setMonthlyMetric}
          slices={monthlySlices}
          emptyMessage="No monthly comparison data available."
        />
      </div>
    </div>
  );
}
