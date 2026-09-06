/**
 * Avsändaren på fakturan.
 *
 * VARFÖR PROVET FINNS. `settings`-raden heter `company_name`, medan
 * `InvoicePdfData["company"]` heter `name`. Både PDF-routen och
 * e-postutskicket skickade in `settings` rakt av, och `d.company.name` blev
 * `undefined`. Fakturahuvudet började alltså på gatuadressen, och den
 * lagstadgade sidfoten — som ska bära avsändarens namn och organisationsnummer
 * — trycktes utan namn. På den faktura kunden får.
 *
 * Typkontrollen kunde inte hitta det: `select("*")` på en otypad Supabase-
 * klient ger `any`, och `any` passar in var som helst. Därför ligger
 * omskrivningen numera i en typad funktion, och den funktionen prövas här.
 */
import { describe, it, expect } from "vitest";
import { companyFromSettings } from "@/lib/invoicing/invoice-pdf";

const settingsRow = {
  company_name: "Testbolaget AB",
  org_number: "556000-0000",
  vat_number: "SE556000000001",
  address: "Storgatan 1",
  postal_code: "111 22",
  city: "Stockholm",
  email: "faktura@testbolaget.se",
  phone: "08-123 45 67",
  bankgiro: "123-4567",
  plusgiro: null,
  iban: null,
  bic: null,
  // Fält som finns i raden men inte hör hemma på fakturan
  logo_path: "logos/testbolaget.png",
  company_type: "aktiebolag",
};

describe("companyFromSettings", () => {
  it("företagsnamnet hamnar i name — inte bara i company_name", () => {
    expect(companyFromSettings(settingsRow).name).toBe("Testbolaget AB");
  });

  it("namnet är aldrig undefined, ens när raden saknar värde", () => {
    // Ett tomt namn syns som en tom rad; undefined försvinner spårlöst.
    expect(companyFromSettings({}).name).toBe("");
    expect(companyFromSettings({ company_name: null }).name).toBe("");
  });

  it("resten av avsändarblocket följer med", () => {
    const c = companyFromSettings(settingsRow);
    expect(c.org_number).toBe("556000-0000");
    expect(c.vat_number).toBe("SE556000000001");
    expect(c.address).toBe("Storgatan 1");
    expect(c.postal_code).toBe("111 22");
    expect(c.city).toBe("Stockholm");
    expect(c.email).toBe("faktura@testbolaget.se");
    expect(c.phone).toBe("08-123 45 67");
    expect(c.bankgiro).toBe("123-4567");
  });

  it("varje fält fakturamallen läser är med", () => {
    // Mallen läser company.<fält> på tolv ställen. Saknas ett av dem blir det
    // undefined i PDF:en, alltså en tom rad utan felmeddelande.
    const c = companyFromSettings(settingsRow);
    for (const key of [
      "name", "org_number", "vat_number", "address", "postal_code", "city",
      "email", "phone", "bankgiro", "plusgiro", "iban", "bic",
    ]) {
      expect(Object.hasOwn(c, key), `avsändarblocket saknar ${key}`).toBe(true);
    }
  });
});
