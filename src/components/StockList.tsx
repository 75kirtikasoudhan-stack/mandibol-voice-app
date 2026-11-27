import { Package, Sprout } from "lucide-react";
import type { StockItem } from "../types";

interface StockListProps {
  stocks: StockItem[];
}

function formatKg(val: number): string {
  const rounded = Math.round(val * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
}

export function StockList({ stocks }: StockListProps) {
  if (stocks.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
        <Package className="w-10 h-10 text-slate-400 mx-auto mb-2" />
        <p className="text-base font-bold text-slate-900">Abhi koi sabzi stock mein nahi hai</p>
        <p className="text-sm text-slate-600 mt-1">
          Niche mic dabakar bolein: &ldquo;10 kilo bhindi 300 rupaye mein kharida&rdquo;
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {stocks.map((item) => {
        const pctRemaining =
          item.boughtKg > 0
            ? Math.min(100, Math.max(0, Math.round((item.remainingKg / item.boughtKg) * 100)))
            : 0;
        const isOut = item.remainingKg <= 0;
        const isLow = !isOut && (item.remainingKg <= 3 || pctRemaining <= 20);
        const avgCostPerKg =
          item.boughtKg > 0 ? item.boughtCostInr / item.boughtKg : 0;
        const itemProfit = Math.round(
          item.soldRevenueInr - item.soldKg * avgCostPerKg
        );

        return (
          <div
            key={item.id}
            className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isOut
                      ? "bg-rose-100 text-rose-700"
                      : isLow
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  <Sprout className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug truncate">
                    {item.name}{" "}
                    {item.hindiName ? (
                      <span className="font-bold text-slate-700">({item.hindiName})</span>
                    ) : null}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                    {item.englishName && (
                      <>
                        <span>{item.englishName}</span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <span className="tabular-nums">
                      Bought {formatKg(item.boughtKg)} kg for ₹{item.boughtCostInr.toLocaleString("en-IN")}
                    </span>
                    {avgCostPerKg > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums font-semibold text-slate-700">
                          Avg ₹{Math.round(avgCostPerKg)}/kg
                        </span>
                      </>
                    )}
                    {item.soldKg > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums text-blue-700 font-semibold">
                          Sold {formatKg(item.soldKg)} kg (₹{item.soldRevenueInr.toLocaleString("en-IN")})
                        </span>
                        {avgCostPerKg > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span
                              className={`tabular-nums font-bold ${
                                itemProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                              }`}
                            >
                              Munafa {itemProfit >= 0 ? "+" : "-"}₹{Math.abs(itemProfit).toLocaleString("en-IN")}
                            </span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p
                  className={`font-mono-num text-xl sm:text-2xl font-extrabold leading-none ${
                    isOut
                      ? "text-rose-700"
                      : isLow
                      ? "text-amber-700"
                      : "text-slate-900"
                  }`}
                >
                  {formatKg(item.remainingKg)} kg
                </p>
                <p
                  className={`text-xs font-bold mt-1 ${
                    isOut
                      ? "text-rose-700"
                      : isLow
                      ? "text-amber-700"
                      : "text-emerald-700"
                  }`}
                >
                  {isOut ? "Khatam · Out" : isLow ? "Kam Bacha · Low" : "Bacha · Left"}
                </p>
              </div>
            </div>

            <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isOut
                    ? "bg-rose-500"
                    : isLow
                    ? "bg-amber-500"
                    : "bg-emerald-600"
                }`}
                style={{ width: `${pctRemaining}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
