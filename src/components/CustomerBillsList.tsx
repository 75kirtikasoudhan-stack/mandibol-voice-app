import { useMemo, useState } from "react";
import {
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  MessageCircle,
  Plus,
  Printer,
  Receipt,
  Trash2,
  X,
} from "lucide-react";
import { VEGETABLE_CATALOG } from "../data/initialData";
import type {
  CustomerBill,
  ParsedMultiOrderLine,
  ShopProfile,
  StockItem,
  UdhaarEntry,
} from "../types";
import {
  buildCustomerBillWhatsAppUrl,
  downloadCustomerBillInvoiceExcel,
  downloadCustomerBillInvoiceHtml,
} from "../utils/exportReports";

interface CustomerBillsListProps {
  bills: CustomerBill[];
  stocks: StockItem[];
  udhaarList?: UdhaarEntry[];
  shopProfile?: ShopProfile;
  onCreateBill: (payload: {
    buyerName: string;
    lines: ParsedMultiOrderLine[];
    paymentMode: "OFFLINE" | "ONLINE" | "UDHAAR" | "SPLIT";
    paidOnlineInr?: number;
    paidOfflineInr?: number;
  }) => void;
  onRecordBillPayment: (
    billId: string,
    payment: { onlineInr: number; offlineInr: number }
  ) => void;
}

function formatKg(val: number): string {
  return String(Math.round(val * 100) / 100);
}

const DEFAULT_ITEM_CHOICES = Object.keys(VEGETABLE_CATALOG);

export function CustomerBillsList({
  bills,
  stocks,
  udhaarList = [],
  shopProfile,
  onCreateBill,
  onRecordBillPayment,
}: CustomerBillsListProps) {
  const getCustomerMobile = (buyerName: string): string | undefined => {
    const cleaned = buyerName.trim().toLowerCase();
    if (!cleaned) return undefined;
    const match = udhaarList.find(
      (u) => u.customerName.trim().toLowerCase() === cleaned && u.mobile.trim()
    );
    return match?.mobile;
  };
  const [buyerFilter, setBuyerFilter] = useState<string>("ALL");
  const [previewBill, setPreviewBill] = useState<CustomerBill | null>(null);
  const [showNewBillModal, setShowNewBillModal] = useState(false);

  const [newBuyer, setNewBuyer] = useState("");
  const [newPaymentMode, setNewPaymentMode] = useState<
    "OFFLINE" | "ONLINE" | "UDHAAR" | "SPLIT"
  >("OFFLINE");
  const [newSplitOnline, setNewSplitOnline] = useState("");
  const [newSplitOffline, setNewSplitOffline] = useState("");
  const [newLines, setNewLines] = useState<
    Array<{ item: string; qty: string; rate: string }>
  >([
    { item: "Tamatar", qty: "5", rate: "" },
    { item: "Aaloo", qty: "10", rate: "" },
  ]);
  const [billError, setBillError] = useState("");

  const [payingBillId, setPayingBillId] = useState<string | null>(null);
  const [billPayOnline, setBillPayOnline] = useState("0");
  const [billPayOffline, setBillPayOffline] = useState("");
  const [billPayError, setBillPayError] = useState("");

  const uniqueBuyers = useMemo(() => {
    const set = new Set(bills.map((b) => b.buyerName));
    return Array.from(set);
  }, [bills]);

  const filteredBills = useMemo(() => {
    if (buyerFilter === "ALL") return bills;
    return bills.filter((b) => b.buyerName === buyerFilter);
  }, [bills, buyerFilter]);

  const totals = useMemo(() => {
    return filteredBills.reduce(
      (acc, b) => ({
        cost: acc.cost + b.totalCostInr,
        bill: acc.bill + b.totalBillInr,
        profit: acc.profit + b.netProfitInr,
      }),
      { cost: 0, bill: 0, profit: 0 }
    );
  }, [filteredBills]);

  const getDefaultSellRate = (vegName: string): number => {
    const stock = stocks.find(
      (s) => s.name.toLowerCase() === vegName.toLowerCase()
    );
    if (stock && stock.sellRates && stock.sellRates.length > 0) {
      return stock.sellRates[stock.sellRates.length - 1].ratePerKg;
    }
    return VEGETABLE_CATALOG[vegName]?.defaultSellRate ?? 35;
  };

  const handleSubmitNewBill = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedBuyer = newBuyer.trim() || "Grahak";
    const parsedLines: ParsedMultiOrderLine[] = [];

    for (const row of newLines) {
      const qtyNum = Number(row.qty);
      const rateNum = row.rate.trim() ? Number(row.rate) : 0;
      if (!row.item.trim() || !Number.isFinite(qtyNum) || qtyNum <= 0) {
        setBillError("Kripya har sabzi ke liye sahi wajan (kg) darj karein.");
        return;
      }
      parsedLines.push({
        item: row.item.trim(),
        quantity_kg: qtyNum,
        ...(Number.isFinite(rateNum) && rateNum > 0
          ? { rate_per_kg: Math.round(rateNum) }
          : {}),
      });
    }

    if (parsedLines.length === 0) {
      setBillError("Kam se kam 1 sabzi jodein.");
      return;
    }

    onCreateBill({
      buyerName: cleanedBuyer,
      lines: parsedLines,
      paymentMode: newPaymentMode,
      ...(newPaymentMode === "SPLIT"
        ? {
            paidOnlineInr: Math.max(0, Math.round(Number(newSplitOnline) || 0)),
            paidOfflineInr: Math.max(0, Math.round(Number(newSplitOffline) || 0)),
          }
        : {}),
    });
    setShowNewBillModal(false);
    setNewBuyer("");
    setNewPaymentMode("OFFLINE");
    setNewSplitOnline("");
    setNewSplitOffline("");
    setNewLines([
      { item: "Tamatar", qty: "5", rate: "" },
      { item: "Aaloo", qty: "10", rate: "" },
    ]);
    setBillError("");
  };

  const openBillPayDrawer = (bill: CustomerBill) => {
    setPayingBillId(bill.id);
    const pending = bill.pendingBalanceInr ?? 0;
    setBillPayOnline("0");
    setBillPayOffline(pending > 0 ? String(pending) : "");
    setBillPayError("");
  };

  const handleConfirmBillPayment = (e: React.FormEvent, bill: CustomerBill) => {
    e.preventDefault();
    const onlineNum = billPayOnline.trim() ? Number(billPayOnline) : 0;
    const offlineNum = billPayOffline.trim() ? Number(billPayOffline) : 0;
    if (
      !Number.isFinite(onlineNum) ||
      !Number.isFinite(offlineNum) ||
      onlineNum < 0 ||
      offlineNum < 0 ||
      onlineNum + offlineNum <= 0
    ) {
      setBillPayError("Kripya Online ya Offline (Cash) mein kam se kam ₹1 darj karein.");
      return;
    }
    onRecordBillPayment(bill.id, {
      onlineInr: Math.round(onlineNum),
      offlineInr: Math.round(offlineNum),
    });
    setPayingBillId(null);
    setBillPayOnline("0");
    setBillPayOffline("");
    setBillPayError("");
  };

  return (
    <div className="space-y-3.5">
      {/* Header Summary Bar */}
      <div className="rounded-2xl bg-slate-900 text-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Customer Bills · ग्राहक बिल व मुनाफा</span>
            </h2>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              Multi-item bills with vendor cost vs selling total &amp; customer invoice download
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowNewBillModal(true);
              setBillError("");
            }}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Bill</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-slate-800/90 border border-slate-700 px-3 py-2">
            <p className="text-[11px] font-bold text-orange-300">
              Our Cost · लागत
            </p>
            <p className="font-mono-num text-base sm:text-lg font-extrabold text-white mt-0.5">
              ₹{totals.cost.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="rounded-xl bg-slate-800/90 border border-slate-700 px-3 py-2">
            <p className="text-[11px] font-bold text-blue-300">
              Bill Total · कुल बिल
            </p>
            <p className="font-mono-num text-base sm:text-lg font-extrabold text-white mt-0.5">
              ₹{totals.bill.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="rounded-xl bg-slate-800/90 border border-slate-700 px-3 py-2">
            <p className="text-[11px] font-bold text-emerald-300">
              Margin · मुनाफा
            </p>
            <p className="font-mono-num text-base sm:text-lg font-extrabold text-emerald-300 mt-0.5">
              {totals.profit >= 0 ? "+" : "-"}₹
              {Math.abs(totals.profit).toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* Buyer Filter Chips */}
      {uniqueBuyers.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => setBuyerFilter("ALL")}
            className={`min-h-[36px] px-3 rounded-xl text-xs font-extrabold border whitespace-nowrap shrink-0 cursor-pointer ${
              buyerFilter === "ALL"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            All Buyers ({bills.length})
          </button>
          {uniqueBuyers.map((buyer) => (
            <button
              key={buyer}
              type="button"
              onClick={() => setBuyerFilter(buyer)}
              className={`min-h-[36px] px-3 rounded-xl text-xs font-extrabold border whitespace-nowrap shrink-0 cursor-pointer ${
                buyerFilter === buyer
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              {buyer}
            </button>
          ))}
        </div>
      )}

      {/* New Multi-Item Bill Modal */}
      {showNewBillModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Create Multi-Item Customer Bill"
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-700" />
                <span>Create Multi-Item Bill · नया ग्राहक बिल</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewBillModal(false)}
                aria-label="Close new bill modal"
                className="min-h-[40px] min-w-[40px] rounded-xl hover:bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewBill} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Buyer Name · ग्राहक का नाम
                  </label>
                  <input
                    type="text"
                    value={newBuyer}
                    onChange={(e) => setNewBuyer(e.target.value)}
                    placeholder="e.g., Ram or Sunita Ji"
                    className="w-full min-h-[44px] rounded-xl border-2 border-slate-300 px-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Type · भुगतान
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl">
                    {(
                      [
                        { id: "OFFLINE", label: "Cash", activeCls: "bg-emerald-600 text-white" },
                        { id: "ONLINE", label: "Online UPI", activeCls: "bg-blue-600 text-white" },
                        { id: "SPLIT", label: "Split", activeCls: "bg-slate-900 text-white" },
                        { id: "UDHAAR", label: "Udhaar", activeCls: "bg-amber-600 text-white" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setNewPaymentMode(opt.id)}
                        className={`min-h-[36px] px-1.5 rounded-lg text-[11px] font-extrabold cursor-pointer whitespace-nowrap ${
                          newPaymentMode === opt.id ? opt.activeCls : "text-slate-700"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {newPaymentMode === "SPLIT" && (
                <div className="grid grid-cols-2 gap-2.5 rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <div>
                    <label className="block text-[11px] font-bold text-blue-900 mb-1">
                      📱 Paid Online (UPI) ₹
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newSplitOnline}
                      onChange={(e) => setNewSplitOnline(e.target.value)}
                      placeholder="e.g., 300"
                      className="w-full min-h-[40px] rounded-lg border border-blue-300 bg-white px-2.5 text-sm font-mono-num font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                      💵 Paid Offline (Cash) ₹
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newSplitOffline}
                      onChange={(e) => setNewSplitOffline(e.target.value)}
                      placeholder="e.g., 200"
                      className="w-full min-h-[40px] rounded-lg border border-emerald-300 bg-white px-2.5 text-sm font-mono-num font-bold text-slate-900"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Vegetables (leave rate blank for today&apos;s default ₹/kg)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setNewLines((prev) => [
                        ...prev,
                        { item: "Pyaaz", qty: "5", rate: "" },
                      ])
                    }
                    className="text-xs font-extrabold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {newLines.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                    <select
                      value={row.item}
                      onChange={(e) =>
                        setNewLines((prev) =>
                          prev.map((r, i) =>
                            i === idx ? { ...r, item: e.target.value } : r
                          )
                        )
                      }
                      className="col-span-5 min-h-[42px] rounded-xl border border-slate-300 bg-white px-2.5 text-xs sm:text-sm font-bold text-slate-900"
                    >
                      {DEFAULT_ITEM_CHOICES.map((veg) => (
                        <option key={veg} value={veg}>
                          {veg} (₹{getDefaultSellRate(veg)}/kg)
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.25"
                      min="0.1"
                      value={row.qty}
                      onChange={(e) =>
                        setNewLines((prev) =>
                          prev.map((r, i) =>
                            i === idx ? { ...r, qty: e.target.value } : r
                          )
                        )
                      }
                      placeholder="kg"
                      className="col-span-3 min-h-[42px] rounded-xl border border-slate-300 px-2.5 text-xs sm:text-sm font-mono-num font-bold text-slate-900"
                    />
                    <input
                      type="number"
                      min="1"
                      value={row.rate}
                      onChange={(e) =>
                        setNewLines((prev) =>
                          prev.map((r, i) =>
                            i === idx ? { ...r, rate: e.target.value } : r
                          )
                        )
                      }
                      placeholder={`₹${getDefaultSellRate(row.item)}`}
                      className="col-span-3 min-h-[42px] rounded-xl border border-slate-300 px-2.5 text-xs sm:text-sm font-mono-num font-bold text-slate-900"
                    />
                    <button
                      type="button"
                      disabled={newLines.length <= 1}
                      onClick={() =>
                        setNewLines((prev) => prev.filter((_, i) => i !== idx))
                      }
                      aria-label="Remove item row"
                      className="col-span-1 min-h-[42px] flex items-center justify-center text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {billError && (
                <p className="text-xs font-bold text-rose-700">{billError}</p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Generate Bill · बिल बनाएं</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewBillModal(false)}
                  className="min-h-[46px] px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Bill Preview Modal (Strictly Hides Vendor Cost & Profit Margin) */}
      {previewBill && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Customer Bill Receipt"
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                  {shopProfile?.shopName?.trim() || "MandiBol"} · Customer Bill / ग्राहक बिल
                </h3>
                <p className="text-xs font-semibold text-slate-500">
                  Bill {previewBill.billNumber} · {previewBill.dateTime}
                  {shopProfile?.vendorMobile?.trim()
                    ? ` · Mob: ${shopProfile.vendorMobile.trim()}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewBill(null)}
                aria-label="Close bill preview"
                className="min-h-[40px] min-w-[40px] rounded-xl hover:bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3.5 rounded-xl bg-slate-50 border border-slate-200 p-3.5 grid grid-cols-2 gap-2 text-xs sm:text-sm">
              <div>
                <span className="text-slate-500 font-semibold">Buyer: </span>
                <span className="font-extrabold text-slate-900">
                  {previewBill.buyerName}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Status: </span>
                <span
                  className={`font-extrabold ${
                    previewBill.paymentStatus === "UDHAAR_PENDING"
                      ? "text-amber-800"
                      : "text-emerald-700"
                  }`}
                >
                  {previewBill.paymentStatus === "UDHAAR_PENDING"
                    ? "Udhaar Pending"
                    : "Paid Cash"}
                </span>
              </div>
            </div>

            <div className="mt-3.5 border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                    <th className="py-2 px-3">Vegetable</th>
                    <th className="py-2 px-2.5 text-right">Qty</th>
                    <th className="py-2 px-2.5 text-right">Rate/kg</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewBill.items.map((it, idx) => (
                    <tr key={`${it.item}-${idx}`}>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {it.item}
                        {it.hindiName ? (
                          <span className="text-slate-500 font-medium">
                            {" "}
                            ({it.hindiName})
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono-num font-semibold">
                        {formatKg(it.qtyKg)} kg
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono-num font-semibold">
                        ₹{it.sellRatePerKg}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num font-extrabold text-slate-900">
                        ₹{it.subtotalInr.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 rounded-xl bg-emerald-50 border-2 border-emerald-500 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-extrabold text-emerald-950">
                Grand Total · कुल बिल राशि
              </span>
              <span className="font-mono-num text-2xl font-extrabold text-emerald-900">
                ₹{previewBill.totalBillInr.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="mt-2.5 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-mono-num">
              <div>
                <p className="text-[11px] font-bold text-blue-800">📱 Online (UPI)</p>
                <p className="font-extrabold text-slate-900">
                  ₹{(previewBill.paidOnlineInr ?? 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-emerald-800">💵 Offline (Cash)</p>
                <p className="font-extrabold text-slate-900">
                  ₹{(previewBill.paidOfflineInr ?? 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-amber-800">⏳ Pending</p>
                <p className="font-extrabold text-slate-900">
                  ₹{(previewBill.pendingBalanceInr ?? 0).toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a
                href={buildCustomerBillWhatsAppUrl(
                  previewBill,
                  shopProfile,
                  getCustomerMobile(previewBill.buyerName)
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>Send Bill on WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={() => downloadCustomerBillInvoiceHtml(previewBill, shopProfile)}
                className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-sm font-extrabold flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>HTML</span>
              </button>
              <button
                type="button"
                onClick={() => downloadCustomerBillInvoiceExcel(previewBill, shopProfile)}
                className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-sm font-extrabold flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="min-h-[44px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-extrabold flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Bills & Multi-Item Ledger Table */}
      {filteredBills.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
          <Receipt className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-base font-bold text-slate-900">
            Abhi koi multi-item grahak bill nahi hai
          </p>
          <p className="text-sm text-slate-600 mt-1">
            Bolein ya type karein: &ldquo;Ram ko 20 kilo tamatar 30 kilo aaloo 5 kilo bhindi bika&rdquo;
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBills.map((bill) => {
            const paidOnline = bill.paidOnlineInr ?? 0;
            const paidOffline = bill.paidOfflineInr ?? 0;
            const pendingBal = bill.pendingBalanceInr ?? 0;
            const isUdhaar = pendingBal > 0 || bill.paymentStatus === "UDHAAR_PENDING";
            const isPayingBill = payingBillId === bill.id;
            const statusLabel =
              bill.paymentStatus === "UDHAAR_PENDING"
                ? "Udhaar Pending"
                : bill.paymentStatus === "PARTIAL_PAID"
                ? "Partial Paid"
                : bill.paymentStatus === "PAID_ONLINE"
                ? "Paid Online (UPI)"
                : "Paid Cash";

            return (
              <div
                key={bill.id}
                className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-num text-xs font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        {bill.billNumber}
                      </span>
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                        {bill.buyerName}
                      </h3>
                      <span
                        className={`text-xs font-extrabold ${
                          isUdhaar
                            ? "text-amber-700"
                            : bill.paymentStatus === "PAID_ONLINE"
                            ? "text-blue-700"
                            : "text-emerald-700"
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                      {bill.dateTime} · {bill.items.length}{" "}
                      {bill.items.length === 1 ? "item" : "items"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-mono-num text-xl sm:text-2xl font-extrabold text-slate-900 leading-none">
                      ₹{bill.totalBillInr.toLocaleString("en-IN")}
                    </p>
                    <p
                      className={`font-mono-num text-xs font-extrabold mt-1 ${
                        bill.netProfitInr >= 0 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      Net Profit: {bill.netProfitInr >= 0 ? "+" : "-"}₹
                      {Math.abs(bill.netProfitInr).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                {/* Paid Online vs Paid Offline vs Remaining Pending Strip */}
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-[11px] sm:text-xs font-mono-num">
                  <div>
                    <p className="font-bold text-blue-800">📱 Paid Online (UPI)</p>
                    <p className="font-extrabold text-slate-900 mt-0.5">
                      ₹{paidOnline.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-emerald-800">💵 Paid Offline (Cash)</p>
                    <p className="font-extrabold text-slate-900 mt-0.5">
                      ₹{paidOffline.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-amber-800">⏳ Remaining Balance</p>
                    <p className="font-extrabold text-slate-900 mt-0.5">
                      ₹{pendingBal.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                {/* Itemized Breakdown Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-200">
                        <th className="py-2 px-3">Item</th>
                        <th className="py-2 px-2 text-right">Qty</th>
                        <th className="py-2 px-2 text-right">Sell Rate</th>
                        <th className="py-2 px-2 text-right">Cost (₹)</th>
                        <th className="py-2 px-2 text-right">Bill (₹)</th>
                        <th className="py-2 px-3 text-right">Margin (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bill.items.map((it, idx) => (
                        <tr key={`${bill.id}-${it.item}-${idx}`}>
                          <td className="py-2 px-3 font-bold text-slate-900">
                            {it.item}
                          </td>
                          <td className="py-2 px-2 text-right font-mono-num font-semibold text-slate-800">
                            {formatKg(it.qtyKg)} kg
                          </td>
                          <td className="py-2 px-2 text-right font-mono-num font-semibold text-slate-700">
                            ₹{it.sellRatePerKg}/kg
                          </td>
                          <td className="py-2 px-2 text-right font-mono-num font-semibold text-orange-700">
                            ₹{it.costTotalInr.toLocaleString("en-IN")}
                          </td>
                          <td className="py-2 px-2 text-right font-mono-num font-extrabold text-blue-800">
                            ₹{it.subtotalInr.toLocaleString("en-IN")}
                          </td>
                          <td
                            className={`py-2 px-3 text-right font-mono-num font-extrabold ${
                              it.profitInr >= 0
                                ? "text-emerald-700"
                                : "text-rose-700"
                            }`}
                          >
                            {it.profitInr >= 0 ? "+" : "-"}₹
                            {Math.abs(it.profitInr).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Vendor Cost vs Bill vs Profit Strip & Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="text-xs font-semibold text-slate-600 font-mono-num">
                    Cost: ₹{bill.totalCostInr.toLocaleString("en-IN")} · Bill: ₹
                    {bill.totalBillInr.toLocaleString("en-IN")} · Profit:{" "}
                    <span className="font-extrabold text-emerald-700">
                      {bill.netProfitInr >= 0 ? "+" : "-"}₹
                      {Math.abs(bill.netProfitInr).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        isPayingBill ? setPayingBillId(null) : openBillPayDrawer(bill)
                      }
                      className={`min-h-[44px] px-3 py-1.5 rounded-xl border text-xs font-extrabold whitespace-nowrap cursor-pointer ${
                        isPayingBill
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-950"
                      }`}
                    >
                      Record Payment (Split)
                    </button>

                    <a
                      href={buildCustomerBillWhatsAppUrl(
                        bill,
                        shopProfile,
                        getCustomerMobile(bill.buyerName)
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all"
                    >
                      <MessageCircle className="w-4 h-4 shrink-0" />
                      <span>Send Bill on WhatsApp</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => setPreviewBill(bill)}
                      className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all"
                    >
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span>Download Bill</span>
                    </button>
                  </div>
                </div>

                {/* Inline Record Payment (Online / Offline Split) Drawer */}
                {isPayingBill && (
                  <form
                    onSubmit={(e) => handleConfirmBillPayment(e, bill)}
                    className="rounded-xl bg-blue-50/70 border border-blue-200 p-3 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-slate-900">
                        Record Payment for {bill.billNumber} ({bill.buyerName})
                      </span>
                      <button
                        type="button"
                        onClick={() => setPayingBillId(null)}
                        aria-label="Close bill payment drawer"
                        className="min-h-[32px] min-w-[32px] rounded-lg hover:bg-blue-100 text-slate-700 flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {pendingBal > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setBillPayOnline("0");
                            setBillPayOffline(String(pendingBal));
                            setBillPayError("");
                          }}
                          className="min-h-[34px] px-2.5 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-900 cursor-pointer"
                        >
                          💵 Full Cash (₹{pendingBal})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBillPayOnline(String(pendingBal));
                            setBillPayOffline("0");
                            setBillPayError("");
                          }}
                          className="min-h-[34px] px-2.5 rounded-lg bg-white border border-blue-300 text-xs font-bold text-blue-900 cursor-pointer"
                        >
                          📱 Full Online (₹{pendingBal})
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-blue-900 mb-1">
                          📱 Online (UPI) ₹
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={billPayOnline}
                          onChange={(e) => {
                            setBillPayOnline(e.target.value);
                            setBillPayError("");
                          }}
                          className="w-full min-h-[42px] rounded-xl bg-white border-2 border-blue-300 px-3 text-sm font-mono-num font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                          💵 Offline (Cash) ₹
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={billPayOffline}
                          onChange={(e) => {
                            setBillPayOffline(e.target.value);
                            setBillPayError("");
                          }}
                          className="w-full min-h-[42px] rounded-xl bg-white border-2 border-emerald-300 px-3 text-sm font-mono-num font-bold text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono-num text-xs font-extrabold text-slate-800">
                        Adding: ₹
                        {(
                          Math.max(0, Number(billPayOnline) || 0) +
                          Math.max(0, Number(billPayOffline) || 0)
                        ).toLocaleString("en-IN")}
                      </span>
                      <button
                        type="submit"
                        className="min-h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Save Payment</span>
                      </button>
                    </div>

                    {billPayError && (
                      <p className="text-xs font-bold text-rose-700">{billPayError}</p>
                    )}
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
