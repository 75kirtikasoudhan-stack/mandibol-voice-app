import { useEffect, useState } from "react";
import {
  Calendar,
  Check,
  Clock,
  DatabaseBackup,
  RotateCcw,
  Settings,
  Store,
  Trash2,
  User,
  X,
} from "lucide-react";
import type { ShopProfile } from "../types";
import { getActiveBusinessDateTime } from "../utils/exportReports";

interface ShopSetupModalProps {
  isOpen: boolean;
  shopProfile: ShopProfile;
  onClose: () => void;
  onSaveProfile: (next: ShopProfile) => void;
  onStartFresh: () => void;
  onLoadDemoData: () => void;
}

function getCurrentLocalDateTimeDefaults(): { date: string; time: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return {
    date: `${year}-${month}-${day}`,
    time: `${hh}:${mm}`,
  };
}

export function ShopSetupModal({
  isOpen,
  shopProfile,
  onClose,
  onSaveProfile,
  onStartFresh,
  onLoadDemoData,
}: ShopSetupModalProps) {
  const [draft, setDraft] = useState<ShopProfile>(shopProfile);
  const [formError, setFormError] = useState("");
  const [confirmingFresh, setConfirmingFresh] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const defaults = getCurrentLocalDateTimeDefaults();
      setDraft({
        shopName: shopProfile.shopName || "MandiBol",
        vendorName: shopProfile.vendorName || "",
        vendorMobile: shopProfile.vendorMobile || "",
        useLiveClock: shopProfile.useLiveClock !== false,
        customDate: shopProfile.customDate || defaults.date,
        customTime: shopProfile.customTime || defaults.time,
      });
      setFormError("");
      setConfirmingFresh(false);
    }
  }, [isOpen, shopProfile]);

  if (!isOpen) return null;

  const activePreview = getActiveBusinessDateTime(draft);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedShop = draft.shopName.trim() || "MandiBol";
    const cleanedMobile = draft.vendorMobile.replace(/\D/g, "").slice(0, 10);

    if (draft.vendorMobile.trim() && cleanedMobile.length !== 10) {
      setFormError("Vendor mobile number 10 anko ka hona chahiye.");
      return;
    }

    if (!draft.useLiveClock && !draft.customDate) {
      setFormError("Kripya custom business date chunein.");
      return;
    }

    onSaveProfile({
      shopName: cleanedShop,
      vendorName: draft.vendorName.trim(),
      vendorMobile: cleanedMobile,
      useLiveClock: draft.useLiveClock,
      customDate: draft.customDate,
      customTime: draft.customTime || "09:00",
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shop Setup and Data Modes"
      className="fixed inset-0 z-50 bg-slate-950/65 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl p-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>Shop Setup &amp; Date · दुकान सेटअप</span>
            </h2>
            <p className="text-xs font-medium text-slate-600 mt-0.5">
              Customize your shop name, active date/time, or start fresh for real use
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Shop Setup"
            className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shop Profile & Date/Time Form */}
        <form onSubmit={handleSave} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">
              Shop / Mandi Name · दुकान का नाम *
            </label>
            <div className="relative">
              <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={draft.shopName}
                onChange={(e) => {
                  setDraft((prev) => ({ ...prev, shopName: e.target.value }));
                  setFormError("");
                }}
                placeholder="e.g., Kirtika Sabzi Bhandar"
                className="w-full min-h-[44px] rounded-xl border-2 border-slate-300 pl-10 pr-3.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                Vendor Name · दुकानदार का नाम
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={draft.vendorName}
                  onChange={(e) => {
                    setDraft((prev) => ({ ...prev, vendorName: e.target.value }));
                    setFormError("");
                  }}
                  placeholder="e.g., Ramesh Gupta"
                  className="w-full min-h-[44px] rounded-xl border-2 border-slate-300 pl-10 pr-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                Vendor Mobile · मोबाइल नंबर
              </label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={draft.vendorMobile}
                onChange={(e) => {
                  setDraft((prev) => ({
                    ...prev,
                    vendorMobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                  }));
                  setFormError("");
                }}
                placeholder="10-digit mobile"
                className="w-full min-h-[44px] rounded-xl border-2 border-slate-300 px-3.5 text-sm font-mono-num font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Active Business Date & Time Selector */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                  Active Business Date &amp; Time
                </span>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={draft.useLiveClock}
                onClick={() => {
                  const defaults = getCurrentLocalDateTimeDefaults();
                  setDraft((prev) => ({
                    ...prev,
                    useLiveClock: !prev.useLiveClock,
                    customDate: prev.customDate || defaults.date,
                    customTime: prev.customTime || defaults.time,
                  }));
                  setFormError("");
                }}
                className={`min-h-[38px] px-3 rounded-xl text-xs font-extrabold border flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                  draft.useLiveClock
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-slate-800 border-slate-300 hover:bg-slate-100"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {draft.useLiveClock ? "Use Live Clock: ON" : "Use Live Clock: OFF"}
                </span>
              </button>
            </div>

            {!draft.useLiveClock && (
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Custom Date · तारीख
                  </label>
                  <input
                    type="date"
                    value={draft.customDate}
                    onChange={(e) => {
                      setDraft((prev) => ({ ...prev, customDate: e.target.value }));
                      setFormError("");
                    }}
                    className="w-full min-h-[44px] rounded-xl border-2 border-slate-300 bg-white px-3 text-sm font-mono-num font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Custom Time · समय
                  </label>
                  <input
                    type="time"
                    value={draft.customTime}
                    onChange={(e) => {
                      setDraft((prev) => ({ ...prev, customTime: e.target.value }));
                      setFormError("");
                    }}
                    className="w-full min-h-[44px] rounded-xl border-2 border-slate-300 bg-white px-3 text-sm font-mono-num font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            )}

            <div className="rounded-xl bg-white border border-slate-200 px-3 py-2 flex items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-600">Active Entry Stamp:</span>
              <span className="font-mono-num font-extrabold text-emerald-800">
                {activePreview.displayDate} · {activePreview.timeLabel}
              </span>
            </div>
          </div>

          {formError && (
            <p className="text-xs font-bold text-rose-700">{formError}</p>
          )}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Shop Setup · सेव करें</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[46px] px-4 rounded-xl border border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-50 whitespace-nowrap cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Two Clear Data Modes: Start Fresh vs Load Demo Data */}
        <div className="mt-5 pt-4 border-t border-slate-200 space-y-3">
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
              Data Mode · खाता मोड (Buyers vs. Judges)
            </h3>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Start with ₹0 empty ledger for your real shop, or reload sample data for demos
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Start Fresh Card */}
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 flex flex-col justify-between gap-2.5">
              <div>
                <p className="text-xs sm:text-sm font-extrabold text-rose-950">
                  Start Fresh · नया खाता शुरू करें
                </p>
                <p className="text-[11px] font-medium text-rose-900/80 mt-0.5">
                  Clears all demo stock, bills &amp; udhaar to ₹0 (keeps your shop setup).
                </p>
              </div>

              {!confirmingFresh ? (
                <button
                  type="button"
                  onClick={() => setConfirmingFresh(true)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>Start Fresh (₹0)</span>
                </button>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-extrabold text-rose-900">
                    Clear all demo entries to ₹0?
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onStartFresh();
                        setConfirmingFresh(false);
                        onClose();
                      }}
                      className="flex-1 min-h-[44px] px-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-extrabold whitespace-nowrap cursor-pointer"
                    >
                      Yes, Start Fresh
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingFresh(false)}
                      className="min-h-[44px] px-3 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold whitespace-nowrap cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Load Demo Data Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col justify-between gap-2.5">
              <div>
                <p className="text-xs sm:text-sm font-extrabold text-slate-900">
                  Load Demo Data · डेमो डेटा लोड करें
                </p>
                <p className="text-[11px] font-medium text-slate-600 mt-0.5">
                  Restores sample morning stock, customer bills, udhaar &amp; 7-day history.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onLoadDemoData();
                  onClose();
                }}
                className="w-full min-h-[44px] px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <DatabaseBackup className="w-4 h-4 shrink-0 text-emerald-400" />
                <RotateCcw className="w-3.5 h-3.5 hidden" />
                <span>Load Demo Data</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
