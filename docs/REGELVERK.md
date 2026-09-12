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
| Verifikatets balans, raderingsskydd, bilagekoppling och årsavslutslås upprätthålls som databasvillkor (inte bara i RPC) | `20260907000002_immutable_delete.sql`, `20260907000003_correction_row_order.sql`, `20260907000004_verification_balance_guard.sql`, `20260907000005_attachment_link_guard.sql`, `20260908000001_yearend_locks.sql`, `20260909000001_period_lock_update_guard.sql` | BFL 5 kap., BFNAR 2013:2 | — | 2026-12 | seedad uppströms (inhämtat 2026-09-08) |
| SIE 4-export och -import enligt SIE-specifikationen (teckenkodning, #KONTO/#VER/#TRANS-format) | `src/lib/sie/build.ts`, `export.ts`, `import.ts` | SIE-gruppens specifikation SIE 4 | — | 2026-12 | seedad uppströms (inhämtat 2026-09-08) |
| Senast bokföra (tidpunkt för bokföring) | Inte implementerat som påminnelse | BFNAR 2013:2 kap. 3 | — | 2026-12 | saknas |
| Räkenskapsår: kalenderår, brutet, förlängt första år max 18 månader | `fiscal_years` antar kalenderår | BFL 3 kap. | — | fas 1 | saknas |

## 2. Moms

| Regel | Plats i koden | Källa | Verifierad | Nästa kontroll | Status |
|---|---|---|---|---|---|
| Skattesatser 25 / 12 / 6 / 0 % | `vat_rates` i `20260701000004_seed.sql` | ML 9 kap. | — | 2026-11 | seedad uppströms |
| Livsmedel 12 % → 6 % från 2026-04-01 t.o.m. 2027-12-31 (kategori, inte sats) | Kommentar i seed, användaren väljer sats per rad | Skatteverket, ändring i ML | — | 2027-11 | seedad uppströms |
| Momsdeklarationens rutor 05–62 och momskod per konto | `src/lib/vat/report.ts`, `accounts.vat_code` | Skatteverket, momsdeklarationens blankett | — | 2026-11 | seedad uppströms |
| Varuimport från land utanför EU: underlag i ruta 50, importmoms i ruta 60–62 (konton 4545, 2615, 2625, 2635) | `20260907000011_import_goods_vat.sql`, `vat_codes` PURCHASE_IMPORT/OUTPUT_VAT_IMPORT_* | Skatteverket ”Fylla i momsdeklarationen”, fält 50 och 60–62 | — | 2026-11 | seedad uppströms (inhämtat 2026-09-08) |
| Intäktskonton för 12 % och 6 % (3002, 3003, 3012, 3013) med momskod SALES_12/SALES_6 | `20260909000002_vat_12_6_sales_accounts.sql` | BAS 2026 | — | varje december | seedad uppströms (inhämtat 2026-09-08) |
| Deklarationsfrister: 12:e i andra månaden efter perioden (17:e januari och augusti), helårsmoms. Rapport kan inte godkännas för en period som inte löpt ut | `src/lib/vat/report.ts` `vatPeriods`, `20260909000001_period_lock_update_guard.sql` | SFL 26 kap. | — | 2026-11 | seedad uppströms |
| Periodisk sammanställning vid EU-handel, 25:e | `src/lib/tax-calendar.ts` | SFL 35 kap. | — | 2026-11 | seedad uppströms |
| eSKD-filformat | `src/lib/vat/report.ts` `generateEskd` (omskriven uppströms 2026-09 efter specifikationen), `src/app/(app)/moms/eskd/` | Skatteverkets tekniska beskrivning eSKD | — | 2026-11 | seedad uppströms |
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
| Debiterad preliminärskatt (F-skatt) är skattekostnad, betalas 12:e (17:e januari och augusti) | `tax-calendar.ts` visar F-skattdatum bara när `settings.pays_f_tax = true` (`20260907000007_settings_pays_f_tax.sql`, inhämtat 2026-09-08); konteringen för AB saknas fortfarande | SFL 62 kap., 55 kap. 2–3 §§ | — | fas 1 | kontering 2518 eller 1630, aldrig 2012 | saknas |
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
| Prisbasbelopp | `rule_values.prisbasbelopp` | regeringen.se / SCB | 2026-09-04 | 2026-10 (regeringens beslut om 2027) | 59 200 kr för 2026 | verifierad |
| Förhöjt prisbasbelopp | `rule_values.prisbasbelopp_forhojt` | regeringen.se / SCB | 2026-09-04 | 2026-10 (regeringens beslut om 2027) | 60 500 kr för 2026 | verifierad |
| Inkomstbasbelopp | `rule_values.inkomstbasbelopp` | pensionsmyndigheten.se | — | varje november | 83 400 kr för 2026 | seedad uppströms |
| Riksbankens referensränta (dröjsmålsränta = referensränta + 8 procentenheter) | `rule_values.referensranta` | riksbank.se, räntelagen 6 § | 2026-09-04 | varje januari och juli | 2,00 % från 2026-07-01 | verifierad |
| Påminnelseavgift: högst 60 kr, kräver avtal och att fakturan förfallit | `rule_values.paminnelseavgift_max`, `20260907000010_reminder_fee_cap.sql`, `src/lib/actions/invoices.ts` | lag (1981:739) om ersättning för inkassokostnader 2 och 4 §§ | — | varje december | 60 kr | seedad uppströms (inhämtat 2026-09-08) |

## 6. Årsredovisning, årsstämma och Bolagsverket

| Regel | Plats i koden | Källa | Verifierad | Nästa kontroll | Förväntat | Status |
|---|---|---|---|---|---|---|
| Årsredovisning enligt K2 | `src/lib/k2/report.ts` | BFNAR 2016:10 med ändringar (BFN beslut 2025-06-16, gäller räkenskapsår som inleds efter 2025-12-31) | 2026-09-04 | 2026-11 | — | seedad uppströms |
| Gränsvärden för mindre företag | saknas | ÅRL 1 kap. 3 § | — | fas 1 | 50 anställda, 40 mkr balansomslutning, 80 mkr nettoomsättning | saknas |
| Årsstämma senast sex månader efter räkenskapsårets slut | saknas i kalendern | ABL 7 kap. 10 § | — | fas 1 | — | saknas |
| Årsredovisning till Bolagsverket senast sju månader efter räkenskapsårets slut | saknas i kalendern | ÅRL 8 kap. 3 § | — | fas 1 | — | saknas |
| Revisionsplikt, gränsvärden | saknas | ABL 9 kap. 1 § | — | fas 1 | mer än 3 anställda, 1,5 mkr balansomslutning, 3 mkr nettoomsättning, två av tre två år i rad | saknas |
| Digital inlämning av årsredovisning | saknas | ÅRL 2 kap. 5 §, 8 kap. 3 a § (SFS 1995:1554 t.o.m. SFS 2026:780), bolagsverket.se | 2026-09-12 (lagtext) | 2026-12 | **frivillig.** ÅRL 8 kap. 3 a §: handlingarna *får* överföras elektroniskt; ÅRL 2 kap. 5 §: årsredovisningen upprättas ”i vanlig läsbar form eller i elektronisk form”. Ursprungligt förslag om obligatorium (2026-01-01) blev inte lag; frågan drivs nu i utredningen Ju 2025:10, slutbetänkande väntas 2026-11-06 | bevakas |
| Resultatdisposition och förändringar i eget kapital i förvaltningsberättelsen | `src/lib/k2/report.ts` | K2 kap. 4–5 | — | fas 3 | — | seedad uppströms |

## 7. Kontoplan

| Regel | Plats i koden | Källa | Verifierad | Nästa kontroll | Status |
|---|---|---|---|---|---|
| BAS 2026 med momskoder | `20260701000004_seed.sql`, `20260831000001_multi_company_ai.sql` | bas.se | — | varje december | seedad uppströms |
| SRU-kopplingstabell | `accounts`, `src/lib/sru/build.ts` | bas.se kopplingstabell | — | varje december | seedad uppströms |
| AB-konton: 2081, 2091, 2098, 2099, 2510, 2518, 2731, 2893, 7010, 7510, 8910 | delvis i `20260831000001_multi_company_ai.sql` | BAS 2026 | — | fas 1 | seedad uppströms |
| Privata utlägg i aktiebolag krediterar 2893, inte 2018 (uppströms valde 2820) | `src/lib/posting/quick-events.ts` `ownerPayableAccount`, `src/lib/actions/trips.ts` | BAS 2026, kontots kommentar i `20260831000001_multi_company_ai.sql`, `docs/KONTERINGSGUIDE.md` | 2026-09-08 (kodgenomgång, forkens beslut) | varje december | verifierad |
| Nya konton från uppströms: 2820, 2615, 4545, 3002, 3003, 3012, 3013; 3740 spärrat för manuell kontering | `20260907000006_account_2820.sql`, `20260907000011_import_goods_vat.sql`, `20260909000002_vat_12_6_sales_accounts.sql` | BAS 2026 | — | varje december | seedad uppströms (inhämtat 2026-09-08) |

## 8. Bevakas

Regeländringar som är föreslagna eller beslutade men inte i kraft, eller som
kan komma. Kontrolleras vid varje årsrullning och när en agent ser nyheter.

| Vad | Varför det spelar roll | Källa att följa | Senast kollad |
|---|---|---|---|
| Höstbudgeten 2027 och de skatteförslag som remitterats inför den | Hela avsnitt 3–5. **Valår: budgetpropositionen lämnas senast 2026-11-12**, inte i september som vanligt ("Under ett valår lämnas regeringens budgetproposition till riksdagen tre veckor efter statsministeromröstning eller regeringsskifte (och i år senast den 12 november)"). 2027 års regelvärden är alltså inte kända förrän tidigast mitten av november — årschecklistan i avsnitt 9 kan inte köras tidigare. Fem skatteförslag är remitterade (alla föreslagna 2027-01-01): jordbruksdiesel, "Höjd åldersgräns och förstärkning av jobbskatteavdraget för seniorer", "Skattefri förmån av kompetensstöd", "Indexering av taket i FoU-avdraget" (nedsättning av arbetsgivaravgifter, tak uttryckt i inkomstbasbelopp) och "Slopad indexering av energiskatten på el". Regeringen skriver själv att om förslagen presenteras "beror på valutgången, det ekonomiska läget, reformutrymmet och finansieringsbehovet". Inget beslutat | regeringen.se ("Skatteförslag som remitterats inför höstbudgeten 2027", "Datum för budgetarbetet") | 2026-09-12 (oförändrad: samma fem remisser, samma formulering om att förslagen beror på valutgången; "Sista dag att överlämna budgeten till riksdagen är i år den 12 november") |
| Obligatorisk digital inlämning av årsredovisning | Fas 3, inlämningsflödet. **Kontrollerat mot lagtexten: inlämningen är fortfarande frivillig.** ÅRL 8 kap. 3 a § (Lag 2024:347): "Handlingar som avses i 3 § *får* överföras elektroniskt till registreringsmyndigheten", och ÅRL 2 kap. 5 §: "Årsredovisningen ska upprättas i vanlig läsbar form eller i elektronisk form" — konsoliderad lydelse t.o.m. SFS 2026:780. Ursprungligt förslag (ikraftträdande 2026-01-01) blev inte lag. Frågan drivs nu i utredningen "En mer säker och digital bolagsrätt" (Ju 2025:10), delbetänkande SOU 2026:26 (2026-04-28), slutbetänkande senast 2026-11-06. Obs: flera sekundärkällor påstår alltjämt att digital inlämning blev obligatorisk för räkenskapsår som inleds efter 2025-12-31 — det stämmer inte mot lagtexten och får inte styra en kodändring | riksdagen.se (SFS 1995:1554, konsoliderad), regeringen.se, SOU 2026:26, bolagsverket.se | 2026-09-12 (lagtext kontrollerad; ingen proposition i riksdagens dokumentlista; bolagsverket.se fortsatt oåtkomlig, CAPTCHA) |
| ViDA (moms i den digitala tidsåldern): e-fakturering och digital rapportering i EU | Fakturamodulen, Peppol, `src/lib/vat/`. Direktivet trädde i kraft 2025-04-14. Gränsöverskridande digital rapportering blir tvingande 2030-07-01. Första svenska steget är **prop. 2025/26:278** "Teknisk översyn av mervärdesskattereglerna vid gränsöverskridande handel" (överlämnad 2026-06-09): ändringar i ML 2023:200 om gränsöverskridande handel, beskattningsgrundande händelse, redovisningsskyldighetens inträde och de särskilda ordningarna, föreslaget ikraftträdande 2027-01-01. Ej beslutad — motionstiden går ut 2026-10-05. Separat utredning om nationellt genomförande (inhemska transaktioner) tillsatt 2026-02-05, inget beslut än | riksdagen.se (prop. 2025/26:278), EU-kommissionen, Skatteverket | 2026-09-12 (oförändrad: "Propositionen bereds i utskott", skatteutskottet, motionstid t.o.m. 2026-10-05, utskottsförslag och kammarbeslut "-") |
| Moderna och enklare skatteregler för arbetslivet: tjänsteställe, tjänsteresa och avdrag för ökade levnadskostnader | `rule_values.traktamente_*` och `rule_values.milersattning`, avsnitt 4. Lagrådsremiss beslutad 2026-09-03 (bygger på SOU 2025:4): reglerna om tjänsteställe uppdateras, "tjänsteresa" definieras i IL, och avdragen för tillfälligt arbete och dubbel bosättning ersätts av ett nytt gemensamt avdrag. Föreslaget ikraftträdande 2027-01-01. Ingen proposition ännu, inget riksdagsbeslut | regeringen.se, lagrådsremiss 2026-09-03 | 2026-09-12 (fortfarande bara lagrådsremiss "Moderna och enklare skatteregler" 2026-09-03; ingen proposition i riksdagens lista t.o.m. prop. 2025/26:312) |
| Prisbasbelopp och förhöjt prisbasbelopp för 2027 | `rule_values.prisbasbelopp`, `rule_values.prisbasbelopp_forhojt` och allt som räknas på dem (bl.a. `direktavdrag_inventarier`). SCB har 2026-07-15 **beräknat** prisbasbeloppet för 2027 till 59 600 kr och det förhöjda till 60 900 kr. Beloppen ska fastställas av regeringen ("Prisbasbeloppet och det förhöjda prisbasbeloppet ska fastställas av regeringen", SCB 2026-07-15), vilket normalt sker i september. Inget regeringsbeslut hittat 2026-09-12 heller (inget pressmeddelande "Prisbasbelopp för 2027 fastställt" på regeringen.se) — inga nya rader i `rule_values` förrän beslutet finns. Obs: valåret kan skjuta beslutet framåt, se raden om höstbudgeten | scb.se (statistiknyhet "Prisbasbeloppet för år 2027"), regeringen.se | 2026-09-12 (SCB:s statistiknyhet omverifierad: 59 600 / 60 900 kr; inget regeringsbeslut på regeringen.se) |
| Ändrade gränsvärden för revisionsplikt | Avgör om revisor behövs. Bara ett äldre utredningsförslag (SOU 2021:60) och en intresseorganisations rapport (Företagarna, mars 2026) finns, ingen proposition | regeringen.se | 2026-09-12 (ingen proposition i riksdagens dokumentlista för riksmötet 2025/26) |
| Fortsatt översyn av K-regelverken hos BFN | Årsredovisningen. Den kända K2-ändringen är nu i kraft, se avsnitt 6. Ett separat BFN-beslut 2026-05-18 ändrar BFNAR 2017:3 (årsbokslut för enskild näringsidkare/handelsbolag) från räkenskapsår efter 2026-12-31 — berör inte AB, men visar att översynen fortsätter | bfn.se | 2026-09-12 (nyaste nyheten alltjämt 2026-06-30 "Frågor och svar om skattereduktion för gåvor", inget nytt sedan förra kontrollen) |
| Livsmedelsmomsen upphör 2027-12-31 | `vat_rates`, faktura-UI. Slutdatumet står fast: "Mervärdesskatten på livsmedel sänktes tillfälligt från 12 till 6 procent från och med den 1 april 2026 till och med den 31 december 2027" (regeringen.se, pressmeddelande september 2026). En utredning om differentierad matmoms ska redovisas senast 2026-12-22 och avgör vad som gäller från 2028-01-01. Separat uppdrag till Konsumentverket och Konjunkturinstitutet att följa prisgenomslaget slutredovisas 2028-03-31 — det är uppföljning, inte en regeländring | regeringen.se (pressmeddelanden 2026-09-01 och september 2026 om prisgenomslaget, dir. om differentierad mervärdesskatt på livsmedel), riksdagen.se (prop. 2025/26:55) | 2026-09-12 |
| Ny BAS-kontoplan varje år | Kontoplanen, momskoder, SRU. Inget publicerat för BAS 2027 ännu (senaste nyheterna på bas.se är alltjämt från 2026-06-09, och endast 2026 års kontoplaner ligger för nedladdning), väntas som vanligt i december | bas.se | 2026-09-12 |
| BFN avvecklas 2026-12-31; normgivning för K2/K3 förs över till Revisorsinspektionen och en ny Nämnd för god redovisningssed från 2027-01-01 | Källhänvisningarna i `AGENTS.md` och det här registret pekar i dag på bfn.se — måste bytas ut från 2027. Promemorian Ds (Fi2026/01008, publicerad 2026-05-04) föreslår att Revisorsinspektionen byter namn till Myndigheten för redovisning och revision, att Nämnden för god redovisningssed inrättas som särskilt beslutsorgan och att BFN:s uppgifter förs över dit. Ikraftträdande föreslås 2027-01-01. Ingen proposition ännu | regeringen.se (Ds Fi2026/01008, regeringsuppdrag 2025-10) | 2026-09-12 (ingen proposition i riksdagens dokumentlista; sökning på Bokföringsnämnden, Revisorsinspektionen, Myndigheten för redovisning och revision och Nämnden för god redovisningssed ger inga träffar bland propositionerna för riksmötet 2025/26) |

## 9. Årschecklista (november–december)

Körs inför varje nytt räkenskapsår. Varje punkt verifieras mot källa, läggs in
med ny migration, och registret ovan får nytt verifieringsdatum.

Inför 2027 gäller en avvikelse: valet 2026-09-13 gör att budgetpropositionen
lämnas senast 2026-11-12 i stället för i september (se avsnitt 8). Punkterna
3–4 och 7 nedan kan därför inte stängas förrän budgeten är lämnad, och flera
värden blir kända först i december.

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
| 2026-09-12 | Veckovis bevakning. **Nytt: obligatorisk digital inlämning av årsredovisning kontrollerad direkt mot lagtexten** i stället för indirekt (bolagsverket.se är fortsatt oåtkomlig). Konsoliderad ÅRL (1995:1554, t.o.m. SFS 2026:780) säger i 8 kap. 3 a § att handlingarna *får* överföras elektroniskt och i 2 kap. 5 § att årsredovisningen upprättas "i vanlig läsbar form eller i elektronisk form" — inlämningen är alltså frivillig, och de sekundärkällor som påstår att den blev obligatorisk för räkenskapsår som inleds efter 2025-12-31 har fel. Noterat i avsnitt 6 och 8 så att en framtida agent inte bygger på den felaktiga uppgiften. Bekräftat oförändrat: inget regeringsbeslut om prisbasbeloppen för 2027 (SCB:s beräkning 59 600 / 60 900 kr från 2026-07-15 kvarstår som enda uppgift, och SCB skriver själv att regeringen ska fastställa beloppen), prop. 2025/26:278 bereds fortfarande i skatteutskottet med motionstid t.o.m. 2026-10-05, tjänsteställereglerna är kvar på lagrådsremissnivå, ingen proposition om revisionsplikt eller om BFN:s avveckling, bfn.se nyaste nyhet 2026-06-30, bas.se nyaste 2026-06-09 (ingen BAS 2027), höstbudgetens fem remitterade skatteförslag och datumet 2026-11-12 oförändrade, livsmedelsmoms 6 % t.o.m. 2027-12-31. Nya propositioner sedan förra körningen: 2025/26:310 (hälsodataregister), skr. 311 (trafikavtal), 312 (bygglov) — ingen berör bokföringen i ett AB. Nya lagar 2026-07-01 enligt Skatteverket (utökade momskontroller vid registrering, permanent skattefri elbilsladdning på arbetsplatsen, 6 % moms på entré till dansställen) påverkar inte forkens kod: momssatsen 6 % finns redan i `vat_rates` och förmånsreglerna hör till fas 2 | riksdagen.se (konsoliderad SFS 1995:1554 via data.riksdagen.se, prop. 2025/26:278 HD03278, dokumentlista prop. rm 2025/26), scb.se (statistiknyhet "Prisbasbeloppet för år 2027", 2026-07-15), regeringen.se ("Skatteförslag som remitterats inför höstbudgeten 2027", "Statens budget", pressmeddelande om matmomsen), bfn.se, bas.se, skatteverket.se (nyheter och pressmeddelanden 2026) | Inga kodändringar — inget fynd i kraft eller beslutat som påverkar koden. Två rader (avsnitt 6 och 8) fick lagtextcitat och verifieringsdatum, åtta rader i avsnitt 8 fick nytt kontrolldatum. bolagsverket.se gick inte att nå (CAPTCHA) |
| 2026-09-08 | Uppströms (`Isakssol/debet-kredit-community`, 56 commits efter forkpunkten) inhämtade med `git merge upstream/main`. Regelstyrt innehåll: databasvillkor för verifikatens oföränderlighet och balans, årsavslutslås, momsperiodlås, eSKD- och SIE-format efter specifikation, importmoms (ruta 50, 60–62), intäktskonton 12/6 %, påminnelseavgift max 60 kr, F-skattdatum villkorade av `settings.pays_f_tax`, datumstyrt uppslag av `rule_values` (`src/lib/rule-values.ts`). Konflikt om motkonto för privata utlägg i AB: uppströms 2820, forken behåller 2893 | Uppströms commit-meddelanden och migrationer; inga regelvärden omverifierade mot myndighet i den här sessionen | Nya rader ovan markerade ”seedad uppströms (inhämtat 2026-09-08)”. Kvar att verifiera mot primärkälla vid nästa kontroll |
| 2026-09-08 | Veckovis bevakning. Nytt sedan förra körningen: höstbudgeten 2027 lämnas senast **2026-11-12** eftersom 2026 är valår, och regeringen har remitterat fem skatteförslag inför den (jordbruksdiesel, jobbskatteavdrag för seniorer, skattefri kompetensstödsförmån, indexering av taket i FoU-avdraget, slopad indexering av elenergiskatten) — alla föreslagna 2027-01-01, alla beroende av valutgången. Ny rad i avsnitt 8 och en anmärkning i årschecklistan: 2027 års regelvärden kan inte fastställas i systemet förrän budgeten är lämnad. Bekräftat oförändrat: prop. 2025/26:278 bereds fortfarande i skatteutskottet (motionstid t.o.m. 2026-10-05), tjänsteställereglerna är kvar på lagrådsremissnivå, inget regeringsbeslut om prisbasbeloppen för 2027, ingen proposition om revisionsplikt eller om BFN:s avveckling, bfn.se nyaste nyhet 2026-06-30, bas.se nyaste 2026-06-09 (ingen BAS 2027). Genomgång av riksdagens propositionslista för riksmötet 2025/26: prop. 306 (stadigvarande vistelse), 307 (skatteavtal Nederländerna) och 309 (kupongskatt) berör inte bokföringen i ett svenskägt AB | regeringen.se ("Skatteförslag som remitterats inför höstbudgeten 2027", "Datum för budgetarbetet", pressmeddelanden, lagrådsremisser), riksdagen.se (prop. 2025/26:278 HD03278, dokumentlista prop. rm 2025/26), bfn.se, bas.se, skatteverket.se (nyheter 2026) | Inga kodändringar — inget fynd i kraft eller beslutat. En ny rad i avsnitt 8, sex rader fick nytt kontrolldatum. bolagsverket.se gick inte att nå (CAPTCHA), SCB:s statistiknyhet om prisbasbeloppet 2027 gick inte att hämta på nytt |
| 2026-09-05 | Veckovis bevakning. Nytt sedan förra körningen: prop. 2025/26:278 (ML, gränsöverskridande handel, första steget i ViDA, föreslaget ikraftträdande 2027-01-01, ej beslutad), lagrådsremiss 2026-09-03 om tjänsteställe/tjänsteresa/ökade levnadskostnader (föreslaget 2027-01-01, ej proposition) och SCB:s beräknade prisbasbelopp för 2027 (59 600 / 60 900 kr, ännu inte fastställda av regeringen). Bekräftat oförändrat: livsmedelsmoms 6 % t.o.m. 2027-12-31, matmomsutredningen redovisas 2026-12-22, Ju 2025:10 slutbetänkande 2026-11-06, revisionsplikten, BAS 2027 ej publicerad. BFN:s avveckling preciserad med Ds Fi2026/01008 | riksdagen.se (prop. 2025/26:278, dokumentstatus HD03278), regeringen.se (pressmeddelanden 2026-09-01 och 2026-09-03, Ds Fi2026/01008), scb.se (statistiknyhet 2026-07-15), bas.se | Inga kodändringar — inget fynd i kraft eller beslutat. Tre nya/utökade rader i avsnitt 8, nästa kontroll för prisbasbeloppen flyttad till 2026-10. bfn.se och bolagsverket.se gick inte att nå |
| 2026-09-04 | Veckovis bevakning: prisbasbelopp (59 200 kr), förhöjt prisbasbelopp (60 500 kr) och referensräntan (2,00 % från 2026-07-01) bekräftade oförändrade mot förväntat | regeringen.se pressmeddelande "Prisbasbelopp för 2026 fastställt", riksbank.se nyhet "Referensräntan fastställd till 2,00 procent" | Verifieringsdatum satt i avsnitt 5, inga kodändringar |
| 2026-09-04 | Veckovis bevakning: BFN beslutade 2025-06-16 om ändringar i K2 (BFNAR 2016:10), gäller räkenskapsår som inleds efter 2025-12-31 — skärpta gränser för vem som får tillämpa K2, höjd periodiseringsgräns, nya/ändrade balansposter m.m. | bfn.se/andringar-i-k2-arsredovisning-for-mindre-foretag/, bfn.se/fragor-och-svar/andringar-i-k2-och-k3-fran-2026/ | Registrerat i avsnitt 6. Ingen kodändring: nuvarande `src/lib/k2/report.ts` renderar inga av de omdöpta/tillagda posterna. Plan för full verifiering mot BFNAR 2016:10 utökad i `PLAN.md` fas 3 |
| 2026-09-04 | Veckovis bevakning av avsnitt 8: digital inlämning, ViDA, revisionsplikt, K2-översyn, livsmedelsmoms och BAS-kontoplan kontrollerade. Ny bevakningspost tillagd om BFN:s avveckling 2026-12-31 (normgivning flyttar till Revisorsinspektionen/ny nämnd 2027-01-01). Nedsatt arbetsgivaravgift för 19–23-åringar (lag 2026:100) identifierad och infogad i avsnitt 4 | se avsnitt 8 och avsnitt 4 för källor per post | Avsnitt 4 och 8 uppdaterade, inga kodändringar |
| 2026-09-04 | Registret skapat vid fork. Alla uppströms värden markerade "seedad uppströms". AB-specifika regler inventerade och markerade "saknas" | Kodgenomgång av `supabase/migrations/` och `src/lib/` | Fas 0 och fas 1 i `PLAN.md` |
