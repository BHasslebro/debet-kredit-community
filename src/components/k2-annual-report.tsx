import { PrintButton } from "@/components/print-button";
import { Card, CardContent } from "@/components/ui/card";
import { DownloadButton } from "@/components/download-button";
import type { K2Report, K2Row } from "@/lib/k2/report";

const fmt = (n: number) => n.toLocaleString("sv-SE");

function RowTable({ rows }: { rows: K2Row[] }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className={r.bold ? "font-semibold border-t" : ""}>
            <td className="py-1">
              {r.label}
              {r.note ? <sup className="text-muted-foreground ml-1">{r.note}</sup> : null}
            </td>
            <td className="py-1 text-right tabular-nums w-32">{fmt(r.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Årsredovisning K2 för mindre aktiebolag — utskrivbart dokument */
export function K2AnnualReport({
  year, companyName, orgNumber, city, report,
}: {
  year: number;
  companyName: string;
  orgNumber: string;
  city: string;
  report: K2Report;
}) {
  const balanced = report.balances.assets === report.balances.equityAndLiabilities;
  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">Årsredovisning {year} (K2)</h1>
          <p className="text-sm text-muted-foreground">
            Upprättad enligt BFNAR 2016:10 (K2). Granska, skriv ut, underteckna och
            lämna in till Bolagsverket — digital inlämning via bolagsverket.se eller
            på papper. Stäm gärna av med redovisningskonsult första året.
          </p>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <PrintButton />
          <DownloadButton size="sm" className="print:hidden"
            href={`/export/sru?year=${year}`} workingLabel="Bygger SRU-filerna…"
            title="INK2 + INK2R + INK2S som SRU-filer för Skatteverkets filöverföring">
            SRU-filer (INK2)
          </DownloadButton>
        </div>
      </div>

      {/* Varningen satt tidigare i en print:hidden-ruta. Det utskrivna
          dokumentet — det som faktiskt lämnas till Bolagsverket — visade
          alltså en obalanserad balansräkning utan ett ord om saken. En
          årsredovisning som inte balanserar får inte lämnas in tyst. */}
      {!balanced && (
        <Card className="border-destructive">
          <CardContent className="py-4 text-sm text-destructive">
            Obs: balansräkningen balanserar inte (tillgångar {fmt(report.balances.assets)} kr,
            eget kapital &amp; skulder {fmt(report.balances.equityAndLiabilities)} kr —
            skillnad {fmt(report.balances.assets - report.balances.equityAndLiabilities)} kr).
            Dokumentet får inte lämnas in i det här skicket. Kontrollera att alla
            bokslutsposter (avskrivningar, skatt, årets resultat) är bokförda, och
            att inga poster ligger på konton avsedda för enskild firma (2010–2018) —
            de hör inte hemma i ett aktiebolag.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="py-8 px-8 space-y-8 print:shadow-none print:border-0">
          {/* Titelsida */}
          <div className="text-center space-y-1 pb-4 border-b">
            <div className="text-xl font-bold">Årsredovisning</div>
            <div className="text-lg">{companyName}</div>
            <div className="text-sm text-muted-foreground">Org.nr {orgNumber}</div>
            <div className="text-sm text-muted-foreground">Räkenskapsåret {year}-01-01 – {year}-12-31</div>
          </div>

          {/* Förvaltningsberättelse */}
          <section className="space-y-2">
            <h2 className="font-semibold text-base">Förvaltningsberättelse</h2>
            <h3 className="text-sm font-medium">Verksamheten</h3>
            <p className="text-sm">
              Bolaget bedriver sin verksamhet i {city || "Sverige"}. Styrelsen har sitt
              säte i {city || "Sverige"}. Inga väsentliga händelser har inträffat under
              räkenskapsåret utöver den löpande verksamheten.
            </p>
            <h3 className="text-sm font-medium">Flerårsöversikt (tkr)</h3>
            <table className="text-sm w-full max-w-sm">
              <thead><tr className="text-left text-muted-foreground">
                <th></th><th className="text-right">{year}</th>
              </tr></thead>
              <tbody>
                <tr><td>Nettoomsättning</td><td className="text-right tabular-nums">{fmt(Math.round(report.netRevenue / 1000))}</td></tr>
                {/* Raden heter det den heter — tidigare skrevs årets resultat
                    här, alltså efter bokslutsdispositioner och skatt. */}
                <tr><td>Resultat efter finansiella poster</td><td className="text-right tabular-nums">{fmt(Math.round(report.resultAfterFin / 1000))}</td></tr>
                <tr><td>Soliditet (%)</td><td className="text-right tabular-nums">
                  {report.balances.assets > 0 ? Math.round(report.equity.total / report.balances.assets * 100) : 0}
                </td></tr>
              </tbody>
            </table>
            <h3 className="text-sm font-medium">Förändringar i eget kapital (kr)</h3>
            <table className="text-sm w-full max-w-md">
              <tbody>
                <tr><td>Aktiekapital</td><td className="text-right tabular-nums">{fmt(report.equity.shareCapital)}</td></tr>
                {/* Utan den här raden summerade tabellen inte när något låg på
                    2082–2090 eller på enskild firmas egetkapitalkonton. */}
                {report.equity.otherEquity !== 0 && (
                  <tr><td>Övrigt eget kapital</td><td className="text-right tabular-nums">{fmt(report.equity.otherEquity)}</td></tr>
                )}
                <tr><td>Balanserat resultat</td><td className="text-right tabular-nums">{fmt(report.equity.retained)}</td></tr>
                <tr><td>Årets resultat</td><td className="text-right tabular-nums">{fmt(report.equity.yearResult)}</td></tr>
                <tr className="font-semibold border-t"><td>Summa eget kapital</td><td className="text-right tabular-nums">{fmt(report.equity.total)}</td></tr>
              </tbody>
            </table>
            <h3 className="text-sm font-medium">Resultatdisposition</h3>
            <p className="text-sm">
              Till årsstämmans förfogande står {fmt(report.equity.retained + report.equity.yearResult)} kr.
              Styrelsen föreslår att medlen balanseras i ny räkning.
            </p>
          </section>

          {/* Resultaträkning */}
          <section className="space-y-2">
            <h2 className="font-semibold text-base">Resultaträkning (kr)</h2>
            <RowTable rows={report.incomeStatement} />
          </section>

          {/* Balansräkning */}
          <section className="space-y-2">
            <h2 className="font-semibold text-base">Balansräkning (kr)</h2>
            <h3 className="text-sm font-medium">Tillgångar</h3>
            <RowTable rows={report.balanceAssets} />
            <h3 className="text-sm font-medium pt-2">Eget kapital och skulder</h3>
            <RowTable rows={report.balanceEquityLiabilities} />
          </section>

          {/* Noter */}
          <section className="space-y-2">
            <h2 className="font-semibold text-base">Noter</h2>
            <p className="text-sm">
              <b>Not 1 — Redovisningsprinciper.</b> Årsredovisningen är upprättad i
              enlighet med årsredovisningslagen och Bokföringsnämndens allmänna råd
              BFNAR 2016:10 (K2) om årsredovisning i mindre företag. Anläggnings­tillgångar
              skrivs av linjärt över bedömd nyttjandeperiod (5 år).
            </p>
            <p className="text-sm">
              <b>Not 2 — Medelantal anställda.</b> ______ st (fylls i för hand).
            </p>
          </section>

          {/* Underskrift */}
          <section className="space-y-8 pt-4">
            <p className="text-sm">{city || "Ort"}, den ______________________</p>
            <div className="pt-8 border-t max-w-xs">
              <p className="text-sm">Styrelseledamot</p>
            </div>
            <div className="pt-8 border-t max-w-xs">
              <p className="text-sm">Styrelseledamot / verkställande direktör</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Samtliga styrelseledamöter och, i förekommande fall, verkställande
              direktören ska underteckna årsredovisningen. Lägg till rader för hand
              om styrelsen har fler ledamöter.
            </p>
          </section>

          {/* Fastställelseintyg — krävs i original på den kopia som lämnas till
              Bolagsverket (årsredovisningslagen 8 kap. 3 c §). Datum fylls i för
              hand eftersom stämman hålls efter att dokumentet skrivits ut. */}
          <section className="space-y-4 pt-8 border-t" style={{ breakBefore: "page" }}>
            <h2 className="font-semibold text-base">Fastställelseintyg</h2>
            <p className="text-sm leading-relaxed">
              Undertecknad styrelseledamot intygar att resultaträkningen och
              balansräkningen har fastställts på årsstämma den ______________________.
              Årsstämman beslutade i fråga om bolagets {report.result >= 0 ? "vinst" : "förlust"} enligt
              den i förvaltningsberättelsen intagna dispositionen. Jag intygar även
              att denna kopia av årsredovisningen överensstämmer med originalet.
            </p>
            <p className="text-sm pt-4">{city || "Ort"}, den ______________________</p>
            <div className="pt-8 border-t max-w-xs">
              <p className="text-sm">Styrelseledamot</p>
              <p className="text-xs text-muted-foreground">Namnförtydligande: ______________________</p>
            </div>
          </section>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground print:hidden space-y-1">
        <p>
          Dokumentet genereras direkt ur bokföringen och innehåller allt Bolagsverket
          kräver vid pappersinlämning, inklusive fastställelseintyget. Debet &amp; Kredit
          är ett verktyg — styrelsen ansvarar för årsredovisningens innehåll.
        </p>
        <p>
          Så lämnar du in på papper: håll årsstämman, skriv ut dokumentet, låt styrelsen
          underteckna årsredovisningen och en ledamot fastställelseintyget i original,
          och posta till Bolagsverket, Årsredovisningar, 851 98 Sundsvall.
        </p>
      </div>
    </div>
  );
}
