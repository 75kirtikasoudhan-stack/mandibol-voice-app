export type VoiceIntent = "PURCHASE" | "SALE" | "UDHAAR" | "SUMMARY" | "UNCLEAR";

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
}

export interface UdhaarEntry {
  id: string;
  customerName: string;
  amountInr: number;
  lastUpdated: string;
}

export interface ActivityEntry {
  id: string;
  intent: VoiceIntent;
  transcript: string;
  summaryText: string;
  hindiReply: string;
  timestamp: string;
}

export interface ParsedVoiceCommand {
  intent: VoiceIntent;
  suggested_intent?: "PURCHASE" | "SALE" | "UDHAAR";
  item: string;
  quantity_kg: number;
  amount_inr: number;
  customer_name: string;
  hindi_reply: string;
}

export interface MandiState {
  totalKharid: number;
  totalBikri: number;
  stocks: StockItem[];
  udhaarList: UdhaarEntry[];
  activities: ActivityEntry[];
}
