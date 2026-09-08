/**
 * Årsredovisning K2 (BFNAR 2016:10) för mindre aktiebolag — datamodell.
 * Mappar kontosaldon till K2:s uppställningsformer för resultat- och
 * balansräkning (kostnadsslagsindelad RR). Dokumentet skrivs ut/undertecknas
 * och lämnas till Bolagsverket (papper eller digitalt via deras e-tjänst).
 */

export type K2Line = { account: number; closing: number };

export type K2Row = { label: string; amount: number; bold?: boolean; note?: number };

/**
 * Hela kronor. `Math.round(-0.2)` ger `-0`, som skrivs ut som "−0" i
 * flerårsöversikten och i förändringar i eget kapital — därav `+ 0`.
 */
const round = (n: number) => Math.round(n) + 0;

/** Summera konton i intervall [from, to] (debetsaldo positivt) */
function sum(lines: K2Line[], from: number, to: number, exclude: number[] = []): number {
  return lines
    .filter((l) => l.account >= from && l.account <= to && !exclude.includes(l.account))
    .reduce((s, l) => s + l.closing, 0);
}

export type K2Report = {
  incomeStatement: K2Row[];
  balanceAssets: K2Row[];
  balanceEquityLiabilities: K2Row[];
  netRevenue: number;
  /** Årets resultat, efter bokslutsdispositioner och skatt. */
  result: number;
  /** Resultat efter finansiella poster — flerårsöversiktens egen rad. */
  resultAfterFin: number;
  equity: {
    openingCapital: number; shareCapital: number; retained: number;
    /** Bundet EK utöver aktiekapitalet + enskild firmas/handelsbolagets EK. */
    otherEquity: number;
    yearResult: number; total: number;
  };
  balances: { assets: number; equityAndLiabilities: number };
};

/**
 * Varje post avrundas till hela kronor FÖRE summeringen, och summorna räknas
 * ur de avrundade posterna. Rundades summan i stället ur de orundade talen
 * kunde dokumentet visa rader som inte gick ihop med sin egen summa
 * (165 350 − 5 000 − 2 988 = 157 362 under en rörelseresultatrad som stod på
 * 157 361), och samma enkrona följde med till Skatteverket via SRU.
 */
export function buildK2Report(lines: K2Line[]): K2Report {
  /** Kontosaldon i hela kronor, debetsaldo positivt. */
  const kr = (from: number, to: number, exclude: number[] = []) =>
    round(sum(lines, from, to, exclude));
  /**
   * Samma, med omvänt tecken — intäkter, eget kapital och skulder visas
   * positiva. Negationen ligger INNANFÖR round(): `-round(0)` är `-0`, och
   * det skrevs ut som "−0" på tomma rader i förändringar i eget kapital.
   */
  const cr = (from: number, to: number, exclude: number[] = []) =>
    round(-sum(lines, from, to, exclude));

  // ---- Resultaträkning (kostnadsslagsindelad) ----
  const netRevenue = cr(3000, 3799, [3740]);
  // 3800–3899 (aktiverat arbete för egen räkning) föll tidigare ur
  // resultaträkningen helt, medan SRU-blanketten räknade med det. Samma
  // underlag gav då två olika resultat till Bolagsverket och Skatteverket.
  const otherIncome = cr(3740, 3740) + cr(3800, 3999);
  const materials = cr(4000, 4999);
  const external = cr(5000, 6999);
  const personnel = cr(7000, 7699);
  const depreciation = cr(7700, 7899);
  const otherOpEx = cr(7900, 7999);
  const operatingResult = netRevenue + otherIncome + materials + external + personnel + depreciation + otherOpEx;
  const finIncome = cr(8000, 8399);
  const finExpense = cr(8400, 8799);
  const resultAfterFin = operatingResult + finIncome + finExpense;
  const appropriations = cr(8800, 8899);
  const tax = cr(8900, 8998);
  const result = resultAfterFin + appropriations + tax;

  const incomeStatement: K2Row[] = [
    { label: "Nettoomsättning", amount: netRevenue },
    { label: "Övriga rörelseintäkter", amount: otherIncome },
    { label: "Råvaror och förnödenheter", amount: materials },
    { label: "Övriga externa kostnader", amount: external },
    { label: "Personalkostnader", amount: personnel, note: 2 },
    { label: "Av- och nedskrivningar av materiella och immateriella anläggningstillgångar", amount: depreciation },
    { label: "Övriga rörelsekostnader", amount: otherOpEx },
    { label: "Rörelseresultat", amount: operatingResult, bold: true },
    { label: "Övriga ränteintäkter och liknande resultatposter", amount: finIncome },
    { label: "Räntekostnader och liknande resultatposter", amount: finExpense },
    { label: "Resultat efter finansiella poster", amount: resultAfterFin, bold: true },
    { label: "Bokslutsdispositioner", amount: appropriations },
    { label: "Skatt på årets resultat", amount: tax },
    { label: "Årets resultat", amount: result, bold: true },
  ].filter((r) => r.amount !== 0 || r.bold);

  // ---- Balansräkning: tillgångar ----
  // Intervallen täcker 1000–1999 utan lucka. 1800–1899 (kortfristiga
  // placeringar) saknades och föll ur SUMMA TILLGÅNGAR, och byggnader och mark
  // låg under rubriken "Immateriella anläggningstillgångar".
  const intangibles = kr(1000, 1099);
  const buildings = kr(1100, 1199);
  const machines = kr(1200, 1299);
  const financialAssets = kr(1300, 1399);
  const inventory = kr(1400, 1499);
  const receivables = kr(1500, 1599);
  const otherReceivables = kr(1600, 1799);
  const shortTermInvestments = kr(1800, 1899);
  const cash = kr(1900, 1999);
  const assets = intangibles + buildings + machines + financialAssets + inventory
    + receivables + otherReceivables + shortTermInvestments + cash;

  const balanceAssets: K2Row[] = [
    { label: "Immateriella anläggningstillgångar", amount: intangibles },
    { label: "Byggnader och mark", amount: buildings },
    { label: "Materiella anläggningstillgångar (inventarier, verktyg och installationer)", amount: machines, note: 3 },
    { label: "Finansiella anläggningstillgångar", amount: financialAssets },
    { label: "Varulager m.m.", amount: inventory },
    { label: "Kundfordringar", amount: receivables },
    { label: "Övriga fordringar och förutbetalda kostnader", amount: otherReceivables },
    { label: "Kortfristiga placeringar", amount: shortTermInvestments },
    { label: "Kassa och bank", amount: cash },
    { label: "SUMMA TILLGÅNGAR", amount: assets, bold: true },
  ].filter((r) => r.amount !== 0 || r.bold);

  // ---- Balansräkning: eget kapital och skulder ----
  // Intervallen täcker 2000–2999 utan lucka. Tre grupper saknades:
  // 2082–2090 (reservfond, uppskrivningsfond, ej registrerat aktiekapital),
  // 2200–2299 (avsättningar) och 2000–2080 (enskild firmas och
  // handelsbolagets eget kapital). Den sista var värst: snabbhändelsen
  // "Eget uttag" bokar D 2013, och ett aktiebolag som råkade använda den fick
  // en balansräkning som inte balanserade — i det utskrivna dokumentet till
  // Bolagsverket, utan varning.
  const shareCapital = cr(2081, 2081);
  const otherEquityFunds = cr(2082, 2090);
  const soleTraderEquity = cr(2000, 2080, [2019]);
  const otherEquity = otherEquityFunds + soleTraderEquity;
  const retained = cr(2091, 2098);
  const bookedYearResult = cr(2099, 2099) + cr(2019, 2019);
  const yearResult = bookedYearResult !== 0 ? bookedYearResult : result;
  const equityTotal = shareCapital + otherEquity + retained + yearResult;
  const untaxedReserves = cr(2100, 2199);
  const provisions = cr(2200, 2299);
  const supplierDebt = cr(2440, 2449);
  const taxDebts = cr(2500, 2599) + cr(2600, 2699) + cr(2700, 2799);
  const otherDebts = cr(2300, 2399) + cr(2400, 2439) + cr(2450, 2499) + cr(2800, 2999);
  const equityAndLiabilities = equityTotal + untaxedReserves + provisions
    + supplierDebt + taxDebts + otherDebts;

  const balanceEquityLiabilities: K2Row[] = [
    { label: "Aktiekapital", amount: shareCapital },
    { label: "Övrigt eget kapital", amount: otherEquity },
    { label: "Balanserat resultat", amount: retained },
    { label: "Årets resultat", amount: yearResult },
    { label: "Summa eget kapital", amount: equityTotal, bold: true },
    { label: "Obeskattade reserver", amount: untaxedReserves },
    { label: "Avsättningar", amount: provisions },
    { label: "Leverantörsskulder", amount: supplierDebt },
    { label: "Skatteskulder och momsskulder", amount: taxDebts },
    { label: "Övriga skulder", amount: otherDebts },
    { label: "SUMMA EGET KAPITAL OCH SKULDER", amount: equityAndLiabilities, bold: true },
  ].filter((r) => r.amount !== 0 || r.bold);

  return {
    incomeStatement,
    balanceAssets,
    balanceEquityLiabilities,
    netRevenue,
    result,
    resultAfterFin,
    equity: {
      openingCapital: shareCapital + retained,
      shareCapital,
      retained,
      otherEquity,
      yearResult,
      total: equityTotal,
    },
    balances: { assets, equityAndLiabilities },
  };
}
