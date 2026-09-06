import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { sections, visibleSections, activeHref } from "@/components/nav-links";

/**
 * Vänstermenyn är en konfiguration, och konfigurationer fångas aldrig av
 * kodgranskning: en felstavad href ger inget typfel, ingen byggvarning och
 * ingen röd testrad — bara en 404 den dagen någon klickar. I community väger
 * det tyngre än i licensutgåvan, för community har färre sidor: menymodellen
 * kopierades hit från en app med drygt dubbelt så många rutter, och varje rad
 * som följde med utan att sidan gjorde det hade blivit en trasig länk.
 */

const APP = join(process.cwd(), "src/app/(app)");
const allLinks = sections.flatMap((s) => s.links);

/** /rapporter → src/app/(app)/rapporter. "/" → src/app/(app)/page.tsx. */
function routeExists(href: string): boolean {
  const dir = href === "/" ? APP : join(APP, href.slice(1));
  return existsSync(join(dir, "page.tsx"));
}

describe("vänstermenyn", () => {
  it("har poster att kontrollera", () => {
    // Sanity: går importen sönder ska testet falla här, inte tyst godkänna noll.
    expect(allLinks.length).toBeGreaterThan(15);
  });

  it.each(allLinks.map((l) => [l.label, l.href] as const))(
    "%s pekar på en sida som finns (%s)",
    (_label, href) => {
      expect(routeExists(href)).toBe(true);
    },
  );

  it("har inga dubbletter", () => {
    const hrefs = allLinks.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("listar platser, inte åtgärder", () => {
    // "Ny faktura", "Ny verifikation" och "Sök" togs medvetet bort: knapparna
    // står på listsidorna och ⌘K finns. Sidorna lever kvar — raderna ska inte
    // smyga tillbaka.
    for (const gone of ["/fakturor/ny", "/verifikat/ny", "/sok"]) {
      expect(allLinks.some((l) => l.href === gone)).toBe(false);
    }
  });

  it("lämnar ingen sida utan ingång när raden tas bort", () => {
    // Sök togs bort med motiveringen att ⌘K finns. Någon sådan lyssnare fanns
    // inte i det här repot — menyraden var sidans enda ingång. Genvägen ligger
    // nu i appens ram.
    const layout = readFileSync(join(APP, "layout.tsx"), "utf8");
    expect(layout).toContain("SearchHotkey");
    const hotkey = readFileSync(
      join(process.cwd(), "src/components/search-hotkey.tsx"), "utf8");
    expect(hotkey).toContain('"/sok"');
    // Och sidorna bakom de andra borttagna raderna nås fortfarande någonstans
    // ifrån.
    for (const [sida, varifran] of [
      ["/fakturor/ny", "fakturor/page.tsx"],
      ["/verifikat/ny", "verifikat/page.tsx"],
    ] as const) {
      expect(readFileSync(join(APP, varifran), "utf8")).toContain(`"${sida}"`);
    }
  });

  it("ger bara kön en siffra", () => {
    // /godkann finns inte i community, alltså är Underlagsinkorg den enda kön
    // som ska tömmas. Får Rapporter en badge betyder den ingenting, och då
    // slutar man se badges överallt.
    const withBadge = allLinks.filter((l) => l.badge).map((l) => l.href);
    expect(withBadge).toEqual(["/underlag"]);
  });

  describe("utgåvan kortar menyn men hålar den aldrig", () => {
    it("ger ingen rubricerad grupp en ensam rad", () => {
      for (const section of visibleSections()) {
        if (section.title) expect(section.links.length).toBeGreaterThanOrEqual(2);
      }
    });

    it("viker in Pengar in i Varje dag så länge Fakturor står ensam där", () => {
      const visible = visibleSections();
      expect(visible.map((s) => s.title)).not.toContain("Pengar in");
      expect(visible[0].title).toBe("Varje dag");
      expect(visible[0].links.map((l) => l.href)).toContain("/fakturor");
    });

    it("tappar hela grupper i stället för att lämna hål", () => {
      // Lön har ingen sida här och finns därför inte alls i modellen — inte
      // som en tom rubrik.
      expect(sections.map((s) => s.title)).not.toContain("Lön");
    });

    it("låter blocket utan rubrik bära en ensam rad", () => {
      // En avdelare är inte en etikett: Inställningar ensam sist är ingen hål.
      const last = visibleSections().at(-1);
      expect(last?.title).toBe("");
      expect(last?.links.map((l) => l.href)).toEqual(["/installningar"]);
    });

    it("behåller kadensordningen från licensutgåvan", () => {
      expect(visibleSections().map((s) => s.title)).toEqual([
        "Varje dag", "Pengar ut", "Varje månad", "Bokslut & rapporter",
        "Register", "",
      ]);
    });
  });

  describe("aktiv markering följer grenen", () => {
    it("markerar grenen från en objektsida", () => {
      expect(activeHref("/fakturor/1042", allLinks)).toBe("/fakturor");
      expect(activeHref("/verifikat/238", allLinks)).toBe("/verifikat");
    });

    it("låter längsta prefixet vinna", () => {
      expect(activeHref("/rapporter/balans", allLinks)).toBe("/rapporter");
    });

    it("markerar Översikt bara på Översikt", () => {
      expect(activeHref("/", allLinks)).toBe("/");
      expect(activeHref("/moms", allLinks)).toBe("/moms");
    });

    it("markerar ingenting på en sida utan menyrad", () => {
      expect(activeHref("/sok", allLinks)).toBeNull();
      expect(activeHref("/fakturor/ny", allLinks)).toBe("/fakturor");
    });

    it("tar inte en grannroute för en gren", () => {
      // /momsfri vore inte /moms — gränsen går vid ett snedstreck, inte vid
      // bokstäverna.
      expect(activeHref("/momsfri", allLinks)).toBeNull();
    });

    it("markerar exakt en rad", () => {
      const visible = visibleSections().flatMap((s) => s.links);
      for (const path of ["/", "/fakturor/1042", "/kontoplan", "/rapporter/huvudbok"]) {
        const active = activeHref(path, visible);
        expect(visible.filter((l) => l.href === active)).toHaveLength(1);
      }
    });
  });

  describe("kontrasten är mätt, inte gissad", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

    it.each([
      ["--nav-item", "oklch(0.38 0.02 50)"],
      ["--nav-heading", "oklch(0.5 0.03 55)"],
      ["--nav-icon", "oklch(0.52 0.03 55)"],
      ["--nav-meta", "oklch(0.46 0.02 55)"],
      ["--nav-foot", "oklch(0.42 0.02 50)"],
    ])("%s står kvar på det uppmätta värdet", (token, value) => {
      expect(css).toContain(`${token}: ${value}`);
    });

    it("har bytt mörka lägets blålila mot uppljusad korall", () => {
      // Värdet får stå kvar i kommentaren som beskriver bytet — det är
      // deklarationen som ska vara borta, inte minnet av den.
      expect(css).not.toMatch(/--sidebar-primary:\s*oklch\(0\.488 0\.243 264\.376\)/);
      expect(css).toContain("--sidebar-primary: oklch(0.68 0.16 42)");
    });
  });
});
