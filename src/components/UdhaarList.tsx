import { Check, Users } from "lucide-react";
import type { UdhaarEntry } from "../types";

interface UdhaarListProps {
  udhaarList: UdhaarEntry[];
  onSettleUdhaar: (id: string) => void;
}

export function UdhaarList({ udhaarList, onSettleUdhaar }: UdhaarListProps) {
  const totalUdhaar = udhaarList.reduce((acc, entry) => acc + entry.amountInr, 0);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Users className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-slate-300">
              Total Baaki Udhaar · कुल बकाया उधार
            </p>
          </div>
        </div>
        <p className="font-mono-num text-xl sm:text-2xl font-extrabold text-amber-400 shrink-0">
          ₹{totalUdhaar.toLocaleString("en-IN")}
        </p>
      </div>

      {udhaarList.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
          <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-base font-bold text-slate-900">Koi udhaar baaki nahi hai</p>
          <p className="text-sm text-slate-600 mt-1">
            Udhaar likhne ke liye bolein: &ldquo;Sunita ji ke 50 rupaye udhaar likho&rdquo;
          </p>
        </div>
      ) : (
        udhaarList.map((entry) => {
          const initial = entry.customerName.trim().charAt(0).toUpperCase() || "G";
          return (
            <div
              key={entry.id}
              className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-900 font-extrabold text-lg flex items-center justify-center shrink-0">
                  {initial}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                    {entry.customerName}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium">
                    Baaki · Updated {entry.lastUpdated}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <p className="font-mono-num text-xl sm:text-2xl font-extrabold text-slate-900">
                  ₹{entry.amountInr.toLocaleString("en-IN")}
                </p>
                <button
                  type="button"
                  onClick={() => onSettleUdhaar(entry.id)}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:scale-[0.98] border border-emerald-300 text-emerald-900 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer"
                  title="Mark Paid / Jama Karein"
                >
                  <Check className="w-4 h-4" />
                  <span>Paid</span>
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
