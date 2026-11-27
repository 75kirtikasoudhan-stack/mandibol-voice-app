import { IndianRupee, ShoppingBag, TrendingUp } from "lucide-react";

interface SummaryCardsProps {
  totalKharid: number;
  totalBikri: number;
  totalOnlineBikri: number;
  totalOfflineBikri: number;
}

export function SummaryCards({
  totalKharid,
  totalBikri,
  totalOnlineBikri,
  totalOfflineBikri,
}: SummaryCardsProps) {
  const munafa = totalBikri - totalKharid;
  const isNegative = munafa < 0;
  const formattedMunafa = `${isNegative ? "-" : "+"}₹${Math.abs(munafa).toLocaleString("en-IN")}`;

  return (
    <section aria-label="Daily Summary" className="grid grid-cols-3 gap-2 sm:gap-4">
      {/* Kharid (Cost) - Orange */}
      <div className="rounded-2xl bg-orange-50 border-2 border-orange-300 p-2.5 sm:p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] sm:text-xs font-bold text-orange-800">
            खरीद
          </span>
          <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-orange-200/80 text-orange-800 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </span>
        </div>
        <div className="mt-1.5 sm:mt-2">
          <p className="text-xs sm:text-sm font-extrabold text-orange-950 leading-tight">
            Kharid (Cost)
          </p>
          <p className="font-mono-num text-lg sm:text-3xl font-extrabold text-orange-950 tracking-tight mt-0.5 truncate">
            ₹{totalKharid.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Bikri (Sales) - Blue with Offline Cash & Online UPI Split */}
      <div className="rounded-2xl bg-blue-50 border-2 border-blue-300 p-2.5 sm:p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] sm:text-xs font-bold text-blue-800">
            बिक्री
          </span>
          <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-200/80 text-blue-800 flex items-center justify-center shrink-0">
            <IndianRupee className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </span>
        </div>
        <div className="mt-1.5 sm:mt-2">
          <p className="text-xs sm:text-sm font-extrabold text-blue-950 leading-tight">
            Bikri (Sales)
          </p>
          <p className="font-mono-num text-lg sm:text-3xl font-extrabold text-blue-950 tracking-tight mt-0.5 truncate">
            ₹{totalBikri.toLocaleString("en-IN")}
          </p>
          <div className="mt-1.5 pt-1.5 border-t border-blue-200/80 space-y-0.5 text-[10px] sm:text-xs font-mono-num font-bold text-blue-900">
            <p className="truncate">
              💵 Offline (Cash): ₹{totalOfflineBikri.toLocaleString("en-IN")}
            </p>
            <p className="truncate">
              📱 Online (UPI): ₹{totalOnlineBikri.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* Munafa (Profit) - Bright Green */}
      <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-500 p-2.5 sm:p-4 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] sm:text-xs font-bold text-emerald-800">
            मुनाफा
          </span>
          <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </span>
        </div>
        <div className="mt-1.5 sm:mt-2">
          <p className="text-xs sm:text-sm font-extrabold text-emerald-950 leading-tight">
            Munafa (Profit)
          </p>
          <p
            className={`font-mono-num text-lg sm:text-3xl font-extrabold tracking-tight mt-0.5 truncate ${
              isNegative ? "text-emerald-900" : "text-emerald-700"
            }`}
          >
            {formattedMunafa}
          </p>
        </div>
      </div>
    </section>
  );
}
