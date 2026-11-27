import { VEGETABLE_CATALOG } from "../data/initialData";
import type {
  LedgerAccountType,
  ParsedMultiOrderLine,
  ParsedVoiceCommand,
  PaymentMode,
} from "../types";

export interface ParserContext {
  totalKharid: number;
  totalBikri: number;
  munafa: number;
  stocks: Array<{
    name: string;
    remainingKg: number;
    boughtKg?: number;
    boughtCostInr?: number;
    soldKg?: number;
    soldRevenueInr?: number;
  }>;
  udhaarCustomers: string[];
  udhaarPeople?: Array<{ name: string; accountType: LedgerAccountType }>;
}

const VEG_ALIASES: Array<{ patterns: RegExp[]; canonical: string }> = [
  { patterns: [/\btamatar\b/i, /\btomato(?:es)?\b/i, /टमाटर/], canonical: "Tamatar" },
  { patterns: [/\baaloo\b/i, /\baloo\b/i, /\balu\b/i, /\bpotato(?:es)?\b/i, /आलू/], canonical: "Aaloo" },
  { patterns: [/\bpyaaz\b/i, /\bpyaz\b/i, /\bkanda\b/i, /\bkaanda\b/i, /\bonion(?:s)?\b/i, /प्याज़/, /प्याज/, /कांदा/], canonical: "Pyaaz" },
  { patterns: [/\bbhindi\b/i, /\bokra\b/i, /\blady\s?finger\b/i, /भिंडी/, /भिन्डी/], canonical: "Bhindi" },
  { patterns: [/\bgobhi\b/i, /\bgobi\b/i, /\bphool\s?gobhi\b/i, /\bpatta\s?gobhi\b/i, /\bcauliflower\b/i, /\bcabbage\b/i, /गोभी/, /फूलगोभी/], canonical: "Gobhi" },
  { patterns: [/\bmirchi\b/i, /\bmirch\b/i, /\bhari\s?mirch\b/i, /\bchill?i\b/i, /मिर्ची/, /मिर्च/], canonical: "Mirch" },
  { patterns: [/\bdhaniya\b/i, /\bdhania\b/i, /\bcoriander\b/i, /धनिया/], canonical: "Dhaniya" },
  { patterns: [/\bpalak\b/i, /\bspinach\b/i, /पालक/], canonical: "Palak" },
  { patterns: [/\bbaingan\b/i, /\bbengan\b/i, /\bbrinjal\b/i, /\beggplant\b/i, /बैंगन/], canonical: "Baingan" },
  { patterns: [/\bmatar\b/i, /\bpeas\b/i, /मटर/], canonical: "Matar" },
  { patterns: [/\bgajar\b/i, /\bcarrot(?:s)?\b/i, /गाजर/], canonical: "Gajar" },
  { patterns: [/\blauki\b/i, /\bghiya\b/i, /\bdoodhi\b/i, /\bbottle\s?gourd\b/i, /लौकी/, /घीया/], canonical: "Lauki" },
  { patterns: [/\bkheera\b/i, /\bkhira\b/i, /\bkakdi\b/i, /\bcucumber\b/i, /खीरा/, /ककड़ी/], canonical: "Kheera" },
  { patterns: [/\bnimbu\b/i, /\blemons?\b/i, /नींबू/], canonical: "Nimbu" },
  { patterns: [/\badrak\b/i, /\bginger\b/i, /अदरक/], canonical: "Adrak" },
  { patterns: [/\bkarela\b/i, /\bbitter\s?gourd\b/i, /करेला/], canonical: "Karela" },
  { patterns: [/\bmooli\b/i, /\bmuli\b/i, /\bradish\b/i, /मूली/], canonical: "Mooli" },
  { patterns: [/\bshimla\s?mirch\b/i, /\bcapsicum\b/i, /शिमला\s?मिर्च/], canonical: "Shimla Mirch" },
  { patterns: [/\bmethi\b/i, /\bfenugreek\b/i, /मेथी/], canonical: "Methi" },
  { patterns: [/\btorai\b/i, /\btori\b/i, /\bturai\b/i, /तोरई/], canonical: "Torai" },
  { patterns: [/\bkaddu\b/i, /\bpumpkin\b/i, /कद्दू/], canonical: "Kaddu" },
  { patterns: [/\btinda\b/i, /टिंडा/], canonical: "Tinda" },
  { patterns: [/\bparwal\b/i, /परवल/], canonical: "Parwal" },
  { patterns: [/\barbi\b/i, /अरबी/], canonical: "Arbi" },
  { patterns: [/\bkathal\b/i, /\bjackfruit\b/i, /कटहल/], canonical: "Kathal" },
];

const HINDI_NUMBER_WORDS: Record<string, number> = {
  ek: 1,
  एक: 1,
  do: 2,
  दो: 2,
  teen: 3,
  तीन: 3,
  chaar: 4,
  char: 4,
  चार: 4,
  paanch: 5,
  panch: 5,
  पांच: 5,
  पाँच: 5,
  chhah: 6,
  che: 6,
  छह: 6,
  saat: 7,
  सात: 7,
  aath: 8,
  आठ: 8,
  nau: 9,
  नौ: 9,
  das: 10,
  दस: 10,
  pandrah: 15,
  पंद्रह: 15,
  bees: 20,
  बीस: 20,
  pachis: 25,
  pachees: 25,
  पच्चीस: 25,
  tees: 30,
  तीस: 30,
  chalis: 40,
  चालीस: 40,
  pachas: 50,
  पचास: 50,
  saath: 60,
  साठ: 60,
  sattar: 70,
  सत्तर: 70,
  assi: 80,
  अस्सी: 80,
  nabbe: 90,
  नब्बे: 90,
  sau: 100,
  सौ: 100,
};

const HINDI_CUSTOMER_ALIASES: Record<string, string> = {
  सुनीता: "Sunita Ji",
  "सुनीता जी": "Sunita Ji",
  रमेश: "Ramesh Bhai",
  "रमेश भाई": "Ramesh Bhai",
};

const NON_VEG_CAPITALIZED_WORDS = new Set([
  "Subah",
  "Shaam",
  "Sham",
  "Aaj",
  "Kal",
  "Mandi",
  "Kilo",
  "Kilos",
  "Kilometer",
  "Kilogram",
  "Kg",
  "Gram",
  "Paav",
  "Pav",
  "Aadha",
  "Adha",
  "Dedh",
  "Dhai",
  "Prati",
  "Per",
  "Hisab",
  "Hisaab",
  "Rupaye",
  "Rupees",
  "Rupee",
  "Rs",
  "Mein",
  "Me",
  "Bika",
  "Becha",
  "Bikri",
  "Kharida",
  "Kharid",
  "Liya",
  "Laya",
  "Lae",
  "Udhaar",
  "Udhar",
  "Likho",
  "Likh",
  "Khata",
  "Baaki",
  "Baki",
  "Jama",
  "Kiya",
  "Kiye",
  "Chukaya",
  "Diye",
  "Kat",
  "Kaat",
  "Munafa",
  "Bacha",
  "Maal",
  "Batao",
  "Total",
  "Kul",
  "Aur",
  "Ka",
  "Ke",
  "Ki",
  "Se",
  "Ko",
  "Ne",
  "Ji",
  "Bhai",
  "Kisan",
  "Mandal",
  "Mobile",
  "Phone",
  "Number",
  "Address",
  "Pata",
  "Sector",
  "Gate",
  "Market",
  "Road",
  "Nagar",
  "Colony",
  "Dene",
  "Dena",
  "Hain",
  "Hai",
  "Online",
  "Upi",
  "Phonepe",
  "Gpay",
  "Paytm",
  "Offline",
  "Cash",
  "Nakad",
  "Nagad",
  "Diya",
]);

const KILO_UNIT_PATTERN =
  "(?:kilo|kilos|kilogram|kilograms|kilometer|kilometers|kg|kgs|किलोमीटर|किलोग्राम|किलो)";

const CURRENCY_WORD_PATTERN =
  "(?:rupaye|rupees|rupee|rupaiye|rs\\.?|₹|रुपए|रुपये|रुपया|रु\\.?)";

const ONLINE_MODE_PATTERN =
  "(?:online|upi|phone\\s?pe|g\\s?pay|google\\s?pay|paytm|ऑनलाइन|यूपीआई|फोनपे|गूगल\\s*पे|पेटीएम)";

const OFFLINE_MODE_PATTERN =
  "(?:offline|cash|nakad|nagad|नकद|कैश|ऑफलाइन|हाथोंहाथ)";

interface PaymentSplitResult {
  explicitOnlineInr: number;
  explicitOfflineInr: number;
  hasOnlineKeyword: boolean;
  hasOfflineKeyword: boolean;
  textWithoutSplits: string;
}

function extractPaymentSplit(raw: string): PaymentSplitResult {
  let working = raw;
  let explicitOnlineInr = 0;
  let explicitOfflineInr = 0;

  const patterns: Array<{ re: RegExp; target: "online" | "offline" }> = [
    {
      re: new RegExp(
        `(?:^|\\s)(?:rs\\.?|₹)?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:${CURRENCY_WORD_PATTERN})?\\s*(?:ka|ke|mein|me|se|का|के|में|से)?\\s*${ONLINE_MODE_PATTERN}(?=\\s|$|[,.?!])`,
        "gi"
      ),
      target: "online",
    },
    {
      re: new RegExp(
        `(?:^|\\s)${ONLINE_MODE_PATTERN}\\s*(?::|-|se|mein|me|से|में)?\\s*(?:rs\\.?|₹)?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:${CURRENCY_WORD_PATTERN})?(?=\\s|$|[,.?!])`,
        "gi"
      ),
      target: "online",
    },
    {
      re: new RegExp(
        `(?:^|\\s)(?:rs\\.?|₹)?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:${CURRENCY_WORD_PATTERN})?\\s*(?:ka|ke|mein|me|se|का|के|में|से)?\\s*${OFFLINE_MODE_PATTERN}(?=\\s|$|[,.?!])`,
        "gi"
      ),
      target: "offline",
    },
    {
      re: new RegExp(
        `(?:^|\\s)${OFFLINE_MODE_PATTERN}\\s*(?::|-|se|mein|me|से|में)?\\s*(?:rs\\.?|₹)?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:${CURRENCY_WORD_PATTERN})?(?=\\s|$|[,.?!])`,
        "gi"
      ),
      target: "offline",
    },
  ];

  for (const { re, target } of patterns) {
    working = working.replace(re, (fullMatch, numStr: string) => {
      const val = Number.parseFloat(numStr);
      if (Number.isFinite(val) && val > 0) {
        if (target === "online") {
          explicitOnlineInr += Math.round(val);
        } else {
          explicitOfflineInr += Math.round(val);
        }
        return " ";
      }
      return fullMatch;
    });
  }

  const hasOnlineKeyword = new RegExp(
    `(?:^|\\s|[,.?!])${ONLINE_MODE_PATTERN}(?=\\s|$|[,.?!])`,
    "i"
  ).test(raw);
  const hasOfflineKeyword = new RegExp(
    `(?:^|\\s|[,.?!])${OFFLINE_MODE_PATTERN}(?=\\s|$|[,.?!])`,
    "i"
  ).test(raw);

  return {
    explicitOnlineInr,
    explicitOfflineInr,
    hasOnlineKeyword,
    hasOfflineKeyword,
    textWithoutSplits: working.replace(/\s+/g, " ").trim(),
  };
}

function resolvePaymentAmounts(
  totalAmountInr: number,
  split: PaymentSplitResult
): {
  paid_online_inr: number;
  paid_offline_inr: number;
  payment_mode: PaymentMode;
} {
  if (split.explicitOnlineInr > 0 || split.explicitOfflineInr > 0) {
    const mode: PaymentMode =
      split.explicitOnlineInr > 0 && split.explicitOfflineInr > 0
        ? "SPLIT"
        : split.explicitOnlineInr > 0
        ? "ONLINE"
        : "OFFLINE";
    return {
      paid_online_inr: split.explicitOnlineInr,
      paid_offline_inr: split.explicitOfflineInr,
      payment_mode: mode,
    };
  }

  if (split.hasOnlineKeyword && !split.hasOfflineKeyword) {
    return {
      paid_online_inr: Math.max(0, totalAmountInr),
      paid_offline_inr: 0,
      payment_mode: "ONLINE",
    };
  }

  return {
    paid_online_inr: 0,
    paid_offline_inr: Math.max(0, totalAmountInr),
    payment_mode: "OFFLINE",
  };
}

function normalizeDevanagariDigits(text: string): string {
  const devDigits = "०१२३४५६७८९";
  return text.replace(/[०-९]/g, (ch) => {
    const idx = devDigits.indexOf(ch);
    return idx >= 0 ? String(idx) : ch;
  });
}

function extractQuantityKg(raw: string): { kg: number; matchedSpan: string } {
  const lower = raw.toLowerCase();

  if (/\bpaune\s+do\b/i.test(lower) || /पौने\s+दो/.test(raw)) {
    return { kg: 1.75, matchedSpan: "paune do" };
  }
  if (/\bsawa\s+do\b/i.test(lower) || /सवा\s+दो/.test(raw)) {
    return { kg: 2.25, matchedSpan: "sawa do" };
  }
  if (/\bsaade\s+teen\b/i.test(lower) || /साढ़े\s+तीन/.test(raw)) {
    return { kg: 3.5, matchedSpan: "saade teen" };
  }

  const paavMatch = raw.match(
    /(?:\b(?:ek\s+)?(?:paav|pav|pao)(?:\s+bhar)?\b|एक\s+पाव|पाव\s+भर|पाव)/i
  );
  if (paavMatch) {
    return { kg: 0.25, matchedSpan: paavMatch[0] };
  }

  const aadhaMatch = raw.match(
    new RegExp(
      `(?:\\b(?:aadha|adha|half)(?:\\s*${KILO_UNIT_PATTERN})?\\b|आधा(?:\\s*${KILO_UNIT_PATTERN})?)`,
      "i"
    )
  );
  if (aadhaMatch) {
    return { kg: 0.5, matchedSpan: aadhaMatch[0] };
  }

  const paunaMatch = raw.match(
    new RegExp(
      `(?:\\b(?:pauna|paune)(?:\\s*${KILO_UNIT_PATTERN})?\\b|पौना(?:\\s*${KILO_UNIT_PATTERN})?)`,
      "i"
    )
  );
  if (paunaMatch) {
    return { kg: 0.75, matchedSpan: paunaMatch[0] };
  }

  const sawaMatch = raw.match(
    new RegExp(
      `(?:\\bsawa(?:\\s*${KILO_UNIT_PATTERN})?\\b|सवा(?:\\s*${KILO_UNIT_PATTERN})?)`,
      "i"
    )
  );
  if (sawaMatch) {
    return { kg: 1.25, matchedSpan: sawaMatch[0] };
  }

  const dedhMatch = raw.match(
    new RegExp(
      `(?:\\b(?:dedh|derh)(?:\\s*${KILO_UNIT_PATTERN})?\\b|डेढ़(?:\\s*${KILO_UNIT_PATTERN})?)`,
      "i"
    )
  );
  if (dedhMatch) {
    return { kg: 1.5, matchedSpan: dedhMatch[0] };
  }

  const dhaiMatch = raw.match(
    new RegExp(
      `(?:\\b(?:dhai|adhaai)(?:\\s*${KILO_UNIT_PATTERN})?\\b|ढाई(?:\\s*${KILO_UNIT_PATTERN})?)`,
      "i"
    )
  );
  if (dhaiMatch) {
    return { kg: 2.5, matchedSpan: dhaiMatch[0] };
  }

  const gramMatch = raw.match(
    /(?:^|\s)(\d+(?:\.\d+)?)\s*(?:gram|grams|gm|g|ग्राम)(?=\s|$|[,.?!])/i
  );
  if (gramMatch) {
    const val = Number.parseFloat(gramMatch[1]);
    if (Number.isFinite(val) && val > 0) {
      return { kg: Math.round((val / 1000) * 1000) / 1000, matchedSpan: gramMatch[0].trim() };
    }
  }

  const kiloMatch = raw.match(
    new RegExp(`(?:^|\\s)(\\d+(?:\\.\\d+)?)\\s*${KILO_UNIT_PATTERN}(?=\\s|$|[,.?!])`, "i")
  );
  if (kiloMatch) {
    const val = Number.parseFloat(kiloMatch[1]);
    if (Number.isFinite(val) && val > 0) {
      return { kg: val, matchedSpan: kiloMatch[0].trim() };
    }
  }

  const wordKiloMatch = raw.match(
    new RegExp(
      `(?:^|\\s)([a-zA-Z\\u0900-\\u097F]+)\\s+${KILO_UNIT_PATTERN}(?=\\s|$|[,.?!])`,
      "i"
    )
  );
  if (wordKiloMatch) {
    const word = wordKiloMatch[1].toLowerCase();
    const mapped = HINDI_NUMBER_WORDS[word];
    if (mapped) {
      return { kg: mapped, matchedSpan: wordKiloMatch[0].trim() };
    }
  }

  return { kg: 0, matchedSpan: "" };
}

function extractRatePerKg(raw: string, qtyMatchedSpan: string): number {
  const withoutQty = qtyMatchedSpan ? raw.replace(qtyMatchedSpan, " ") : raw;

  const prefixRateMatch = withoutQty.match(
    /(?:^|\s)(?:rs\.?|₹)\s*(\d+(?:\.\d+)?)\s*(?:\/\s*(?:kg|kilo|किलो)|per\s+(?:kg|kilo)|prati\s+(?:kg|kilo|किलो)|प्रति\s+(?:किलो|किलोग्राम)|(?:kg|kilo|किलो))(?=\s|$|[,.?!])/i
  );
  if (prefixRateMatch) {
    const val = Number.parseFloat(prefixRateMatch[1]);
    if (Number.isFinite(val) && val > 0) return Math.round(val);
  }

  const explicitPerKgMatch = withoutQty.match(
    new RegExp(
      `(?:^|\\s)(\\d+(?:\\.\\d+)?)\\s*(?:${CURRENCY_WORD_PATTERN})?\\s*(?:\\/\\s*(?:kg|kilo|किलो)|per\\s+(?:kg|kilo)|prati\\s+(?:kg|kilo|किलो)|प्रति\\s+(?:किलो|किलोग्राम))(?=\\s|$|[,.?!])`,
      "i"
    )
  );
  if (explicitPerKgMatch) {
    const val = Number.parseFloat(explicitPerKgMatch[1]);
    if (Number.isFinite(val) && val > 0) return Math.round(val);
  }

  const currencyKiloMatch = withoutQty.match(
    new RegExp(
      `(?:^|\\s)(\\d+(?:\\.\\d+)?)\\s*${CURRENCY_WORD_PATTERN}\\s*(?:kilo|kg|किलो)(?=\\s|$|[,.?!])`,
      "i"
    )
  );
  if (currencyKiloMatch) {
    const val = Number.parseFloat(currencyKiloMatch[1]);
    if (Number.isFinite(val) && val > 0) return Math.round(val);
  }

  const wordRateMatch = withoutQty.match(
    new RegExp(
      `(?:^|\\s)([a-zA-Z\\u0900-\\u097F]+)\\s+${CURRENCY_WORD_PATTERN}\\s*(?:per\\s+(?:kg|kilo)|prati\\s+(?:kg|kilo|किलो)|प्रति\\s+(?:किलो|किलोग्राम)|kilo|kg|किलो)(?=\\s|$|[,.?!])`,
      "i"
    )
  );
  if (wordRateMatch) {
    const mapped = HINDI_NUMBER_WORDS[wordRateMatch[1].toLowerCase()];
    if (mapped) return mapped;
  }

  return 0;
}

function extractAmountInr(raw: string, qtyMatchedSpan: string): number {
  const prefixMatch = raw.match(/(?:^|\s)(?:rs\.?|₹)\s*(\d+(?:\.\d+)?)(?=\s|$|[,.?!])/i);
  if (prefixMatch) {
    const val = Number.parseFloat(prefixMatch[1]);
    if (Number.isFinite(val) && val > 0) return Math.round(val);
  }

  const suffixMatch = raw.match(
    new RegExp(`(?:^|\\s)(\\d+(?:\\.\\d+)?)\\s*${CURRENCY_WORD_PATTERN}(?=\\s|$|[,.?!])`, "i")
  );
  if (suffixMatch) {
    const val = Number.parseFloat(suffixMatch[1]);
    if (Number.isFinite(val) && val > 0) return Math.round(val);
  }

  const withoutQty = qtyMatchedSpan ? raw.replace(qtyMatchedSpan, " ") : raw;

  const contextNumMatch = withoutQty.match(
    /(?:^|\s)(\d+(?:\.\d+)?)\s*(?:mein|me|ka|ke|में|का|के)(?=\s|$|[,.?!])/i
  );
  if (contextNumMatch) {
    const val = Number.parseFloat(contextNumMatch[1]);
    if (Number.isFinite(val) && val > 0) return Math.round(val);
  }

  const hundredMatch = withoutQty.match(
    new RegExp(
      `(?:^|\\s)([a-zA-Z\\u0900-\\u097F]+)\\s+(?:sau|सौ)(?:\\s+(?:${CURRENCY_WORD_PATTERN}|में|mein))?(?=\\s|$|[,.?!])`,
      "i"
    )
  );
  if (hundredMatch) {
    const mult = HINDI_NUMBER_WORDS[hundredMatch[1].toLowerCase()];
    if (mult) return mult * 100;
  }

  const wordPriceMatch = withoutQty.match(
    new RegExp(
      `(?:^|\\s)([a-zA-Z\\u0900-\\u097F]+)\\s+${CURRENCY_WORD_PATTERN}(?=\\s|$|[,.?!])`,
      "i"
    )
  );
  if (wordPriceMatch) {
    const mapped = HINDI_NUMBER_WORDS[wordPriceMatch[1].toLowerCase()];
    if (mapped) return mapped;
  }

  const standaloneNums = withoutQty.match(/\b\d+(?:\.\d+)?\b/g);
  if (standaloneNums && standaloneNums.length > 0) {
    const lastVal = Number.parseFloat(standaloneNums[standaloneNums.length - 1]);
    if (Number.isFinite(lastVal) && lastVal > 0) return Math.round(lastVal);
  }

  return 0;
}

function extractKnownVegetable(raw: string): string {
  for (const entry of VEG_ALIASES) {
    if (entry.patterns.some((re) => re.test(raw))) {
      return entry.canonical;
    }
  }
  return "";
}

function extractVegetableItem(raw: string, excludeCustomer = ""): string {
  const known = extractKnownVegetable(raw);
  if (known) return known;

  const customerWords = new Set(
    excludeCustomer
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
  );

  const words = raw.split(/[\s,]+/).map((w) => w.replace(/[^a-zA-Z]/g, ""));
  for (const word of words) {
    if (
      word.length >= 3 &&
      /^[A-Z][a-z]+$/.test(word) &&
      !NON_VEG_CAPITALIZED_WORDS.has(word) &&
      !customerWords.has(word.toLowerCase())
    ) {
      return word;
    }
  }

  return "";
}

function extractMobileAndAddress(raw: string): {
  mobile: string;
  address: string;
  cleanedText: string;
} {
  let working = raw;
  let mobile = "";
  let address = "";

  // Extract 10-digit Indian mobile number (with optional label mobile/phone/number/मोबाइल/फ़ोन/नंबर)
  const labeledMobileMatch = working.match(
    /(?:^|\s)(?:mobile|mob|phone|number|no\.?|मोबाइल|फोन|फ़ोन|नंबर)\s*(?:no\.?|number|नंबर|:|-)?\s*(?:\+?91[\s-]?)?(\d{10})(?=\s|$|[,.?!])/i
  );
  if (labeledMobileMatch) {
    mobile = labeledMobileMatch[1];
    working = working.replace(labeledMobileMatch[0], " ");
  } else {
    const bareMobileMatch = working.match(
      /(?:^|\s)(?:\+?91[\s-]?)?([6-9]\d{9})(?=\s|$|[,.?!])/
    );
    if (bareMobileMatch) {
      mobile = bareMobileMatch[1];
      working = working.replace(bareMobileMatch[0], " ");
    }
  }

  // Extract address after keyword address / pata / पता up to connector (ko/ne/ke/को/ने/के) or numeric amount
  const addressMatch = working.match(
    /(?:^|\s)(?:address|addr|pata|पता)\s*(?::|-)?\s*(.+?)(?=\s+(?:ko|ne|ke|ki|ka|udhaar|udhar|dene|dena|jama|लिखो|उधार|को|ने|के)\b|\s+\d+\s*(?:rupaye|rupees|rs|₹|रुपए|रुपये)|$)/i
  );
  if (addressMatch && addressMatch[1]) {
    address = addressMatch[1].replace(/[,]+$/g, "").trim();
    working = working.replace(addressMatch[0], " ");
  }

  return {
    mobile,
    address,
    cleanedText: working.replace(/\s+/g, " ").trim(),
  };
}

function extractCustomerName(raw: string, knownCustomers: string[]): string {
  const lower = raw.toLowerCase();

  // 1. Exact full-name match first
  for (const existing of knownCustomers) {
    if (lower.includes(existing.toLowerCase())) {
      return existing;
    }
  }

  // Exact multi-word Hindi customer aliases first
  for (const [devKey, canonical] of Object.entries(HINDI_CUSTOMER_ALIASES)) {
    if (devKey.includes(" ") && raw.includes(devKey)) {
      return canonical;
    }
  }

  let extractedCandidate = "";

  const latinMatch = raw.match(
    /^(.+?)\s+(?:mobile|mob|phone|number|address|addr|pata|ne|ke|ka|ki|ko|udhaar|udhar|baaki|baki|jama|kat|kaat|likho|hisab|hisaab|dene|dena)\b/i
  );
  if (latinMatch && latinMatch[1]) {
    const candidate = latinMatch[1]
      .replace(/^(aaj|abhi)\s+/i, "")
      .replace(/\s+(?:mobile|mob|phone|address|pata).*$/i, "")
      .trim();
    if (candidate && !/^\d+$/.test(candidate)) {
      extractedCandidate = candidate
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    }
  }

  if (!extractedCandidate) {
    const devMatch = raw.match(
      /^(.+?)\s+(?:मोबाइल|पता|ने|के|का|की|को|उधार|बाकी|जमा|काट|लिखो|हिसाब|देने|देना)/
    );
    if (devMatch && devMatch[1]) {
      const candidate = devMatch[1].trim();
      if (candidate && !/^(आज|अभी|उधार)$/.test(candidate)) {
        extractedCandidate = candidate;
      }
    }
  }

  // Single-word Devanagari alias fallback only when candidate has no qualifier (e.g. "रमेश" vs "रमेश किसान")
  for (const [devKey, canonical] of Object.entries(HINDI_CUSTOMER_ALIASES)) {
    if (!devKey.includes(" ")) {
      if (extractedCandidate === devKey || (!extractedCandidate && raw.includes(devKey))) {
        return canonical;
      }
    }
  }

  // 2. Match base name (e.g. "Sunita" -> "Sunita Ji") ONLY if candidate has no conflicting qualifier
  for (const existing of knownCustomers) {
    const base = existing.toLowerCase().replace(/\s+(ji|bhai)$/i, "").trim();
    if (base.length >= 3) {
      if (
        extractedCandidate &&
        extractedCandidate.toLowerCase() === base
      ) {
        return existing;
      }
      if (!extractedCandidate && lower.includes(base)) {
        return existing;
      }
    }
  }

  return extractedCandidate;
}

function getItemHindiLabel(canonicalItem: string): string {
  const catalogEntry = VEGETABLE_CATALOG[canonicalItem];
  return catalogEntry?.hindiName || canonicalItem;
}

function extractMultiOrderLines(raw: string): ParsedMultiOrderLine[] {
  const tokenRegex = new RegExp(
    `(?:^|\\s)(?:` +
      `(\\d+(?:\\.\\d+)?)\\s*(gram|grams|gm|g|ग्राम|${KILO_UNIT_PATTERN})` +
      `|(ek\\s+paav|paav|pav|pao|एक\\s+पाव|पाव)` +
      `|(aadha|adha|half)(?:\\s*${KILO_UNIT_PATTERN})?|(आधा)(?:\\s*${KILO_UNIT_PATTERN})?` +
      `|(dedh|derh)(?:\\s*${KILO_UNIT_PATTERN})?|(डेढ़)(?:\\s*${KILO_UNIT_PATTERN})?` +
      `|(dhai|adhaai)(?:\\s*${KILO_UNIT_PATTERN})?|(ढाई)(?:\\s*${KILO_UNIT_PATTERN})?` +
      `|(ek|do|teen|chaar|char|paanch|panch|das|bees|एक|दो|तीन|चार|पांच|पाँच|दस|बीस)\\s+${KILO_UNIT_PATTERN}` +
      `)(?=\\s|$|[,.?!])`,
    "gi"
  );

  const tokens: Array<{ start: number; end: number; qtyKg: number }> = [];
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(raw)) !== null) {
    let qtyKg = 0;
    if (match[1] && match[2]) {
      const num = Number.parseFloat(match[1]);
      if (Number.isFinite(num) && num > 0) {
        const unitLower = match[2].toLowerCase();
        const isGram =
          unitLower === "g" ||
          unitLower === "gm" ||
          unitLower === "gram" ||
          unitLower === "grams" ||
          match[2] === "ग्राम";
        qtyKg = isGram ? Math.round((num / 1000) * 1000) / 1000 : num;
      }
    } else if (match[3]) {
      qtyKg = 0.25;
    } else if (match[4] || match[5]) {
      qtyKg = 0.5;
    } else if (match[6] || match[7]) {
      qtyKg = 1.5;
    } else if (match[8] || match[9]) {
      qtyKg = 2.5;
    } else if (match[10]) {
      qtyKg = HINDI_NUMBER_WORDS[match[10].toLowerCase()] ?? 0;
    }

    if (qtyKg > 0) {
      tokens.push({
        start: match.index,
        end: match.index + match[0].length,
        qtyKg,
      });
    }
  }

  if (tokens.length === 0) return [];

  const lines: ParsedMultiOrderLine[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const sliceStart = tokens[i].end;
    const sliceEnd = i + 1 < tokens.length ? tokens[i + 1].start : raw.length;
    const segment = raw.slice(sliceStart, sliceEnd).trim();
    if (!segment) continue;

    const item = extractKnownVegetable(segment);
    if (!item) continue;

    const rate = extractRatePerKg(segment, "");
    const explicitAmtMatch = segment.match(
      new RegExp(
        `(?:^|\\s)(?:(?:rs\\.?|₹)\\s*(\\d+(?:\\.\\d+)?)|(\\d+(?:\\.\\d+)?)\\s*${CURRENCY_WORD_PATTERN})(?=\\s|$|[,.?!])`,
        "i"
      )
    );
    const explicitAmt =
      rate <= 0 && explicitAmtMatch
        ? Math.round(Number.parseFloat(explicitAmtMatch[1] || explicitAmtMatch[2]))
        : 0;

    lines.push({
      item,
      quantity_kg: tokens[i].qtyKg,
      ...(rate > 0 ? { rate_per_kg: rate } : {}),
      ...(explicitAmt > 0 ? { amount_inr: explicitAmt } : {}),
    });
  }

  return lines;
}

export function parseHindiCommand(
  rawText: string,
  context?: ParserContext
): ParsedVoiceCommand {
  const raw = normalizeDevanagariDigits(rawText.trim());
  const lower = raw.toLowerCase();

  if (!raw) {
    return {
      intent: "UNCLEAR",
      suggested_intent: "SALE",
      item: "",
      quantity_kg: 0,
      amount_inr: 0,
      customer_name: "",
      hindi_reply: "कितने रुपये में बिका? कृपया दोबारा बोलें या नीचे चुनें।",
    };
  }

  const { mobile, address, cleanedText } = extractMobileAndAddress(raw);
  const splitInfo = extractPaymentSplit(cleanedText);
  const amountParseText = splitInfo.textWithoutSplits || cleanedText;
  const cleanedLower = cleanedText.toLowerCase();

  const { kg: quantity_kg, matchedSpan } = extractQuantityKg(amountParseText);
  const rate_per_kg = extractRatePerKg(amountParseText, matchedSpan);
  const rawExtractedTotal = extractAmountInr(amountParseText, matchedSpan);
  const splitSum = splitInfo.explicitOnlineInr + splitInfo.explicitOfflineInr;
  const extractedTotal = rawExtractedTotal > 0 ? rawExtractedTotal : splitSum;

  const isPurchase =
    /\b(kharida|kharid|khareeda|khareed|liya|laya|laaya|lae|buy|bought)\b/i.test(
      cleanedLower
    ) || /(खरीदा|ख़रीदा|खरीद|ख़रीद|लिया|लाया|लाए)/.test(cleanedText);

  const isSale =
    /\b(bika|becha|bech|bikri|bikree|sale|sold)\b/i.test(cleanedLower) ||
    /(बिका|बेचा|बेच|बिक्री)/.test(cleanedText);

  const isPayableAdd =
    /\b(dene\s+hain|dene\s+hai|dena\s+hai|dene\s+h|dena\s+h|payable)\b/i.test(
      cleanedLower
    ) || /(देने\s*हैं|देने\s*है|देना\s*है)/.test(cleanedText);

  const hasKoPayee =
    /\bko\b/i.test(cleanedLower) || /(?:^|\s|[^\u0900-\u097F])को(?=\s|$)/.test(cleanedText) || /\Sको\s/.test(cleanedText);
  const hasNeOrKeCustomer =
    /\b(ne|ke)\b/i.test(cleanedLower) || /(ने|के)/.test(cleanedText);

  const isPaidVerb =
    /\b(diye|de\s+diye|paid|chukaya|chuka|wapas|diya)\b/i.test(cleanedLower) ||
    /(दिए|दे\s+दिए|दिया|चुकाया|चुका|वापस)/.test(cleanedText);

  const isRepayment =
    /\b(jama|kat\s*do|kaat\s*do|chukaya|chuka|wapas|diye|de\s+diye)\b/i.test(
      cleanedLower
    ) || /(जमा|काट\s*दो|काट|चुकाया|चुका|वापस|दिए|दे\s+दिए)/.test(cleanedText);

  const isFullPayoff =
    /\b(chukaya|chuka\s+diya|poora|pura|sab\s+de\s+diya|clear)\b/i.test(cleanedLower) ||
    /(चुकाया|पूरा|सब\s+दे\s+दिया)/.test(cleanedText);

  const isUdhaarWord =
    /\b(udhaar|udhar|likho|likh|khata|baaki|baki|credit)\b/i.test(cleanedLower) ||
    /(उधार|लिखो|लिख|खाता|बाकी|बकाया)/.test(cleanedText);

  const hasHisabWord =
    /\b(hisab|hisaab|baaki|baki|batao)\b/i.test(cleanedLower) ||
    /(हिसाब|बाकी|बताओ)/.test(cleanedText);

  const hasProfitOrStockWord =
    /\b(munafa|profit|bacha|maal)\b/i.test(cleanedLower) ||
    /(मुनाफा|बचा|माल|फायदा)/.test(cleanedText);

  const hasKulOrTotal =
    /\b(total|kul)\b/i.test(cleanedLower) || /(कुल|टोटल)/.test(cleanedText);

  const knownPeopleNames =
    context?.udhaarPeople?.map((p) => p.name) ?? context?.udhaarCustomers ?? [];
  const detectedCustomer = extractCustomerName(raw, knownPeopleNames);
  const matchedProfile = context?.udhaarPeople?.find(
    (p) => p.name.toLowerCase() === detectedCustomer.toLowerCase()
  );

  const knownItem = extractKnownVegetable(cleanedText);
  const item =
    isRepayment || isUdhaarWord || isPayableAdd
      ? knownItem
      : extractVegetableItem(cleanedText, detectedCustomer);
  const multiLines = extractMultiOrderLines(amountParseText);

  // -1. Check MULTI_SALE ("Ram ko 20 kilo tamatar 30 kilo aaloo ... bika" or "Ram ko 500 rupaye ka tamatar bika, 300 online aur 200 offline diya")
  const isSingleBuyerCustomerSale =
    multiLines.length === 1 &&
    Boolean(detectedCustomer) &&
    hasKoPayee &&
    (isSale || isUdhaarWord);

  const isValueBasedCustomerSale =
    !isPurchase &&
    !isPayableAdd &&
    isSale &&
    Boolean(detectedCustomer) &&
    Boolean(item) &&
    multiLines.length === 0 &&
    quantity_kg <= 0 &&
    extractedTotal > 0;

  if (isValueBasedCustomerSale) {
    const buyerName = detectedCustomer || "Grahak";
    const totalBill = extractedTotal;
    const catalogSell = VEGETABLE_CATALOG[item]?.defaultSellRate ?? 35;
    const effectiveRate = rate_per_kg > 0 ? rate_per_kg : catalogSell;
    const estQty = Math.max(0.25, Math.round((totalBill / effectiveRate) * 100) / 100);
    const resolvedSplit = isUdhaarWord
      ? {
          paid_online_inr: splitInfo.explicitOnlineInr,
          paid_offline_inr: splitInfo.explicitOfflineInr,
          payment_mode: (splitInfo.explicitOnlineInr > 0 && splitInfo.explicitOfflineInr > 0
            ? "SPLIT"
            : splitInfo.explicitOnlineInr > 0
            ? "ONLINE"
            : "OFFLINE") as PaymentMode,
        }
      : resolvePaymentAmounts(totalBill, splitInfo);
    const totalPaid =
      resolvedSplit.paid_online_inr + resolvedSplit.paid_offline_inr;
    const hasPendingUdhaar = isUdhaarWord || totalPaid < totalBill;

    return {
      intent: "MULTI_SALE",
      item,
      quantity_kg: estQty,
      amount_inr: totalBill,
      customer_name: buyerName,
      multi_items: [
        {
          item,
          quantity_kg: estQty,
          rate_per_kg: effectiveRate,
          amount_inr: totalBill,
        },
      ],
      is_udhaar: hasPendingUdhaar,
      paid_online_inr: resolvedSplit.paid_online_inr,
      paid_offline_inr: resolvedSplit.paid_offline_inr,
      payment_mode: resolvedSplit.payment_mode,
      hindi_reply: `${buyerName} का ${item} का ${totalBill} रुपये का बिल दर्ज किया जा रहा है।`,
    };
  }

  if (
    !isPurchase &&
    !isPayableAdd &&
    (isSale || isUdhaarWord || isPaidVerb) &&
    (multiLines.length >= 2 || isSingleBuyerCustomerSale)
  ) {
    const buyerName = detectedCustomer || "Grahak";
    if (
      multiLines.length === 1 &&
      !multiLines[0].rate_per_kg &&
      !multiLines[0].amount_inr &&
      extractedTotal > 0
    ) {
      multiLines[0].amount_inr = extractedTotal;
    }

    const explicitPaidTotal = splitInfo.explicitOnlineInr + splitInfo.explicitOfflineInr;
    const hasExplicitSplit = explicitPaidTotal > 0;
    const modeHint: PaymentMode | undefined = hasExplicitSplit
      ? splitInfo.explicitOnlineInr > 0 && splitInfo.explicitOfflineInr > 0
        ? "SPLIT"
        : splitInfo.explicitOnlineInr > 0
        ? "ONLINE"
        : "OFFLINE"
      : splitInfo.hasOnlineKeyword && !splitInfo.hasOfflineKeyword
      ? "ONLINE"
      : undefined;

    return {
      intent: "MULTI_SALE",
      item: multiLines[0].item,
      quantity_kg: multiLines.reduce((acc, l) => acc + l.quantity_kg, 0),
      amount_inr: 0,
      customer_name: buyerName,
      multi_items: multiLines,
      is_udhaar: isUdhaarWord,
      ...(hasExplicitSplit
        ? {
            paid_online_inr: splitInfo.explicitOnlineInr,
            paid_offline_inr: splitInfo.explicitOfflineInr,
          }
        : {}),
      ...(modeHint ? { payment_mode: modeHint } : {}),
      hindi_reply: `${buyerName} के लिए ${multiLines.length} सब्जियों का बिल बनाया जा रहा है।`,
    };
  }

  // 0. Check PAYABLE_ADD ("Ramesh kisan ko 200 rupaye dene hain")
  if (isPayableAdd && !knownItem) {
    if (!detectedCustomer || extractedTotal <= 0) {
      return {
        intent: "UNCLEAR",
        suggested_intent: "PAYABLE_ADD",
        item: "",
        quantity_kg: 0,
        amount_inr: extractedTotal,
        customer_name: detectedCustomer,
        ...(mobile ? { mobile } : {}),
        ...(address ? { address } : {}),
        hindi_reply: "किसे कितने रुपये देने हैं? कृपया दोबारा बोलें या नीचे चुनें।",
      };
    }

    return {
      intent: "PAYABLE_ADD",
      item: "",
      quantity_kg: 0,
      amount_inr: extractedTotal,
      customer_name: detectedCustomer,
      ...(mobile ? { mobile } : {}),
      ...(address ? { address } : {}),
      hindi_reply: `जी, ${detectedCustomer} को ${extractedTotal} रुपये देनदारी (Payable) में लिख दिए हैं।`,
    };
  }

  // 1. Check PAYABLE_PAY vs UDHAAR_JAMA
  // If user says "<person> ko <amt> rupaye diye" (or person is known PAYABLE and not "ne jama"), it is PAYABLE_PAY
  const isPayablePayment =
    !knownItem &&
    !isUdhaarWord &&
    ((hasKoPayee && isPaidVerb && !hasNeOrKeCustomer) ||
      (matchedProfile?.accountType === "PAYABLE" &&
        (isPaidVerb || isRepayment) &&
        !hasNeOrKeCustomer));

  if (isPayablePayment) {
    const payTotal = splitSum > 0 ? splitSum : extractedTotal;
    if (!detectedCustomer || (payTotal <= 0 && !isFullPayoff)) {
      return {
        intent: "UNCLEAR",
        suggested_intent: "PAYABLE_PAY",
        item: "",
        quantity_kg: 0,
        amount_inr: payTotal,
        customer_name: detectedCustomer,
        hindi_reply: "किसे कितने रुपये दिए? कृपया दोबारा बोलें या नीचे चुनें।",
      };
    }

    const resolvedPay = resolvePaymentAmounts(payTotal, splitInfo);
    return {
      intent: "PAYABLE_PAY",
      item: "",
      quantity_kg: 0,
      amount_inr: payTotal,
      customer_name: detectedCustomer,
      full_repayment: payTotal <= 0 && isFullPayoff,
      paid_online_inr: resolvedPay.paid_online_inr,
      paid_offline_inr: resolvedPay.paid_offline_inr,
      payment_mode: resolvedPay.payment_mode,
      hindi_reply:
        payTotal > 0
          ? `जी, ${detectedCustomer} को ${payTotal} रुपये का भुगतान दर्ज किया जा रहा है।`
          : `जी, ${detectedCustomer} का पूरा बकाया चुकाया जा रहा है।`,
    };
  }

  // 2. Check UDHAAR_JAMA (customer repayment) BEFORE SALE/UDHAAR
  if (isRepayment && !knownItem) {
    const jamaTotal = splitSum > 0 ? splitSum : extractedTotal;
    if (!detectedCustomer || (jamaTotal <= 0 && !isFullPayoff)) {
      return {
        intent: "UNCLEAR",
        suggested_intent: "UDHAAR_JAMA",
        item: "",
        quantity_kg: 0,
        amount_inr: jamaTotal,
        customer_name: detectedCustomer,
        hindi_reply: "किस ग्राहक ने कितने रुपये जमा किए? कृपया दोबारा बोलें या नीचे चुनें।",
      };
    }

    const resolvedJama = resolvePaymentAmounts(jamaTotal, splitInfo);
    return {
      intent: "UDHAAR_JAMA",
      item: "",
      quantity_kg: 0,
      amount_inr: jamaTotal,
      customer_name: detectedCustomer,
      full_repayment: jamaTotal <= 0 && isFullPayoff,
      paid_online_inr: resolvedJama.paid_online_inr,
      paid_offline_inr: resolvedJama.paid_offline_inr,
      payment_mode: resolvedJama.payment_mode,
      hindi_reply:
        jamaTotal > 0
          ? `जी, ${detectedCustomer} के ${jamaTotal} रुपये जमा किए जा रहे हैं।`
          : `जी, ${detectedCustomer} का पूरा उधार जमा किया जा रहा है।`,
    };
  }

  // 3. Check UDHAAR_HISAB (customer credit history/balance query like "Sunita ji ka hisab batao")
  if (
    !isPurchase &&
    !isSale &&
    !hasProfitOrStockWord &&
    extractedTotal <= 0 &&
    (detectedCustomer || /उधार|udhaar|udhar|khata|खाता/i.test(raw)) &&
    hasHisabWord &&
    !/\b(likho|likh)\b|लिखो|लिख/.test(raw)
  ) {
    return {
      intent: "UDHAAR_HISAB",
      item: "",
      quantity_kg: 0,
      amount_inr: 0,
      customer_name: detectedCustomer,
      hindi_reply: detectedCustomer
        ? `${detectedCustomer} का उधार हिसाब बता रहा हूँ।`
        : "कुल उधार खाते का हिसाब बता रहा हूँ।",
    };
  }

  // 4. Check SUMMARY intent (profit & stock summary)
  const hasExplicitSummaryWord =
    hasProfitOrStockWord ||
    /\b(hisab|hisaab|batao|haal)\b/i.test(cleanedLower) ||
    /(हिसाब|बताओ)/.test(cleanedText);

  if (
    hasExplicitSummaryWord ||
    (hasKulOrTotal && !isPurchase && !isSale && !isUdhaarWord)
  ) {
    return {
      intent: "SUMMARY",
      item,
      quantity_kg: 0,
      amount_inr: 0,
      customer_name: "",
      hindi_reply: item
        ? `${getItemHindiLabel(item)} का मुनाफा और हिसाब बता रहा हूँ।`
        : "आज का पूरा हिसाब और बचा हुआ माल बता रहा हूँ।",
    };
  }

  // 5. Check UDHAAR (new credit entry — also supports mobile & address)
  if (isUdhaarWord) {
    if (!detectedCustomer || extractedTotal <= 0) {
      return {
        intent: "UNCLEAR",
        suggested_intent: "UDHAAR",
        item: "",
        quantity_kg: 0,
        amount_inr: extractedTotal,
        customer_name: detectedCustomer,
        ...(mobile ? { mobile } : {}),
        ...(address ? { address } : {}),
        hindi_reply: "कितने रुपये उधार लिखने हैं? कृपया दोबारा बोलें या नीचे चुनें।",
      };
    }

    return {
      intent: "UDHAAR",
      item: "",
      quantity_kg: 0,
      amount_inr: extractedTotal,
      customer_name: detectedCustomer,
      ...(mobile ? { mobile } : {}),
      ...(address ? { address } : {}),
      hindi_reply: `जी, ${detectedCustomer} के ${extractedTotal} रुपये उधार खाते में लिख दिए हैं।`,
    };
  }

  // Compute total amount from per-kg rate if detected and quantity > 0
  const amount_inr =
    rate_per_kg > 0 && quantity_kg > 0
      ? Math.round(quantity_kg * rate_per_kg)
      : extractedTotal;

  // 6. Check PURCHASE & SALE intents
  if (isPurchase && !isSale) {
    if (!item || quantity_kg <= 0 || amount_inr <= 0) {
      return {
        intent: "UNCLEAR",
        suggested_intent: "PURCHASE",
        item,
        quantity_kg,
        ...(rate_per_kg > 0 ? { rate_per_kg } : {}),
        amount_inr,
        customer_name: "",
        hindi_reply: "कितने रुपये में खरीदा? कृपया दोबारा बोलें या नीचे चुनें।",
      };
    }

    const itemHindi = getItemHindiLabel(item);
    const hindiReply =
      rate_per_kg > 0
        ? `जी, ${quantity_kg} किलो ${itemHindi} ${rate_per_kg} रुपये प्रति किलो के हिसाब से ${amount_inr} रुपये में खरीद दर्ज की गई है।`
        : `जी, ${quantity_kg} किलो ${itemHindi} ${amount_inr} रुपये में खरीद दर्ज कर दी गई है।`;

    return {
      intent: "PURCHASE",
      item,
      quantity_kg,
      ...(rate_per_kg > 0 ? { rate_per_kg } : {}),
      amount_inr,
      customer_name: "",
      hindi_reply: hindiReply,
    };
  }

  if (isSale || (isPaidVerb && knownItem)) {
    if (!item || quantity_kg <= 0 || amount_inr <= 0) {
      return {
        intent: "UNCLEAR",
        suggested_intent: "SALE",
        item,
        quantity_kg,
        ...(rate_per_kg > 0 ? { rate_per_kg } : {}),
        amount_inr,
        customer_name: "",
        hindi_reply: "कितने रुपये में बिका? कृपया दोबारा बोलें या नीचे चुनें।",
      };
    }

    const resolvedSale = resolvePaymentAmounts(amount_inr, splitInfo);
    const modeHindi =
      resolvedSale.payment_mode === "ONLINE"
        ? " (ऑनलाइन UPI)"
        : resolvedSale.payment_mode === "SPLIT"
        ? ` (${resolvedSale.paid_online_inr} ऑनलाइन, ${resolvedSale.paid_offline_inr} नकद)`
        : "";
    const itemHindi = getItemHindiLabel(item);
    const hindiReply =
      rate_per_kg > 0
        ? `जी, ${quantity_kg} किलो ${itemHindi} ${rate_per_kg} रुपये प्रति किलो के हिसाब से ${amount_inr} रुपये में बिका${modeHindi}।`
        : `जी, ${quantity_kg} किलो ${itemHindi} ${amount_inr} रुपये में बिक्री दर्ज कर दी गई है${modeHindi}।`;

    return {
      intent: "SALE",
      item,
      quantity_kg,
      ...(rate_per_kg > 0 ? { rate_per_kg } : {}),
      amount_inr,
      customer_name: "",
      paid_online_inr: resolvedSale.paid_online_inr,
      paid_offline_inr: resolvedSale.paid_offline_inr,
      payment_mode: resolvedSale.payment_mode,
      hindi_reply: hindiReply,
    };
  }

  // 7. Fallback if neither keyword nor clear structure matched
  return {
    intent: "UNCLEAR",
    suggested_intent: "SALE",
    item,
    quantity_kg,
    ...(rate_per_kg > 0 ? { rate_per_kg } : {}),
    amount_inr,
    customer_name: "",
    hindi_reply: "कितने रुपये में बिका? कृपया दोबारा बोलें या नीचे चुनें।",
  };
}
