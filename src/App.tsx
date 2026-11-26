import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock,
  RotateCcw,
  Sprout,
  Users,
  Volume2,
  X,
} from "lucide-react";
import { SummaryCards } from "./components/SummaryCards";
import { StockList } from "./components/StockList";
import { UdhaarList } from "./components/UdhaarList";
import { UnclearRecoveryCard } from "./components/UnclearRecoveryCard";
import { VoiceDock } from "./components/VoiceDock";
import {
  VEGETABLE_CATALOG,
  createDefaultState,
} from "./data/initialData";
import type {
  ActivityEntry,
  MandiState,
  ParsedVoiceCommand,
  StockItem,
  UdhaarEntry,
} from "./types";
import {
  getSpeechRecognitionCtor,
  speakHindi,
  stopSpeaking,
  type SpeechRecognitionLike,
} from "./utils/speech";
import { parseHindiCommand } from "./utils/hindiParser";

const STORAGE_KEY = "mandibol_state_v1";

function loadInitialState(): MandiState {
  if (typeof window === "undefined") return createDefaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw) as MandiState;
    if (
      typeof parsed.totalKharid === "number" &&
      typeof parsed.totalBikri === "number" &&
      Array.isArray(parsed.stocks) &&
      Array.isArray(parsed.udhaarList)
    ) {
      return parsed;
    }
  } catch {
    // Ignore corrupt localStorage and restore defaults
  }
  return createDefaultState();
}

function formatCurrentTime(): string {
  return new Date().toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function normalizeVegName(rawItem: string): {
  name: string;
  hindiName: string;
  englishName: string;
} {
  const cleaned = rawItem.trim();
  const key = Object.keys(VEGETABLE_CATALOG).find(
    (k) => k.toLowerCase() === cleaned.toLowerCase()
  );
  if (key) {
    return {
      name: key,
      hindiName: VEGETABLE_CATALOG[key].hindiName,
      englishName: VEGETABLE_CATALOG[key].englishName,
    };
  }
  const titleCased = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  return {
    name: titleCased || "Sabzi",
    hindiName: "",
    englishName: "",
  };
}

function formatKgLabel(kg: number): string {
  const rounded = Math.round(kg * 100) / 100;
  return `${rounded} kg`;
}

export default function App() {
  const [state, setState] = useState<MandiState>(() => loadInitialState());
  const [activeTab, setActiveTab] = useState<"stock" | "udhaar">("stock");

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [confirmation, setConfirmation] = useState<{
    intent: ParsedVoiceCommand["intent"];
    headline: string;
    hindiReply: string;
  } | null>(null);

  const [unclearState, setUnclearState] = useState<{
    transcript: string;
    parsed: ParsedVoiceCommand;
  } | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptBufferRef = useRef("");
  const submittedSpeechRef = useRef(false);
  const speechSupported = getSpeechRecognitionCtor() !== null;

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      stopSpeaking();
    };
  }, []);

  const buildExactSummaryReply = useCallback((current: MandiState): {
    headline: string;
    hindiReply: string;
  } => {
    const munafa = current.totalBikri - current.totalKharid;
    const topStocks = [...current.stocks]
      .filter((s) => s.remainingKg > 0)
      .sort((a, b) => b.remainingKg - a.remainingKg)
      .slice(0, 3);

    const stockTextHindi =
      topStocks.length > 0
        ? topStocks
            .map((s) => `${s.hindiName || s.name} ${Math.round(s.remainingKg * 100) / 100} किलो`)
            .join(", ")
        : "कोई माल बाकी नहीं है";

    const stockTextLatin =
      topStocks.length > 0
        ? topStocks
            .map((s) => `${s.name} ${Math.round(s.remainingKg * 100) / 100} kg`)
            .join(", ")
        : "No stock left";

    const munafaHindi =
      munafa >= 0
        ? `शुद्ध मुनाफा ${munafa} रुपये है`
        : `मुनाफा माइनस ${Math.abs(munafa)} रुपये है`;

    const hindiReply = `आज की कुल बिक्री ${current.totalBikri} रुपये, खरीद ${current.totalKharid} रुपये, और ${munafaHindi}। बचा हुआ माल: ${stockTextHindi}।`;
    const headline = `Munafa: ${munafa >= 0 ? "+" : "-"}₹${Math.abs(munafa).toLocaleString("en-IN")} · Stock: ${stockTextLatin}`;

    return { headline, hindiReply };
  }, []);

  const applyParsedTransaction = useCallback(
    (
      parsed: ParsedVoiceCommand,
      rawTranscript: string,
      currentState: MandiState
    ) => {
      const nowTime = formatCurrentTime();

      if (parsed.intent === "SUMMARY") {
        const { headline, hindiReply } = buildExactSummaryReply(currentState);
        const activity: ActivityEntry = {
          id: `act-${Date.now()}`,
          intent: "SUMMARY",
          transcript: rawTranscript,
          summaryText: headline,
          hindiReply,
          timestamp: nowTime,
        };
        setState((prev) => ({
          ...prev,
          activities: [activity, ...prev.activities].slice(0, 15),
        }));
        setUnclearState(null);
        setConfirmation({
          intent: "SUMMARY",
          headline,
          hindiReply,
        });
        speakHindi(hindiReply);
        return;
      }

      if (parsed.intent === "PURCHASE") {
        const veg = normalizeVegName(parsed.item);
        const kg = Math.max(0, parsed.quantity_kg);
        const amt = Math.max(0, Math.round(parsed.amount_inr));

        setState((prev) => {
          const existingIdx = prev.stocks.findIndex(
            (s) => s.name.toLowerCase() === veg.name.toLowerCase()
          );
          let nextStocks: StockItem[];
          if (existingIdx >= 0) {
            nextStocks = prev.stocks.map((s, idx) =>
              idx === existingIdx
                ? {
                    ...s,
                    remainingKg: Math.round((s.remainingKg + kg) * 100) / 100,
                    boughtKg: Math.round((s.boughtKg + kg) * 100) / 100,
                    boughtCostInr: s.boughtCostInr + amt,
                  }
                : s
            );
          } else {
            const newItem: StockItem = {
              id: `${veg.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
              name: veg.name,
              hindiName: veg.hindiName,
              englishName: veg.englishName,
              remainingKg: Math.round(kg * 100) / 100,
              boughtKg: Math.round(kg * 100) / 100,
              boughtCostInr: amt,
              soldKg: 0,
              soldRevenueInr: 0,
            };
            nextStocks = [newItem, ...prev.stocks];
          }

          const headline = `Kharid · ${veg.name} +${formatKgLabel(kg)} · ₹${amt.toLocaleString("en-IN")}`;
          const activity: ActivityEntry = {
            id: `act-${Date.now()}`,
            intent: "PURCHASE",
            transcript: rawTranscript,
            summaryText: headline,
            hindiReply: parsed.hindi_reply,
            timestamp: nowTime,
          };

          return {
            ...prev,
            totalKharid: prev.totalKharid + amt,
            stocks: nextStocks,
            activities: [activity, ...prev.activities].slice(0, 15),
          };
        });

        setActiveTab("stock");
        setUnclearState(null);
        const headline = `Kharid · ${veg.name} +${formatKgLabel(kg)} · +₹${amt.toLocaleString("en-IN")} Cost`;
        setConfirmation({
          intent: "PURCHASE",
          headline,
          hindiReply: parsed.hindi_reply,
        });
        speakHindi(parsed.hindi_reply);
        return;
      }

      if (parsed.intent === "SALE") {
        const veg = normalizeVegName(parsed.item);
        const kg = Math.max(0, parsed.quantity_kg);
        const amt = Math.max(0, Math.round(parsed.amount_inr));

        setState((prev) => {
          const existingIdx = prev.stocks.findIndex(
            (s) => s.name.toLowerCase() === veg.name.toLowerCase()
          );
          let nextStocks: StockItem[];
          if (existingIdx >= 0) {
            nextStocks = prev.stocks.map((s, idx) =>
              idx === existingIdx
                ? {
                    ...s,
                    remainingKg: Math.max(
                      0,
                      Math.round((s.remainingKg - kg) * 100) / 100
                    ),
                    soldKg: Math.round((s.soldKg + kg) * 100) / 100,
                    soldRevenueInr: s.soldRevenueInr + amt,
                  }
                : s
            );
          } else {
            const newItem: StockItem = {
              id: `${veg.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
              name: veg.name,
              hindiName: veg.hindiName,
              englishName: veg.englishName,
              remainingKg: 0,
              boughtKg: 0,
              boughtCostInr: 0,
              soldKg: Math.round(kg * 100) / 100,
              soldRevenueInr: amt,
            };
            nextStocks = [...prev.stocks, newItem];
          }

          const headline = `Bikri · ${veg.name} −${formatKgLabel(kg)} · +₹${amt.toLocaleString("en-IN")}`;
          const activity: ActivityEntry = {
            id: `act-${Date.now()}`,
            intent: "SALE",
            transcript: rawTranscript,
            summaryText: headline,
            hindiReply: parsed.hindi_reply,
            timestamp: nowTime,
          };

          return {
            ...prev,
            totalBikri: prev.totalBikri + amt,
            stocks: nextStocks,
            activities: [activity, ...prev.activities].slice(0, 15),
          };
        });

        setActiveTab("stock");
        setUnclearState(null);
        const headline = `Bikri · ${veg.name} −${formatKgLabel(kg)} · +₹${amt.toLocaleString("en-IN")} Sales`;
        setConfirmation({
          intent: "SALE",
          headline,
          hindiReply: parsed.hindi_reply,
        });
        speakHindi(parsed.hindi_reply);
        return;
      }

      if (parsed.intent === "UDHAAR") {
        const rawCustomer = parsed.customer_name.trim() || "Grahak";
        const amt = Math.max(0, Math.round(parsed.amount_inr));

        setState((prev) => {
          const existingIdx = prev.udhaarList.findIndex(
            (u) => u.customerName.toLowerCase() === rawCustomer.toLowerCase()
          );
          let nextUdhaar: UdhaarEntry[];
          if (existingIdx >= 0) {
            nextUdhaar = prev.udhaarList.map((u, idx) =>
              idx === existingIdx
                ? {
                    ...u,
                    amountInr: u.amountInr + amt,
                    lastUpdated: nowTime,
                  }
                : u
            );
          } else {
            const formattedName = rawCustomer
              .split(/\s+/)
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ");
            nextUdhaar = [
              {
                id: `${formattedName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
                customerName: formattedName,
                amountInr: amt,
                lastUpdated: nowTime,
              },
              ...prev.udhaarList,
            ];
          }

          const headline = `Udhaar · ${rawCustomer} +₹${amt.toLocaleString("en-IN")}`;
          const activity: ActivityEntry = {
            id: `act-${Date.now()}`,
            intent: "UDHAAR",
            transcript: rawTranscript,
            summaryText: headline,
            hindiReply: parsed.hindi_reply,
            timestamp: nowTime,
          };

          return {
            ...prev,
            udhaarList: nextUdhaar,
            activities: [activity, ...prev.activities].slice(0, 15),
          };
        });

        setActiveTab("udhaar");
        setUnclearState(null);
        const headline = `Udhaar · ${rawCustomer} +₹${amt.toLocaleString("en-IN")}`;
        setConfirmation({
          intent: "UDHAAR",
          headline,
          hindiReply: parsed.hindi_reply,
        });
        speakHindi(parsed.hindi_reply);
      }
    },
    [buildExactSummaryReply]
  );

  const processCommand = useCallback(
    (text: string) => {
      const cleaned = text.trim();
      if (!cleaned) return;

      setIsProcessing(true);
      setErrorMsg(null);
      setLiveTranscript(cleaned);

      try {
        const data = parseHindiCommand(cleaned, {
          totalKharid: state.totalKharid,
          totalBikri: state.totalBikri,
          munafa: state.totalBikri - state.totalKharid,
          stocks: state.stocks.map((s) => ({
            name: s.name,
            remainingKg: s.remainingKg,
          })),
          udhaarCustomers: state.udhaarList.map((u) => u.customerName),
        });

        if (data.intent === "UNCLEAR") {
          setConfirmation(null);
          setUnclearState({
            transcript: cleaned,
            parsed: data,
          });
          const unclearSpeech =
            "Kitne rupaye mein bika? Kripya dobara bolein ya neeche chunein.";
          speakHindi(data.hindi_reply || unclearSpeech);
        } else {
          applyParsedTransaction(data, cleaned, state);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Could not parse command. Please try again.";
        setErrorMsg(message);
      } finally {
        setIsProcessing(false);
        setLiveTranscript("");
      }
    },
    [applyParsedTransaction, state]
  );

  const handleToggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const RecognitionCtor = getSpeechRecognitionCtor();
    if (!RecognitionCtor) {
      setErrorMsg(
        "Voice microphone is not supported in this browser. Please tap a command chip below or use the keyboard button."
      );
      return;
    }

    stopSpeaking();
    setErrorMsg(null);
    transcriptBufferRef.current = "";
    submittedSpeechRef.current = false;

    const recognition = new RecognitionCtor();
    recognition.lang = "hi-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setLiveTranscript("");
    };

    recognition.onresult = (event) => {
      let combined = "";
      let hasFinal = false;

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        combined += result[0]?.transcript ?? "";
        if (result.isFinal) {
          hasFinal = true;
        }
      }

      const trimmed = combined.trim();
      transcriptBufferRef.current = trimmed;
      setLiveTranscript(trimmed);

      if (hasFinal && trimmed && !submittedSpeechRef.current) {
        submittedSpeechRef.current = true;
        setIsListening(false);
        recognition.stop();
        void processCommand(trimmed);
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setErrorMsg(
          "Microphone access was blocked. Please allow mic permission or tap a demo command chip below."
        );
      } else if (event.error === "no-speech") {
        setErrorMsg("Koi awaaz nahi sunai di. Dobara bolein ya neeche chip dabayein.");
      } else if (event.error !== "aborted") {
        setErrorMsg(`Voice recognition error (${event.error}). Try tapping a chip below.`);
      }
      setLiveTranscript("");
    };

    recognition.onend = () => {
      setIsListening(false);
      const pendingText = transcriptBufferRef.current.trim();
      if (pendingText && !submittedSpeechRef.current) {
        submittedSpeechRef.current = true;
        void processCommand(pendingText);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setErrorMsg("Could not start microphone. Try again or tap a command chip.");
    }
  };

  const handleConfirmUnclear = (resolved: {
    intent: "PURCHASE" | "SALE" | "UDHAAR";
    item: string;
    quantity_kg: number;
    amount_inr: number;
    customer_name: string;
  }) => {
    let hindiReply = "";
    if (resolved.intent === "PURCHASE") {
      hindiReply = `जी, ${resolved.quantity_kg} किलो ${resolved.item} ${resolved.amount_inr} रुपये में खरीद दर्ज कर दी गई है।`;
    } else if (resolved.intent === "SALE") {
      hindiReply = `जी, ${resolved.quantity_kg} किलो ${resolved.item} ${resolved.amount_inr} रुपये में बिक्री दर्ज कर दी गई है।`;
    } else {
      hindiReply = `जी, ${resolved.customer_name} के ${resolved.amount_inr} रुपये उधार खाते में लिख दिए हैं।`;
    }

    applyParsedTransaction(
      {
        intent: resolved.intent,
        item: resolved.item,
        quantity_kg: resolved.quantity_kg,
        amount_inr: resolved.amount_inr,
        customer_name: resolved.customer_name,
        hindi_reply: hindiReply,
      },
      unclearState?.transcript || "Manual check",
      state
    );
  };

  const handleSettleUdhaar = (id: string) => {
    const entry = state.udhaarList.find((u) => u.id === id);
    if (!entry) return;

    const hindiReply = `जी, ${entry.customerName} के ${entry.amountInr} रुपये उधार जमा हो गए हैं।`;
    const nowTime = formatCurrentTime();

    const settledActivity: ActivityEntry = {
      id: `act-${Date.now()}`,
      intent: "UDHAAR",
      transcript: `${entry.customerName} udhaar paid`,
      summaryText: `Udhaar Jama · ${entry.customerName} ₹${entry.amountInr.toLocaleString("en-IN")} Paid`,
      hindiReply,
      timestamp: nowTime,
    };

    setState((prev) => ({
      ...prev,
      udhaarList: prev.udhaarList.filter((u) => u.id !== id),
      activities: [settledActivity, ...prev.activities].slice(0, 15),
    }));

    setConfirmation({
      intent: "UDHAAR",
      headline: `Udhaar Jama · ${entry.customerName} ₹${entry.amountInr.toLocaleString("en-IN")} Paid`,
      hindiReply,
    });
    speakHindi(hindiReply);
  };

  const handleResetDemo = () => {
    recognitionRef.current?.abort();
    stopSpeaking();
    setIsListening(false);
    setIsProcessing(false);
    setLiveTranscript("");
    setErrorMsg(null);
    setUnclearState(null);
    setConfirmation(null);
    setActiveTab("stock");
    const fresh = createDefaultState();
    setState(fresh);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-72 sm:pb-64">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Sprout className="w-5 h-5" />
            </span>
            <div className="flex items-baseline gap-2 min-w-0">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 whitespace-nowrap">
                MandiBol
              </h1>
              <span className="hidden sm:inline text-xs font-bold text-slate-500 whitespace-nowrap">
                मंडी बोल · Sabzi Hisaab
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetDemo}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Demo</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 space-y-4 sm:space-y-5">
        {/* Top Summary Bar */}
        <SummaryCards
          totalKharid={state.totalKharid}
          totalBikri={state.totalBikri}
        />

        {/* Green Spoken Confirmation Banner */}
        {confirmation && (
          <div
            role="status"
            className="rounded-2xl bg-emerald-700 text-white p-4 shadow-md flex items-start justify-between gap-3"
          >
            <div className="flex items-start gap-3 min-w-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-200 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-emerald-100">
                  {confirmation.headline}
                </p>
                <p className="text-base sm:text-lg font-extrabold text-white mt-0.5 leading-snug">
                  {confirmation.hindiReply}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => speakHindi(confirmation.hindiReply)}
                aria-label="Replay Hindi voice reply"
                title="Replay Hindi audio"
                className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-emerald-600 flex items-center justify-center cursor-pointer"
              >
                <Volume2 className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setConfirmation(null)}
                aria-label="Close confirmation"
                className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-emerald-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div
            role="alert"
            className="rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 p-3.5 sm:p-4 flex items-center justify-between gap-3"
          >
            <p className="text-sm font-bold">{errorMsg}</p>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              aria-label="Dismiss error"
              className="min-h-[40px] min-w-[40px] rounded-xl hover:bg-rose-100 flex items-center justify-center shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Yellow Unclear Recovery Card */}
        {unclearState && (
          <UnclearRecoveryCard
            transcript={unclearState.transcript}
            parsed={unclearState.parsed}
            knownCustomers={state.udhaarList.map((u) => u.customerName)}
            onConfirm={handleConfirmUnclear}
            onCancel={() => setUnclearState(null)}
          />
        )}

        {/* Main Workspace Grid: Tabs on left/main, Recent Hisaab on desktop right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 space-y-4">
            {/* Two Main Tabs */}
            <div
              role="tablist"
              aria-label="Inventory and Credit Tabs"
              className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-200/80 rounded-2xl"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "stock"}
                onClick={() => setActiveTab("stock")}
                className={`min-h-[46px] px-3 py-2 rounded-xl text-sm sm:text-base font-extrabold flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === "stock"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                <Sprout className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
                <span>Sabzi Stock ({state.stocks.length})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "udhaar"}
                onClick={() => setActiveTab("udhaar")}
                className={`min-h-[46px] px-3 py-2 rounded-xl text-sm sm:text-base font-extrabold flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === "udhaar"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-amber-700" />
                <span>Udhaar Khata ({state.udhaarList.length})</span>
              </button>
            </div>

            {activeTab === "stock" ? (
              <StockList stocks={state.stocks} />
            ) : (
              <UdhaarList
                udhaarList={state.udhaarList}
                onSettleUdhaar={handleSettleUdhaar}
              />
            )}
          </div>

          {/* Aaj Ke Saude (Recent Entries) */}
          <aside className="lg:col-span-5 rounded-2xl bg-white border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-600" />
                <span>Aaj Ke Saude · Today&apos;s Log</span>
              </h2>
              <span className="text-xs font-bold text-slate-500 tabular-nums">
                {state.activities.length} entries
              </span>
            </div>

            <div className="divide-y divide-slate-100 mt-1">
              {state.activities.slice(0, 6).map((act) => (
                <div key={act.id} className="py-3 first:pt-2.5 last:pb-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-extrabold text-slate-900">
                      {act.summaryText}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 whitespace-nowrap shrink-0 tabular-nums">
                      {act.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-0.5 truncate">
                    &ldquo;{act.transcript}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </main>

      {/* Bottom Fixed Voice & Judge Demo Dock */}
      <VoiceDock
        isListening={isListening}
        isProcessing={isProcessing}
        liveTranscript={liveTranscript}
        speechSupported={speechSupported}
        onToggleListening={handleToggleListening}
        onSelectCommand={(cmd) => void processCommand(cmd)}
      />
    </div>
  );
}
