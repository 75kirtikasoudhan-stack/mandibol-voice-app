import { VEGETABLE_CATALOG } from "../data/initialData";
import type { ParsedVoiceCommand } from "../types";

export interface ParserContext {
  totalKharid: number;
  totalBikri: number;
  munafa: number;
  stocks: Array<{ name: string; remainingKg: number }>;
  udhaarCustomers: string[];
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
  bees: 20,
  बीस: 20,
  pachis: 25,
  pachees: 25,
  tees: 30,
  तीस: 30,
  chalis: 40,
  चालीस: 40,
  pachas: 50,
  पचास: 50,
  saath: 60,
  साठ: 60,
  sattar: 70,
  assi: 80,
  nabbe: 90,
  sau: 100,
  सौ: 100,
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
  "Kg",
  "Gram",
  "Paav",
  "Pav",
  "Aadha",
  "Adha",
  "Dedh",
  "Dhai",
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
  "Udhaar",
  "Udhar",
  "Likho",
  "Likh",
  "Khata",
  "Baaki",
  "Baki",
  "Munafa",
  "Bacha",
  "Maal",
  "Batao",
  "Hisab",
  "Hisaab",
  "Total",
  "Aur",
  "Ka",
  "Ke",
  "Ki",
  "Se",
  "Ko",
  "Ji",
  "Bhai",
]);

function extractQuantityKg(raw: string): { kg: number; matchedSpan: string } {
  const lower = raw.toLowerCase();

  // Compound fractions first
  if (/\bpaune\s+do\b/i.test(lower) || /पौने\s+दो/.test(raw)) {
    return { kg: 1.75, matchedSpan: "paune do" };
  }
  if (/\bsawa\s+do\b/i.test(lower) || /सवा\s+दो/.test(raw)) {
    return { kg: 2.25, matchedSpan: "sawa do" };
  }
  if (/\bsaade\s+teen\b/i.test(lower) || /साढ़े\s+तीन/.test(raw)) {
    return { kg: 3.5, matchedSpan: "saade teen" };
  }

  // Standard Indian unit words
  const paavMatch = raw.match(/\b(?:ek\s+)?(?:paav|pav|pao)(?:\s+bhar)?\b|एक\s+पाव|पाव\s+भर|पाव/i);
  if (paavMatch) {
    return { kg: 0.25, matchedSpan: paavMatch[0] };
  }

  const aadhaMatch = raw.match(/\b(?:aadha|adha|half)\s*(?:kilo|kg)?\b|आधा\s*(?:किलो)?/i);
  if (aadhaMatch) {
    return { kg: 0.5, matchedSpan: aadhaMatch[0] };
  }

  const paunaMatch = raw.match(/\b(?:pauna|paune)\s*(?:kilo|kg)?\b|पौना\s*(?:किलो)?/i);
  if (paunaMatch) {
    return { kg: 0.75, matchedSpan: paunaMatch[0] };
  }

  const sawaMatch = raw.match(/\bsawa\s*(?:kilo|kg)?\b|सवा\s*(?:किलो)?/i);
  if (sawaMatch) {
    return { kg: 1.25, matchedSpan: sawaMatch[0] };
  }

  const dedhMatch = raw.match(/\b(?:dedh|derh)\s*(?:kilo|kg)?\b|डेढ़\s*(?:किलो)?/i);
  if (dedhMatch) {
    return { kg: 1.5, matchedSpan: dedhMatch[0] };
  }

  const dhaiMatch = raw.match(/\b(?:dhai|adhaai)\s*(?:kilo|kg)?\b|ढाई\s*(?:किलो)?/i);
  if (dhaiMatch) {
    return { kg: 2.5, matchedSpan: dhaiMatch[0] };
  }

  // Numeric grams (e.g., 500 gram, 250 gm)
  const gramMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:gram|grams|gm|g|ग्राम)\b/i);
  if (gramMatch) {
    const val = Number.parseFloat(gramMatch[1]);
    if (Number.isFinite(val) && val > 0) {
      return { kg: Math.round((val / 1000) * 1000) / 1000, matchedSpan: gramMatch[0] };
    }
  }

  // Numeric kilos (e.g., 2 kilo, 10 kg)
  const kiloMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:kilo|kilos|kg|kgs|किलो)\b/i);
  if (kiloMatch) {
    const val = Number.parseFloat(kiloMatch[1]);
    if (Number.isFinite(val) && val > 0) {
      return { kg: val, matchedSpan: kiloMatch[0] };
    }
  }

  // Spoken Hindi number words before kilo/kg (e.g., "do kilo", "das kilo")
  const wordKiloMatch = raw.match(
    /\b([a-zA-Z\u0900-\u097F]+)\s+(?:kilo|kilos|kg|kgs|किलो)\b/i
  );
  if (wordKiloMatch) {
    const word = wordKiloMatch[1].toLowerCase();
    const mapped = HINDI_NUMBER_WORDS[word];
    if (mapped) {
      return { kg: mapped, matchedSpan: wordKiloMatch[0] };
    }
  }

  return { kg: 0, matchedSpan: "" };
}

function extractAmountInr(raw: string, qtyMatchedSpan: string): number {
  // Prefer explicit currency markers
  const prefixMatch = raw.match(/(?:rs\.?|₹)\s*(\d+(?:\.\d+)?)/i);
  if (prefixMatch) {
    const val = Number.parseFloat(prefixMatch[1]);
    if (Number.isFinite(val) && val > 0) return Math.round(val);
  }

  const suffixMatch = raw.match(
    /(\d+(?:\.\d+)?)\s*(?:rupaye|rupees|rupee|rupaiye|rs\.?|₹|रुपये|रुपए|रु\.?)/i
  );
  if (suffixMatch) {
    const val = Number.parseFloat(suffixMatch[1]);
    if (Number.isFinite(val) && val > 0) return Math.round(val);
  }

  // Remove quantity span so we don't accidentally treat kg number as ₹
  const withoutQty = qtyMatchedSpan ? raw.replace(qtyMatchedSpan, " ") : raw;

  // Check "<number> mein/ka/ke"
  const contextNumMatch = withoutQty.match(/(\d+(?:\.\d+)?)\s*(?:mein|me|ka|ke|में|का|के)\b/i);
  if (contextNumMatch) {
    const val = Number.parseFloat(contextNumMatch[1]);
    if (Number.isFinite(val) && val > 0) return Math.round(val);
  }

  // Check Hindi word price before rupaye (e.g., "sau rupaye", "pachas rupaye")
  const wordPriceMatch = withoutQty.match(
    /\b([a-zA-Z\u0900-\u097F]+)\s+(?:rupaye|rupees|rupee|rupaiye|rs\.?|रुपये|रुपए)\b/i
  );
  if (wordPriceMatch) {
    const mapped = HINDI_NUMBER_WORDS[wordPriceMatch[1].toLowerCase()];
    if (mapped) return mapped;
  }

  // Last resort: standalone number remaining after removing quantity
  const standaloneNums = withoutQty.match(/\b\d+(?:\.\d+)?\b/g);
  if (standaloneNums && standaloneNums.length > 0) {
    const lastVal = Number.parseFloat(standaloneNums[standaloneNums.length - 1]);
    if (Number.isFinite(lastVal) && lastVal > 0) return Math.round(lastVal);
  }

  return 0;
}

function extractVegetableItem(raw: string): string {
  for (const entry of VEG_ALIASES) {
    if (entry.patterns.some((re) => re.test(raw))) {
      return entry.canonical;
    }
  }

  // Check any capitalized word spoken/typed that isn't a known non-vegetable filler
  const words = raw.split(/[\s,]+/).map((w) => w.replace(/[^a-zA-Z]/g, ""));
  for (const word of words) {
    if (
      word.length >= 3 &&
      /^[A-Z][a-z]+$/.test(word) &&
      !NON_VEG_CAPITALIZED_WORDS.has(word)
    ) {
      return word;
    }
  }

  return "";
}

function extractCustomerName(raw: string, knownCustomers: string[]): string {
  const lower = raw.toLowerCase();

  for (const existing of knownCustomers) {
    const base = existing.toLowerCase().replace(/\s+(ji|bhai)$/i, "").trim();
    if (lower.includes(existing.toLowerCase()) || (base.length >= 3 && lower.includes(base))) {
      return existing;
    }
  }

  // Match pattern before ke / ka / ki / ko / udhaar
  const latinMatch = raw.match(
    /^(.+?)\s+(?:ke|ka|ki|ko|udhaar|udhar|baaki|baki|likho)\b/i
  );
  if (latinMatch && latinMatch[1]) {
    const candidate = latinMatch[1]
      .replace(/^(aaj|abhi)\s+/i, "")
      .trim();
    if (candidate && !/^\d+$/.test(candidate)) {
      return candidate
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    }
  }

  // Devanagari pattern before के / का / की / को / उधार
  const devMatch = raw.match(/^(.+?)\s+(?:के|का|की|को|उधार|बाकी|लिखो)/);
  if (devMatch && devMatch[1]) {
    const candidate = devMatch[1].trim();
    if (candidate) return candidate;
  }

  return "";
}

function getItemHindiLabel(canonicalItem: string): string {
  const catalogEntry = VEGETABLE_CATALOG[canonicalItem];
  return catalogEntry?.hindiName || canonicalItem;
}

export function parseHindiCommand(
  rawText: string,
  context?: ParserContext
): ParsedVoiceCommand {
  const raw = rawText.trim();
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

  // 1. Check SUMMARY intent
  const isSummary =
    /\b(munafa|profit|bacha|hisab|hisaab|batao|haal)\b/i.test(lower) ||
    /(मुनाफा|बचा|हिसाब|बताओ|फायदा)/.test(raw) ||
    (/\btotal\b/i.test(lower) && !/\b(kharida|liya|bika|becha|udhaar|udhar)\b/i.test(lower));

  if (isSummary) {
    return {
      intent: "SUMMARY",
      item: "",
      quantity_kg: 0,
      amount_inr: 0,
      customer_name: "",
      hindi_reply: "आज का पूरा हिसाब और बचा हुआ माल बता रहा हूँ।",
    };
  }

  // 2. Check UDHAAR intent
  const isUdhaar =
    /\b(udhaar|udhar|likho|likh|khata|baaki|baki|credit)\b/i.test(lower) ||
    /(उधार|लिखो|खाता|बाकी|बकाया)/.test(raw);

  const { kg: quantity_kg, matchedSpan } = extractQuantityKg(raw);
  const amount_inr = extractAmountInr(raw, matchedSpan);

  if (isUdhaar) {
    const customer_name = extractCustomerName(raw, context?.udhaarCustomers ?? []);
    if (!customer_name || amount_inr <= 0) {
      return {
        intent: "UNCLEAR",
        suggested_intent: "UDHAAR",
        item: "",
        quantity_kg: 0,
        amount_inr,
        customer_name,
        hindi_reply: "कितने रुपये उधार लिखने हैं? कृपया दोबारा बोलें या नीचे चुनें।",
      };
    }

    return {
      intent: "UDHAAR",
      item: "",
      quantity_kg: 0,
      amount_inr,
      customer_name,
      hindi_reply: `जी, ${customer_name} के ${amount_inr} रुपये उधार खाते में लिख दिए हैं।`,
    };
  }

  // 3. Check PURCHASE & SALE intents
  const isPurchase =
    /\b(kharida|kharid|khareeda|khareed|liya|laya|laaya|buy|bought)\b/i.test(lower) ||
    /(खरीदा|खरीद|लिया|लाया)/.test(raw);

  const isSale =
    /\b(bika|becha|bech|diya|bikri|bikree|sale|sold)\b/i.test(lower) ||
    /(बिका|बेचा|बेच|दिया|बिक्री)/.test(raw);

  const item = extractVegetableItem(raw);

  if (isPurchase && !isSale) {
    if (!item || quantity_kg <= 0 || amount_inr <= 0) {
      return {
        intent: "UNCLEAR",
        suggested_intent: "PURCHASE",
        item,
        quantity_kg,
        amount_inr,
        customer_name: "",
        hindi_reply: "कितने रुपये में बिका? कृपया दोबारा बोलें या नीचे चुनें।",
      };
    }

    const itemHindi = getItemHindiLabel(item);
    return {
      intent: "PURCHASE",
      item,
      quantity_kg,
      amount_inr,
      customer_name: "",
      hindi_reply: `जी, ${quantity_kg} किलो ${itemHindi} ${amount_inr} रुपये में खरीद दर्ज कर दी गई है।`,
    };
  }

  if (isSale) {
    if (!item || quantity_kg <= 0 || amount_inr <= 0) {
      return {
        intent: "UNCLEAR",
        suggested_intent: "SALE",
        item,
        quantity_kg,
        amount_inr,
        customer_name: "",
        hindi_reply: "कितने रुपये में बिका? कृपया दोबारा बोलें या नीचे चुनें।",
      };
    }

    const itemHindi = getItemHindiLabel(item);
    return {
      intent: "SALE",
      item,
      quantity_kg,
      amount_inr,
      customer_name: "",
      hindi_reply: `जी, ${quantity_kg} किलो ${itemHindi} ${amount_inr} रुपये में बिक्री दर्ज कर दी गई है।`,
    };
  }

  // 4. Fallback if neither keyword nor clear structure matched
  return {
    intent: "UNCLEAR",
    suggested_intent: "SALE",
    item,
    quantity_kg,
    amount_inr,
    customer_name: "",
    hindi_reply: "कितने रुपये में बिका? कृपया दोबारा बोलें या नीचे चुनें।",
  };
}
