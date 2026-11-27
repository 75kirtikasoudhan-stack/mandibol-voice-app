import type {
  CustomerBill,
  DailyHistoryRecord,
  MandiState,
  MonthlyComparisonPoint,
  ShopProfile,
} from "../types";

export const VEGETABLE_CATALOG: Record<
  string,
  {
    hindiName: string;
    englishName: string;
    defaultBuyRate: number;
    defaultSellRate: number;
  }
> = {
  Tamatar: { hindiName: "टमाटर", englishName: "Tomato", defaultBuyRate: 20, defaultSellRate: 35 },
  Aaloo: { hindiName: "आलू", englishName: "Potato", defaultBuyRate: 15, defaultSellRate: 30 },
  Pyaaz: { hindiName: "प्याज़", englishName: "Onion", defaultBuyRate: 20, defaultSellRate: 32 },
  Bhindi: { hindiName: "भिंडी", englishName: "Okra / Ladyfinger", defaultBuyRate: 28, defaultSellRate: 40 },
  Gobhi: { hindiName: "गोभी", englishName: "Cauliflower", defaultBuyRate: 20, defaultSellRate: 32 },
  Palak: { hindiName: "पालक", englishName: "Spinach", defaultBuyRate: 15, defaultSellRate: 25 },
  Mirch: { hindiName: "हरी मिर्च", englishName: "Green Chilli", defaultBuyRate: 40, defaultSellRate: 60 },
  Dhaniya: { hindiName: "धनिया", englishName: "Coriander", defaultBuyRate: 30, defaultSellRate: 50 },
  Baingan: { hindiName: "बैंगन", englishName: "Brinjal", defaultBuyRate: 22, defaultSellRate: 35 },
  Matar: { hindiName: "मटर", englishName: "Green Peas", defaultBuyRate: 45, defaultSellRate: 70 },
  Gajar: { hindiName: "गाजर", englishName: "Carrot", defaultBuyRate: 20, defaultSellRate: 35 },
  Lauki: { hindiName: "लौकी", englishName: "Bottle Gourd", defaultBuyRate: 18, defaultSellRate: 30 },
  Kheera: { hindiName: "खीरा", englishName: "Cucumber", defaultBuyRate: 20, defaultSellRate: 32 },
  Nimbu: { hindiName: "नींबू", englishName: "Lemon", defaultBuyRate: 50, defaultSellRate: 80 },
  Adrak: { hindiName: "अदरक", englishName: "Ginger", defaultBuyRate: 60, defaultSellRate: 90 },
};

export const JUDGE_DEMO_COMMANDS: string[] = [
  "Ram ko 20 kilo tamatar 30 kilo aaloo 100 kilo pyaaz 5 kilo bhindi 2 kilo mirchi bika",
  "Subah 10 kilo bhindi 300 rupaye mein kharida",
  "2 kilo tamatar 60 rupaye mein bika",
  "Sunita ji ke 50 rupaye udhaar likho",
  "Aaj ka total munafa aur bacha maal batao",
];

// Realistic past 3 months sample data for Monthly Sales & Profit Comparison Pie Chart
export const PAST_MONTHS_ANALYTICS: MonthlyComparisonPoint[] = [
  {
    month: "August 2026",
    shortLabel: "Aug",
    salesInr: 42500,
    profitInr: 11200,
  },
  {
    month: "September 2026",
    shortLabel: "Sep",
    salesInr: 48900,
    profitInr: 13400,
  },
  {
    month: "October 2026",
    shortLabel: "Oct",
    salesInr: 54200,
    profitInr: 15800,
  },
];

// Month-to-date base before today's live cart session
export const CURRENT_MONTH_MTD_BASE = {
  month: "November 2026 (MTD)",
  shortLabel: "Nov (Now)",
  salesInr: 39400,
  profitInr: 10900,
};

function formatPastDate(daysAgo: number): { iso: string; display: string } {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const display = d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return { iso: `${year}-${month}-${day}`, display };
}

export function createDefaultDailyHistory(): DailyHistoryRecord[] {
  const templates = [
    {
      daysAgo: 1,
      totalKharid: 2150,
      totalBikri: 2940,
      topSoldVegetable: "Tamatar (22 kg)",
      savedAt: "8:45 PM",
      items: [
        {
          name: "Tamatar",
          soldKg: 22,
          avgBuyRate: 22,
          sellRatesSummary: "₹35/kg (14kg), ₹28/kg (8kg)",
          salesInr: 714,
          profitInr: 230,
        },
        {
          name: "Aaloo",
          soldKg: 35,
          avgBuyRate: 16,
          sellRatesSummary: "₹26/kg (35kg)",
          salesInr: 910,
          profitInr: 350,
        },
        {
          name: "Pyaaz",
          soldKg: 20,
          avgBuyRate: 24,
          sellRatesSummary: "₹36/kg (20kg)",
          salesInr: 720,
          profitInr: 240,
        },
      ],
    },
    {
      daysAgo: 2,
      totalKharid: 1980,
      totalBikri: 2680,
      topSoldVegetable: "Aaloo (30 kg)",
      savedAt: "8:30 PM",
      items: [
        {
          name: "Aaloo",
          soldKg: 30,
          avgBuyRate: 15,
          sellRatesSummary: "₹28/kg (20kg), ₹24/kg (10kg)",
          salesInr: 800,
          profitInr: 350,
        },
        {
          name: "Bhindi",
          soldKg: 14,
          avgBuyRate: 28,
          sellRatesSummary: "₹45/kg (14kg)",
          salesInr: 630,
          profitInr: 238,
        },
      ],
    },
    {
      daysAgo: 3,
      totalKharid: 2400,
      totalBikri: 3260,
      topSoldVegetable: "Pyaaz (28 kg)",
      savedAt: "9:00 PM",
      items: [
        {
          name: "Pyaaz",
          soldKg: 28,
          avgBuyRate: 22,
          sellRatesSummary: "₹35/kg (18kg), ₹32/kg (10kg)",
          salesInr: 950,
          profitInr: 334,
        },
        {
          name: "Gobhi",
          soldKg: 18,
          avgBuyRate: 20,
          sellRatesSummary: "₹32/kg (18kg)",
          salesInr: 576,
          profitInr: 216,
        },
      ],
    },
    {
      daysAgo: 4,
      totalKharid: 1750,
      totalBikri: 2390,
      topSoldVegetable: "Tamatar (18 kg)",
      savedAt: "8:20 PM",
      items: [
        {
          name: "Tamatar",
          soldKg: 18,
          avgBuyRate: 20,
          sellRatesSummary: "₹32/kg (12kg), ₹26/kg (6kg)",
          salesInr: 540,
          profitInr: 180,
        },
      ],
    },
    {
      daysAgo: 5,
      totalKharid: 2620,
      totalBikri: 3490,
      topSoldVegetable: "Bhindi (20 kg)",
      savedAt: "8:55 PM",
      items: [
        {
          name: "Bhindi",
          soldKg: 20,
          avgBuyRate: 26,
          sellRatesSummary: "₹42/kg (12kg), ₹36/kg (8kg)",
          salesInr: 792,
          profitInr: 272,
        },
      ],
    },
    {
      daysAgo: 6,
      totalKharid: 2100,
      totalBikri: 2790,
      topSoldVegetable: "Aaloo (32 kg)",
      savedAt: "8:40 PM",
      items: [
        {
          name: "Aaloo",
          soldKg: 32,
          avgBuyRate: 15,
          sellRatesSummary: "₹26/kg (32kg)",
          salesInr: 832,
          profitInr: 352,
        },
      ],
    },
    {
      daysAgo: 7,
      totalKharid: 1890,
      totalBikri: 2540,
      topSoldVegetable: "Tamatar (19 kg)",
      savedAt: "8:15 PM",
      items: [
        {
          name: "Tamatar",
          soldKg: 19,
          avgBuyRate: 19,
          sellRatesSummary: "₹30/kg (19kg)",
          salesInr: 570,
          profitInr: 209,
        },
      ],
    },
  ];

  return templates.map((t) => {
    const { iso, display } = formatPastDate(t.daysAgo);
    return {
      id: `day-${iso}`,
      date: iso,
      displayDate: display,
      totalKharid: t.totalKharid,
      totalBikri: t.totalBikri,
      netProfit: t.totalBikri - t.totalKharid,
      topSoldVegetable: t.topSoldVegetable,
      savedAt: t.savedAt,
      items: t.items,
    };
  });
}

export const INITIAL_MANDI_STATE: MandiState = {
  // Morning totals: Bought 20kg Tamatar (₹400) + 30kg Aaloo (₹450) + 15kg Pyaaz (₹300) = ₹1,150
  // Morning sales so far: 2kg Tamatar (₹70 UPI) + 5kg Aaloo (₹150 Cash) = ₹220
  totalKharid: 1150,
  totalBikri: 220,
  totalOnlineBikri: 70,
  totalOfflineBikri: 150,
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
      soldOnlineInr: 70,
      soldOfflineInr: 0,
      buyRates: [
        {
          id: "br-tamatar-1",
          qtyKg: 20,
          ratePerKg: 20,
          totalInr: 400,
          time: "7:30 AM",
        },
      ],
      sellRates: [
        {
          id: "sr-tamatar-1",
          qtyKg: 2,
          ratePerKg: 35,
          totalInr: 70,
          onlineInr: 70,
          offlineInr: 0,
          time: "9:10 AM",
        },
      ],
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
      soldOnlineInr: 0,
      soldOfflineInr: 150,
      buyRates: [
        {
          id: "br-aaloo-1",
          qtyKg: 30,
          ratePerKg: 15,
          totalInr: 450,
          time: "7:30 AM",
        },
      ],
      sellRates: [
        {
          id: "sr-aaloo-1",
          qtyKg: 5,
          ratePerKg: 30,
          totalInr: 150,
          onlineInr: 0,
          offlineInr: 150,
          time: "9:25 AM",
        },
      ],
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
      soldOnlineInr: 0,
      soldOfflineInr: 0,
      buyRates: [
        {
          id: "br-pyaaz-1",
          qtyKg: 15,
          ratePerKg: 20,
          totalInr: 300,
          time: "7:30 AM",
        },
      ],
      sellRates: [],
    },
  ],
  udhaarList: [
    {
      id: "sunita-ji",
      customerName: "Sunita Ji",
      mobile: "9876543210",
      address: "Sector 6 Market",
      accountType: "RECEIVABLE",
      amountInr: 80,
      totalPaidOnlineInr: 0,
      totalPaidOfflineInr: 20,
      lastUpdated: "9:15 AM",
      history: [
        {
          id: "u-init-3",
          type: "CREDIT",
          amountInr: 50,
          balanceAfter: 80,
          note: "Morning sabzi udhaar",
          dateTime: "Today · 9:15 AM",
        },
        {
          id: "u-init-2",
          type: "REPAYMENT",
          amountInr: 20,
          onlineInr: 0,
          offlineInr: 20,
          paymentMode: "OFFLINE",
          balanceAfter: 30,
          note: "Subah jama kiya (Cash)",
          dateTime: "Today · 8:45 AM",
        },
        {
          id: "u-init-1",
          type: "CREDIT",
          amountInr: 50,
          balanceAfter: 50,
          note: "Sabzi udhaar (kal ka baaki)",
          dateTime: "Yesterday · 6:30 PM",
        },
      ],
    },
    {
      id: "ramesh-bhai",
      customerName: "Ramesh Bhai",
      mobile: "9811223344",
      address: "Near Mandir Road",
      accountType: "RECEIVABLE",
      amountInr: 120,
      totalPaidOnlineInr: 0,
      totalPaidOfflineInr: 0,
      lastUpdated: "9:40 AM",
      history: [
        {
          id: "u-init-4",
          type: "CREDIT",
          amountInr: 120,
          balanceAfter: 120,
          note: "Aaloo & Pyaaz udhaar",
          dateTime: "Today · 9:40 AM",
        },
      ],
    },
    {
      id: "kisan-mandal",
      customerName: "Kisan Mandal",
      mobile: "9955443322",
      address: "Sabzi Mandi Gate 2",
      accountType: "PAYABLE",
      amountInr: 300,
      totalPaidOnlineInr: 0,
      totalPaidOfflineInr: 0,
      lastUpdated: "7:30 AM",
      history: [
        {
          id: "u-init-5",
          type: "CREDIT",
          amountInr: 300,
          balanceAfter: 300,
          note: "Subah pyaaz mandi crate credit",
          dateTime: "Today · 7:30 AM",
        },
      ],
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
  dailyHistory: [],
  customerBills: [],
  shopProfile: {
    shopName: "MandiBol",
    vendorName: "",
    vendorMobile: "",
    useLiveClock: true,
    customDate: "",
    customTime: "",
  },
};

export function createDefaultShopProfile(): ShopProfile {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return {
    shopName: "MandiBol",
    vendorName: "",
    vendorMobile: "",
    useLiveClock: true,
    customDate: `${year}-${month}-${day}`,
    customTime: `${hh}:${mm}`,
  };
}

export function createDefaultCustomerBills(): CustomerBill[] {
  const { iso } = formatPastDate(0);
  return [
    {
      id: "bill-init-101",
      billNumber: "MB-101",
      buyerName: "Mohan Chaiwala",
      dateTime: "Today · 9:25 AM",
      isoDate: iso,
      items: [
        {
          item: "Tamatar",
          hindiName: "टमाटर",
          qtyKg: 2,
          sellRatePerKg: 35,
          subtotalInr: 70,
          costRatePerKg: 20,
          costTotalInr: 40,
          profitInr: 30,
        },
        {
          item: "Aaloo",
          hindiName: "आलू",
          qtyKg: 5,
          sellRatePerKg: 30,
          subtotalInr: 150,
          costRatePerKg: 15,
          costTotalInr: 75,
          profitInr: 75,
        },
      ],
      totalCostInr: 115,
      totalBillInr: 220,
      netProfitInr: 105,
      paidOnlineInr: 70,
      paidOfflineInr: 150,
      pendingBalanceInr: 0,
      paymentStatus: "PAID_CASH",
    },
  ];
}

export function createDefaultState(preserveShopProfile?: ShopProfile): MandiState {
  const base = JSON.parse(JSON.stringify(INITIAL_MANDI_STATE)) as MandiState;
  base.dailyHistory = createDefaultDailyHistory();
  base.customerBills = createDefaultCustomerBills();
  base.shopProfile = preserveShopProfile ?? createDefaultShopProfile();
  return base;
}

export function createEmptyFreshState(preserveShopProfile?: ShopProfile): MandiState {
  return {
    totalKharid: 0,
    totalBikri: 0,
    totalOnlineBikri: 0,
    totalOfflineBikri: 0,
    stocks: [],
    udhaarList: [],
    activities: [],
    dailyHistory: [],
    customerBills: [],
    shopProfile: preserveShopProfile ?? createDefaultShopProfile(),
  };
}
