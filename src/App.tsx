import { useCallback, useEffect, useRef, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Receipt,
  RotateCcw,
  Settings,
  Sprout,
  Users,
  Volume2,
  X,
} from "lucide-react";
import { CustomerBillsList } from "./components/CustomerBillsList";
import { ReportsTab } from "./components/ReportsTab";
import { ShopSetupModal } from "./components/ShopSetupModal";
import { SummaryCards } from "./components/SummaryCards";
import { StockList } from "./components/StockList";
import { UdhaarList } from "./components/UdhaarList";
import { UnclearRecoveryCard } from "./components/UnclearRecoveryCard";
import { VoiceDock } from "./components/VoiceDock";
import {
  VEGETABLE_CATALOG,
  createDefaultCustomerBills,
  createDefaultDailyHistory,
  createDefaultShopProfile,
  createDefaultState,
  createEmptyFreshState,
} from "./data/initialData";
import type {
  ActivityEntry,
  CustomerBill,
  DailyHistoryItemSnapshot,
  DailyHistoryRecord,
  LedgerAccountType,
  MandiState,
  MultiOrderItem,
  ParsedMultiOrderLine,
  ParsedVoiceCommand,
  PaymentMode,
  RateLogEntry,
  ShopProfile,
  StockItem,
  UdhaarEntry,
  UdhaarTransaction,
} from "./types";
import { getActiveBusinessDateTime } from "./utils/exportReports";
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
      const totalOnlineBikri =
        typeof parsed.totalOnlineBikri === "number" ? parsed.totalOnlineBikri : 0;
      const totalOfflineBikri =
        typeof parsed.totalOfflineBikri === "number"
          ? parsed.totalOfflineBikri
          : Math.max(0, parsed.totalBikri - totalOnlineBikri);

      return {
        ...parsed,
        totalOnlineBikri,
        totalOfflineBikri,
        stocks: parsed.stocks.map((s) => ({
          ...s,
          soldOnlineInr:
            typeof s.soldOnlineInr === "number" ? s.soldOnlineInr : 0,
          soldOfflineInr:
            typeof s.soldOfflineInr === "number"
              ? s.soldOfflineInr
              : s.soldRevenueInr,
          buyRates: Array.isArray(s.buyRates)
            ? s.buyRates
            : s.boughtKg > 0
            ? [
                {
                  id: `br-mig-${s.id}`,
                  qtyKg: s.boughtKg,
                  ratePerKg: Math.round(s.boughtCostInr / s.boughtKg),
                  totalInr: s.boughtCostInr,
                  time: "Morning",
                },
              ]
            : [],
          sellRates: Array.isArray(s.sellRates)
            ? s.sellRates
            : s.soldKg > 0
            ? [
                {
                  id: `sr-mig-${s.id}`,
                  qtyKg: s.soldKg,
                  ratePerKg: Math.round(s.soldRevenueInr / s.soldKg),
                  totalInr: s.soldRevenueInr,
                  onlineInr: 0,
                  offlineInr: s.soldRevenueInr,
                  time: "Today",
                },
              ]
            : [],
        })),
        udhaarList: parsed.udhaarList.map((u) => {
          const accountType: LedgerAccountType =
            u.accountType === "PAYABLE" ? "PAYABLE" : "RECEIVABLE";
          const history: UdhaarTransaction[] = Array.isArray(u.history)
            ? u.history.map((tx) => ({
                ...tx,
                balanceAfter:
                  typeof tx.balanceAfter === "number"
                    ? tx.balanceAfter
                    : u.amountInr,
              }))
            : u.amountInr > 0
            ? [
                {
                  id: `u-mig-${u.id}`,
                  type: "CREDIT",
                  amountInr: u.amountInr,
                  balanceAfter: u.amountInr,
                  note: "Purana udhaar baaki",
                  dateTime: u.lastUpdated || "Today",
                },
              ]
            : [];
          return {
            ...u,
            mobile: u.mobile || "",
            address: u.address || "",
            accountType,
            totalPaidOnlineInr:
              typeof u.totalPaidOnlineInr === "number" ? u.totalPaidOnlineInr : 0,
            totalPaidOfflineInr:
              typeof u.totalPaidOfflineInr === "number"
                ? u.totalPaidOfflineInr
                : 0,
            history,
          };
        }),
        dailyHistory: Array.isArray(parsed.dailyHistory)
          ? parsed.dailyHistory
          : createDefaultDailyHistory(),
        customerBills: Array.isArray(parsed.customerBills)
          ? parsed.customerBills.map((b) => {
              const paidOnlineInr =
                typeof b.paidOnlineInr === "number"
                  ? b.paidOnlineInr
                  : b.paymentStatus === "PAID_ONLINE"
                  ? b.totalBillInr
                  : 0;
              const paidOfflineInr =
                typeof b.paidOfflineInr === "number"
                  ? b.paidOfflineInr
                  : b.paymentStatus === "PAID_CASH"
                  ? b.totalBillInr
                  : 0;
              const pendingBalanceInr =
                typeof b.pendingBalanceInr === "number"
                  ? b.pendingBalanceInr
                  : Math.max(0, b.totalBillInr - paidOnlineInr - paidOfflineInr);
              return {
                ...b,
                paidOnlineInr,
                paidOfflineInr,
                pendingBalanceInr,
              };
            })
          : createDefaultCustomerBills(),
        shopProfile: parsed.shopProfile
          ? { ...createDefaultShopProfile(), ...parsed.shopProfile }
          : createDefaultShopProfile(),
      };
    }
  } catch {
    // Ignore corrupt localStorage and restore defaults
  }
  return createDefaultState();
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
  const [activeTab, setActiveTab] = useState<
    "stock" | "udhaar" | "bills" | "reports"
  >("stock");
  const [expandedUdhaarId, setExpandedUdhaarId] = useState<string | null>("sunita-ji");
  const [showShopSetup, setShowShopSetup] = useState(false);

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

  const buildExactSummaryReply = useCallback(
    (
      current: MandiState,
      targetItemName?: string
    ): {
      headline: string;
      hindiReply: string;
    } => {
      if (targetItemName) {
        const veg = normalizeVegName(targetItemName);
        const stock = current.stocks.find(
          (s) => s.name.toLowerCase() === veg.name.toLowerCase()
        );

        if (!stock) {
          return {
            headline: `${veg.name} · No purchase or sale recorded today`,
            hindiReply: `आज ${veg.hindiName || veg.name} का कोई खरीद या बिक्री रिकॉर्ड नहीं मिला।`,
          };
        }

        const avgCostPerKg =
          stock.boughtKg > 0 ? stock.boughtCostInr / stock.boughtKg : 0;
        const costOfSold = stock.soldKg * avgCostPerKg;
        const itemProfit = Math.round(stock.soldRevenueInr - costOfSold);
        const itemLabelHindi = stock.hindiName || stock.name;

        if (stock.soldKg <= 0) {
          const avgRounded = Math.round(avgCostPerKg);
          const remRounded = Math.round(stock.remainingKg * 100) / 100;
          return {
            headline: `${stock.name} · 0 kg sold · Avg ₹${avgRounded}/kg · Left ${remRounded} kg`,
            hindiReply: `${itemLabelHindi} की अभी कोई बिक्री नहीं हुई है। औसत खरीद भाव ${avgRounded} रुपये प्रति किलो और बचा माल ${remRounded} किलो है।`,
          };
        }

        const soldRounded = Math.round(stock.soldKg * 100) / 100;
        const remRounded = Math.round(stock.remainingKg * 100) / 100;
        const costRounded = Math.round(costOfSold);
        const avgRounded = Math.round(avgCostPerKg);
        const profitSign = itemProfit >= 0 ? "+" : "-";
        const profitHindi =
          itemProfit >= 0
            ? `${itemProfit} रुपये मुनाफा हुआ`
            : `${Math.abs(itemProfit)} रुपये नुकसान हुआ`;

        return {
          headline: `${stock.name} Munafa: ${profitSign}₹${Math.abs(itemProfit).toLocaleString("en-IN")} (${soldRounded} kg · ₹${stock.soldRevenueInr} rev − ₹${costRounded} cost)`,
          hindiReply: `${soldRounded} किलो ${itemLabelHindi} कुल ${stock.soldRevenueInr} रुपये में बिका, और लागत ${costRounded} रुपये (औसत ${avgRounded} रुपये प्रति किलो) थी — इस पर आपका ${profitHindi}। बचा माल ${remRounded} किलो है।`,
        };
      }

      const munafa = current.totalBikri - current.totalKharid;
      const realizedItemProfit = Math.round(
        current.stocks.reduce((sum, s) => {
          if (s.soldKg <= 0 || s.boughtKg <= 0) return sum;
          const avg = s.boughtCostInr / s.boughtKg;
          return sum + (s.soldRevenueInr - s.soldKg * avg);
        }, 0)
      );

      const topStocks = [...current.stocks]
        .filter((s) => s.remainingKg > 0)
        .sort((a, b) => b.remainingKg - a.remainingKg)
        .slice(0, 3);

      const stockTextHindi =
        topStocks.length > 0
          ? topStocks
              .map(
                (s) =>
                  `${s.hindiName || s.name} ${Math.round(s.remainingKg * 100) / 100} किलो`
              )
              .join(", ")
          : "कोई माल बाकी नहीं है";

      const stockTextLatin =
        topStocks.length > 0
          ? topStocks
              .map(
                (s) =>
                  `${s.name} ${Math.round(s.remainingKg * 100) / 100} kg`
              )
              .join(", ")
          : "No stock left";

      const munafaHindi =
        munafa >= 0
          ? `कुल नेट मुनाफा ${munafa} रुपये है`
          : `कुल नेट अंतर माइनस ${Math.abs(munafa)} रुपये है`;

      const realizedHindi =
        realizedItemProfit !== 0
          ? ` बिके हुए माल पर मुनाफा ${realizedItemProfit >= 0 ? `${realizedItemProfit} रुपये` : `माइनस ${Math.abs(realizedItemProfit)} रुपये`} है।`
          : "";

      const hindiReply = `आज की कुल बिक्री ${current.totalBikri} रुपये, खरीद ${current.totalKharid} रुपये, और ${munafaHindi}।${realizedHindi} बचा हुआ माल: ${stockTextHindi}।`;
      const headline = `Net Munafa: ${munafa >= 0 ? "+" : "-"}₹${Math.abs(munafa).toLocaleString("en-IN")} · Sold Profit: ${realizedItemProfit >= 0 ? "+" : "-"}₹${Math.abs(realizedItemProfit).toLocaleString("en-IN")} · Stock: ${stockTextLatin}`;

      return { headline, hindiReply };
    },
    []
  );

  const applyParsedTransaction = useCallback(
    (
      parsed: ParsedVoiceCommand,
      rawTranscript: string,
      currentState: MandiState
    ) => {
      const activeDt = getActiveBusinessDateTime(currentState.shopProfile);
      const nowTime =
        currentState.shopProfile?.useLiveClock === false
          ? activeDt.dateTimeLabel
          : activeDt.timeLabel;

      if (parsed.intent === "SUMMARY") {
        const { headline, hindiReply } = buildExactSummaryReply(
          currentState,
          parsed.item
        );
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

      if (parsed.intent === "MULTI_SALE" && parsed.multi_items?.length) {
        const buyerName = parsed.customer_name.trim() || "Grahak";
        const isUdhaar = Boolean(parsed.is_udhaar);
        const dateTime = activeDt.dateTimeLabel;
        const isoDate = activeDt.isoDate;
        const billNumber = `MB-${101 + (currentState.customerBills?.length ?? 0)}`;

        const billedItems: MultiOrderItem[] = [];
        let totalBillInr = 0;
        let totalCostInr = 0;

        for (const line of parsed.multi_items) {
          const veg = normalizeVegName(line.item);
          const qtyKg = Math.max(0, Math.round(line.quantity_kg * 100) / 100);
          if (qtyKg <= 0) continue;

          const matchedStock = currentState.stocks.find(
            (s) => s.name.toLowerCase() === veg.name.toLowerCase()
          );
          const catalogDefaults = VEGETABLE_CATALOG[veg.name];

          let sellRatePerKg = line.rate_per_kg ?? 0;
          if (sellRatePerKg <= 0 && line.amount_inr && line.amount_inr > 0) {
            sellRatePerKg = Math.round(line.amount_inr / qtyKg);
          }
          if (
            sellRatePerKg <= 0 &&
            matchedStock?.sellRates &&
            matchedStock.sellRates.length > 0
          ) {
            sellRatePerKg =
              matchedStock.sellRates[matchedStock.sellRates.length - 1].ratePerKg;
          }
          if (sellRatePerKg <= 0) {
            sellRatePerKg = catalogDefaults?.defaultSellRate ?? 35;
          }

          const subtotalInr =
            line.amount_inr && line.amount_inr > 0
              ? Math.round(line.amount_inr)
              : Math.round(qtyKg * sellRatePerKg);

          const costRatePerKg =
            matchedStock && matchedStock.boughtKg > 0
              ? Math.round((matchedStock.boughtCostInr / matchedStock.boughtKg) * 100) /
                100
              : catalogDefaults?.defaultBuyRate ?? Math.round(sellRatePerKg * 0.65);

          const costTotalInr = Math.round(qtyKg * costRatePerKg);
          const profitInr = subtotalInr - costTotalInr;

          totalBillInr += subtotalInr;
          totalCostInr += costTotalInr;

          billedItems.push({
            item: veg.name,
            hindiName: veg.hindiName || matchedStock?.hindiName || "",
            qtyKg,
            sellRatePerKg,
            subtotalInr,
            costRatePerKg: Math.round(costRatePerKg),
            costTotalInr,
            profitInr,
          });
        }

        if (billedItems.length === 0) return;

        const hasExplicitSplit =
          (parsed.paid_online_inr ?? 0) > 0 || (parsed.paid_offline_inr ?? 0) > 0;
        let paidOnlineInr = 0;
        let paidOfflineInr = 0;
        if (hasExplicitSplit) {
          paidOnlineInr = Math.max(0, Math.round(parsed.paid_online_inr ?? 0));
          paidOfflineInr = Math.max(0, Math.round(parsed.paid_offline_inr ?? 0));
        } else if (isUdhaar) {
          paidOnlineInr = 0;
          paidOfflineInr = 0;
        } else if (parsed.payment_mode === "ONLINE") {
          paidOnlineInr = totalBillInr;
          paidOfflineInr = 0;
        } else {
          paidOnlineInr = 0;
          paidOfflineInr = totalBillInr;
        }

        const paidTotal = paidOnlineInr + paidOfflineInr;
        const pendingBalanceInr = Math.max(0, totalBillInr - paidTotal);
        const paymentStatus: CustomerBill["paymentStatus"] =
          pendingBalanceInr === 0
            ? paidOnlineInr > 0 && paidOfflineInr === 0
              ? "PAID_ONLINE"
              : "PAID_CASH"
            : paidTotal > 0
            ? "PARTIAL_PAID"
            : "UDHAAR_PENDING";

        const netProfitInr = totalBillInr - totalCostInr;
        const newBill: CustomerBill = {
          id: `bill-${Date.now()}`,
          billNumber,
          buyerName,
          dateTime,
          isoDate,
          items: billedItems,
          totalCostInr,
          totalBillInr,
          netProfitInr,
          paidOnlineInr,
          paidOfflineInr,
          pendingBalanceInr,
          paymentStatus,
        };

        const itemsSummary = billedItems
          .map((it) => `${it.item} ${it.qtyKg}kg`)
          .join(", ");
        const payLabel =
          paidOnlineInr > 0 && paidOfflineInr > 0
            ? `Online ₹${paidOnlineInr.toLocaleString("en-IN")} + Cash ₹${paidOfflineInr.toLocaleString("en-IN")}`
            : paidOnlineInr > 0
            ? `Online ₹${paidOnlineInr.toLocaleString("en-IN")}`
            : paidOfflineInr > 0
            ? `Cash ₹${paidOfflineInr.toLocaleString("en-IN")}`
            : "Udhaar Pending";
        const pendingLabel =
          pendingBalanceInr > 0
            ? ` · Baaki ₹${pendingBalanceInr.toLocaleString("en-IN")}`
            : "";

        const headline = `${billNumber} · ${buyerName} · ${billedItems.length} items · Bill ₹${totalBillInr.toLocaleString("en-IN")} (${payLabel}${pendingLabel}) · Munafa ${netProfitInr >= 0 ? "+" : "-"}₹${Math.abs(netProfitInr).toLocaleString("en-IN")}`;

        let paymentSpeech = "";
        if (paidOnlineInr > 0 && paidOfflineInr > 0) {
          paymentSpeech = ` इसमें से ${paidOnlineInr} रुपये ऑनलाइन और ${paidOfflineInr} रुपये नकद मिले`;
        } else if (paidOnlineInr > 0) {
          paymentSpeech = ` पूरा भुगतान ${paidOnlineInr} रुपये ऑनलाइन (UPI) में मिला`;
        } else if (paidOfflineInr > 0) {
          paymentSpeech = ` भुगतान ${paidOfflineInr} रुपये नकद में मिला`;
        } else {
          paymentSpeech = ` पूरा ${totalBillInr} रुपये उधार खाते में लिख दिया गया है`;
        }
        if (pendingBalanceInr > 0 && paidTotal > 0) {
          paymentSpeech += ` और बाकी ${pendingBalanceInr} रुपये उधार में लिखे गए`;
        }

        const hindiReply = `${buyerName} का कुल बिल ${totalBillInr} रुपये बना है।${paymentSpeech}, और इस पर आपका शुद्ध मुनाफा ${netProfitInr >= 0 ? `${netProfitInr} रुपये` : `माइनस ${Math.abs(netProfitInr)} रुपये`} हुआ।`;

        const activity: ActivityEntry = {
          id: `act-${Date.now()}`,
          intent: "MULTI_SALE",
          transcript: rawTranscript,
          summaryText: `${billNumber} (${buyerName}): ${itemsSummary} = ₹${totalBillInr.toLocaleString("en-IN")} [${payLabel}${pendingLabel}]`,
          hindiReply,
          timestamp: nowTime,
        };

        setState((prev) => {
          const updatedStocks = [...prev.stocks];
          let remOnline = paidOnlineInr;
          let remOffline = paidOfflineInr;

          billedItems.forEach((bi, itemIdx) => {
            const isLast = itemIdx === billedItems.length - 1;
            const itemOnline =
              totalBillInr > 0
                ? isLast
                  ? remOnline
                  : Math.min(
                      remOnline,
                      Math.round((bi.subtotalInr / totalBillInr) * paidOnlineInr)
                    )
                : 0;
            const itemOffline =
              totalBillInr > 0
                ? isLast
                  ? remOffline
                  : Math.min(
                      remOffline,
                      Math.round((bi.subtotalInr / totalBillInr) * paidOfflineInr)
                    )
                : 0;
            remOnline = Math.max(0, remOnline - itemOnline);
            remOffline = Math.max(0, remOffline - itemOffline);

            const idx = updatedStocks.findIndex(
              (s) => s.name.toLowerCase() === bi.item.toLowerCase()
            );
            const rateEntry: RateLogEntry = {
              id: `sr-${Date.now()}-${bi.item.toLowerCase()}-${itemIdx}`,
              qtyKg: bi.qtyKg,
              ratePerKg: bi.sellRatePerKg,
              totalInr: bi.subtotalInr,
              onlineInr: itemOnline,
              offlineInr: itemOffline,
              time: nowTime,
            };
            if (idx >= 0) {
              const s = updatedStocks[idx];
              updatedStocks[idx] = {
                ...s,
                remainingKg: Math.max(
                  0,
                  Math.round((s.remainingKg - bi.qtyKg) * 100) / 100
                ),
                soldKg: Math.round((s.soldKg + bi.qtyKg) * 100) / 100,
                soldRevenueInr: s.soldRevenueInr + bi.subtotalInr,
                soldOnlineInr: (s.soldOnlineInr ?? 0) + itemOnline,
                soldOfflineInr: (s.soldOfflineInr ?? 0) + itemOffline,
                sellRates: [...(s.sellRates ?? []), rateEntry],
              };
            } else {
              const vegMeta = normalizeVegName(bi.item);
              updatedStocks.push({
                id: `${vegMeta.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
                name: vegMeta.name,
                hindiName: vegMeta.hindiName,
                englishName: vegMeta.englishName,
                remainingKg: 0,
                boughtKg: 0,
                boughtCostInr: 0,
                soldKg: bi.qtyKg,
                soldRevenueInr: bi.subtotalInr,
                soldOnlineInr: itemOnline,
                soldOfflineInr: itemOffline,
                buyRates: [],
                sellRates: [rateEntry],
              });
            }
          });

          let nextUdhaar = prev.udhaarList;
          if (pendingBalanceInr > 0) {
            const existingIdx = prev.udhaarList.findIndex(
              (u) => u.customerName.toLowerCase() === buyerName.toLowerCase()
            );
            const noteStr =
              paidTotal > 0
                ? `${billNumber}: ${itemsSummary} (Paid ₹${paidOnlineInr} Online, ₹${paidOfflineInr} Cash)`
                : `${billNumber}: ${itemsSummary}`;
            if (existingIdx >= 0) {
              const existing = prev.udhaarList[existingIdx];
              const nextBal = existing.amountInr + pendingBalanceInr;
              const tx: UdhaarTransaction = {
                id: `u-tx-${Date.now()}`,
                type: "CREDIT",
                amountInr: pendingBalanceInr,
                onlineInr: paidOnlineInr,
                offlineInr: paidOfflineInr,
                paymentMode:
                  paidOnlineInr > 0 && paidOfflineInr > 0
                    ? "SPLIT"
                    : paidOnlineInr > 0
                    ? "ONLINE"
                    : "OFFLINE",
                balanceAfter: nextBal,
                note: noteStr,
                dateTime,
              };
              nextUdhaar = prev.udhaarList.map((u, i) =>
                i === existingIdx
                  ? {
                      ...u,
                      amountInr: nextBal,
                      totalPaidOnlineInr:
                        (u.totalPaidOnlineInr ?? 0) + paidOnlineInr,
                      totalPaidOfflineInr:
                        (u.totalPaidOfflineInr ?? 0) + paidOfflineInr,
                      lastUpdated: nowTime,
                      history: [tx, ...u.history],
                    }
                  : u
              );
            } else {
              const tx: UdhaarTransaction = {
                id: `u-tx-${Date.now()}`,
                type: "CREDIT",
                amountInr: pendingBalanceInr,
                onlineInr: paidOnlineInr,
                offlineInr: paidOfflineInr,
                paymentMode:
                  paidOnlineInr > 0 && paidOfflineInr > 0
                    ? "SPLIT"
                    : paidOnlineInr > 0
                    ? "ONLINE"
                    : "OFFLINE",
                balanceAfter: pendingBalanceInr,
                note: noteStr,
                dateTime,
              };
              nextUdhaar = [
                {
                  id: `${buyerName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
                  customerName: buyerName,
                  mobile: "",
                  address: "",
                  accountType: "RECEIVABLE",
                  amountInr: pendingBalanceInr,
                  totalPaidOnlineInr: paidOnlineInr,
                  totalPaidOfflineInr: paidOfflineInr,
                  lastUpdated: nowTime,
                  history: [tx],
                },
                ...prev.udhaarList,
              ];
            }
          }

          return {
            ...prev,
            totalBikri: prev.totalBikri + paidTotal,
            totalOnlineBikri: (prev.totalOnlineBikri ?? 0) + paidOnlineInr,
            totalOfflineBikri: (prev.totalOfflineBikri ?? 0) + paidOfflineInr,
            stocks: updatedStocks,
            udhaarList: nextUdhaar,
            customerBills: [newBill, ...(prev.customerBills ?? [])],
            activities: [activity, ...prev.activities].slice(0, 15),
          };
        });

        setActiveTab("bills");
        setUnclearState(null);
        setConfirmation({
          intent: "MULTI_SALE",
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
        const effectiveRate =
          parsed.rate_per_kg && parsed.rate_per_kg > 0
            ? parsed.rate_per_kg
            : kg > 0
            ? Math.round(amt / kg)
            : 0;
        const rateEntry: RateLogEntry = {
          id: `br-${Date.now()}`,
          qtyKg: Math.round(kg * 100) / 100,
          ratePerKg: effectiveRate,
          totalInr: amt,
          time: nowTime,
        };
        const rateSuffix =
          parsed.rate_per_kg && parsed.rate_per_kg > 0
            ? ` (@ ₹${parsed.rate_per_kg}/kg)`
            : "";
        const activityHeadline = `Kharid · ${veg.name} +${formatKgLabel(kg)}${rateSuffix} · ₹${amt.toLocaleString("en-IN")}`;

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
                    buyRates: [...(s.buyRates ?? []), rateEntry],
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
              buyRates: [rateEntry],
              sellRates: [],
            };
            nextStocks = [newItem, ...prev.stocks];
          }

          const activity: ActivityEntry = {
            id: `act-${Date.now()}`,
            intent: "PURCHASE",
            transcript: rawTranscript,
            summaryText: activityHeadline,
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
        const headline = `Kharid · ${veg.name} +${formatKgLabel(kg)}${rateSuffix} · +₹${amt.toLocaleString("en-IN")} Cost`;
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
        const rawAmt = Math.max(0, Math.round(parsed.amount_inr));
        const hasExplicitSplit =
          (parsed.paid_online_inr ?? 0) > 0 || (parsed.paid_offline_inr ?? 0) > 0;
        const paidOnline = hasExplicitSplit
          ? Math.max(0, Math.round(parsed.paid_online_inr ?? 0))
          : parsed.payment_mode === "ONLINE"
          ? rawAmt
          : 0;
        const paidOffline = hasExplicitSplit
          ? Math.max(0, Math.round(parsed.paid_offline_inr ?? 0))
          : parsed.payment_mode === "ONLINE"
          ? 0
          : rawAmt;
        const amt = hasExplicitSplit ? paidOnline + paidOffline : rawAmt;

        const effectiveRate =
          parsed.rate_per_kg && parsed.rate_per_kg > 0
            ? parsed.rate_per_kg
            : kg > 0
            ? Math.round(amt / kg)
            : 0;
        const sellRateEntry: RateLogEntry = {
          id: `sr-${Date.now()}`,
          qtyKg: Math.round(kg * 100) / 100,
          ratePerKg: effectiveRate,
          totalInr: amt,
          onlineInr: paidOnline,
          offlineInr: paidOffline,
          time: nowTime,
        };

        const matchedStock = currentState.stocks.find(
          (s) => s.name.toLowerCase() === veg.name.toLowerCase()
        );
        const avgCostPerKg =
          matchedStock && matchedStock.boughtKg > 0
            ? matchedStock.boughtCostInr / matchedStock.boughtKg
            : 0;
        const saleProfit =
          avgCostPerKg > 0 ? Math.round(amt - kg * avgCostPerKg) : null;

        const rateSuffix =
          parsed.rate_per_kg && parsed.rate_per_kg > 0
            ? ` (@ ₹${parsed.rate_per_kg}/kg)`
            : "";
        const payModeBadge =
          paidOnline > 0 && paidOffline > 0
            ? ` · Online ₹${paidOnline} + Cash ₹${paidOffline}`
            : paidOnline > 0
            ? " · Online (UPI)"
            : " · Cash";
        const profitSuffix =
          saleProfit !== null
            ? ` · Munafa ${saleProfit >= 0 ? "+" : "-"}₹${Math.abs(saleProfit).toLocaleString("en-IN")}`
            : "";

        const kgRounded = Math.round(kg * 100) / 100;
        const itemLabelHindi = veg.hindiName || veg.name;
        const modeHindi =
          paidOnline > 0 && paidOffline > 0
            ? ` (${paidOnline} ऑनलाइन और ${paidOffline} नकद)`
            : paidOnline > 0
            ? " (ऑनलाइन UPI)"
            : "";
        let finalHindiReply = parsed.hindi_reply;
        if (parsed.rate_per_kg && parsed.rate_per_kg > 0) {
          finalHindiReply =
            saleProfit !== null
              ? `${kgRounded} किलो ${itemLabelHindi} ${parsed.rate_per_kg} रुपये प्रति किलो के हिसाब से ${amt} रुपये${modeHindi} में बिका, और इस पर आपका मुनाफा ${saleProfit >= 0 ? `${saleProfit} रुपये` : `माइनस ${Math.abs(saleProfit)} रुपये`} हुआ।`
              : `${kgRounded} किलो ${itemLabelHindi} ${parsed.rate_per_kg} रुपये प्रति किलो के हिसाब से ${amt} रुपये${modeHindi} में बिका।`;
        } else if (saleProfit !== null) {
          finalHindiReply = `${kgRounded} किलो ${itemLabelHindi} ${amt} रुपये${modeHindi} में बिका, और इस पर आपका मुनाफा ${saleProfit >= 0 ? `${saleProfit} रुपये` : `माइनस ${Math.abs(saleProfit)} रुपये`} हुआ।`;
        }

        const activityHeadline = `Bikri · ${veg.name} −${formatKgLabel(kg)}${rateSuffix} · +₹${amt.toLocaleString("en-IN")}${payModeBadge}${profitSuffix}`;

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
                    soldOnlineInr: (s.soldOnlineInr ?? 0) + paidOnline,
                    soldOfflineInr: (s.soldOfflineInr ?? 0) + paidOffline,
                    sellRates: [...(s.sellRates ?? []), sellRateEntry],
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
              soldOnlineInr: paidOnline,
              soldOfflineInr: paidOffline,
              buyRates: [],
              sellRates: [sellRateEntry],
            };
            nextStocks = [...prev.stocks, newItem];
          }

          const activity: ActivityEntry = {
            id: `act-${Date.now()}`,
            intent: "SALE",
            transcript: rawTranscript,
            summaryText: activityHeadline,
            hindiReply: finalHindiReply,
            timestamp: nowTime,
          };

          return {
            ...prev,
            totalBikri: prev.totalBikri + amt,
            totalOnlineBikri: (prev.totalOnlineBikri ?? 0) + paidOnline,
            totalOfflineBikri: (prev.totalOfflineBikri ?? 0) + paidOffline,
            stocks: nextStocks,
            activities: [activity, ...prev.activities].slice(0, 15),
          };
        });

        setActiveTab("stock");
        setUnclearState(null);
        setConfirmation({
          intent: "SALE",
          headline: `${activityHeadline} Sales`,
          hindiReply: finalHindiReply,
        });
        speakHindi(finalHindiReply);
        return;
      }

      if (parsed.intent === "UDHAAR" || parsed.intent === "PAYABLE_ADD") {
        const isPayable = parsed.intent === "PAYABLE_ADD";
        const rawCustomer = parsed.customer_name.trim() || (isPayable ? "Kisan" : "Grahak");
        const amt = Math.max(0, Math.round(parsed.amount_inr));
        const dateTime = activeDt.dateTimeLabel;

        const existingCustomer = currentState.udhaarList.find(
          (u) => u.customerName.toLowerCase() === rawCustomer.toLowerCase()
        );
        const nextBalance = (existingCustomer?.amountInr ?? 0) + amt;

        const tx: UdhaarTransaction = {
          id: `u-tx-${Date.now()}`,
          type: "CREDIT",
          amountInr: amt,
          balanceAfter: nextBalance,
          note: rawTranscript,
          dateTime,
        };

        const targetId =
          existingCustomer?.id ??
          `${rawCustomer.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
        const displayCustomer =
          existingCustomer?.customerName ??
          rawCustomer
            .split(/\s+/)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");

        const nextMobile = parsed.mobile?.trim() || existingCustomer?.mobile || "";
        const nextAddress = parsed.address?.trim() || existingCustomer?.address || "";

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
                    mobile: parsed.mobile?.trim() || u.mobile,
                    address: parsed.address?.trim() || u.address,
                    amountInr: u.amountInr + amt,
                    lastUpdated: nowTime,
                    history: [tx, ...u.history],
                  }
                : u
            );
          } else {
            nextUdhaar = [
              {
                id: targetId,
                customerName: displayCustomer,
                mobile: nextMobile,
                address: nextAddress,
                accountType: isPayable ? "PAYABLE" : "RECEIVABLE",
                amountInr: amt,
                lastUpdated: nowTime,
                history: [tx],
              },
              ...prev.udhaarList,
            ];
          }

          const headline = isPayable
            ? `Payable · ${displayCustomer} +₹${amt.toLocaleString("en-IN")}`
            : `Udhaar · ${displayCustomer} +₹${amt.toLocaleString("en-IN")}`;
          const activity: ActivityEntry = {
            id: `act-${Date.now()}`,
            intent: parsed.intent,
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
        setExpandedUdhaarId(targetId);
        setUnclearState(null);
        const headline = isPayable
          ? `Payable (Dena Hai) · ${displayCustomer} +₹${amt.toLocaleString("en-IN")}`
          : `Udhaar (Lena Hai) · ${displayCustomer} +₹${amt.toLocaleString("en-IN")}`;
        setConfirmation({
          intent: parsed.intent,
          headline,
          hindiReply: parsed.hindi_reply,
        });
        speakHindi(parsed.hindi_reply);
        return;
      }

      if (parsed.intent === "UDHAAR_JAMA" || parsed.intent === "PAYABLE_PAY") {
        const isPayable = parsed.intent === "PAYABLE_PAY";
        const rawCustomer = parsed.customer_name.trim();
        const existingCustomer = currentState.udhaarList.find(
          (u) => u.customerName.toLowerCase() === rawCustomer.toLowerCase()
        );

        if (!existingCustomer) {
          const notFoundReply = `${rawCustomer || "व्यक्ति"} का कोई खाता नहीं मिला।`;
          setActiveTab("udhaar");
          setUnclearState(null);
          setConfirmation({
            intent: parsed.intent,
            headline: `${isPayable ? "Payable" : "Udhaar"} · ${rawCustomer} not found`,
            hindiReply: notFoundReply,
          });
          speakHindi(notFoundReply);
          return;
        }

        const hasExplicitSplit =
          (parsed.paid_online_inr ?? 0) > 0 || (parsed.paid_offline_inr ?? 0) > 0;
        let onlinePaid = 0;
        let offlinePaid = 0;

        if (parsed.full_repayment) {
          const fullAmt = existingCustomer.amountInr;
          if (parsed.payment_mode === "ONLINE") {
            onlinePaid = fullAmt;
          } else {
            offlinePaid = fullAmt;
          }
        } else if (hasExplicitSplit) {
          onlinePaid = Math.max(0, Math.round(parsed.paid_online_inr ?? 0));
          offlinePaid = Math.max(0, Math.round(parsed.paid_offline_inr ?? 0));
        } else {
          const reqAmt = Math.max(0, Math.round(parsed.amount_inr));
          if (parsed.payment_mode === "ONLINE") {
            onlinePaid = reqAmt;
          } else {
            offlinePaid = reqAmt;
          }
        }

        const settledAmt = onlinePaid + offlinePaid;

        if (settledAmt <= 0) {
          const zeroReply = `${existingCustomer.customerName} का पहले से कोई बकाया नहीं है।`;
          setActiveTab("udhaar");
          setExpandedUdhaarId(existingCustomer.id);
          setUnclearState(null);
          setConfirmation({
            intent: parsed.intent,
            headline: `${existingCustomer.customerName} · ₹0 pending`,
            hindiReply: zeroReply,
          });
          speakHindi(zeroReply);
          return;
        }

        const paymentMode: PaymentMode =
          onlinePaid > 0 && offlinePaid > 0
            ? "SPLIT"
            : onlinePaid > 0
            ? "ONLINE"
            : "OFFLINE";
        const newBalance = Math.max(0, existingCustomer.amountInr - settledAmt);
        const dateTime = activeDt.dateTimeLabel;
        const tx: UdhaarTransaction = {
          id: `u-tx-${Date.now()}`,
          type: "REPAYMENT",
          amountInr: settledAmt,
          onlineInr: onlinePaid,
          offlineInr: offlinePaid,
          paymentMode,
          balanceAfter: newBalance,
          note: rawTranscript,
          dateTime,
        };

        const modeHindi =
          paymentMode === "SPLIT"
            ? `${settledAmt} रुपये (${onlinePaid} ऑनलाइन और ${offlinePaid} नकद)`
            : paymentMode === "ONLINE"
            ? `${settledAmt} रुपये ऑनलाइन (UPI)`
            : `${settledAmt} रुपये नकद`;
        const modeTag =
          paymentMode === "SPLIT"
            ? `Online ₹${onlinePaid} + Cash ₹${offlinePaid}`
            : paymentMode === "ONLINE"
            ? "Online UPI"
            : "Cash";

        const isPayableAccount =
          isPayable || existingCustomer.accountType === "PAYABLE";
        const hindiReply = isPayableAccount
          ? newBalance > 0
            ? `जी, ${existingCustomer.customerName} को ${modeHindi} दिए गए, अब आपका बकाया ${newBalance} रुपये है।`
            : `जी, ${existingCustomer.customerName} को ${modeHindi} दिए गए, अब पूरा बकाया चुकता हो गया है।`
          : newBalance > 0
          ? `जी, ${existingCustomer.customerName} के ${modeHindi} जमा हो गए, अब उनका बचा उधार ${newBalance} रुपये है।`
          : `जी, ${existingCustomer.customerName} के ${modeHindi} जमा हो गए, अब उनका पूरा उधार चुकता हो गया है।`;

        const headline = isPayableAccount
          ? `Payable Paid (${modeTag}) · ${existingCustomer.customerName} −₹${settledAmt.toLocaleString("en-IN")} (Baaki ₹${newBalance.toLocaleString("en-IN")})`
          : `Udhaar Jama (${modeTag}) · ${existingCustomer.customerName} −₹${settledAmt.toLocaleString("en-IN")} (Baaki ₹${newBalance.toLocaleString("en-IN")})`;

        const activity: ActivityEntry = {
          id: `act-${Date.now()}`,
          intent: parsed.intent,
          transcript: rawTranscript,
          summaryText: headline,
          hindiReply,
          timestamp: nowTime,
        };

        setState((prev) => ({
          ...prev,
          totalBikri: isPayableAccount ? prev.totalBikri : prev.totalBikri + settledAmt,
          totalOnlineBikri: isPayableAccount
            ? prev.totalOnlineBikri
            : (prev.totalOnlineBikri ?? 0) + onlinePaid,
          totalOfflineBikri: isPayableAccount
            ? prev.totalOfflineBikri
            : (prev.totalOfflineBikri ?? 0) + offlinePaid,
          udhaarList: prev.udhaarList.map((u) =>
            u.id === existingCustomer.id
              ? {
                  ...u,
                  amountInr: newBalance,
                  totalPaidOnlineInr: (u.totalPaidOnlineInr ?? 0) + onlinePaid,
                  totalPaidOfflineInr: (u.totalPaidOfflineInr ?? 0) + offlinePaid,
                  lastUpdated: nowTime,
                  history: [tx, ...u.history],
                }
              : u
          ),
          activities: [activity, ...prev.activities].slice(0, 15),
        }));

        setActiveTab("udhaar");
        setExpandedUdhaarId(existingCustomer.id);
        setUnclearState(null);
        setConfirmation({
          intent: parsed.intent,
          headline,
          hindiReply,
        });
        speakHindi(hindiReply);
        return;
      }

      if (parsed.intent === "UDHAAR_HISAB") {
        const rawCustomer = parsed.customer_name.trim();
        setActiveTab("udhaar");
        setUnclearState(null);

        if (rawCustomer) {
          const entry = currentState.udhaarList.find(
            (u) => u.customerName.toLowerCase() === rawCustomer.toLowerCase()
          );

          if (!entry) {
            const reply = `${rawCustomer} का कोई खाता दर्ज नहीं है।`;
            setConfirmation({
              intent: "UDHAAR_HISAB",
              headline: `${rawCustomer} · No ledger account`,
              hindiReply: reply,
            });
            speakHindi(reply);
            return;
          }

          setExpandedUdhaarId(entry.id);
          const reply =
            entry.amountInr > 0
              ? `${entry.customerName} का कुल ${entry.amountInr} रुपये ${entry.accountType === "PAYABLE" ? "देना" : "उधार"} बाकी है। खाते में ${entry.history.length} लेन-देन दर्ज हैं।`
              : `${entry.customerName} का कोई बाकी नहीं है, उनका हिसाब चुकता है।`;
          const headline = `${entry.customerName} Hisab · Baaki ₹${entry.amountInr.toLocaleString("en-IN")} (${entry.history.length} entries)`;

          const hisabActivity: ActivityEntry = {
            id: `act-${Date.now()}`,
            intent: "UDHAAR_HISAB",
            transcript: rawTranscript,
            summaryText: headline,
            hindiReply: reply,
            timestamp: nowTime,
          };

          setState((prev) => ({
            ...prev,
            activities: [hisabActivity, ...prev.activities].slice(0, 15),
          }));
          setConfirmation({
            intent: "UDHAAR_HISAB",
            headline,
            hindiReply: reply,
          });
          speakHindi(reply);
          return;
        }

        const totalReceivable = currentState.udhaarList
          .filter((u) => u.accountType !== "PAYABLE")
          .reduce((acc, u) => acc + u.amountInr, 0);
        const totalPayable = currentState.udhaarList
          .filter((u) => u.accountType === "PAYABLE")
          .reduce((acc, u) => acc + u.amountInr, 0);
        const pendingCount = currentState.udhaarList.filter(
          (u) => u.amountInr > 0
        ).length;
        const reply = `कुल ${pendingCount} खातों में ${totalReceivable} रुपये लेना बाकी है और ${totalPayable} रुपये देना बाकी है।`;
        const headline = `Ledger · Lena ₹${totalReceivable.toLocaleString("en-IN")} · Dena ₹${totalPayable.toLocaleString("en-IN")}`;

        setConfirmation({
          intent: "UDHAAR_HISAB",
          headline,
          hindiReply: reply,
        });
        speakHindi(reply);
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
          udhaarPeople: state.udhaarList.map((u) => ({
            name: u.customerName,
            accountType: u.accountType,
          })),
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
  }) => {
    let hindiReply = "";
    if (resolved.intent === "PURCHASE") {
      hindiReply = `जी, ${resolved.quantity_kg} किलो ${resolved.item} ${resolved.amount_inr} रुपये में खरीद दर्ज कर दी गई है।`;
    } else if (resolved.intent === "SALE") {
      hindiReply = `जी, ${resolved.quantity_kg} किलो ${resolved.item} ${resolved.amount_inr} रुपये में बिक्री दर्ज कर दी गई है।`;
    } else if (resolved.intent === "UDHAAR_JAMA") {
      hindiReply = `जी, ${resolved.customer_name} के ${resolved.amount_inr} रुपये जमा किए जा रहे हैं।`;
    } else if (resolved.intent === "PAYABLE_ADD") {
      hindiReply = `जी, ${resolved.customer_name} को ${resolved.amount_inr} रुपये देनदारी में लिख दिए हैं।`;
    } else if (resolved.intent === "PAYABLE_PAY") {
      hindiReply = `जी, ${resolved.customer_name} को ${resolved.amount_inr} रुपये का भुगतान दर्ज किया जा रहा है।`;
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

  const handleReceiveUdhaarPayment = (
    id: string,
    payment: { onlineInr: number; offlineInr: number }
  ) => {
    const entry = state.udhaarList.find((u) => u.id === id);
    if (!entry) return;

    const onlineInr = Math.max(0, Math.round(payment.onlineInr));
    const offlineInr = Math.max(0, Math.round(payment.offlineInr));
    const totalAmt = onlineInr + offlineInr;
    if (totalAmt <= 0) return;

    const isPayable = entry.accountType === "PAYABLE";
    const paymentMode: PaymentMode =
      onlineInr > 0 && offlineInr > 0
        ? "SPLIT"
        : onlineInr > 0
        ? "ONLINE"
        : "OFFLINE";
    const modeDesc =
      paymentMode === "SPLIT"
        ? `${onlineInr} online aur ${offlineInr} offline`
        : paymentMode === "ONLINE"
        ? `${onlineInr} online`
        : `${offlineInr} offline`;

    applyParsedTransaction(
      {
        intent: isPayable ? "PAYABLE_PAY" : "UDHAAR_JAMA",
        item: "",
        quantity_kg: 0,
        amount_inr: totalAmt,
        paid_online_inr: onlineInr,
        paid_offline_inr: offlineInr,
        payment_mode: paymentMode,
        customer_name: entry.customerName,
        hindi_reply: "",
      },
      isPayable
        ? `${entry.customerName} ko ${modeDesc} diye`
        : `${entry.customerName} ne ${modeDesc} jama kiye`,
      state
    );
  };

  const handleAddPerson = (person: {
    name: string;
    mobile: string;
    address: string;
    accountType: LedgerAccountType;
    openingAmountInr: number;
  }) => {
    const activeDt = getActiveBusinessDateTime(state.shopProfile);
    const nowTime =
      state.shopProfile?.useLiveClock === false
        ? activeDt.dateTimeLabel
        : activeDt.timeLabel;
    const dateTime = activeDt.dateTimeLabel;
    const newId = `${person.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    const displayName = person.name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    const history: UdhaarTransaction[] =
      person.openingAmountInr > 0
        ? [
            {
              id: `u-tx-${Date.now()}`,
              type: "CREDIT",
              amountInr: person.openingAmountInr,
              balanceAfter: person.openingAmountInr,
              note:
                person.accountType === "PAYABLE"
                  ? "Opening payable added"
                  : "Opening udhaar added",
              dateTime,
            },
          ]
        : [];

    const newEntry: UdhaarEntry = {
      id: newId,
      customerName: displayName,
      mobile: person.mobile,
      address: person.address,
      accountType: person.accountType,
      amountInr: person.openingAmountInr,
      totalPaidOnlineInr: 0,
      totalPaidOfflineInr: 0,
      lastUpdated: nowTime,
      history,
    };

    const reply =
      person.openingAmountInr > 0
        ? `जी, ${displayName} का खाता ${person.openingAmountInr} रुपये के साथ जोड़ दिया गया है।`
        : `जी, ${displayName} का खाता जोड़ दिया गया है।`;

    const activity: ActivityEntry = {
      id: `act-${Date.now()}`,
      intent: person.accountType === "PAYABLE" ? "PAYABLE_ADD" : "UDHAAR",
      transcript: `Added profile: ${displayName}`,
      summaryText: `${person.accountType === "PAYABLE" ? "Payable" : "Udhaar"} Profile · ${displayName} (₹${person.openingAmountInr.toLocaleString("en-IN")})`,
      hindiReply: reply,
      timestamp: nowTime,
    };

    setState((prev) => ({
      ...prev,
      udhaarList: [newEntry, ...prev.udhaarList],
      activities: [activity, ...prev.activities].slice(0, 15),
    }));
    setActiveTab("udhaar");
    setExpandedUdhaarId(newId);
    setConfirmation({
      intent: person.accountType === "PAYABLE" ? "PAYABLE_ADD" : "UDHAAR",
      headline: `Added ${displayName} · ₹${person.openingAmountInr.toLocaleString("en-IN")}`,
      hindiReply: reply,
    });
  };

  const handleUpdatePersonProfile = (
    id: string,
    updates: { mobile: string; address: string }
  ) => {
    setState((prev) => ({
      ...prev,
      udhaarList: prev.udhaarList.map((u) =>
        u.id === id
          ? {
              ...u,
              mobile: updates.mobile,
              address: updates.address,
            }
          : u
      ),
    }));
  };

  const handleSaveTodayClosing = () => {
    const activeDt = getActiveBusinessDateTime(state.shopProfile);
    const todayIso = activeDt.isoDate;
    const displayDate = activeDt.displayDate;
    const nowTime = activeDt.timeLabel;
    const netProfit = state.totalBikri - state.totalKharid;

    const soldStocks = state.stocks.filter((s) => s.soldKg > 0 || s.soldRevenueInr > 0);
    const topItem =
      soldStocks.length > 0
        ? [...soldStocks].sort((a, b) => b.soldRevenueInr - a.soldRevenueInr)[0]
        : null;
    const topSoldVegetable = topItem
      ? `${topItem.name} (${Math.round(topItem.soldKg * 100) / 100} kg)`
      : "No sales yet";

    const itemsSnapshot: DailyHistoryItemSnapshot[] = state.stocks
      .filter((s) => s.soldKg > 0 || s.boughtKg > 0)
      .map((s) => {
        const avgBuyRate =
          s.boughtKg > 0 ? Math.round(s.boughtCostInr / s.boughtKg) : 0;
        const costOfSold =
          s.boughtKg > 0 ? (s.soldKg * s.boughtCostInr) / s.boughtKg : 0;
        const profitInr = Math.round(s.soldRevenueInr - costOfSold);
        const sellRatesSummary =
          s.sellRates && s.sellRates.length > 0
            ? s.sellRates
                .map(
                  (r) =>
                    `₹${r.ratePerKg}/kg (${Math.round(r.qtyKg * 100) / 100}kg)`
                )
                .join(", ")
            : "—";
        return {
          name: s.name,
          soldKg: Math.round(s.soldKg * 100) / 100,
          avgBuyRate,
          sellRatesSummary,
          salesInr: s.soldRevenueInr,
          profitInr,
        };
      });

    const record: DailyHistoryRecord = {
      id: `day-${todayIso}`,
      date: todayIso,
      displayDate,
      totalKharid: state.totalKharid,
      totalBikri: state.totalBikri,
      netProfit,
      topSoldVegetable,
      savedAt: nowTime,
      items: itemsSnapshot,
    };

    const profitPhrase =
      netProfit >= 0
        ? `कुल नेट मुनाफा ${netProfit} रुपये`
        : `कुल अंतर माइनस ${Math.abs(netProfit)} रुपये`;
    const hindiReply = `आज (${displayDate}) का क्लोजिंग हिसाब सेव हो गया है। कुल बिक्री ${state.totalBikri} रुपये, खरीद ${state.totalKharid} रुपये, और ${profitPhrase} रहा।`;
    const headline = `Closing Saved (${displayDate}) · Bikri ₹${state.totalBikri.toLocaleString("en-IN")} · Net ${netProfit >= 0 ? "+" : "-"}₹${Math.abs(netProfit).toLocaleString("en-IN")}`;

    const activity: ActivityEntry = {
      id: `act-${Date.now()}`,
      intent: "SUMMARY",
      transcript: "Save Today's Closing Report",
      summaryText: headline,
      hindiReply,
      timestamp: nowTime,
    };

    setState((prev) => {
      const remaining = (prev.dailyHistory ?? []).filter(
        (d) => d.date !== todayIso
      );
      return {
        ...prev,
        dailyHistory: [record, ...remaining].sort((a, b) =>
          b.date.localeCompare(a.date)
        ),
        activities: [activity, ...prev.activities].slice(0, 15),
      };
    });

    setConfirmation({
      intent: "SUMMARY",
      headline,
      hindiReply,
    });
    speakHindi(hindiReply);
  };

  const handleCreateManualBill = (payload: {
    buyerName: string;
    lines: ParsedMultiOrderLine[];
    paymentMode: "OFFLINE" | "ONLINE" | "UDHAAR" | "SPLIT";
    paidOnlineInr?: number;
    paidOfflineInr?: number;
  }) => {
    const isUdhaar = payload.paymentMode === "UDHAAR";
    const modeLabel =
      payload.paymentMode === "SPLIT"
        ? `${payload.paidOnlineInr ?? 0} online aur ${payload.paidOfflineInr ?? 0} offline `
        : payload.paymentMode === "ONLINE"
        ? "online "
        : isUdhaar
        ? "udhaar "
        : "offline ";
    const summaryTranscript = `${payload.buyerName} ko ${payload.lines
      .map((l) => `${l.quantity_kg} kilo ${l.item}`)
      .join(" ")} ${modeLabel}bika`;
    applyParsedTransaction(
      {
        intent: "MULTI_SALE",
        item: payload.lines[0]?.item || "",
        quantity_kg: payload.lines.reduce((a, l) => a + l.quantity_kg, 0),
        amount_inr: 0,
        customer_name: payload.buyerName,
        multi_items: payload.lines,
        is_udhaar: isUdhaar,
        payment_mode:
          payload.paymentMode === "SPLIT"
            ? "SPLIT"
            : payload.paymentMode === "ONLINE"
            ? "ONLINE"
            : "OFFLINE",
        ...(payload.paymentMode === "SPLIT"
          ? {
              paid_online_inr: Math.max(0, Math.round(payload.paidOnlineInr ?? 0)),
              paid_offline_inr: Math.max(0, Math.round(payload.paidOfflineInr ?? 0)),
            }
          : {}),
        hindi_reply: "",
      },
      summaryTranscript,
      state
    );
  };

  const handleRecordBillPayment = (
    billId: string,
    payment: { onlineInr: number; offlineInr: number }
  ) => {
    const targetBill = (state.customerBills ?? []).find((b) => b.id === billId);
    const onlineInr = Math.max(0, Math.round(payment.onlineInr));
    const offlineInr = Math.max(0, Math.round(payment.offlineInr));
    const addedPaid = onlineInr + offlineInr;
    if (!targetBill || addedPaid <= 0) return;

    const activeDt = getActiveBusinessDateTime(state.shopProfile);
    const nowTime =
      state.shopProfile?.useLiveClock === false
        ? activeDt.dateTimeLabel
        : activeDt.timeLabel;
    const dateTime = activeDt.dateTimeLabel;

    const nextPaidOnline = (targetBill.paidOnlineInr ?? 0) + onlineInr;
    const nextPaidOffline = (targetBill.paidOfflineInr ?? 0) + offlineInr;
    const nextPending = Math.max(
      0,
      targetBill.totalBillInr - nextPaidOnline - nextPaidOffline
    );
    const nextStatus: CustomerBill["paymentStatus"] =
      nextPending === 0
        ? nextPaidOnline > 0 && nextPaidOffline === 0
          ? "PAID_ONLINE"
          : "PAID_CASH"
        : "PARTIAL_PAID";

    const payMode: PaymentMode =
      onlineInr > 0 && offlineInr > 0
        ? "SPLIT"
        : onlineInr > 0
        ? "ONLINE"
        : "OFFLINE";
    const modeTag =
      payMode === "SPLIT"
        ? `Online ₹${onlineInr} + Cash ₹${offlineInr}`
        : payMode === "ONLINE"
        ? "Online UPI"
        : "Cash";
    const modeHindi =
      payMode === "SPLIT"
        ? `${onlineInr} रुपये ऑनलाइन और ${offlineInr} रुपये नकद`
        : payMode === "ONLINE"
        ? `${onlineInr} रुपये ऑनलाइन (UPI)`
        : `${offlineInr} रुपये नकद`;

    const hindiReply =
      nextPending > 0
        ? `जी, ${targetBill.buyerName} के बिल ${targetBill.billNumber} में ${modeHindi} जमा हो गए हैं। अब बाकी बकाया ${nextPending} रुपये है।`
        : `जी, ${targetBill.buyerName} के बिल ${targetBill.billNumber} के ${modeHindi} जमा हो गए हैं, पूरा बिल चुकता हो गया है।`;
    const headline = `${targetBill.billNumber} Paid (${modeTag}) · ${targetBill.buyerName} +₹${addedPaid.toLocaleString("en-IN")}`;
    const activity: ActivityEntry = {
      id: `act-${Date.now()}`,
      intent: "UDHAAR_JAMA",
      transcript: `Bill ${targetBill.billNumber} payment (${modeTag})`,
      summaryText: headline,
      hindiReply,
      timestamp: nowTime,
    };

    setState((prev) => {
      const updatedStocks = [...prev.stocks];
      const billTotal = targetBill.totalBillInr;
      if (billTotal > 0 && targetBill.items.length > 0) {
        let remOnline = onlineInr;
        let remOffline = offlineInr;
        targetBill.items.forEach((bi, idx) => {
          const isLast = idx === targetBill.items.length - 1;
          const itemOnline = isLast
            ? remOnline
            : Math.min(remOnline, Math.round((bi.subtotalInr / billTotal) * onlineInr));
          const itemOffline = isLast
            ? remOffline
            : Math.min(remOffline, Math.round((bi.subtotalInr / billTotal) * offlineInr));
          remOnline = Math.max(0, remOnline - itemOnline);
          remOffline = Math.max(0, remOffline - itemOffline);

          const stockIdx = updatedStocks.findIndex(
            (s) => s.name.toLowerCase() === bi.item.toLowerCase()
          );
          if (stockIdx >= 0) {
            const s = updatedStocks[stockIdx];
            updatedStocks[stockIdx] = {
              ...s,
              soldOnlineInr: (s.soldOnlineInr ?? 0) + itemOnline,
              soldOfflineInr: (s.soldOfflineInr ?? 0) + itemOffline,
            };
          }
        });
      }

      return {
        ...prev,
        totalBikri: prev.totalBikri + addedPaid,
        totalOnlineBikri: (prev.totalOnlineBikri ?? 0) + onlineInr,
        totalOfflineBikri: (prev.totalOfflineBikri ?? 0) + offlineInr,
        stocks: updatedStocks,
        customerBills: (prev.customerBills ?? []).map((b) =>
          b.id === billId
            ? {
                ...b,
                paidOnlineInr: nextPaidOnline,
                paidOfflineInr: nextPaidOffline,
                pendingBalanceInr: nextPending,
                paymentStatus: nextStatus,
              }
            : b
        ),
        udhaarList: prev.udhaarList.map((u) => {
          if (
            u.customerName.toLowerCase() !== targetBill.buyerName.toLowerCase() ||
            u.accountType === "PAYABLE"
          ) {
            return u;
          }
          const nextBal = Math.max(0, u.amountInr - addedPaid);
          const tx: UdhaarTransaction = {
            id: `u-tx-${Date.now()}`,
            type: "REPAYMENT",
            amountInr: addedPaid,
            onlineInr,
            offlineInr,
            paymentMode: payMode,
            balanceAfter: nextBal,
            note: `Paid ${targetBill.billNumber} (${modeTag})`,
            dateTime,
          };
          return {
            ...u,
            amountInr: nextBal,
            totalPaidOnlineInr: (u.totalPaidOnlineInr ?? 0) + onlineInr,
            totalPaidOfflineInr: (u.totalPaidOfflineInr ?? 0) + offlineInr,
            lastUpdated: nowTime,
            history: [tx, ...u.history],
          };
        }),
        activities: [activity, ...prev.activities].slice(0, 15),
      };
    });

    setConfirmation({
      intent: "UDHAAR_JAMA",
      headline,
      hindiReply,
    });
    speakHindi(hindiReply);
  };

  const handleSaveShopProfile = (nextProfile: ShopProfile) => {
    setState((prev) => ({
      ...prev,
      shopProfile: nextProfile,
    }));
    const activeDt = getActiveBusinessDateTime(nextProfile);
    const dateInfo = nextProfile.useLiveClock
      ? "Live Clock"
      : `${activeDt.displayDate} · ${activeDt.timeLabel}`;
    setConfirmation({
      intent: "SUMMARY",
      headline: `Shop Setup Saved · ${nextProfile.shopName} (${dateInfo})`,
      hindiReply: `जी, दुकान का नाम ${nextProfile.shopName} और तारीख सेटअप सेव हो गया है।`,
    });
  };

  const handleStartFresh = () => {
    recognitionRef.current?.abort();
    stopSpeaking();
    setIsListening(false);
    setIsProcessing(false);
    setLiveTranscript("");
    setErrorMsg(null);
    setUnclearState(null);
    setActiveTab("stock");
    setExpandedUdhaarId(null);
    const fresh = createEmptyFreshState(state.shopProfile);
    setState(fresh);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      // Ignore storage errors
    }
    setConfirmation({
      intent: "SUMMARY",
      headline: `Fresh Khata Started · ₹0 (${fresh.shopProfile.shopName})`,
      hindiReply:
        "नया खाता ₹0 से शुरू हो गया है। अब आप अपनी असली खरीद, बिक्री और उधार दर्ज कर सकते हैं।",
    });
  };

  const handleLoadDemoData = () => {
    recognitionRef.current?.abort();
    stopSpeaking();
    setIsListening(false);
    setIsProcessing(false);
    setLiveTranscript("");
    setErrorMsg(null);
    setUnclearState(null);
    setActiveTab("stock");
    setExpandedUdhaarId("sunita-ji");
    const demo = createDefaultState(state.shopProfile);
    setState(demo);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
    } catch {
      // Ignore storage errors
    }
    setConfirmation({
      intent: "SUMMARY",
      headline: `Demo Data Loaded (${demo.shopProfile.shopName})`,
      hindiReply: "डेमो डेटा फिर से लोड हो गया है।",
    });
  };

  const handleResetDemo = () => {
    handleLoadDemoData();
  };

  const activeShopName = state.shopProfile?.shopName?.trim() || "MandiBol";
  const activeHeaderDt = getActiveBusinessDateTime(state.shopProfile);
  const isCustomClock = state.shopProfile?.useLiveClock === false;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28 sm:pb-24">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Sprout className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2 min-w-0">
                <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-slate-900 truncate">
                  {activeShopName}
                </h1>
                <span className="hidden md:inline text-xs font-bold text-slate-500 whitespace-nowrap">
                  MandiBol · Sabzi Hisaab
                </span>
              </div>
              {isCustomClock && (
                <p className="font-mono-num text-[11px] font-bold text-amber-800 truncate">
                  Custom Date: {activeHeaderDt.displayDate} · {activeHeaderDt.timeLabel}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowShopSetup(true)}
              className="min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:scale-[0.98] border border-emerald-200 text-emerald-950 text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Settings className="w-4 h-4 text-emerald-700" />
              <span>Shop Setup</span>
            </button>

            <button
              type="button"
              onClick={handleResetDemo}
              className="min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset Demo</span>
              <span className="sm:hidden">Reset</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-48 space-y-4 sm:space-y-5">
        {/* Top Summary Bar */}
        <SummaryCards
          totalKharid={state.totalKharid}
          totalBikri={state.totalBikri}
          totalOnlineBikri={state.totalOnlineBikri ?? 0}
          totalOfflineBikri={state.totalOfflineBikri ?? state.totalBikri}
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
            {/* Four Main Tabs */}
            <div
              role="tablist"
              aria-label="Inventory, Credit, Bills, and Reports Tabs"
              className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 bg-slate-200/80 rounded-2xl"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "stock"}
                onClick={() => setActiveTab("stock")}
                className={`min-h-[44px] px-2.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === "stock"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                <Sprout className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Stock ({state.stocks.length})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "udhaar"}
                onClick={() => setActiveTab("udhaar")}
                className={`min-h-[44px] px-2.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === "udhaar"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                <Users className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Udhaar ({state.udhaarList.length})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "bills"}
                onClick={() => setActiveTab("bills")}
                className={`min-h-[44px] px-2.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === "bills"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                <Receipt className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Bills ({(state.customerBills ?? []).length})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "reports"}
                onClick={() => setActiveTab("reports")}
                className={`min-h-[44px] px-2.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === "reports"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                <BarChart3 className="w-4 h-4 text-blue-700 shrink-0" />
                <span>Reports · रिपोर्ट</span>
              </button>
            </div>

            {activeTab === "stock" ? (
              <StockList stocks={state.stocks} />
            ) : activeTab === "udhaar" ? (
              <UdhaarList
                udhaarList={state.udhaarList}
                expandedId={expandedUdhaarId}
                shopProfile={state.shopProfile}
                onToggleExpand={(id) =>
                  setExpandedUdhaarId((prev) => (prev === id ? null : id))
                }
                onReceivePayment={handleReceiveUdhaarPayment}
                onAddPerson={handleAddPerson}
                onUpdatePersonProfile={handleUpdatePersonProfile}
              />
            ) : activeTab === "bills" ? (
              <CustomerBillsList
                bills={state.customerBills ?? []}
                stocks={state.stocks}
                udhaarList={state.udhaarList}
                shopProfile={state.shopProfile}
                onCreateBill={handleCreateManualBill}
                onRecordBillPayment={handleRecordBillPayment}
              />
            ) : (
              <ReportsTab
                state={state}
                onSaveTodayClosing={handleSaveTodayClosing}
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

            {state.activities.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-bold text-slate-700">
                  Abhi koi sauda darj nahi hai
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Neeche mic dabayein ya type karein: &ldquo;10 kilo tamatar 200 rupaye mein kharida&rdquo;
                </p>
              </div>
            ) : (
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
            )}
          </aside>
        </div>
      </main>

      {/* Shop Setup & Start Fresh Modal */}
      <ShopSetupModal
        isOpen={showShopSetup}
        shopProfile={state.shopProfile}
        onClose={() => setShowShopSetup(false)}
        onSaveProfile={handleSaveShopProfile}
        onStartFresh={handleStartFresh}
        onLoadDemoData={handleLoadDemoData}
      />

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
