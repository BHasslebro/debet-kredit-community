import { describe, it, expect } from "vitest";
import { buildInk2Sru } from "@/lib/sru/build";

// Samma test-AB som K2-testet: vinst 27 716 efter skatt, bokförd skatt 6 000
const lines = [
  { account: 1930, closing: 71716 },
  { account: 1510, closing: 10000 },
  { account: 2081, closing: -25000 },
  { account: 2099, closing: -27716 },
  { account: 2440, closing: -5000 },
  { account: 2510, closing: -6000 },
  { account: 2710, closing: -4000 },
  { account: 2731, closing: -2000 },
  { account: 2611, closing: -12000 },
  { account: 3011, closing: -100000 },
  { account: 5420, closing: 40000 },
  { account: 7210, closing: 20000 },
  { account: 7510, closing: 6284 },
  { account: 8910, closing: 6000 },
];

const sru = buildInk2Sru({
  taxYear: 2026, org12: "165561234567", name: "Testbolaget AB",
  fiscalStart: "2026-01-01", fiscalEnd: "2026-12-31",
  lines, created: new Date("2027-06-01T09:00:00Z"),
});

describe("buildInk2Sru", () => {
  it("innehåller alla tre blanketterna och avslutas med FIL_SLUT en gång", () => {
    expect(sru).toContain("#BLANKETT INK2-2026P4");
    expect(sru).toContain("#BLANKETT INK2R-2026P4");
    expect(sru).toContain("#BLANKETT INK2S-2026P4");
    expect(sru.match(/#FIL_SLUT/g)).toHaveLength(1);
    expect(sru.match(/#BLANKETTSLUT/g)).toHaveLength(3);
  });

  it("INK2R: räkenskapsschemat mappas rätt", () => {
    expect(sru).toContain("#UPPGIFT 7281 71716");   // 2.26 kassa/bank
    expect(sru).toContain("#UPPGIFT 7251 10000");   // 2.19 kundfordringar
    expect(sru).toContain("#UPPGIFT 7301 25000");   // 2.27 bundet EK
    expect(sru).toContain("#UPPGIFT 7302 27716");   // 2.28 fritt EK (bokfört 2099)
    expect(sru).toContain("#UPPGIFT 7365 5000");    // 2.45 leverantörsskulder
    expect(sru).toContain("#UPPGIFT 7368 6000");    // 2.49 skatteskulder (25xx)
    expect(sru).toContain("#UPPGIFT 7369 18000");   // 2.48 övriga (moms 12000 + 2710/2731)
    expect(sru).toContain("#UPPGIFT 7410 100000");  // 3.1 nettoomsättning
    expect(sru).toContain("#UPPGIFT 7513 40000");   // 3.7 övriga externa
    expect(sru).toContain("#UPPGIFT 7514 26284");   // 3.8 personalkostnader
    expect(sru).toContain("#UPPGIFT 7528 6000");    // 3.25 skatt
    expect(sru).toContain("#UPPGIFT 7450 27716");   // 3.26 vinst
  });

  it("INK2R balanserar: tillgångar = EK + skulder", () => {
    const get = (code: number) => {
      const m = sru.match(new RegExp(`#UPPGIFT ${code} (-?\\d+)`));
      return m ? parseInt(m[1], 10) : 0;
    };
    const assets = get(7281) + get(7251);
    const ekAndDebt = get(7301) + get(7302) + get(7365) + get(7368) + get(7369);
    expect(assets).toBe(ekAndDebt);
  });

  it("INK2S: vinst 4.1, skatten återläggs 4.3a, överskott 4.15 → INK2 1.1", () => {
    expect(sru).toContain("#UPPGIFT 7650 27716");   // 4.1
    expect(sru).toContain("#UPPGIFT 7651 6000");    // 4.3a
    expect(sru).toContain("#UPPGIFT 7670 33716");   // 4.15 = 27716 + 6000
    expect(sru).toContain("#UPPGIFT 7104 33716");   // INK2 1.1
    expect(sru).not.toContain("#UPPGIFT 7770");
  });

  it("förlustbolag hamnar på 7550/7750/7770/7114", () => {
    const loss = buildInk2Sru({
      taxYear: 2026, org12: "165561234567", name: "Testbolaget AB",
      fiscalStart: "2026-01-01", fiscalEnd: "2026-12-31",
      lines: [
        { account: 1930, closing: 20000 },
        { account: 2081, closing: -25000 },
        { account: 3011, closing: -10000 },
        { account: 5420, closing: 15000 },
      ],
      created: new Date("2027-06-01T09:00:00Z"),
    });
    expect(loss).toContain("#UPPGIFT 7550 5000");
    expect(loss).toContain("#UPPGIFT 7750 5000");
    expect(loss).toContain("#UPPGIFT 7770 5000");
    expect(loss).toContain("#UPPGIFT 7114 5000");
  });
});

/**
 * INK2R:s resultatrader måste gå ihop med 3.26 (7450 vinst / 7550 förlust).
 * Varje rad rundades tidigare för sig medan resultatet rundades ur de
 * orundade talen, så blanketten kunde lämnas till Skatteverket med
 * 165 350 − 5 000 − 2 988 = 157 362 under ett 7450 som stod på 157 361.
 */
describe("INK2R går ihop med sig själv", () => {
  const field = (file: string, code: number): number => {
    const m = new RegExp(`^#UPPGIFT ${code} (-?\\d+)$`, "m").exec(file);
    return m ? parseInt(m[1], 10) : 0;
  };

  /** 3.1 + 3.4 − kostnadsraderna + finansiellt + disp − skatt */
  const derivedResult = (file: string) =>
    field(file, 7410) + field(file, 7413)
    - field(file, 7511) - field(file, 7513) - field(file, 7514)
    - field(file, 7515) - field(file, 7517)
    + field(file, 7417) - field(file, 7522)
    + field(file, 7422) - field(file, 7527)
    - field(file, 7528);

  const build = (l: { account: number; closing: number }[]) => buildInk2Sru({
    taxYear: 2026, org12: "165561234567", name: "Testbolaget AB",
    fiscalStart: "2026-01-01", fiscalEnd: "2026-12-31",
    lines: l, created: new Date("2027-06-01T09:00:00Z"),
  });

  it("raderna summerar till 3.26 på jämna kronor", () => {
    expect(derivedResult(sru)).toBe(field(sru, 7450));
  });

  it("raderna summerar till 3.26 också med ören i underlaget", () => {
    // Öresbeloppen är valda så att varje rad rundas nedåt och den gamla
    // koden hamnade en krona fel på totalen.
    const ören = build([
      { account: 1930, closing: 18396.4 },
      { account: 2081, closing: -5000.2 },
      { account: 3011, closing: -165349.79 },
      { account: 4010, closing: 5000.4 },
      { account: 5420, closing: 2988.49 },
    ]);
    expect(derivedResult(ören)).toBe(field(ören, 7450));
  });

  it("INK2R 3.26 och INK2S 4.1 är samma tal", () => {
    const ören = build([
      { account: 3011, closing: -165349.79 },
      { account: 4010, closing: 5000.4 },
      { account: 5420, closing: 2988.49 },
      { account: 1930, closing: 157360.9 },
    ]);
    expect(field(ören, 7450)).toBe(field(ören, 7650));
  });

  it("ett negativt räntenetto faller inte ur blanketten", () => {
    // 8000–8399 innehåller både ränteintäkter och valutakursförluster. Ett
    // negativt netto skrevs varken på 3.16 eller 3.18 och försvann helt.
    const ränta = build([
      { account: 3011, closing: -100000 },
      { account: 8330, closing: 4000 },   // valutakursförlust i 8000-serien
      { account: 1930, closing: 96000 },
    ]);
    expect(derivedResult(ränta)).toBe(field(ränta, 7450));
    expect(field(ränta, 7450)).toBe(96000);
  });
});
