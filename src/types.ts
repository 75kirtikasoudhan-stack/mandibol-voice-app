export type VoiceIntent =
  | "PURCHASE"
  | "SALE"
  | "MULTI_SALE"
  | "UDHAAR"
  | "UDHAAR_JAMA"
  | "UDHAAR_HISAB"
  | "PAYABLE_ADD"
  | "PAYABLE_PAY"
  | "SUMMARY"
  | "UNCLEAR";

export type PaymentMode = "ONLINE" | "OFFLINE" | "SPLIT";

export interface RateLogEntry {
  id: string;
  qtyKg: number;
  ratePerKg: number;
  totalInr: number;
  onlineInr?: number;
  offlineInr?: number;
  time: string;
}

export interface StockItem {
  id: string;
  name: string;
  hindiName: string;
  englishName: string;
  remainingKg: number;
  boughtKg: number;
  boughtCostInr: number;
  soldKg: number;
  soldRevenueInr: number;
  soldOnlineInr?: number;
  soldOfflineInr?: number;
  buyRates: RateLogEntry[];
  sellRates: RateLogEntry[];
}

export type LedgerAccountType = "RECEIVABLE" | "PAYABLE";

export interface UdhaarTransaction {
  id: string;
  type: "CREDIT" | "REPAYMENT";
  amountInr: number;
  onlineInr?: number;
  offlineInr?: number;
  paymentMode?: PaymentMode;
  balanceAfter: number;
  note: string;
  dateTime: string;
}

export interface UdhaarEntry {
  id: string;
  customerName: string;
  mobile: string;
  address: string;
  accountType: LedgerAccountType;
  amountInr: number;
  totalPaidOnlineInr?: number;
  totalPaidOfflineInr?: number;
  lastUpdated: string;
  history: UdhaarTransaction[];
}

export interface MultiOrderItem {
  item: string;
  hindiName?: string;
  qtyKg: number;
  sellRatePerKg: number;
  subtotalInr: number;
  costRatePerKg: number;
  costTotalInr: number;
  profitInr: number;
}

export interface CustomerBill {
  id: string;
  billNumber: string;
  buyerName: string;
  dateTime: string;
  isoDate: string;
  items: MultiOrderItem[];
  totalCostInr: number;
  totalBillInr: number;
  netProfitInr: number;
  paidOnlineInr: number;
  paidOfflineInr: number;
  pendingBalanceInr: number;
  paymentStatus: "PAID_CASH" | "PAID_ONLINE" | "PARTIAL_PAID" | "UDHAAR_PENDING";
}

export interface MonthlyComparisonPoint {
  month: string;
  shortLabel: string;
  salesInr: number;
  profitInr: number;
  isCurrent?: boolean;
}

export interface ActivityEntry {
  id: string;
  intent: VoiceIntent;
  transcript: string;
  summaryText: string;
  hindiReply: string;
  timestamp: string;
}

export interface ParsedMultiOrderLine {
  item: string;
  quantity_kg: number;
  rate_per_kg?: number;
  amount_inr?: number;
}

export interface ParsedVoiceCommand {
  intent: VoiceIntent;
  suggested_intent?:
    | "PURCHASE"
    | "SALE"
    | "UDHAAR"
    | "UDHAAR_JAMA"
    | "PAYABLE_ADD"
    | "PAYABLE_PAY";
  item: string;
  quantity_kg: number;
  rate_per_kg?: number;
  amount_inr: number;
  customer_name: string;
  mobile?: string;
  address?: string;
  full_repayment?: boolean;
  multi_items?: ParsedMultiOrderLine[];
  is_udhaar?: boolean;
  paid_online_inr?: number;
  paid_offline_inr?: number;
  payment_mode?: PaymentMode;
  hindi_reply: string;
}

export interface DailyHistoryItemSnapshot {
  name: string;
  soldKg: number;
  avgBuyRate: number;
  sellRatesSummary: string;
  salesInr: number;
  profitInr: number;
}

export interface DailyHistoryRecord {
  id: string;
  date: string; // YYYY-MM-DD
  displayDate: string;
  totalKharid: number;
  totalBikri: number;
  netProfit: number;
  topSoldVegetable: string;
  savedAt: string;
  items?: DailyHistoryItemSnapshot[];
}

export interface ShopProfile {
  shopName: string;
  vendorName: string;
  vendorMobile: string;
  useLiveClock: boolean;
  customDate: string; // YYYY-MM-DD
  customTime: string; // HH:mm
}

export interface MandiState {
  totalKharid: number;
  totalBikri: number;
  totalOnlineBikri: number;
  totalOfflineBikri: number;
  stocks: StockItem[];
  udhaarList: UdhaarEntry[];
  activities: ActivityEntry[];
  dailyHistory: DailyHistoryRecord[];
  customerBills: CustomerBill[];
  shopProfile: ShopProfile;
}
