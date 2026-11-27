import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  FileText,
  History,
  IndianRupee,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Printer,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type { LedgerAccountType, ShopProfile, UdhaarEntry } from "../types";
import {
  buildUdhaarSlipWhatsAppUrl,
  downloadPersonAdviceSlip,
  downloadPersonAdviceSlipExcel,
} from "../utils/exportReports";

interface NewPersonPayload {
  name: string;
  mobile: string;
  address: string;
  accountType: LedgerAccountType;
  openingAmountInr: number;
}

interface UdhaarListProps {
  udhaarList: UdhaarEntry[];
  expandedId: string | null;
  shopProfile?: ShopProfile;
  onToggleExpand: (id: string) => void;
  onReceivePayment: (
    id: string,
    payment: { onlineInr: number; offlineInr: number }
  ) => void;
  onAddPerson: (person: NewPersonPayload) => void;
  onUpdatePersonProfile: (
    id: string,
    updates: { mobile: string; address: string }
  ) => void;
}

export function UdhaarList({
  udhaarList,
  expandedId,
  shopProfile,
  onToggleExpand,
  onReceivePayment,
  onAddPerson,
  onUpdatePersonProfile,
}: UdhaarListProps) {
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payOnline, setPayOnline] = useState("0");
  const [payOffline, setPayOffline] = useState("");
  const [payError, setPayError] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newType, setNewType] = useState<LedgerAccountType>("RECEIVABLE");
  const [newOpeningAmt, setNewOpeningAmt] = useState("");
  const [addError, setAddError] = useState("");

  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editMobile, setEditMobile] = useState("");
  const [editAddress, setEditAddress] = useState("");

  const [adviceEntry, setAdviceEntry] = useState<UdhaarEntry | null>(null);

  const totalReceivable = udhaarList
    .filter((u) => u.accountType !== "PAYABLE")
    .reduce((acc, entry) => acc + entry.amountInr, 0);

  const totalPayable = udhaarList
    .filter((u) => u.accountType === "PAYABLE")
    .reduce((acc, entry) => acc + entry.amountInr, 0);

  const openPaymentDrawer = (entry: UdhaarEntry) => {
    setPayingId(entry.id);
    setPayOnline("0");
    setPayOffline(entry.amountInr > 0 ? String(entry.amountInr) : "");
    setPayError("");
  };

  const handleConfirmPayment = (e: React.FormEvent, entry: UdhaarEntry) => {
    e.preventDefault();
    const onlineNum = payOnline.trim() ? Number(payOnline) : 0;
    const offlineNum = payOffline.trim() ? Number(payOffline) : 0;
    if (
      !Number.isFinite(onlineNum) ||
      !Number.isFinite(offlineNum) ||
      onlineNum < 0 ||
      offlineNum < 0 ||
      onlineNum + offlineNum <= 0
    ) {
      setPayError("Kripya Online ya Offline (Cash) mein kam se kam ₹1 darj karein.");
      return;
    }
    onReceivePayment(entry.id, {
      onlineInr: Math.round(onlineNum),
      offlineInr: Math.round(offlineNum),
    });
    setPayingId(null);
    setPayOnline("0");
    setPayOffline("");
    setPayError("");
  };

  const handleCreatePerson = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedName = newName.trim();
    const cleanedMobile = newMobile.replace(/\D/g, "").slice(0, 10);
    const cleanedAddress = newAddress.trim();
    const numericOpening = newOpeningAmt.trim() ? Number(newOpeningAmt) : 0;

    if (!cleanedName) {
      setAddError("Kripya vyakti ka naam darj karein.");
      return;
    }
    if (newMobile.trim() && cleanedMobile.length !== 10) {
      setAddError("Mobile number 10 anko ka hona chahiye.");
      return;
    }
    if (!Number.isFinite(numericOpening) || numericOpening < 0) {
      setAddError("Kripya sahi opening balance darj karein.");
      return;
    }

    onAddPerson({
      name: cleanedName,
      mobile: cleanedMobile,
      address: cleanedAddress,
      accountType: newType,
      openingAmountInr: Math.round(numericOpening),
    });

    setShowAddModal(false);
    setNewName("");
    setNewMobile("");
    setNewAddress("");
    setNewType("RECEIVABLE");
    setNewOpeningAmt("");
    setAddError("");
  };

  const startEditProfile = (entry: UdhaarEntry) => {
    setEditingProfileId(entry.id);
    setEditMobile(entry.mobile || "");
    setEditAddress(entry.address || "");
  };

  const saveEditProfile = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    const cleanedMobile = editMobile.replace(/\D/g, "").slice(0, 10);
    onUpdatePersonProfile(id, {
      mobile: cleanedMobile,
      address: editAddress.trim(),
    });
    setEditingProfileId(null);
  };

  return (
    <div className="space-y-3">
      {/* Dual Receivable / Payable Summary & + Add Person Action */}
      <div className="rounded-2xl bg-slate-900 text-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-white">
                Customer &amp; Supplier Ledger · उधार व देनदारी खाता
              </p>
              <p className="text-[11px] font-semibold text-slate-300">
                {udhaarList.length} total accounts
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowAddModal(true);
              setAddError("");
            }}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Person</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-slate-800/90 border border-slate-700 px-3 py-2.5">
            <p className="text-[11px] font-bold text-amber-300">
              Receivable · लेना है
            </p>
            <p className="font-mono-num text-lg sm:text-xl font-extrabold text-white mt-0.5">
              ₹{totalReceivable.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="rounded-xl bg-slate-800/90 border border-slate-700 px-3 py-2.5">
            <p className="text-[11px] font-bold text-rose-300">
              Payable · देना है
            </p>
            <p className="font-mono-num text-lg sm:text-xl font-extrabold text-white mt-0.5">
              ₹{totalPayable.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* Add Person Modal */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add Customer or Supplier"
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-700" />
                <span>Add Person · नया खाता जोड़ें</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Close modal"
                className="min-h-[40px] min-w-[40px] rounded-xl hover:bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePerson} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Account Type · खाता प्रकार
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setNewType("RECEIVABLE")}
                    className={`min-h-[42px] rounded-lg text-xs sm:text-sm font-extrabold transition-colors cursor-pointer ${
                      newType === "RECEIVABLE"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "text-slate-700 hover:bg-white/60"
                    }`}
                  >
                    Receivable · लेना है
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType("PAYABLE")}
                    className={`min-h-[42px] rounded-lg text-xs sm:text-sm font-extrabold transition-colors cursor-pointer ${
                      newType === "PAYABLE"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "text-slate-700 hover:bg-white/60"
                    }`}
                  >
                    Payable · देना है
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Person Name · नाम *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    setAddError("");
                  }}
                  placeholder="e.g., Sunita Ji or Ramesh Kisan"
                  className="w-full min-h-[44px] rounded-xl border-2 border-slate-300 px-3.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number (10 digits) · मोबाइल नंबर
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={newMobile}
                  onChange={(e) => {
                    setNewMobile(e.target.value.replace(/\D/g, "").slice(0, 10));
                    setAddError("");
                  }}
                  placeholder="e.g., 9876543210"
                  className="w-full min-h-[44px] rounded-xl border-2 border-slate-300 px-3.5 text-sm font-mono-num font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Address / Locality · पता
                </label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="e.g., Sector 6 Market"
                  className="w-full min-h-[44px] rounded-xl border-2 border-slate-300 px-3.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pending Amount (₹) · बाकी रकम
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newOpeningAmt}
                  onChange={(e) => {
                    setNewOpeningAmt(e.target.value);
                    setAddError("");
                  }}
                  placeholder="e.g., 100 (optional)"
                  className="w-full min-h-[44px] rounded-xl border-2 border-slate-300 px-3.5 text-sm font-mono-num font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              {addError && (
                <p className="text-xs font-bold text-rose-700">{addError}</p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Person · जोड़ें</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="min-h-[46px] px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Individual Person Advice Slip Modal */}
      {adviceEntry && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Person Advice Slip"
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                  {shopProfile?.shopName?.trim() || "MandiBol"} · Payment Advice Slip
                </h3>
                <p className="text-xs font-semibold text-slate-500">
                  {adviceEntry.accountType === "PAYABLE"
                    ? "Payable · देना है (Supplier)"
                    : "Receivable · लेना है (Customer)"}
                  {shopProfile?.vendorName?.trim()
                    ? ` · ${shopProfile.vendorName.trim()}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdviceEntry(null)}
                aria-label="Close advice slip"
                className="min-h-[40px] min-w-[40px] rounded-xl hover:bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3.5 rounded-xl bg-slate-50 border border-slate-200 p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
              <div>
                <span className="text-slate-500 font-semibold">Name: </span>
                <span className="font-extrabold text-slate-900">
                  {adviceEntry.customerName}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Mobile: </span>
                <span className="font-mono-num font-bold text-slate-900">
                  {adviceEntry.mobile || "Not provided"}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500 font-semibold">Address: </span>
                <span className="font-bold text-slate-800">
                  {adviceEntry.address || "Not provided"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Paid Online (UPI): </span>
                <span className="font-mono-num font-extrabold text-blue-800">
                  ₹{(adviceEntry.totalPaidOnlineInr ?? 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Paid Offline (Cash): </span>
                <span className="font-mono-num font-extrabold text-emerald-800">
                  ₹{(adviceEntry.totalPaidOfflineInr ?? 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div
              className={`mt-3 rounded-xl px-4 py-3 flex items-center justify-between border ${
                adviceEntry.accountType === "PAYABLE"
                  ? "bg-rose-50 border-rose-200 text-rose-950"
                  : "bg-emerald-50 border-emerald-200 text-emerald-950"
              }`}
            >
              <span className="text-xs sm:text-sm font-extrabold">
                Current Pending Balance (कुल बाकी)
              </span>
              <span className="font-mono-num text-xl font-extrabold">
                ₹{adviceEntry.amountInr.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="mt-3.5 border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 text-xs font-extrabold text-slate-700">
                Past Transactions ({adviceEntry.history.length})
              </div>
              <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
                {adviceEntry.history.map((tx) => {
                  const isCredit = tx.type === "CREDIT";
                  return (
                    <div
                      key={tx.id}
                      className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">
                          {adviceEntry.accountType === "PAYABLE"
                            ? isCredit
                              ? "Dena Likha (+₹)"
                              : "Diya (-₹)"
                            : isCredit
                            ? "Udhaar Liya (+₹)"
                            : "Jama Kiya (-₹)"}
                        </p>
                        <p className="text-slate-500 truncate">
                          {tx.dateTime} · {tx.note}
                        </p>
                      </div>
                      <div className="text-right shrink-0 font-mono-num">
                        <p
                          className={`font-extrabold ${
                            isCredit ? "text-amber-800" : "text-emerald-700"
                          }`}
                        >
                          {isCredit ? "+" : "-"}₹{tx.amountInr.toLocaleString("en-IN")}
                        </p>
                        <p className="text-[11px] font-semibold text-slate-500">
                          Bal: ₹{tx.balanceAfter.toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a
                href={buildUdhaarSlipWhatsAppUrl(adviceEntry, shopProfile)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>WhatsApp Slip</span>
              </a>
              <button
                type="button"
                onClick={() => downloadPersonAdviceSlipExcel(adviceEntry, shopProfile)}
                className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-sm font-extrabold flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => downloadPersonAdviceSlip(adviceEntry, shopProfile)}
                className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-sm font-extrabold flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>HTML</span>
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

      {/* Structured Ledger List */}
      {udhaarList.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
          <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-base font-bold text-slate-900">Koi khata darj nahi hai</p>
          <p className="text-sm text-slate-600 mt-1">
            Upar &ldquo;Add Person&rdquo; dabayein ya bolein: &ldquo;Sunita ji ke 50 rupaye udhaar likho&rdquo;
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {udhaarList.map((entry) => {
            const initial = entry.customerName.trim().charAt(0).toUpperCase() || "G";
            const isExpanded = expandedId === entry.id;
            const isPaying = payingId === entry.id;
            const isEditingProfile = editingProfileId === entry.id;
            const isSettled = entry.amountInr <= 0;
            const isPayable = entry.accountType === "PAYABLE";

            return (
              <div
                key={entry.id}
                className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs"
              >
                {/* Structured Profile Row */}
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onToggleExpand(entry.id)}
                      aria-expanded={isExpanded}
                      className="flex items-start gap-3 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div
                        className={`w-11 h-11 rounded-xl font-extrabold text-lg flex items-center justify-center shrink-0 ${
                          isSettled
                            ? "bg-emerald-100 text-emerald-800"
                            : isPayable
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {initial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                            {entry.customerName}
                          </h3>
                          <span
                            className={`text-[11px] font-extrabold ${
                              isPayable ? "text-rose-700" : "text-amber-800"
                            }`}
                          >
                            {isPayable ? "Payable · देना है" : "Receivable · लेना है"}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 font-semibold mt-1">
                          <span className="inline-flex items-center gap-1 font-mono-num">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {entry.mobile || "No mobile"}
                          </span>
                          <span className="inline-flex items-center gap-1 truncate max-w-[200px]">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {entry.address || "No address"}
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-slate-700">
                            <History className="w-3.5 h-3.5 text-slate-400" />
                            {entry.history.length}{" "}
                            {entry.history.length === 1 ? "entry" : "entries"}
                          </span>
                        </div>
                      </div>
                    </button>

                    <div className="text-right shrink-0">
                      <p
                        className={`font-mono-num text-xl sm:text-2xl font-extrabold leading-none ${
                          isSettled
                            ? "text-emerald-700"
                            : isPayable
                            ? "text-rose-700"
                            : "text-slate-900"
                        }`}
                      >
                        ₹{entry.amountInr.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[11px] font-bold text-slate-500 mt-1">
                        {isSettled
                          ? "Chukta · Settled"
                          : isPayable
                          ? "Dena Baaki"
                          : "Lena Baaki"}
                      </p>
                    </div>
                  </div>

                  {/* Online vs Offline vs Pending Breakdown Strip */}
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-[11px] sm:text-xs font-mono-num">
                    <div>
                      <p className="font-bold text-blue-800">📱 Paid Online (UPI)</p>
                      <p className="font-extrabold text-slate-900 mt-0.5">
                        ₹{(entry.totalPaidOnlineInr ?? 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-emerald-800">💵 Paid Offline (Cash)</p>
                      <p className="font-extrabold text-slate-900 mt-0.5">
                        ₹{(entry.totalPaidOfflineInr ?? 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-amber-800">⏳ Pending Balance</p>
                      <p className="font-extrabold text-slate-900 mt-0.5">
                        ₹{entry.amountInr.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  {/* Quick Action Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Updated: {entry.lastUpdated}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          isEditingProfile
                            ? setEditingProfileId(null)
                            : startEditProfile(entry)
                        }
                        className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit Info</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdviceEntry(entry)}
                        className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-700" />
                        <span>Advice Slip</span>
                      </button>

                      <a
                        href={buildUdhaarSlipWhatsAppUrl(entry, shopProfile)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-extrabold flex items-center gap-1 whitespace-nowrap cursor-pointer transition-all"
                      >
                        <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>WhatsApp Slip</span>
                      </a>

                      <button
                        type="button"
                        onClick={() =>
                          isPaying ? setPayingId(null) : openPaymentDrawer(entry)
                        }
                        className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs font-extrabold flex items-center gap-1 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                          isPaying
                            ? "bg-slate-900 text-white border-slate-900"
                            : isPayable
                            ? "bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-900"
                            : "bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-950"
                        }`}
                      >
                        <IndianRupee className="w-3.5 h-3.5" />
                        <span>
                          {isPayable ? "Record Payment" : "Record Payment"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline Edit Mobile / Address Drawer */}
                {isEditingProfile && (
                  <form
                    onSubmit={(e) => saveEditProfile(e, entry.id)}
                    className="px-4 pb-4 pt-3 bg-slate-50 border-t border-slate-200 space-y-2.5"
                  >
                    <p className="text-xs font-extrabold text-slate-800">
                      Update Mobile &amp; Address for {entry.customerName}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={editMobile}
                        onChange={(e) =>
                          setEditMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                        }
                        placeholder="10-digit Mobile"
                        className="min-h-[42px] rounded-xl bg-white border border-slate-300 px-3 text-sm font-mono-num font-bold text-slate-900"
                      />
                      <input
                        type="text"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        placeholder="Address / Locality"
                        className="min-h-[42px] rounded-xl bg-white border border-slate-300 px-3 text-sm font-bold text-slate-900"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        className="min-h-[40px] px-4 rounded-xl bg-slate-900 text-white text-xs font-extrabold cursor-pointer"
                      >
                        Save Details
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingProfileId(null)}
                        className="min-h-[40px] px-3 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Inline Payment Drawer (Online / Offline Split) */}
                {isPaying && (
                  <form
                    onSubmit={(e) => handleConfirmPayment(e, entry)}
                    className={`px-4 pb-4 pt-3 border-t space-y-2.5 ${
                      isPayable
                        ? "bg-rose-50/70 border-rose-200"
                        : "bg-blue-50/70 border-blue-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-slate-900">
                        {isPayable
                          ? `Record Split Payment to ${entry.customerName} (भुगतान)`
                          : `Record Payment from ${entry.customerName} (Online / Offline Split)`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPayingId(null)}
                        aria-label="Close payment form"
                        className="min-h-[32px] min-w-[32px] rounded-lg hover:bg-slate-200/60 text-slate-800 flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {entry.amountInr > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setPayOnline("0");
                            setPayOffline(String(entry.amountInr));
                            setPayError("");
                          }}
                          className="min-h-[36px] px-3 rounded-lg text-xs font-bold border bg-white text-slate-900 border-slate-300 hover:bg-slate-100 cursor-pointer"
                        >
                          💵 Full Cash (₹{entry.amountInr})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPayOnline(String(entry.amountInr));
                            setPayOffline("0");
                            setPayError("");
                          }}
                          className="min-h-[36px] px-3 rounded-lg text-xs font-bold border bg-white text-blue-900 border-blue-300 hover:bg-blue-50 cursor-pointer"
                        >
                          📱 Full Online (₹{entry.amountInr})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const halfOnline = Math.round(entry.amountInr / 2);
                            const halfOffline = entry.amountInr - halfOnline;
                            setPayOnline(String(halfOnline));
                            setPayOffline(String(halfOffline));
                            setPayError("");
                          }}
                          className="min-h-[36px] px-3 rounded-lg text-xs font-bold border bg-white text-slate-900 border-slate-300 hover:bg-slate-100 cursor-pointer"
                        >
                          50/50 Split
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
                          value={payOnline}
                          onChange={(e) => {
                            setPayOnline(e.target.value);
                            setPayError("");
                          }}
                          placeholder="0"
                          className="w-full min-h-[44px] rounded-xl bg-white border-2 border-blue-300 px-3 text-base font-mono-num font-bold text-slate-900 focus:outline-none focus:border-blue-700"
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
                          value={payOffline}
                          onChange={(e) => {
                            setPayOffline(e.target.value);
                            setPayError("");
                          }}
                          placeholder="0"
                          className="w-full min-h-[44px] rounded-xl bg-white border-2 border-emerald-300 px-3 text-base font-mono-num font-bold text-slate-900 focus:outline-none focus:border-emerald-700"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                      <span className="font-mono-num text-xs font-extrabold text-slate-800">
                        Total Paying: ₹
                        {(
                          Math.max(0, Number(payOnline) || 0) +
                          Math.max(0, Number(payOffline) || 0)
                        ).toLocaleString("en-IN")}
                      </span>
                      <button
                        type="submit"
                        className={`min-h-[44px] px-4 rounded-xl text-white text-sm font-extrabold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                          isPayable
                            ? "bg-rose-600 hover:bg-rose-700"
                            : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        <span>{isPayable ? "Confirm Pay" : "Save Split Payment"}</span>
                      </button>
                    </div>

                    {payError && (
                      <p className="text-xs font-bold text-rose-700">{payError}</p>
                    )}
                  </form>
                )}

                {/* Expanded Transaction History */}
                {isExpanded && (
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <p className="text-xs font-extrabold text-slate-700">
                        Transaction History · लेन-देन हिसाब ({entry.history.length})
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => downloadPersonAdviceSlipExcel(entry, shopProfile)}
                          className="text-xs font-extrabold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Excel (.xlsx)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadPersonAdviceSlip(entry, shopProfile)}
                          className="text-xs font-extrabold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Printable Slip</span>
                        </button>
                      </div>
                    </div>
                    {entry.history.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        Koi purana hisab darj nahi hai.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-200/80">
                        {entry.history.map((tx) => {
                          const isCredit = tx.type === "CREDIT";
                          return (
                            <div
                              key={tx.id}
                              className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3"
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                <span
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                    isCredit
                                      ? isPayable
                                        ? "bg-rose-100 text-rose-800"
                                        : "bg-amber-100 text-amber-800"
                                      : "bg-emerald-100 text-emerald-800"
                                  }`}
                                >
                                  {isCredit ? (
                                    <ArrowUpRight className="w-4 h-4" />
                                  ) : (
                                    <ArrowDownLeft className="w-4 h-4" />
                                  )}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-xs sm:text-sm font-bold text-slate-900">
                                    {isPayable
                                      ? isCredit
                                        ? "Dena Likha (+₹)"
                                        : "Diya (-₹)"
                                      : isCredit
                                      ? "Udhaar Liya (+₹)"
                                      : "Jama Kiya (-₹)"}
                                    {!isCredit &&
                                    ((tx.onlineInr ?? 0) > 0 || (tx.offlineInr ?? 0) > 0) ? (
                                      <span className="ml-1.5 text-[11px] font-mono-num font-semibold text-blue-800">
                                        [
                                        {(tx.onlineInr ?? 0) > 0
                                          ? `Online ₹${tx.onlineInr}`
                                          : ""}
                                        {(tx.onlineInr ?? 0) > 0 &&
                                        (tx.offlineInr ?? 0) > 0
                                          ? " + "
                                          : ""}
                                        {(tx.offlineInr ?? 0) > 0
                                          ? `Cash ₹${tx.offlineInr}`
                                          : ""}
                                        ]
                                      </span>
                                    ) : null}
                                  </p>
                                  <p className="text-xs text-slate-600 truncate">
                                    {tx.dateTime} · {tx.note}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span
                                  className={`font-mono-num text-sm sm:text-base font-extrabold block ${
                                    isCredit
                                      ? isPayable
                                        ? "text-rose-800"
                                        : "text-amber-800"
                                      : "text-emerald-700"
                                  }`}
                                >
                                  {isCredit ? "+" : "-"}₹
                                  {tx.amountInr.toLocaleString("en-IN")}
                                </span>
                                <span className="font-mono-num text-[11px] font-semibold text-slate-500">
                                  Baaki ₹{tx.balanceAfter.toLocaleString("en-IN")}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
