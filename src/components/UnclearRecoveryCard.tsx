import { useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import type { ParsedVoiceCommand } from "../types";

interface UnclearRecoveryCardProps {
  transcript: string;
  parsed: ParsedVoiceCommand;
  knownCustomers: string[];
  onConfirm: (resolved: {
    intent:
      | "PURCHASE"
      | "SALE"
      | "UDHAAR"
      | "UDHAAR_JAMA"
      | "PAYABLE_ADD"
      | "PAYABLE_PAY";
    item: string;
    quantity_kg: number;
    amount_inr: number;
    customer_name: string;
  }) => void;
  onCancel: () => void;
}

const QUICK_VEGGIES = ["Tamatar", "Aaloo", "Pyaaz", "Bhindi", "Gobhi", "Mirch"];
const QUICK_KGS = [
  { label: "0.25 (Paav)", value: 0.25 },
  { label: "0.5 (Aadha)", value: 0.5 },
  { label: "1 kg", value: 1 },
  { label: "2 kg", value: 2 },
  { label: "5 kg", value: 5 },
];
const QUICK_AMOUNTS = [20, 40, 50, 100, 200];

export function UnclearRecoveryCard({
  transcript,
  parsed,
  knownCustomers,
  onConfirm,
  onCancel,
}: UnclearRecoveryCardProps) {
  const [intent, setIntent] = useState<
    "PURCHASE" | "SALE" | "UDHAAR" | "UDHAAR_JAMA" | "PAYABLE_ADD" | "PAYABLE_PAY"
  >(parsed.suggested_intent ?? "SALE");
  const [item, setItem] = useState(parsed.item || "Tamatar");
  const [kg, setKg] = useState(parsed.quantity_kg > 0 ? String(parsed.quantity_kg) : "1");
  const [amount, setAmount] = useState(
    parsed.amount_inr > 0 ? String(parsed.amount_inr) : ""
  );
  const [customerName, setCustomerName] = useState(
    parsed.customer_name || knownCustomers[0] || ""
  );
  const [formError, setFormError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);
    const numericKg = Number(kg);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormError("Kripya rupaye (₹) darj karein.");
      return;
    }

    if (
      intent === "UDHAAR" ||
      intent === "UDHAAR_JAMA" ||
      intent === "PAYABLE_ADD" ||
      intent === "PAYABLE_PAY"
    ) {
      if (!customerName.trim()) {
        setFormError("Kripya vyakti ka naam likhein.");
        return;
      }
      onConfirm({
        intent,
        item: "",
        quantity_kg: 0,
        amount_inr: numericAmount,
        customer_name: customerName.trim(),
      });
      return;
    }

    if (!item.trim()) {
      setFormError("Kripya sabzi ka naam chunein.");
      return;
    }

    if (!Number.isFinite(numericKg) || numericKg <= 0) {
      setFormError("Kripya wajan (kg) darj karein.");
      return;
    }

    onConfirm({
      intent,
      item: item.trim(),
      quantity_kg: numericKg,
      amount_inr: numericAmount,
      customer_name: "",
    });
  };

  const isCustomerIntent =
    intent === "UDHAAR" ||
    intent === "UDHAAR_JAMA" ||
    intent === "PAYABLE_ADD" ||
    intent === "PAYABLE_PAY";

  return (
    <section
      aria-label="Please Check Unclear Entry"
      className="rounded-2xl bg-amber-50 border-2 border-amber-400 p-4 sm:p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-amber-950">
              Kripya Jaanch Karein (Please Check)
            </h2>
            <p className="text-xs sm:text-sm font-medium text-amber-900 mt-0.5">
              Suna gaya: &ldquo;{transcript}&rdquo;
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Dismiss check card"
          className="min-h-[44px] min-w-[44px] rounded-xl text-amber-900 hover:bg-amber-200/60 flex items-center justify-center shrink-0 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
        {/* Action Toggle */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1 bg-amber-200/70 rounded-xl">
          {(
            [
              { id: "SALE", label: "Bikri · Sale" },
              { id: "PURCHASE", label: "Kharid · Buy" },
              { id: "UDHAAR", label: "Udhaar" },
              { id: "UDHAAR_JAMA", label: "Jama · Paid" },
              { id: "PAYABLE_ADD", label: "Dena Hai" },
              { id: "PAYABLE_PAY", label: "Dena Diya" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setIntent(tab.id);
                setFormError("");
              }}
              className={`min-h-[40px] px-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                intent === tab.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-amber-950 hover:bg-amber-100/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isCustomerIntent ? (
          <div>
            <label className="block text-xs font-bold text-amber-950 mb-1.5">
              Person Name · ग्राहक / किसान का नाम
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g., Sunita Ji"
              className="w-full min-h-[44px] rounded-xl bg-white border-2 border-amber-300 px-3.5 py-2 text-base font-bold text-slate-900 focus:outline-none focus:border-slate-900"
            />
            {knownCustomers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {knownCustomers.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCustomerName(c)}
                    className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      customerName === c
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-800 border-amber-300 hover:bg-amber-100"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Vegetable Item */}
            <div>
              <label className="block text-xs font-bold text-amber-950 mb-1.5">
                Sabzi (Item) · सब्जी
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {QUICK_VEGGIES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setItem(v)}
                    className={`min-h-[38px] px-3 py-1 rounded-lg text-xs sm:text-sm font-bold border transition-colors cursor-pointer ${
                      item.toLowerCase() === v.toLowerCase()
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-800 border-amber-300 hover:bg-amber-100"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                placeholder="Sabzi ka naam (e.g., Tamatar)"
                className="w-full min-h-[44px] rounded-xl bg-white border-2 border-amber-300 px-3.5 py-2 text-base font-bold text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>

            {/* Quantity in kg */}
            <div>
              <label className="block text-xs font-bold text-amber-950 mb-1.5">
                Wajan (kg) · किलो
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {QUICK_KGS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setKg(String(opt.value))}
                    className={`min-h-[38px] px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      Number(kg) === opt.value
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-800 border-amber-300 hover:bg-amber-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <input
                type="number"
                step="0.05"
                min="0"
                value={kg}
                onChange={(e) => setKg(e.target.value)}
                placeholder="kg"
                className="w-full min-h-[44px] rounded-xl bg-white border-2 border-amber-300 px-3.5 py-2 text-base font-mono-num font-bold text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
          </>
        )}

        {/* Amount in INR */}
        <div>
          <label className="block text-xs font-bold text-amber-950 mb-1.5">
            Rupaye (₹) · कीमत
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {QUICK_AMOUNTS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setAmount(String(val));
                  setFormError("");
                }}
                className={`min-h-[38px] px-3 py-1 rounded-lg text-xs sm:text-sm font-mono-num font-bold border transition-colors cursor-pointer ${
                  Number(amount) === val
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-800 border-amber-300 hover:bg-amber-100"
                }`}
              >
                ₹{val}
              </button>
            ))}
          </div>
          <input
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setFormError("");
            }}
            placeholder="Kitne rupaye? (e.g., 60)"
            className="w-full min-h-[44px] rounded-xl bg-white border-2 border-amber-300 px-3.5 py-2 text-base font-mono-num font-bold text-slate-900 focus:outline-none focus:border-slate-900"
          />
        </div>

        {formError && (
          <p className="text-sm font-bold text-rose-700">{formError}</p>
        )}

        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="submit"
            className="flex-1 min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Check className="w-5 h-5" />
            <span>Save · दर्ज करें</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[46px] px-4 rounded-xl bg-white hover:bg-amber-100 border border-amber-300 text-amber-950 font-bold text-sm transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
