/**
 * Belopp i PDF-filerna.
 *
 * VARFÖR PROVET FINNS. `toLocaleString("sv-SE")` ger U+2212 MINUS SIGN, inte
 * bindestreck. @react-pdf renderar med standard-Helvetica (WinAnsi) och utan
 * `Font.register` — och WinAnsi saknar U+2212. Tecknet ritades med bredd 0,
 * alltså ingenting alls: kostnader och skulder trycktes som POSITIVA tal i
 * resultat-, balans- och huvudboksrapporten, i momsdeklarationen och på
 * kreditfakturor. Samma filer ligger i arkiv-zippen som ska bevaras i sju år.
 *
 * Felet syns inte i ett ögonkast — talet står där, bara utan sitt tecken — och
 * ingen typkontroll kan hitta det. Därför prövas tecknet här, kodpunkt för
 * kodpunkt, mot den teckenuppsättning PDF-motorn faktiskt kan rita.
 */
import { describe, it, expect } from "vitest";
import { pdfAmount, fmtKr } from "@/lib/reports/pdf-shared";

/**
 * WinAnsi (CP1252) är standard-Helveticas teckenuppsättning i @react-pdf.
 * Allt utanför den ritas inte. Tusenavskiljaren U+00A0 finns i WinAnsi
 * (position 160) och är alltså i sin ordning; U+2212 finns inte.
 */
const isWinAnsi = (cp: number) =>
  cp === 0x20ac || cp === 0x201a || cp === 0x0192 || cp === 0x201e
  || cp === 0x2026 || cp === 0x2020 || cp === 0x2021 || cp === 0x02c6
  || cp === 0x2030 || cp === 0x0160 || cp === 0x2039 || cp === 0x0152
  || cp === 0x017d || cp === 0x2018 || cp === 0x2019 || cp === 0x201c
  || cp === 0x201d || cp === 0x2022 || cp === 0x2013 || cp === 0x2014
  || cp === 0x02dc || cp === 0x2122 || cp === 0x0161 || cp === 0x203a
  || cp === 0x0153 || cp === 0x017e || cp === 0x0178
  || (cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa0 && cp <= 0xff);

describe("pdfAmount ritar tecken som PDF-motorn kan rita", () => {
  const belopp = [-5000, -0.5, -1234567.89, -12, 0, 12, 1234567.89, 5000];

  for (const n of belopp) {
    it(`${n} innehåller bara WinAnsi-tecken`, () => {
      for (const decimals of [0, 2]) {
        const s = pdfAmount(n, decimals);
        const utanför = [...s].filter((ch) => !isWinAnsi(ch.codePointAt(0)!));
        expect(utanför, `${s} innehåller tecken utanför WinAnsi: ${utanför.join(" ")}`)
          .toEqual([]);
      }
    });
  }

  it("minustecknet är ett bindestreck, inte U+2212", () => {
    expect(fmtKr(-5000)).toBe("-5 000,00");
    expect([...fmtKr(-5000)][0].codePointAt(0)).toBe(0x2d);
    // Källan till felet: så här ser sv-SE ut utan omskrivningen.
    expect([...(-5000).toLocaleString("sv-SE")][0].codePointAt(0)).toBe(0x2212);
  });

  it("negativa belopp behåller sitt tecken", () => {
    expect(fmtKr(-5000).startsWith("-")).toBe(true);
    expect(pdfAmount(-5000, 0)).toBe("-5 000");
  });

  it("tusenavskiljaren lämnas orörd (U+00A0 finns i WinAnsi)", () => {
    expect(fmtKr(1234.5)).toBe("1 234,50");
  });

  it("ett belopp som rundas till noll skrivs inte som negativt", () => {
    // fmtKr(-0) gav "−0,00" på nollrader i balansrapporten.
    expect(fmtKr(-0)).toBe("0,00");
    expect(fmtKr(-0.004)).toBe("0,00");
    expect(pdfAmount(-0.4, 0)).toBe("0");
    // …men ett belopp som faktiskt rundas till −1 ska förbli negativt.
    expect(pdfAmount(-0.6, 0)).toBe("-1");
    expect(fmtKr(-0.005)).toBe("-0,01");
  });

  it("noll är noll", () => {
    expect(fmtKr(0)).toBe("0,00");
    expect(pdfAmount(0, 0)).toBe("0");
  });
});
