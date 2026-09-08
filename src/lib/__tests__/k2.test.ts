import { describe, it, expect } from "vitest";
import { buildK2Report } from "@/lib/k2/report";

// Litet AB: aktiekapital 25 000, försäljning 100 000, kostnader 40 000,
// lön 20 000 + avgifter 6 284, skatt bokförd 6 000, resultat mot 2099.
const lines = [
  { account: 1930, closing: 71716 },     // bank
  { account: 1510, closing: 10000 },     // kundfordringar
  { account: 2081, closing: -25000 },    // aktiekapital
  { account: 2099, closing: -27716 },    // årets resultat (bokfört)
  { account: 2440, closing: -5000 },     // leverantörsskulder
  { account: 2510, closing: -6000 },     // skatteskuld
  { account: 2710, closing: -4000 },     // personalskatt
  { account: 2731, closing: -2000 },     // sociala avgifter
  { account: 2611, closing: -12000 },    // utgående moms
  { account: 3011, closing: -100000 },   // försäljning
  { account: 5420, closing: 40000 },     // programvara
  { account: 7210, closing: 20000 },     // lön
  { account: 7510, closing: 6284 },      // arbetsgivaravgift
  { account: 8910, closing: 6000 },      // skatt på årets resultat
];

describe("buildK2Report", () => {
  const r = buildK2Report(lines);

  it("beräknar nettoomsättning och årets resultat", () => {
    expect(r.netRevenue).toBe(100000);
    expect(r.result).toBe(100000 - 40000 - 20000 - 6284 - 6000);
  });

  it("balansräkningen balanserar", () => {
    expect(r.balances.assets).toBe(81716);
    expect(r.balances.equityAndLiabilities).toBe(81716);
  });

  it("eget kapital delas upp korrekt", () => {
    expect(r.equity.shareCapital).toBe(25000);
    expect(r.equity.yearResult).toBe(27716); // bokfört 2099 används
    expect(r.equity.total).toBe(52716);
  });

  it("personalkostnader och skatt hamnar på egna rader", () => {
    const pers = r.incomeStatement.find((x) => x.label === "Personalkostnader");
    expect(pers?.amount).toBe(-26284);
    const tax = r.incomeStatement.find((x) => x.label.startsWith("Skatt"));
    expect(tax?.amount).toBe(-6000);
  });

  it("momsskuld ingår i skatteskulder-raden (skulder visas positiva)", () => {
    const taxRow = r.balanceEquityLiabilities.find((x) => x.label.includes("Skatteskulder"));
    expect(taxRow?.amount).toBe(6000 + 4000 + 2000 + 12000);
  });
});

/**
 * Kontogrupper som föll ur uppställningen. Var och en gav en balansräkning
 * som inte balanserade — i det dokument som lämnas till Bolagsverket.
 *
 * Metod: lägg till ett konto ur gruppen och en lika stor motpost på ett konto
 * som redan räknades. Balanserar rapporten fortfarande är gruppen med.
 */
describe("balansräkningen tappar inga kontogrupper", () => {
  const cases: { group: string; account: number; closing: number; counter: number }[] = [
    { group: "kortfristiga placeringar", account: 1810, closing: 50000, counter: -50000 },
    { group: "avsättningar", account: 2220, closing: -50000, counter: 50000 },
    { group: "reservfond m.fl. (2082–2090)", account: 2086, closing: -50000, counter: 50000 },
    { group: "enskild firmas eget kapital", account: 2010, closing: -50000, counter: 50000 },
    // Den här är ett klick bort i appen: snabbhändelsen "Eget uttag" bokar
    // D 2013 / K 1930 och erbjöds även aktiebolag.
    { group: "eget uttag (2013)", account: 2013, closing: 5000, counter: -5000 },
    { group: "egen insättning (2018)", account: 2018, closing: -5000, counter: 5000 },
    { group: "byggnader och mark", account: 1110, closing: 50000, counter: -50000 },
  ];

  for (const c of cases) {
    it(`${c.group} (konto ${c.account}) räknas med`, () => {
      const r = buildK2Report([
        ...lines,
        { account: c.account, closing: c.closing },
        { account: 1930, closing: c.counter },
      ]);
      expect(r.balances.assets).toBe(r.balances.equityAndLiabilities);
    });
  }

  it("varje krona mellan 1000 och 2999 hamnar i balansräkningen", () => {
    // Ett konto ur varje hundratal — ingen får tappas bort tyst.
    const spread = [
      1050, 1150, 1250, 1350, 1450, 1550, 1650, 1750, 1850, 1950,
    ].map((account) => ({ account, closing: 1000 }));
    const liabilities = [
      2050, 2150, 2250, 2350, 2450, 2550, 2650, 2750, 2850, 2950,
    ].map((account) => ({ account, closing: -1000 }));
    const r = buildK2Report([...spread, ...liabilities]);
    expect(r.balances.assets).toBe(10000);
    expect(r.balances.equityAndLiabilities).toBe(10000);
  });
});

describe("resultaträkningen tappar inga kontogrupper", () => {
  it("aktiverat arbete för egen räkning (3800–3899) räknas med", () => {
    // Föll tidigare ur K2 helt, medan SRU-blanketten räknade med det — samma
    // underlag gav då olika resultat till Bolagsverket och Skatteverket.
    const r = buildK2Report([{ account: 3850, closing: -10000 }]);
    expect(r.result).toBe(10000);
    const row = r.incomeStatement.find((x) => x.label === "Övriga rörelseintäkter");
    expect(row?.amount).toBe(10000);
  });

  it("varje krona mellan 3000 och 8998 hamnar i årets resultat", () => {
    const spread = [
      3500, 3850, 3950, 4500, 5500, 6500, 7500, 7800, 7950, 8200, 8500, 8850, 8950,
    ].map((account) => ({ account, closing: 1000 }));
    const r = buildK2Report(spread);
    // 13 konton × 1 000 kr debet = 13 000 kr kostnad = −13 000 kr resultat
    expect(r.result).toBe(-13000);
  });
});

/**
 * Varje rad rundades för sig medan summan rundades ur de orundade talen, så
 * det utskrivna dokumentet kunde visa rader som inte gick ihop med sin egen
 * summa. Samma enkrona följde med till Skatteverket via SRU.
 */
describe("de utskrivna raderna summerar till de utskrivna summorna", () => {
  const öresLines = [
    { account: 1930, closing: 18396.4 },
    { account: 1510, closing: 15527.3 },
    { account: 2081, closing: -5000.2 },
    { account: 2440, closing: -18396.1 },
    { account: 3011, closing: -165349.79 },
    { account: 4010, closing: 5000.4 },
    { account: 5420, closing: 2988.49 },
  ];
  const r = buildK2Report(öresLines);

  const amount = (rows: { label: string; amount: number }[], label: string) =>
    rows.find((x) => x.label === label)!.amount;

  it("rörelseresultatet är summan av raderna ovanför", () => {
    const rr = r.incomeStatement;
    const parts = rr
      .filter((x) => !x.bold && rr.indexOf(x) < rr.findIndex((y) => y.label === "Rörelseresultat"))
      .reduce((s, x) => s + x.amount, 0);
    expect(amount(rr, "Rörelseresultat")).toBe(parts);
  });

  it("SUMMA TILLGÅNGAR är summan av tillgångsraderna", () => {
    const rows = r.balanceAssets.filter((x) => x.label !== "SUMMA TILLGÅNGAR");
    expect(amount(r.balanceAssets, "SUMMA TILLGÅNGAR"))
      .toBe(rows.reduce((s, x) => s + x.amount, 0));
  });

  it("SUMMA EGET KAPITAL OCH SKULDER är summan av sina rader", () => {
    const rows = r.balanceEquityLiabilities.filter(
      (x) => x.label !== "SUMMA EGET KAPITAL OCH SKULDER" && x.label !== "Summa eget kapital");
    expect(amount(r.balanceEquityLiabilities, "SUMMA EGET KAPITAL OCH SKULDER"))
      .toBe(rows.reduce((s, x) => s + x.amount, 0));
  });

  it("Summa eget kapital är summan av egetkapitalraderna", () => {
    const labels = ["Aktiekapital", "Övrigt eget kapital", "Balanserat resultat", "Årets resultat"];
    const parts = r.balanceEquityLiabilities
      .filter((x) => labels.includes(x.label))
      .reduce((s, x) => s + x.amount, 0);
    expect(amount(r.balanceEquityLiabilities, "Summa eget kapital")).toBe(parts);
    // …och samma tal som flerårsöversikten och soliditeten räknar på
    expect(r.equity.total).toBe(parts);
  });

  it("förändringar i eget kapital summerar till samma total", () => {
    const e = r.equity;
    expect(e.shareCapital + e.otherEquity + e.retained + e.yearResult).toBe(e.total);
  });
});

describe("flerårsöversikten", () => {
  it("'Resultat efter finansiella poster' är just det, inte årets resultat", () => {
    const r = buildK2Report([
      { account: 3011, closing: -100000 },
      { account: 8910, closing: 20000 },   // bokförd skatt
      { account: 1930, closing: 80000 },
    ]);
    expect(r.resultAfterFin).toBe(100000);
    expect(r.result).toBe(80000);
    expect(r.resultAfterFin).not.toBe(r.result);
  });

  it("ett nollkonto ger 0, inte −0", () => {
    const r = buildK2Report([{ account: 2081, closing: 0 }, { account: 2091, closing: -0.2 }]);
    expect(Object.is(r.equity.shareCapital, -0)).toBe(false);
    expect(Object.is(r.equity.retained, -0)).toBe(false);
  });
});
