# Regelverksregister

Det här är sanningen om vilka regler systemet bygger på, var de bor i koden,
vilken källa som styrker dem och när de senast verifierades. Varje agent som
verifierar eller ändrar en regel uppdaterar den här filen. Se `AGENTS.md`.

Statusvärden:

- **verifierad** — kontrollerad mot primärkälla på angivet datum av den här
  forken
- **seedad uppströms** — värdet lades in av uppströms inför 2026 och har inte
  verifierats om i forken. Behandlas som obekräftat tills det kontrolleras
- **saknas** — regeln behövs för aktiebolag men finns inte i systemet
- **bevakas** — regeländring är föreslagen eller beslutad men inte i kraft.
  Koden ändras inte förrän ikraftträdandet är känt

Belopp och satser under "Förväntat" är hämtade från agentens träningsdata och
är **inte** en källa. De finns för att en avvikelse mot källan ska upptäckas
och för att den som verifierar ska veta vad koden antar i dag.

## 1. Bokföring och arkivering

| Regel | Plats i koden | Källa | Verifierad | Nästa kontroll | Status |
|---|---|---|---|---|---|
| Verifikat är oföränderliga, rättelse via ändringsverifikat | Triggers och RPC i `supabase/migrations/20260701000001_core.sql`, `20260901000003_harden_rpc.sql` | BFL 5 kap. 5 §, BFNAR 2013:2 | — | 2026-12 | seedad uppströms |
| Verifikatets innehåll (datum, beskrivning, belopp, motpart, hänvisning) | `verifications`, `verification_rows` | BFL 5 kap. 7 § | — | 2026-12 | seedad uppströms |
| Obrutna nummerserier per serie och räkenskapsår | `verification_series`, RPC | BFL 5 kap. 7 §, BFNAR 2013:2 | — | 2026-12 | seedad uppströms |
| Arkivering sju år, digitalt räcker | Storage-bucket `underlag`, raderingsskydd | BFL 7 kap. (ändrad 2024-07-01) | — | 2026-12 | seedad uppströms |
| Senast bokföra (tidpunkt för bokföring) | Inte implementerat som påminnelse | BFNAR 2013:2 kap. 3 | — | 2026-12 | saknas |
| Räkenskapsår: kalenderår, brutet, förlängt första år max 18 månader | `fiscal_years` antar kalenderår | BFL 3 kap. | — | fas 1 | saknas |

## 2. Moms

| Regel | Plats i koden | Källa | Verifierad | Nästa kontroll | Status |
|---|---|---|---|---|---|
| Skattesatser 25 / 12 / 6 / 0 % | `vat_rates` i `20260701000004_seed.sql` | ML 9 kap. | — | 2026-11 | seedad uppströms |
| Livsmedel 12 % → 6 % från 2026-04-01 t.o.m. 2027-12-31 (kategori, inte sats) | Kommentar i seed, användaren väljer sats per rad | Skatteverket, ändring i ML | — | 2027-11 | seedad uppströms |
| Momsdeklarationens rutor 05–62 och momskod per konto | `src/lib/vat/report.ts`, `accounts.vat_code` | Skatteverket, momsdeklarationens blankett | — | 2026-11 | seedad uppströms |
| Deklarationsfrister: 12:e i andra månaden efter perioden (17:e januari och augusti), helårsmoms | `src/lib/vat/report.ts` `vatPeriods` | SFL 26 kap. | — | 2026-11 | seedad uppströms |
| Periodisk sammanställning vid EU-handel, 25:e | `src/lib/tax-calendar.ts` | SFL 35 kap. | — | 2026-11 | seedad uppströms |
| eSKD-filformat | `src/app/(app)/moms/eskd/` | Skatteverkets tekniska beskrivning | — | 2026-11 | seedad uppströms |
| Fakturans innehållskrav, förenklad faktura upp till 4 000 kr | `src/lib/invoicing/invoice-pdf.tsx` | ML 17 kap. | — | 2026-11 | seedad uppströms |
| Momsbefrielse upp till 120 000 kr | `rule_values.momsbefrielse_grans` | ML 18 kap. | — | 2026-11 | seedad uppströms |
| Representation: momslyft på underlag max 300 kr/person | `rule_values.representation_moms_underlag` | ML 13 kap., Skatteverket | — | 2026-11 | seedad uppströms |

## 3. Skatt för aktiebolag

| Regel | Plats i koden | Källa | Verifierad | Nästa kontroll | Förväntat | Status |
|---|---|---|---|---|---|---|
| Bolagsskatt | saknas i `rule_values` | IL 65 kap. 10 § | — | fas 1 | 20,6 % | saknas |
| Periodiseringsfond, juridisk person | saknas | IL 30 kap. 5 § | — | fas 1 | 25 % av överskottet, återförs senast år 6 | saknas |
| Schablonintäkt på periodiseringsfonder | saknas | IL 30 kap. 6 a § | — | fas 1 | statslåneräntan 30 november föregående år (lägst 0,5 %) gånger fonderna | saknas |
| Statslåneränta 30 november | saknas | riksgalden.se | — | varje december | — | saknas |
| Debiterad preliminärskatt (F-skatt) är skattekostnad, betalas 12:e (17:e januari och augusti) | `tax-calendar.ts` behandlar den som eget uttag | SFL 62 kap. | — | fas 1 | kontering 2518 eller 1630, aldrig 2012 | saknas |
| Inkomstdeklaration 2: frist beroende på räkenskapsårets slut, senare frist vid digital inlämning | saknas i kalendern | SFL 32 kap., Skatteverket | — | fas 1 | kalenderår: 1 juli, digitalt 1 augusti | saknas |
| INK2, INK2R, INK2S: SRU-koder | `src/lib/sru/build.ts` (spec 2025P4 enligt kodkommentar) | Skatteverkets SRU-specifikation för aktuellt år | — | 2026-11 | — | seedad uppströms |
| Ej avdragsgilla kostnader återläggs (6072, 6982, 6992, 8423) | `src/lib/tax/calc.ts` (EF), saknas för AB | IL 9 och 16 kap. | — | fas 1 | — | saknas |
| Representation: måltid 0 kr avdragsgillt, enklare förtäring upp till 60 kr/person | `rule_values.representation_enklare` | IL 16 kap. 2 § | — | 2026-11 | 60 kr | seedad uppströms |
| Direktavdrag inventarier under ett halvt prisbasbelopp | `rule_values.direktavdrag_inventarier` | IL 18 kap. 4 § | — | 2026-11 | 29 600 kr för 2026 | seedad uppströms |
| Avskrivning inventarier: 30-regeln och 20-regeln | `src/lib/actions/assets.ts` | IL 18 kap. 13 och 17 §§ | — | 2026-11 | — | seedad uppströms |
| Utdelning och K10 (3:12-reglerna) | saknas | IL 57 kap. | — | fas 5 | — | saknas |

## 4. Lön och arbetsgivaravgifter

| Regel | Plats i koden | Källa | Verifierad | Nästa kontroll | Förväntat | Status |
|---|---|---|---|---|---|---|
| Arbetsgivaravgifter, full sats | saknas | SAL 2 kap. 26 § | — | fas 1 | 31,42 % | saknas |
| Nedsatta avgifter (ålder, unga) | saknas | SAL 2 kap., lag (2026:100) om tillfälligt nedsatt arbetsgivaravgift för unga | 2026-09-04 | fas 2 | halv avgift (endast ålderspensionsavgift + halva övriga avgifter/allmän löneavgift) för 19–23-åringar på ersättning ≤ 25 000 kr/mån, gäller 2026-04-01–2027-09-30 | saknas |
| Skattetabeller för preliminärskatt | saknas | Skatteverket, nya varje år | — | fas 2 | — | saknas |
| Arbetsgivardeklaration på individnivå (AGI), XML-format | saknas | Skatteverkets tekniska beskrivning | — | fas 2 | — | saknas |
| AGI och avgifter betalas 12:e (17:e januari och augusti) | saknas i kalendern | SFL 26 kap. | — | fas 2 | — | saknas |
| Skattefri milersättning egen bil | `rule_values.milersattning` | IL 12 kap. 5 §, Skatteverket | — | 2026-11 | 25 kr/mil | seedad uppströms |
| Traktamente inrikes, helt och halvt | `rule_values.traktamente_*` | IL 12 kap., Skatteverket | — | 2026-11 | 300 / 150 kr | seedad uppströms |

## 5. Basbelopp och räntor

| Regel | Plats i koden | Källa | Verifierad | Nästa kontroll | Förväntat | Status |
|---|---|---|---|---|---|---|
| Prisbasbelopp | `rule_values.prisbasbelopp` | regeringen.se / SCB | 2026-09-04 | varje september | 59 200 kr för 2026 | verifierad |
| Förhöjt prisbasbelopp | `rule_values.prisbasbelopp_forhojt` | regeringen.se / SCB | 2026-09-04 | varje september | 60 500 kr för 2026 | verifierad |
| Inkomstbasbelopp | `rule_values.inkomstbasbelopp` | pensionsmyndigheten.se | — | varje november | 83 400 kr för 2026 | seedad uppströms |
| Riksbankens referensränta (dröjsmålsränta = referensränta + 8 procentenheter) | `rule_values.referensranta` | riksbank.se, räntelagen 6 § | 2026-09-04 | varje januari och juli | 2,00 % från 2026-07-01 | verifierad |

## 6. Årsredovisning, årsstämma och Bolagsverket

| Regel | Plats i koden | Källa | Verifierad | Nästa kontroll | Förväntat | Status |
|---|---|---|---|---|---|---|
| Årsredovisning enligt K2 | `src/lib/k2/report.ts` | BFNAR 2016:10 med ändringar (BFN beslut 2025-06-16, gäller räkenskapsår som inleds efter 2025-12-31) | 2026-09-04 | 2026-11 | — | seedad uppströms |
| Gränsvärden för mindre företag | saknas | ÅRL 1 kap. 3 § | — | fas 1 | 50 anställda, 40 mkr balansomslutning, 80 mkr nettoomsättning | saknas |
| Årsstämma senast sex månader efter räkenskapsårets slut | saknas i kalendern | ABL 7 kap. 10 § | — | fas 1 | — | saknas |
| Årsredovisning till Bolagsverket senast sju månader efter räkenskapsårets slut | saknas i kalendern | ÅRL 8 kap. 3 § | — | fas 1 | — | saknas |
| Revisionsplikt, gränsvärden | saknas | ABL 9 kap. 1 § | — | fas 1 | mer än 3 anställda, 1,5 mkr balansomslutning, 3 mkr nettoomsättning, två av tre två år i rad | saknas |
| Digital inlämning av årsredovisning | saknas | bolagsverket.se | 2026-09-04 | 2026-12 | frivillig i dag. Ursprungligt förslag om obligatorium (2026-01-01) blev inte lag; frågan drivs nu i utredningen Ju 2025:10, slutbetänkande väntas 2026-11-06 | bevakas |
| Resultatdisposition och förändringar i eget kapital i förvaltningsberättelsen | `src/lib/k2/report.ts` | K2 kap. 4–5 | — | fas 3 | — | seedad uppströms |

## 7. Kontoplan

| Regel | Plats i koden | Källa | Verifierad | Nästa kontroll | Status |
|---|---|---|---|---|---|
| BAS 2026 med momskoder | `20260701000004_seed.sql`, `20260831000001_multi_company_ai.sql` | bas.se | — | varje december | seedad uppströms |
| SRU-kopplingstabell | `accounts`, `src/lib/sru/build.ts` | bas.se kopplingstabell | — | varje december | seedad uppströms |
| AB-konton: 2081, 2091, 2098, 2099, 2510, 2518, 2731, 2893, 7010, 7510, 8910 | delvis i `20260831000001_multi_company_ai.sql` | BAS 2026 | — | fas 1 | seedad uppströms |

## 8. Bevakas

Regeländringar som är föreslagna eller beslutade men inte i kraft, eller som
kan komma. Kontrolleras vid varje årsrullning och när en agent ser nyheter.

| Vad | Varför det spelar roll | Källa att följa | Senast kollad |
|---|---|---|---|
| Obligatorisk digital inlämning av årsredovisning | Fas 3, inlämningsflödet. Ursprungligt förslag (ikraftträdande 2026-01-01) blev inte lag. Frågan drivs nu i utredningen "En mer säker och digital bolagsrätt" (Ju 2025:10), delbetänkande SOU 2026:26 (2026-04-28), slutbetänkande väntas 2026-11-06 | bolagsverket.se, regeringen.se, SOU 2026:26 | 2026-09-04 |
| ViDA (moms i den digitala tidsåldern): e-fakturering och digital rapportering i EU | Fakturamodulen, Peppol. Direktivet trädde i kraft 2025-04-14. Gränsöverskridande digital rapportering blir tvingande 2030-07-01. Regeringen tillsatte 2026-02-05 en utredning om nationellt genomförande (inkl. ev. krav för inhemska transaktioner), inget beslut om det än | EU-kommissionen, Skatteverket | 2026-09-04 |
| Ändrade gränsvärden för revisionsplikt | Avgör om revisor behövs. Bara ett äldre utredningsförslag (SOU 2021:60) och en intresseorganisations rapport (Företagarna, mars 2026) finns, ingen proposition | regeringen.se | 2026-09-04 |
| Fortsatt översyn av K-regelverken hos BFN | Årsredovisningen. Den kända K2-ändringen är nu i kraft, se avsnitt 6. Ett separat BFN-beslut 2026-05-18 ändrar BFNAR 2017:3 (årsbokslut för enskild näringsidkare/handelsbolag) från räkenskapsår efter 2026-12-31 — berör inte AB, men visar att översynen fortsätter | bfn.se | 2026-09-04 |
| Livsmedelsmomsen upphör 2027-12-31 | `vat_rates`, faktura-UI. Slutdatumet står fast. En utredning om differentierad matmoms ska redovisas senast 2026-12-22 och avgör vad som gäller från 2028-01-01 | Skatteverket, riksdagen.se (bet. 2025/26:SkU9) | 2026-09-04 |
| Ny BAS-kontoplan varje år | Kontoplanen, momskoder, SRU. Inget publicerat för BAS 2027 ännu, väntas som vanligt i december | bas.se | 2026-09-04 |
| BFN avvecklas 2026-12-31; normgivning för K2/K3 förs över till Revisorsinspektionen (byter namn) och en ny Nämnd för god redovisningssed från 2027-01-01 | Källhänvisningarna i `AGENTS.md` och det här registret pekar i dag på bfn.se — måste bytas ut från 2027 | regeringen.se | 2026-09-04 |

## 9. Årschecklista (november–december)

Körs inför varje nytt räkenskapsår. Varje punkt verifieras mot källa, läggs in
med ny migration, och registret ovan får nytt verifieringsdatum.

1. Prisbasbelopp, förhöjt prisbasbelopp, inkomstbasbelopp
2. Statslåneräntan per 30 november, schablonintäkt på periodiseringsfonder
3. Bolagsskatt, arbetsgivaravgifter och eventuella nedsättningar
4. Milersättning, traktamenten, representation, direktavdragsgräns
5. Momssatser och kategorier, momsdeklarationens rutor, eSKD-format
6. Skattetabeller (om lön), AGI-format
7. Frister: moms, AGI, preliminärskatt, INK2, årsstämma, årsredovisning
8. BAS-kontoplan för nya året, kopplingstabell SRU, nya eller borttagna konton
9. SRU-specifikation för INK2, INK2R, INK2S; testa filer i Skatteverkets testmiljö
10. K2-ändringar från BFN
11. Riksbankens referensränta
12. Sektion 8 "Bevakas" gås igenom
13. `docs/KONTERINGSGUIDE.md` uppdateras om konteringar ändrats

## 10. Logg

Nyaste överst. En rad per verifiering eller ändring: datum, vad, källa, utfall.

| Datum | Vad | Källa | Utfall |
|---|---|---|---|
| 2026-09-04 | Veckovis bevakning: prisbasbelopp (59 200 kr), förhöjt prisbasbelopp (60 500 kr) och referensräntan (2,00 % från 2026-07-01) bekräftade oförändrade mot förväntat | regeringen.se pressmeddelande "Prisbasbelopp för 2026 fastställt", riksbank.se nyhet "Referensräntan fastställd till 2,00 procent" | Verifieringsdatum satt i avsnitt 5, inga kodändringar |
| 2026-09-04 | Veckovis bevakning: BFN beslutade 2025-06-16 om ändringar i K2 (BFNAR 2016:10), gäller räkenskapsår som inleds efter 2025-12-31 — skärpta gränser för vem som får tillämpa K2, höjd periodiseringsgräns, nya/ändrade balansposter m.m. | bfn.se/andringar-i-k2-arsredovisning-for-mindre-foretag/, bfn.se/fragor-och-svar/andringar-i-k2-och-k3-fran-2026/ | Registrerat i avsnitt 6. Ingen kodändring: nuvarande `src/lib/k2/report.ts` renderar inga av de omdöpta/tillagda posterna. Plan för full verifiering mot BFNAR 2016:10 utökad i `PLAN.md` fas 3 |
| 2026-09-04 | Veckovis bevakning av avsnitt 8: digital inlämning, ViDA, revisionsplikt, K2-översyn, livsmedelsmoms och BAS-kontoplan kontrollerade. Ny bevakningspost tillagd om BFN:s avveckling 2026-12-31 (normgivning flyttar till Revisorsinspektionen/ny nämnd 2027-01-01). Nedsatt arbetsgivaravgift för 19–23-åringar (lag 2026:100) identifierad och infogad i avsnitt 4 | se avsnitt 8 och avsnitt 4 för källor per post | Avsnitt 4 och 8 uppdaterade, inga kodändringar |
| 2026-09-04 | Registret skapat vid fork. Alla uppströms värden markerade "seedad uppströms". AB-specifika regler inventerade och markerade "saknas" | Kodgenomgång av `supabase/migrations/` och `src/lib/` | Fas 0 och fas 1 i `PLAN.md` |
