import type { MandiState } from "../types";

export const VEGETABLE_CATALOG: Record<string, { hindiName: string; englishName: string }> = {
  Tamatar: { hindiName: "टमाटर", englishName: "Tomato" },
  Aaloo: { hindiName: "आलू", englishName: "Potato" },
  Pyaaz: { hindiName: "प्याज़", englishName: "Onion" },
  Bhindi: { hindiName: "भिंडी", englishName: "Okra / Ladyfinger" },
  Gobhi: { hindiName: "गोभी", englishName: "Cauliflower" },
  Palak: { hindiName: "पालक", englishName: "Spinach" },
  Mirch: { hindiName: "हरी मिर्च", englishName: "Green Chilli" },
  Dhaniya: { hindiName: "धनिया", englishName: "Coriander" },
  Baingan: { hindiName: "बैंगन", englishName: "Brinjal" },
  Matar: { hindiName: "मटर", englishName: "Green Peas" },
  Gajar: { hindiName: "गाजर", englishName: "Carrot" },
  Lauki: { hindiName: "लौकी", englishName: "Bottle Gourd" },
  Kheera: { hindiName: "खीरा", englishName: "Cucumber" },
  Nimbu: { hindiName: "नींबू", englishName: "Lemon" },
  Adrak: { hindiName: "अदरक", englishName: "Ginger" },
};

export const JUDGE_DEMO_COMMANDS: string[] = [
  "Subah 10 kilo bhindi 300 rupaye mein kharida",
  "2 kilo tamatar 60 rupaye mein bika",
  "Aadha kilo pyaaz 20 rupaye bika",
  "Sunita ji ke 50 rupaye udhaar likho",
  "Aaj ka total munafa aur bacha maal batao",
];

export const INITIAL_MANDI_STATE: MandiState = {
  // Morning totals: Bought 20kg Tamatar (₹400) + 30kg Aaloo (₹450) + 15kg Pyaaz (₹300) = ₹1,150
  // Morning sales so far: 2kg Tamatar (₹70) + 5kg Aaloo (₹150) = ₹220
  totalKharid: 1150,
  totalBikri: 220,
  stocks: [
    {
      id: "tamatar",
      name: "Tamatar",
      hindiName: "टमाटर",
      englishName: "Tomato",
      remainingKg: 18,
      boughtKg: 20,
      boughtCostInr: 400,
      soldKg: 2,
      soldRevenueInr: 70,
    },
    {
      id: "aaloo",
      name: "Aaloo",
      hindiName: "आलू",
      englishName: "Potato",
      remainingKg: 25,
      boughtKg: 30,
      boughtCostInr: 450,
      soldKg: 5,
      soldRevenueInr: 150,
    },
    {
      id: "pyaaz",
      name: "Pyaaz",
      hindiName: "प्याज़",
      englishName: "Onion",
      remainingKg: 15,
      boughtKg: 15,
      boughtCostInr: 300,
      soldKg: 0,
      soldRevenueInr: 0,
    },
  ],
  udhaarList: [
    {
      id: "sunita-ji",
      customerName: "Sunita Ji",
      amountInr: 80,
      lastUpdated: "9:15 AM",
    },
    {
      id: "ramesh-bhai",
      customerName: "Ramesh Bhai",
      amountInr: 120,
      lastUpdated: "9:40 AM",
    },
  ],
  activities: [
    {
      id: "init-1",
      intent: "PURCHASE",
      transcript: "Subah mandi kharid: Tamatar, Aaloo, Pyaaz",
      summaryText: "Morning Mandi Stock Loaded (₹1,150)",
      hindiReply: "Subah ka mandi stock darj hai.",
      timestamp: "7:30 AM",
    },
    {
      id: "init-2",
      intent: "SALE",
      transcript: "Subah ki bikri: 2 kg Tamatar, 5 kg Aaloo",
      summaryText: "Morning Sales · +₹220",
      hindiReply: "Subah ki bikri darj hai.",
      timestamp: "9:30 AM",
    },
  ],
};

export function createDefaultState(): MandiState {
  return JSON.parse(JSON.stringify(INITIAL_MANDI_STATE)) as MandiState;
}
