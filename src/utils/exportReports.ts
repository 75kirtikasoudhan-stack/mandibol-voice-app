import * as XLSX from "xlsx";
import type {
  CustomerBill,
  MandiState,
  MonthlyComparisonPoint,
  ShopProfile,
  UdhaarEntry,
} from "../types";

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function triggerFileDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function getActiveBusinessDateTime(profile?: ShopProfile): {
  isoDate: string;
  displayDate: string;
  timeLabel: string;
  dateTimeLabel: string;
} {
  let target = new Date();
  const isCustom = profile && profile.useLiveClock === false && profile.customDate;

  if (isCustom && profile.customDate) {
    const [y, m, d] = profile.customDate.split("-").map(Number);
    const [hh, mm] = (profile.customTime || "09:00").split(":").map(Number);
    if (
      Number.isFinite(y) &&
      Number.isFinite(m) &&
      Number.isFinite(d) &&
      m >= 1 &&
      m <= 12 &&
      d >= 1 &&
      d <= 31
    ) {
      target = new Date(
        y,
        m - 1,
        d,
        Number.isFinite(hh) ? hh : 9,
        Number.isFinite(mm) ? mm : 0,
        0
      );
    }
  }

  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, "0");
  const day = String(target.getDate()).padStart(2, "0");
  const isoDate = `${year}-${month}-${day}`;
  const displayDate = target.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeLabel = target.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const dateTimeLabel = isCustom
    ? `${displayDate} · ${timeLabel}`
    : `Today · ${timeLabel}`;

  return { isoDate, displayDate, timeLabel, dateTimeLabel };
}

export function getTodayIsoDate(profile?: ShopProfile): string {
  return getActiveBusinessDateTime(profile).isoDate;
}

function getShopDisplayMeta(profile?: ShopProfile) {
  const shopName = profile?.shopName?.trim() || "MandiBol";
  const vendorName = profile?.vendorName?.trim() || "";
  const vendorMobile = profile?.vendorMobile?.trim() || "";
  const vendorContactParts = [
    vendorName ? `Proprietor: ${vendorName}` : "",
    vendorMobile ? `Mob: ${vendorMobile}` : "",
  ].filter(Boolean);
  return {
    shopName,
    vendorName,
    vendorMobile,
    vendorContactLine: vendorContactParts.join(" · "),
  };
}

export function downloadDailyExcelReport(state: MandiState): void {
  const activeDt = getActiveBusinessDateTime(state.shopProfile);
  const dateStr = activeDt.isoDate;
  const shopMeta = getShopDisplayMeta(state.shopProfile);
  const wb = XLSX.utils.book_new();

  // Sheet 1: Today_Sales_Profit
  let totalSoldKg = 0;
  let totalSalesInr = 0;
  let totalRealizedProfit = 0;

  const todayRows = state.stocks.map((s) => {
    const avgBuyRate =
      s.boughtKg > 0 ? Math.round(s.boughtCostInr / s.boughtKg) : 0;
    const costOfSold =
      s.boughtKg > 0 ? Math.round((s.soldKg * s.boughtCostInr) / s.boughtKg) : 0;
    const netProfit = Math.round(s.soldRevenueInr - costOfSold);
    const onlinePaid = s.soldOnlineInr ?? 0;
    const offlineCash =
      s.soldOfflineInr ?? Math.max(0, s.soldRevenueInr - onlinePaid);
    const sellRatesStr =
      s.sellRates && s.sellRates.length > 0
        ? s.sellRates
            .map((r) => `₹${r.ratePerKg}/kg (${Math.round(r.qtyKg * 100) / 100}kg)`)
            .join(", ")
        : "-";

    totalSoldKg = Math.round((totalSoldKg + s.soldKg) * 100) / 100;
    totalSalesInr += s.soldRevenueInr;
    totalRealizedProfit += netProfit;

    return {
      Date: dateStr,
      "Shop Name": shopMeta.shopName,
      Vegetable: s.name,
      "Hindi Name": s.hindiName || "-",
      "Qty Sold (kg)": Math.round(s.soldKg * 100) / 100,
      "Avg Buy Rate (INR/kg)": avgBuyRate,
      "Sell Rate(s)": sellRatesStr,
      "Total Sales (INR)": s.soldRevenueInr,
      Online_Paid_INR: onlinePaid,
      Offline_Cash_INR: offlineCash,
      "Cost of Sold (INR)": costOfSold,
      "Net Profit (INR)": netProfit,
    };
  });

  todayRows.push({
    Date: `${dateStr} (${activeDt.timeLabel})`,
    "Shop Name": shopMeta.vendorContactLine
      ? `${shopMeta.shopName} (${shopMeta.vendorContactLine})`
      : shopMeta.shopName,
    Vegetable: "TOTAL SUMMARY",
    "Hindi Name": "कुल हिसाब",
    "Qty Sold (kg)": totalSoldKg,
    "Avg Buy Rate (INR/kg)": 0,
    "Sell Rate(s)": `Total Kharid ₹${state.totalKharid} | Overall Net ₹${state.totalBikri - state.totalKharid}`,
    "Total Sales (INR)": totalSalesInr,
    Online_Paid_INR: state.totalOnlineBikri ?? 0,
    Offline_Cash_INR: state.totalOfflineBikri ?? state.totalBikri,
    "Cost of Sold (INR)": state.totalKharid,
    "Net Profit (INR)": totalRealizedProfit,
  });

  const wsToday = XLSX.utils.json_to_sheet(todayRows);
  wsToday["!cols"] = [
    { wch: 20 },
    { wch: 26 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 20 },
    { wch: 36 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsToday, "Today_Sales_Profit");

  // Sheet 2: Previous_Days_History
  const historyRows = [...(state.dailyHistory ?? [])]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((day) => ({
      Date: day.date,
      "Display Date": day.displayDate,
      "Total Kharid (INR)": day.totalKharid,
      "Total Bikri (INR)": day.totalBikri,
      "Net Profit (INR)": day.netProfit,
      "Top Sold Vegetable": day.topSoldVegetable,
      "Saved At": day.savedAt,
      "Rate & Item Breakdown":
        day.items && day.items.length > 0
          ? day.items
              .map(
                (it) =>
                  `${it.name}: ${it.soldKg}kg [${it.sellRatesSummary}] = ₹${it.salesInr} (Profit ₹${it.profitInr})`
              )
              .join(" | ")
          : "-",
    }));

  const wsHistory = XLSX.utils.json_to_sheet(
    historyRows.length > 0
      ? historyRows
      : [{ Date: dateStr, Message: "No previous daily history saved yet." }]
  );
  wsHistory["!cols"] = [
    { wch: 12 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 12 },
    { wch: 52 },
  ];
  XLSX.utils.book_append_sheet(wb, wsHistory, "Previous_Days_History");

  // Sheet 3: Udhaar_Receivable_Payable
  const udhaarRows = state.udhaarList.map((u) => ({
    "Person Name": u.customerName,
    Mobile: u.mobile || "-",
    Address: u.address || "-",
    Type:
      u.accountType === "PAYABLE"
        ? "Payable (Dena Hai)"
        : "Receivable (Lena Hai)",
    Online_Paid_INR: u.totalPaidOnlineInr ?? 0,
    Offline_Cash_INR: u.totalPaidOfflineInr ?? 0,
    "Pending Balance (INR)": u.amountInr,
    "Last Updated": u.lastUpdated,
    "Total Entries": u.history.length,
  }));

  const wsUdhaar = XLSX.utils.json_to_sheet(
    udhaarRows.length > 0
      ? udhaarRows
      : [
          {
            "Person Name": "No accounts",
            Online_Paid_INR: 0,
            Offline_Cash_INR: 0,
            "Pending Balance (INR)": 0,
          },
        ]
  );
  wsUdhaar["!cols"] = [
    { wch: 20 },
    { wch: 14 },
    { wch: 24 },
    { wch: 22 },
    { wch: 16 },
    { wch: 16 },
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsUdhaar, "Udhaar_Receivable_Payable");

  // Sheet 4: Live_Sabzi_Stock
  const stockRows = state.stocks.map((s) => {
    const avgCostRate =
      s.boughtKg > 0 ? Math.round(s.boughtCostInr / s.boughtKg) : 0;
    const remainingVal = Math.round(s.remainingKg * avgCostRate);
    return {
      Vegetable: s.name,
      "Hindi Name": s.hindiName || "-",
      "Remaining Stock (kg)": Math.round(s.remainingKg * 100) / 100,
      "Avg Buy Rate (INR/kg)": avgCostRate,
      "Estimated Stock Value (INR)": remainingVal,
      "Total Bought (kg)": Math.round(s.boughtKg * 100) / 100,
      "Total Bought Cost (INR)": s.boughtCostInr,
      "Total Sold (kg)": Math.round(s.soldKg * 100) / 100,
      "Total Sold Revenue (INR)": s.soldRevenueInr,
    };
  });

  const wsStock = XLSX.utils.json_to_sheet(
    stockRows.length > 0
      ? stockRows
      : [{ Vegetable: "No stock", "Remaining Stock (kg)": 0 }]
  );
  wsStock["!cols"] = [
    { wch: 16 },
    { wch: 14 },
    { wch: 20 },
    { wch: 20 },
    { wch: 24 },
    { wch: 18 },
    { wch: 22 },
    { wch: 16 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, wsStock, "Live_Sabzi_Stock");

  // Sheet 5: Customer_Bills_Margin (Vendor view including internal Cost & Profit Margin)
  const billRows = (state.customerBills ?? []).map((b) => ({
    "Bill No": b.billNumber,
    "Date & Time": b.dateTime,
    "Buyer Name": b.buyerName,
    "Items Breakdown": b.items
      .map((it) => `${it.item} ${it.qtyKg}kg @ ₹${it.sellRatePerKg}/kg = ₹${it.subtotalInr}`)
      .join(" | "),
    "Our Cost Price (INR)": b.totalCostInr,
    "Selling Bill Total (INR)": b.totalBillInr,
    Online_Paid_INR: b.paidOnlineInr ?? 0,
    Offline_Cash_INR: b.paidOfflineInr ?? 0,
    "Pending Udhaar (INR)": b.pendingBalanceInr ?? 0,
    "Net Profit Earned (INR)": b.netProfitInr,
    "Payment Status":
      b.paymentStatus === "UDHAAR_PENDING"
        ? "Udhaar Pending"
        : b.paymentStatus === "PARTIAL_PAID"
        ? "Partial Paid"
        : b.paymentStatus === "PAID_ONLINE"
        ? "Paid Online (UPI)"
        : "Paid Cash",
  }));

  const wsBills = XLSX.utils.json_to_sheet(
    billRows.length > 0
      ? billRows
      : [{ "Bill No": "-", "Buyer Name": "No customer bills yet", "Selling Bill Total (INR)": 0 }]
  );
  wsBills["!cols"] = [
    { wch: 12 },
    { wch: 20 },
    { wch: 18 },
    { wch: 56 },
    { wch: 20 },
    { wch: 22 },
    { wch: 16 },
    { wch: 16 },
    { wch: 20 },
    { wch: 22 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsBills, "Customer_Bills_Margin");

  XLSX.writeFile(wb, `MandiBol_Report_${dateStr}.xlsx`);
}

export function downloadOverallCsvReport(
  state: MandiState,
  monthlyData: MonthlyComparisonPoint[]
): void {
  const activeDt = getActiveBusinessDateTime(state.shopProfile);
  const dateStr = activeDt.isoDate;
  const shopMeta = getShopDisplayMeta(state.shopProfile);
  const munafa = state.totalBikri - state.totalKharid;
  const lines: string[] = [];

  lines.push(escapeCsvCell(`${shopMeta.shopName} Daily Business Report`));
  if (shopMeta.vendorContactLine) {
    lines.push(escapeCsvCell(shopMeta.vendorContactLine));
  }
  lines.push(`Date & Time,${escapeCsvCell(`${activeDt.displayDate} ${activeDt.timeLabel}`)}`);
  lines.push(`Total Kharid (INR),${state.totalKharid}`);
  lines.push(`Total Bikri (INR),${state.totalBikri}`);
  lines.push(`Net Munafa (INR),${munafa}`);
  lines.push("");

  lines.push("TODAY'S SALES & PROFIT TABLE");
  lines.push(
    "Vegetable,Remaining Stock (kg),Bought Qty (kg),Avg Buy Rate (INR/kg),Quantity Sold (kg),Sell Rates (INR/kg),Total Sales (INR),Net Item Profit (INR)"
  );
  for (const s of state.stocks) {
    const avgBuy = s.boughtKg > 0 ? Math.round(s.boughtCostInr / s.boughtKg) : 0;
    const sellRatesStr =
      s.sellRates && s.sellRates.length > 0
        ? s.sellRates.map((r) => `${r.ratePerKg}/kg (${r.qtyKg}kg)`).join(" | ")
        : "-";
    const itemProfit = Math.round(
      s.soldRevenueInr - (s.boughtKg > 0 ? (s.soldKg * s.boughtCostInr) / s.boughtKg : 0)
    );
    lines.push(
      [
        escapeCsvCell(`${s.name}${s.hindiName ? ` (${s.hindiName})` : ""}`),
        s.remainingKg,
        s.boughtKg,
        avgBuy,
        s.soldKg,
        escapeCsvCell(sellRatesStr),
        s.soldRevenueInr,
        itemProfit,
      ].join(",")
    );
  }
  lines.push("");

  lines.push("RECEIVABLE & PAYABLE LEDGER (UDHAAR KHATA)");
  lines.push("Person Name,Mobile,Address,Account Type,Pending Balance (INR),Last Updated");
  for (const u of state.udhaarList) {
    lines.push(
      [
        escapeCsvCell(u.customerName),
        escapeCsvCell(u.mobile || "-"),
        escapeCsvCell(u.address || "-"),
        u.accountType === "PAYABLE" ? "Payable (Dena Hai)" : "Receivable (Lena Hai)",
        u.amountInr,
        escapeCsvCell(u.lastUpdated),
      ].join(",")
    );
  }
  lines.push("");

  lines.push("MONTHLY SALES & PROFIT COMPARISON");
  lines.push("Month,Total Sales (INR),Net Profit (INR)");
  for (const m of monthlyData) {
    lines.push([escapeCsvCell(m.month), m.salesInr, m.profitInr].join(","));
  }

  triggerFileDownload(
    `MandiBol-Report-${dateStr}.csv`,
    lines.join("\n"),
    "text/csv;charset=utf-8;"
  );
}

export function downloadOverallPrintableReport(
  state: MandiState,
  monthlyData: MonthlyComparisonPoint[]
): void {
  const activeDt = getActiveBusinessDateTime(state.shopProfile);
  const dateStr = activeDt.isoDate;
  const shopMeta = getShopDisplayMeta(state.shopProfile);
  const munafa = state.totalBikri - state.totalKharid;
  const totalReceivable = state.udhaarList
    .filter((u) => u.accountType !== "PAYABLE")
    .reduce((acc, u) => acc + u.amountInr, 0);
  const totalPayable = state.udhaarList
    .filter((u) => u.accountType === "PAYABLE")
    .reduce((acc, u) => acc + u.amountInr, 0);

  const stockRows = state.stocks
    .map((s) => {
      const avgBuy = s.boughtKg > 0 ? Math.round(s.boughtCostInr / s.boughtKg) : 0;
      const sellRatesStr =
        s.sellRates && s.sellRates.length > 0
          ? s.sellRates.map((r) => `₹${r.ratePerKg}/kg`).join(", ")
          : "—";
      const itemProfit = Math.round(
        s.soldRevenueInr - (s.boughtKg > 0 ? (s.soldKg * s.boughtCostInr) / s.boughtKg : 0)
      );
      return `<tr>
        <td>${escapeHtml(s.name)} ${s.hindiName ? `(${escapeHtml(s.hindiName)})` : ""}</td>
        <td>${s.soldKg} kg</td>
        <td>₹${avgBuy}/kg</td>
        <td>${escapeHtml(sellRatesStr)}</td>
        <td>₹${s.soldRevenueInr.toLocaleString("en-IN")}</td>
        <td>${itemProfit >= 0 ? "+" : "-"}₹${Math.abs(itemProfit).toLocaleString("en-IN")}</td>
        <td>${s.remainingKg} kg</td>
      </tr>`;
    })
    .join("");

  const ledgerRows = state.udhaarList
    .map(
      (u) => `<tr>
        <td>${escapeHtml(u.customerName)}</td>
        <td>${escapeHtml(u.mobile || "—")}</td>
        <td>${escapeHtml(u.address || "—")}</td>
        <td>${u.accountType === "PAYABLE" ? "Payable (Dena Hai)" : "Receivable (Lena Hai)"}</td>
        <td>₹${u.amountInr.toLocaleString("en-IN")}</td>
      </tr>`
    )
    .join("");

  const monthRows = monthlyData
    .map(
      (m) => `<tr>
        <td>${escapeHtml(m.month)}</td>
        <td>₹${m.salesInr.toLocaleString("en-IN")}</td>
        <td>₹${m.profitInr.toLocaleString("en-IN")}</td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(shopMeta.shopName)} Report - ${dateStr}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; margin: 32px; line-height: 1.5; }
  h1 { margin: 0 0 4px; font-size: 24px; }
  .sub { color: #475569; margin: 0 0 20px; font-size: 14px; }
  .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 24px; }
  .kpi { border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; }
  .kpi .lbl { font-size: 12px; color: #475569; font-weight: 700; }
  .kpi .val { font-size: 18px; font-weight: 800; margin-top: 4px; }
  h2 { font-size: 16px; margin: 24px 0 10px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
  th { background: #f1f5f9; font-weight: 700; }
  @media print { body { margin: 12px; } }
</style>
</head>
<body>
  <h1>${escapeHtml(shopMeta.shopName)} — Daily Business &amp; Ledger Report</h1>
  <p class="sub">Generated for ${escapeHtml(activeDt.displayDate)} · ${escapeHtml(activeDt.timeLabel)}${shopMeta.vendorContactLine ? ` · ${escapeHtml(shopMeta.vendorContactLine)}` : ""}</p>
  <div class="kpis">
    <div class="kpi"><div class="lbl">Kharid (Cost)</div><div class="val">₹${state.totalKharid.toLocaleString("en-IN")}</div></div>
    <div class="kpi"><div class="lbl">Bikri (Sales)</div><div class="val">₹${state.totalBikri.toLocaleString("en-IN")}</div></div>
    <div class="kpi"><div class="lbl">Munafa (Profit)</div><div class="val">${munafa >= 0 ? "+" : "-"}₹${Math.abs(munafa).toLocaleString("en-IN")}</div></div>
    <div class="kpi"><div class="lbl">Receivable (Lena Hai)</div><div class="val">₹${totalReceivable.toLocaleString("en-IN")}</div></div>
    <div class="kpi"><div class="lbl">Payable (Dena Hai)</div><div class="val">₹${totalPayable.toLocaleString("en-IN")}</div></div>
  </div>
  <h2>Today's Sales, Stock &amp; Profit Table</h2>
  <table>
    <thead><tr><th>Vegetable</th><th>Sold Qty</th><th>Avg Buy Rate</th><th>Sell Rate(s)</th><th>Total Sales</th><th>Net Profit</th><th>Remaining Stock</th></tr></thead>
    <tbody>${stockRows}</tbody>
  </table>
  <h2>Customer &amp; Supplier Pending Ledger</h2>
  <table>
    <thead><tr><th>Person Name</th><th>Mobile</th><th>Address</th><th>Type</th><th>Pending Balance</th></tr></thead>
    <tbody>${ledgerRows}</tbody>
  </table>
  <h2>Monthly Sales &amp; Profit Comparison</h2>
  <table>
    <thead><tr><th>Month</th><th>Total Sales</th><th>Net Profit</th></tr></thead>
    <tbody>${monthRows}</tbody>
  </table>
</body>
</html>`;

  triggerFileDownload(
    `MandiBol-Printable-Report-${dateStr}.html`,
    html,
    "text/html;charset=utf-8;"
  );
}

export function buildAdviceSlipHtml(
  entry: UdhaarEntry,
  shopProfile?: ShopProfile
): string {
  const activeDt = getActiveBusinessDateTime(shopProfile);
  const shopMeta = getShopDisplayMeta(shopProfile);
  const isPayable = entry.accountType === "PAYABLE";
  const typeLabel = isPayable
    ? "Payable · देना है (Supplier Credit)"
    : "Receivable · लेना है (Customer Udhaar)";

  const rows = entry.history
    .map((tx) => {
      const isCredit = tx.type === "CREDIT";
      const label = isPayable
        ? isCredit
          ? "Credit Added (+₹)"
          : "Paid (-₹)"
        : isCredit
        ? "Udhaar Liya (+₹)"
        : "Jama Kiya (-₹)";
      return `<tr>
        <td>${escapeHtml(tx.dateTime)}</td>
        <td>${escapeHtml(label)}</td>
        <td>${escapeHtml(tx.note)}</td>
        <td>${isCredit ? "+" : "-"}₹${tx.amountInr.toLocaleString("en-IN")}</td>
        <td>₹${tx.balanceAfter.toLocaleString("en-IN")}</td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(shopMeta.shopName)} Advice Slip - ${escapeHtml(entry.customerName)}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; margin: 28px; max-width: 720px; }
  .card { border: 2px solid #0f172a; border-radius: 14px; padding: 22px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 16px; }
  h1 { margin: 0; font-size: 22px; }
  .meta { font-size: 13px; color: #475569; margin-top: 4px; }
  .profile { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; margin-bottom: 16px; font-size: 13px; }
  .pending { background: #ecfdf5; border: 2px solid #10b981; border-radius: 10px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
  .pending-amt { font-size: 24px; font-weight: 800; color: #065f46; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
  th { background: #f1f5f9; }
</style>
</head>
<body>
  <div class="card">
    <div class="head">
      <div>
        <h1>${escapeHtml(shopMeta.shopName)} · Payment Advice Slip</h1>
        <div class="meta">हिसाब पर्ची · Date: ${escapeHtml(activeDt.displayDate)} (${escapeHtml(activeDt.timeLabel)})${shopMeta.vendorContactLine ? ` · ${escapeHtml(shopMeta.vendorContactLine)}` : ""}</div>
      </div>
      <div class="meta">${escapeHtml(typeLabel)}</div>
    </div>
    <div class="profile">
      <div><strong>Person:</strong> ${escapeHtml(entry.customerName)}</div>
      <div><strong>Mobile:</strong> ${escapeHtml(entry.mobile || "Not provided")}</div>
      <div><strong>Address:</strong> ${escapeHtml(entry.address || "Not provided")}</div>
      <div><strong>Last Updated:</strong> ${escapeHtml(entry.lastUpdated)}</div>
      <div><strong>Paid Online (UPI):</strong> ₹${(entry.totalPaidOnlineInr ?? 0).toLocaleString("en-IN")}</div>
      <div><strong>Paid Offline (Cash):</strong> ₹${(entry.totalPaidOfflineInr ?? 0).toLocaleString("en-IN")}</div>
    </div>
    <div class="pending">
      <div><strong>Current Pending Balance (कुल बाकी)</strong></div>
      <div class="pending-amt">₹${entry.amountInr.toLocaleString("en-IN")}</div>
    </div>
    <table>
      <thead><tr><th>Date &amp; Time</th><th>Type</th><th>Details</th><th>Amount</th><th>Balance</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</body>
</html>`;
}

export function downloadPersonAdviceSlip(
  entry: UdhaarEntry,
  shopProfile?: ShopProfile
): void {
  const safeName = entry.customerName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const html = buildAdviceSlipHtml(entry, shopProfile);
  triggerFileDownload(
    `MandiBol-AdviceSlip-${safeName || "person"}-${getTodayIsoDate(shopProfile)}.html`,
    html,
    "text/html;charset=utf-8;"
  );
}

export function downloadPersonAdviceSlipExcel(
  entry: UdhaarEntry,
  shopProfile?: ShopProfile
): void {
  const dateStr = getTodayIsoDate(shopProfile);
  const shopMeta = getShopDisplayMeta(shopProfile);
  const safeName = entry.customerName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  const isPayable = entry.accountType === "PAYABLE";

  const wb = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.json_to_sheet([
    {
      "Shop Name": shopMeta.shopName,
      "Vendor Contact": shopMeta.vendorContactLine || "-",
      "Person Name": entry.customerName,
      Mobile: entry.mobile || "Not provided",
      Address: entry.address || "Not provided",
      "Account Type": isPayable
        ? "Payable (Dena Hai)"
        : "Receivable (Lena Hai)",
      "Pending Balance (INR)": entry.amountInr,
      "Last Updated": entry.lastUpdated,
      "Generated Date": dateStr,
    },
  ]);
  summarySheet["!cols"] = [
    { wch: 22 },
    { wch: 26 },
    { wch: 20 },
    { wch: 15 },
    { wch: 24 },
    { wch: 22 },
    { wch: 20 },
    { wch: 14 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, summarySheet, "Advice_Slip_Summary");

  const txRows = entry.history.map((tx) => {
    const isCredit = tx.type === "CREDIT";
    return {
      "Date & Time": tx.dateTime,
      Type: isPayable
        ? isCredit
          ? "Dena Likha (+INR)"
          : "Diya (-INR)"
        : isCredit
        ? "Udhaar Liya (+INR)"
        : "Jama Kiya (-INR)",
      Details: tx.note,
      "Amount (INR)": isCredit ? tx.amountInr : -tx.amountInr,
      "Balance After (INR)": tx.balanceAfter,
    };
  });

  const txSheet = XLSX.utils.json_to_sheet(
    txRows.length > 0
      ? txRows
      : [{ "Date & Time": dateStr, Type: "No transactions yet", "Amount (INR)": 0 }]
  );
  txSheet["!cols"] = [
    { wch: 22 },
    { wch: 20 },
    { wch: 36 },
    { wch: 16 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, txSheet, "Transaction_History");

  XLSX.writeFile(wb, `MandiBol_AdviceSlip_${safeName || "person"}_${dateStr}.xlsx`);
}

// Customer-facing Bill / Invoice (strictly hides vendor's internal cost & profit margin)
export function buildCustomerBillInvoiceHtml(
  bill: CustomerBill,
  shopProfile?: ShopProfile
): string {
  const shopMeta = getShopDisplayMeta(shopProfile);
  const rows = bill.items
    .map(
      (it, idx) => `<tr>
        <td>${idx + 1}</td>
        <td><strong>${escapeHtml(it.item)}</strong>${it.hindiName ? ` (${escapeHtml(it.hindiName)})` : ""}</td>
        <td style="text-align:right">${Math.round(it.qtyKg * 100) / 100} kg</td>
        <td style="text-align:right">₹${it.sellRatePerKg}/kg</td>
        <td style="text-align:right"><strong>₹${it.subtotalInr.toLocaleString("en-IN")}</strong></td>
      </tr>`
    )
    .join("");

  const statusText =
    bill.paymentStatus === "UDHAAR_PENDING"
      ? "Udhaar Pending (बाकी)"
      : bill.paymentStatus === "PARTIAL_PAID"
      ? "Partial Paid (आंशिक जमा)"
      : bill.paymentStatus === "PAID_ONLINE"
      ? "Paid Online (UPI)"
      : "Paid Cash (नकद जमा)";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(shopMeta.shopName)} Bill ${escapeHtml(bill.billNumber)} - ${escapeHtml(bill.buyerName)}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; margin: 28px; max-width: 700px; }
  .invoice { border: 2px solid #0f172a; border-radius: 14px; padding: 24px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 16px; }
  h1 { margin: 0; font-size: 22px; }
  .sub { font-size: 13px; color: #475569; margin-top: 4px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; margin-bottom: 16px; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border: 1px solid #cbd5e1; padding: 9px 10px; text-align: left; }
  th { background: #f1f5f9; font-weight: 700; }
  .total-box { margin-top: 16px; background: #ecfdf5; border: 2px solid #10b981; border-radius: 10px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
  .total-amt { font-size: 24px; font-weight: 800; color: #065f46; }
  .pay-split { margin-top: 12px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; }
  .foot { margin-top: 16px; text-align: center; font-size: 12px; color: #64748b; }
  @media print { body { margin: 10px; } }
</style>
</head>
<body>
  <div class="invoice">
    <div class="head">
      <div>
        <h1>${escapeHtml(shopMeta.shopName)} · Customer Bill / ग्राहक बिल</h1>
        <div class="sub">${shopMeta.vendorContactLine ? `${escapeHtml(shopMeta.vendorContactLine)} · ` : ""}Fresh Vegetables Receipt · ताज़ा सब्ज़ी बिल</div>
      </div>
      <div class="sub"><strong>Bill No:</strong> ${escapeHtml(bill.billNumber)}</div>
    </div>
    <div class="meta">
      <div><strong>Buyer Name:</strong> ${escapeHtml(bill.buyerName)}</div>
      <div><strong>Date &amp; Time:</strong> ${escapeHtml(bill.dateTime)}</div>
      <div><strong>Payment Status:</strong> ${escapeHtml(statusText)}</div>
      <div><strong>Total Items:</strong> ${bill.items.length}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Vegetable · सब्जी</th>
          <th style="text-align:right">Qty (kg)</th>
          <th style="text-align:right">Rate/kg</th>
          <th style="text-align:right">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="total-box">
      <div><strong>Grand Total · कुल बिल राशि</strong></div>
      <div class="total-amt">₹${bill.totalBillInr.toLocaleString("en-IN")}</div>
    </div>
    <div class="pay-split">
      <div><strong>Paid Online (UPI):</strong> ₹${(bill.paidOnlineInr ?? 0).toLocaleString("en-IN")}</div>
      <div><strong>Paid Offline (Cash):</strong> ₹${(bill.paidOfflineInr ?? 0).toLocaleString("en-IN")}</div>
      <div><strong>Pending Balance:</strong> ₹${(bill.pendingBalanceInr ?? 0).toLocaleString("en-IN")}</div>
    </div>
    <div class="foot">Dhanyavaad! Phir Aayein · ${escapeHtml(shopMeta.shopName)}</div>
  </div>
</body>
</html>`;
}

export function downloadCustomerBillInvoiceHtml(
  bill: CustomerBill,
  shopProfile?: ShopProfile
): void {
  const safeBuyer = bill.buyerName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const html = buildCustomerBillInvoiceHtml(bill, shopProfile);
  triggerFileDownload(
    `MandiBol-Bill-${bill.billNumber}-${safeBuyer || "customer"}.html`,
    html,
    "text/html;charset=utf-8;"
  );
}

export function downloadCustomerBillInvoiceExcel(
  bill: CustomerBill,
  shopProfile?: ShopProfile
): void {
  const shopMeta = getShopDisplayMeta(shopProfile);
  const safeBuyer = bill.buyerName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  const wb = XLSX.utils.book_new();

  const rows = bill.items.map((it, idx) => ({
    "S.No": idx + 1,
    "Shop Name": shopMeta.shopName,
    "Buyer Name": bill.buyerName,
    "Bill No": bill.billNumber,
    "Date & Time": bill.dateTime,
    Vegetable: it.item,
    "Hindi Name": it.hindiName || "-",
    "Quantity (kg)": Math.round(it.qtyKg * 100) / 100,
    "Rate (INR/kg)": it.sellRatePerKg,
    "Amount (INR)": it.subtotalInr,
  }));

  rows.push({
    "S.No": bill.items.length + 1,
    "Shop Name": shopMeta.vendorContactLine || shopMeta.shopName,
    "Buyer Name": bill.buyerName,
    "Bill No": bill.billNumber,
    "Date & Time": bill.dateTime,
    Vegetable: "GRAND TOTAL",
    "Hindi Name": "कुल बिल",
    "Quantity (kg)": Math.round(
      bill.items.reduce((acc, it) => acc + it.qtyKg, 0) * 100
    ) / 100,
    "Rate (INR/kg)": 0,
    "Amount (INR)": bill.totalBillInr,
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 6 },
    { wch: 22 },
    { wch: 18 },
    { wch: 10 },
    { wch: 20 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Customer_Bill");
  XLSX.writeFile(
    wb,
    `MandiBol_Bill_${bill.billNumber}_${safeBuyer || "customer"}.xlsx`
  );
}

function normalizeIndianMobile(raw?: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return "";
}

// Builds WhatsApp URL for a customer-facing multi-item bill (strictly hides internal cost & profit margin)
export function buildCustomerBillWhatsAppUrl(
  bill: CustomerBill,
  shopProfile?: ShopProfile,
  customerMobile?: string
): string {
  const shopMeta = getShopDisplayMeta(shopProfile);
  const statusText =
    bill.paymentStatus === "UDHAAR_PENDING"
      ? "Udhaar Pending (बाकी)"
      : bill.paymentStatus === "PARTIAL_PAID"
      ? "Partial Paid (आंशिक जमा)"
      : bill.paymentStatus === "PAID_ONLINE"
      ? "Paid Online (UPI)"
      : "Paid Cash (नकद जमा)";

  const itemLines = bill.items.map((it) => {
    const qty = Math.round(it.qtyKg * 100) / 100;
    const hindi = it.hindiName ? ` (${it.hindiName})` : "";
    return `• ${it.item}${hindi}: ${qty} kg x ₹${it.sellRatePerKg} = ₹${it.subtotalInr.toLocaleString("en-IN")}`;
  });

  const paidOnline = bill.paidOnlineInr ?? 0;
  const paidOffline = bill.paidOfflineInr ?? 0;
  const pendingBal = bill.pendingBalanceInr ?? 0;

  const lines = [
    `*${shopMeta.shopName}* · Sabzi Bill / सब्ज़ी बिल`,
    ...(shopMeta.vendorContactLine ? [shopMeta.vendorContactLine] : []),
    `Bill No: ${bill.billNumber}`,
    `Date: ${bill.dateTime}`,
    `Customer: ${bill.buyerName}`,
    ``,
    `*Items / सामान:*`,
    ...itemLines,
    ``,
    `*Grand Total (कुल बिल): ₹${bill.totalBillInr.toLocaleString("en-IN")}*`,
    `📱 Paid Online (UPI): ₹${paidOnline.toLocaleString("en-IN")}`,
    `💵 Paid Offline (Cash): ₹${paidOffline.toLocaleString("en-IN")}`,
    `⏳ Pending Balance: ₹${pendingBal.toLocaleString("en-IN")}`,
    `Status: ${statusText}`,
    `Dhanyavaad! Phir Aayein.`,
  ];

  const encoded = encodeURIComponent(lines.join("\n"));
  const cleanMobile = normalizeIndianMobile(customerMobile);
  return cleanMobile
    ? `https://wa.me/91${cleanMobile}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}

// Builds WhatsApp URL for an Udhaar (Receivable) or Supplier (Payable) balance slip
export function buildUdhaarSlipWhatsAppUrl(
  entry: UdhaarEntry,
  shopProfile?: ShopProfile
): string {
  const activeDt = getActiveBusinessDateTime(shopProfile);
  const shopMeta = getShopDisplayMeta(shopProfile);
  const isPayable = entry.accountType === "PAYABLE";
  const lastTx = entry.history[0] ?? null;

  let lastTxLine = "Last Entry: Koi purana len-den nahi";
  if (lastTx) {
    const isCredit = lastTx.type === "CREDIT";
    const txLabel = isPayable
      ? isCredit
        ? "Dena Likha (+)"
        : "Bhugtaan Diya (-)"
      : isCredit
      ? "Udhaar Liya (+)"
      : "Jama Kiya (-)";
    const splitDetails =
      !isCredit && ((lastTx.onlineInr ?? 0) > 0 || (lastTx.offlineInr ?? 0) > 0)
        ? ` [Online ₹${(lastTx.onlineInr ?? 0).toLocaleString("en-IN")}, Cash ₹${(lastTx.offlineInr ?? 0).toLocaleString("en-IN")}]`
        : "";
    lastTxLine = `Last Entry: ${txLabel} ₹${lastTx.amountInr.toLocaleString("en-IN")}${splitDetails} (${lastTx.dateTime}) — ${lastTx.note}`;
  }

  const totalOnline = entry.totalPaidOnlineInr ?? 0;
  const totalOffline = entry.totalPaidOfflineInr ?? 0;

  const lines = [
    `*${shopMeta.shopName}* · Khata Slip / हिसाब पर्ची`,
    ...(shopMeta.vendorContactLine ? [shopMeta.vendorContactLine] : []),
    `Date: ${activeDt.displayDate} · ${activeDt.timeLabel}`,
    `Name: ${entry.customerName}`,
    ...(entry.address ? [`Address: ${entry.address}`] : []),
    `Type: ${isPayable ? "Supplier Payable (देना है)" : "Customer Udhaar (लेना है)"}`,
    ``,
    `📱 Total Paid Online (UPI): ₹${totalOnline.toLocaleString("en-IN")}`,
    `💵 Total Paid Offline (Cash): ₹${totalOffline.toLocaleString("en-IN")}`,
    lastTxLine,
    entry.amountInr > 0
      ? `*Pending Balance (${isPayable ? "देना बाकी" : "कुल उधार बाकी"}): ₹${entry.amountInr.toLocaleString("en-IN")}*`
      : `*Balance: ₹0 (Chukta / पूरा हिसाब साफ़)*`,
    ``,
    entry.amountInr > 0 && !isPayable
      ? `Kripya samay par bhugtaan karein. Dhanyavaad!`
      : `Dhanyavaad!`,
  ];

  const encoded = encodeURIComponent(lines.join("\n"));
  const cleanMobile = normalizeIndianMobile(entry.mobile);
  return cleanMobile
    ? `https://wa.me/91${cleanMobile}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}
