/**
 * GOLDEN: Årsavslutet måste gå att genomföra.
 *
 * Integritetstestet av en färsk installation körde hela kedjan och fastnade
 * här: checklistan för årsavslut kräver att alla tolv månader är låsta, och
 * bokslutsverifikatet "Årets resultat" dateras på räkenskapsårets sista dag —
 * som därmed alltid ligger i en låst månad. book_verification nekade
 * verifikatet med "Perioden 2026-12 är låst." Knappen tändes först när
 * bokföringen var låst, och bokföringen var då låst för just det verifikat
 * knappen skulle skapa. Årsavslutet var omöjligt, för alla, i alla
 * installationer.
 *
 * KÄLLOR (primärkällor)
 *
 *  [BFL 5:2]   5 kap. 2 § bokföringslagen (1999:1078): kontanta in- och
 *              utbetalningar ska bokföras senast påföljande arbetsdag, övriga
 *              affärshändelser så snart det kan ske. En bokföring som inte
 *              går att göra bryter mot kravet.
 *              https://lagen.nu/1999:1078#K5P2
 *  [BFL 6:4]   6 kap. 4 § BFL: räkenskapsåret ska avslutas med ett förenklat
 *              årsbokslut för den som får upprätta ett sådant. Programmet ska
 *              inte kunna hindra det.
 *              https://lagen.nu/1999:1078#K6P4
 *  [BFL 5:1]   5 kap. 1 § BFL: grund- och huvudbokföring. Bokslutsverifikatet
 *              hör till räkenskapsåret det avslutar och kan därför inte
 *              dateras utanför året för att slippa förbi låset.
 *              https://lagen.nu/1999:1078#K5P1
 *  [SFL 26:26] 26 kap. 26 § skatteförfarandelagen (2011:1244): en
 *              mervärdesskattedeklaration ska lämnas för varje
 *              redovisningsperiod — alltså en period som löpt ut.
 *              https://lagen.nu/2011:1244#K26P26
 *
 * AVGRÄNSNING
 *  Periodlåset finns för att hindra efterhandsändringar i redovisad tid. Det
 *  ska fortsätta gälla allt en människa bokför. Undantaget omfattar bara
 *  systemets egna bokningar — bokslut, momsomföring och ingående balanser —
 *  och aldrig ett AVSLUTAT räkenskapsår, som är den gräns som faktiskt
 *  skyddar den färdiga bokföringen.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MIG_DIR = fileURLToPath(new URL("../../../../supabase/migrations/", import.meta.url));
const MIGRATIONS = readdirSync(MIG_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((file) => ({ file, sql: readFileSync(path.join(MIG_DIR, file), "utf8") }));

/** Sista definitionen i migrationsordningen vinner, precis som i databasen. */
function effectiveFn(name: string): { file: string; body: string } {
  let hit: { file: string; body: string } | null = null;
  const re = new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+(?:public\\.)?${name}\\s*\\(` +
      `[\\s\\S]*?\\$\\$\\s*;`,
    "gi",
  );
  for (const m of MIGRATIONS) {
    const found = m.sql.match(re);
    if (found?.length) hit = { file: m.file, body: found[found.length - 1] };
  }
  if (!hit) throw new Error(`Funktionen ${name} finns inte i migrationerna.`);
  return hit;
}

function triggersOn(table: string): string[] {
  const re = new RegExp(
    `create\\s+trigger\\s+[\\s\\S]*?\\son\\s+(?:public\\.)?${table}\\b[\\s\\S]*?;`,
    "gi",
  );
  return MIGRATIONS.flatMap((m) => m.sql.match(re) ?? []);
}

describe("Bokslutsverifikatet kommer förbi periodlåset [BFL 6:4]", () => {
  const book = effectiveFn("book_verification");

  it("systembokningar undantas från periodlåset", () => {
    // Utan undantaget kan årets resultat aldrig bokföras: checklistan kräver
    // att december är låst, och verifikatet dateras i december.
    const lockCheck = /if\s+is_period_locked\s*\(\s*p_date\s*\)([\s\S]*?)then/i.exec(book.body);
    expect(lockCheck, "periodlåsets villkor hittades inte i book_verification").not.toBeNull();
    const condition = lockCheck![1];
    for (const source of ["year_end", "vat_report", "opening_balance"]) {
      expect(
        condition,
        `källan ${source} måste undantas från periodlåset, annars går den bokningen inte att göra`,
      ).toContain(source);
    }
  });

  it("undantaget gäller inte ett avslutat räkenskapsår", () => {
    // Den gränsen är den som skyddar färdig bokföring och får inte luckras upp.
    expect(book.body).toMatch(/v_fy\.status\s*=\s*'closed'/i);
    const closedCheck = /if\s+v_fy\.status\s*=\s*'closed'\s*then([\s\S]*?)end if;/i.exec(book.body);
    expect(closedCheck, "kontrollen av avslutat år hittades inte").not.toBeNull();
    expect(closedCheck![1]).not.toMatch(/year_end|vat_report|opening_balance/i);
  });

  it("en vanlig manuell bokning nekas fortfarande i låst period [BFL 5:1]", () => {
    // Undantaget får bara omfatta systemets tre egna källor. Slinker 'manual'
    // (eller någon annan användarkälla) med i listan är periodlåset borta.
    const lockCheck = /if\s+is_period_locked\s*\(\s*p_date\s*\)([\s\S]*?)then/i.exec(book.body);
    const notIn = /not\s+in\s*\(([^)]*)\)/i.exec(lockCheck![1]);
    expect(notIn, "undantaget måste vara en not in-lista").not.toBeNull();
    const allowed = notIn![1].match(/'([a-z_]+)'/g)?.map((s) => s.replaceAll("'", "")) ?? [];
    expect(allowed.sort()).toEqual(["opening_balance", "vat_report", "year_end"]);
  });
});

describe("Låsen är definitiva i databasen, inte bara i appen", () => {
  it("en momslåst period kan inte låsas upp [BFL 5:1]", () => {
    const trg = triggersOn("period_locks");
    expect(trg.some((t) => /before\s+delete/i.test(t)), "periodlås saknar raderingsvakt").toBe(true);
    const fn = effectiveFn("period_locks_block_unlock");
    expect(fn.body).toMatch(/old\.reason\s*<>\s*'manual'/i);
  });

  /**
   * Provet ovan såg bara att raderingsvakten fanns. Vakten släpper igenom lås
   * med reason = 'manual', och det fanns ingenting som hindrade en vanlig
   * användare från att skriva om reason via PostgREST. Tre anrop räckte:
   *
   *   UPDATE period_locks SET reason = 'manual' WHERE month = 2;
   *   DELETE FROM period_locks WHERE month = 2;
   *   select book_verification('A', '2026-02-14', …);
   *
   * — en ny manuell bokning i en redan inlämnad momsperiod. Provet var grönt
   * hela tiden, för invarianten det påstod sig skydda fanns aldrig.
   */
  it("en momslåst period kan inte tvättas om till ett manuellt lås [BFL 5:1]", () => {
    const trg = triggersOn("period_locks");
    expect(
      trg.some((t) => /before\s+update/i.test(t)),
      "periodlås saknar UPDATE-vakt: reason går att skriva om till 'manual', "
        + "och då släpper raderingsvakten igenom en DELETE",
    ).toBe(true);

    const fn = effectiveFn("period_locks_block_downgrade");
    // Ett systemlås får inte byta orsak…
    expect(fn.body).toMatch(/old\.reason\s*<>\s*'manual'/i);
    expect(fn.body).toMatch(/new\.reason\s+is\s+distinct\s+from\s+old\.reason/i);
    // …och låset får inte flyttas till en annan period i stället.
    expect(fn.body).toMatch(/new\.month\s+is\s+distinct\s+from\s+old\.month/i);
    expect(fn.body).toMatch(/new\.fiscal_year_id\s+is\s+distinct\s+from\s+old\.fiscal_year_id/i);
  });

  /**
   * Uppgraderingen åt andra hållet måste finnas kvar: approveVatReport gör
   * upsert på (fiscal_year_id, month) och skriver reason = 'vat_report' över
   * en månad användaren redan låst för hand. Skulle vakten stoppa även den
   * vägen gick momsrapporten inte att godkänna.
   */
  it("ett manuellt lås får uppgraderas till ett momslås", () => {
    const fn = effectiveFn("period_locks_block_downgrade");
    const guard = /if\s+old\.reason\s*<>\s*'manual'\s+and\s+new\.reason\s+is\s+distinct\s+from\s+old\.reason/i;
    expect(
      guard.test(fn.body),
      "vakten måste villkora på att DET GAMLA låset är ett systemlås — annars "
        + "blockeras uppgraderingen manual → vat_report och momsrapporten går inte att godkänna",
    ).toBe(true);
  });

  it("ett avslutat räkenskapsår kan inte öppnas igen [BFL 6:4]", () => {
    const trg = triggersOn("fiscal_years");
    expect(trg.some((t) => /before\s+update/i.test(t)), "räkenskapsår saknar återöppningsvakt").toBe(true);
    const fn = effectiveFn("fiscal_years_block_reopen");
    expect(fn.body).toMatch(/old\.status\s*=\s*'closed'/i);
    expect(fn.body).toMatch(/new\.status\s*<>\s*'closed'/i);
  });
});
