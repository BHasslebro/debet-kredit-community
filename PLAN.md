# Plan — Debet & Kredit för ägarens aktiebolag

Uppdaterad 2026-09-04. Instruktioner för agenter finns i `AGENTS.md`,
regelregistret i `docs/REGELVERK.md`.

## Läge

Uppströms (fryst 2026-09-01) ger ett komplett system för enskild firma och ett
delvis stöd för aktiebolag. Det som fungerar oavsett bolagsform: löpande
bokföring med oföränderliga verifikat, moms med eSKD-fil, fakturering,
leverantörsreskontra, bank (Enable Banking och CSV), rapporter, SIE 4,
anläggningsregister, underlagsinkorg och arkivexport. För aktiebolag finns
dessutom ett K2-dokument (`src/lib/k2/`) och SRU-export för INK2
(`src/lib/sru/`).

Det som är byggt för enskild firma och blir fel eller saknas för aktiebolag:

| Område | Läge i koden | Konsekvens för AB |
|---|---|---|
| Skattekalender (`src/lib/tax-calendar.ts`) | Bara EF: F-skatt som eget uttag, Inkomstdeklaration 1 + NE | Fel frister. AB behöver INK2, AGI, årsredovisning, årsstämma |
| Snabbhändelser (`src/lib/posting/quick-events.ts`) | Eget uttag, egen insättning, F-skatt mot 2012 | Konton och begrepp finns inte i AB |
| Regelvärden (`rule_values`) | Bara EF-värden (egenavgifter, räntefördelning, expansionsfond) | Bolagsskatt, arbetsgivaravgifter, periodiseringsfond 25 %, schablonintäkt och statslåneränta saknas |
| Årsavslut (`src/lib/actions/yearend.ts`) | K1-bokslut, NE, resultat till 2019/2010 | AB kräver bokslutsdispositioner, skatteberäkning (8910/2510), resultat till 2099 och disposition vid stämma |
| Räkenskapsår (`fiscal_years.year` är unikt heltal) | Kalenderår antas | Brutet eller förlängt första räkenskapsår stöds inte |
| Lön och AGI | Finns bara i licensversionen | Ägarlön kan inte bokföras strukturerat, ingen AGI-fil |
| Skattesimulator (`src/lib/tax/calc.ts`) | EF-modell | Irrelevant, döljs redan för AB |
| Årsredovisning | K2-dokument för utskrift | Ingen digital inlämning, noter och förvaltningsberättelse ska verifieras mot K2 |

## Beslut som ägaren behöver fatta

Dessa styr prioriteringen och går inte att verifiera i kod eller källa.

| Fråga | Påverkar | Rekommendation |
|---|---|---|
| Räkenskapsår: kalenderår eller brutet? | Fas 1, datamodellen | Kalenderår. Systemet stödjer bara det i dag |
| Första räkenskapsåret: förkortat eller förlängt (max 18 månader)? | Datamodellen, årsavslut | Förkortat om bolaget bildas sent på året, annars blir fas 1 större |
| Tar ägaren lön från bolaget? | Om fas 2 byggs alls | Troligen ja, då prioriteras fas 2 |
| Momsperiod: månad, kvartal eller år? | Skattekalender, inställning | Kvartal om omsättningen är under 40 mkr |
| Revisor? | Årsredovisningsflödet | Frivilligt under gränsvärdena, verifiera i registret |
| Bankkoppling via Enable Banking eller CSV-import? | Deploy och avtal | CSV först, koppling senare |
| K2 eller K3? | Årsredovisning | K2 för mindre aktiebolag |

## Faser

### Fas 0 — Grund och regelverksprocess (pågår)

- [x] Nya `CLAUDE.md`, `AGENTS.md`, `PLAN.md`
- [x] `docs/REGELVERK.md` med register, årschecklista och logg
- [ ] Alla regelvärden som uppströms seedat för 2026 verifieras mot källa och får
      verifieringsdatum i registret
- [x] `pnpm test` grön som baslinje (74 tester, 2026-09-04)
- [ ] `pnpm lint` grön. Faller i dag med 9 fel och 3 varningar i uppströms kod
      (react-hooks-regler i bl.a. `src/lib/reports/pdf-docs.tsx`). Rättas
      innan de första kodändringarna, så att lint kan vara ett krav i CI
- [ ] Supabase-projekt, deploy och inloggning enligt `docs/INSTALLATION.md`
      (ägaren)
- [ ] Bolagstyp satt till aktiebolag i inställningarna, bolagets uppgifter
      inlagda

### Fas 1 — AB-korrekt grund

Mål: löpande bokföring, moms och skattekalender är rätt för ett aktiebolag utan
anställda.

- Regelvärden för AB i `rule_values`, verifierade och seedade med ny migration:
  bolagsskatt, arbetsgivaravgifter (full sats och eventuella nedsättningar),
  periodiseringsfond för juridisk person, statslåneränta och schablonintäkt,
  gränsvärden för revisionsplikt, gränsvärden för mindre företag enligt
  årsredovisningslagen
- Skattekalender per bolagstyp: moms (oförändrad), debiterad preliminärskatt
  (skattekostnad, inte uttag), arbetsgivardeklaration om lön, INK2,
  årsstämma och årsredovisning till Bolagsverket
- Snabbhändelser för AB: klart — betalt privat (kvitto, mil, traktamente,
  representation) bokförs mot 2893 Skulder till aktieägare i stället för
  2018, och Eget uttag/Egen insättning/F-skatt (EF-konton 2013/2018/2012)
  döljs i snabbhändelse-vyn när bolagstypen är aktiebolag
  (`src/lib/posting/quick-events.ts`, `src/components/new-verification-form.tsx`).
  Kvar: egna snabbhändelser för aktieägartillskott (2093) och lån från
  aktieägare, samt F-skatt-kontering för AB (väntar på verifierad regel,
  se docs/REGELVERK.md avsnitt 3 — källorna anger olika konton, 2510 vs
  2518/1630, olöst)
- Kontoplan för AB kontrolleras: eget kapital (2081, 2091, 2098, 2099),
  skatteskulder (2510, 2518), 2893, 8910, samt kopplingstabellen till INK2
- Årsavslut för AB: bokslutsdispositioner (periodiseringsfond 8811/8819 mot
  212x), skatteberäkning med ej avdragsgilla poster och schablonintäkt,
  bokning av årets skatt, årets resultat till 2099, resultatdisposition efter
  stämma, ingående balanser och låsning
- Tester i `src/lib/__tests__/` för skatteberäkning AB och kalendern

### Fas 2 — Lön och arbetsgivardeklaration (om ägaren tar lön)

- Lönekörning för en person: bruttolön, preliminärskatt enligt skattetabell,
  arbetsgivaravgifter, nettolön, lönespecifikation som PDF
- Kontering 7010/7510/2710/2731/1930 via posting engine, aldrig manuellt
- Arbetsgivardeklaration på individnivå (AGI) som XML enligt Skatteverkets
  tekniska beskrivning, deadline i kalendern
- Skattetabeller per år som data, inte kod. Nytt år kräver nya tabeller
- Bevakas: förmåner, semesterlöneskuld, sjuklön. Byggs inte förrän behov finns

### Fas 3 — Årsredovisning och deklaration komplett

- K2-dokumentet verifieras mot senaste BFNAR 2016:10: förvaltningsberättelse
  med flerårsöversikt, förändringar i eget kapital och resultatdisposition,
  noter (redovisningsprinciper, medelantal anställda). BFN beslutade
  2025-06-16 om ändringar som gäller för räkenskapsår som inleds efter
  2025-12-31: skärpta gränser för vem som får tillämpa K2 (kryptotillgångar,
  utländsk filial, aktierelaterade ersättningar eller konvertibla
  skuldebrev utesluter K2 alltid; byggnadsintäkter ≥75 % av
  nettoomsättningen eller en väsentlig uppskjuten skatteskuld utesluter K2
  för företag över lättnadsreglens gränsvärden), höjd periodiseringsgräns
  (7 000 kr), ny balanspost för tomträtter, uppdelad post för färdiga
  varor/handelsvaror, med mera. Se `docs/REGELVERK.md` avsnitt 6 för källor
- Fastställelseintyg och mall för årsstämmoprotokoll
- Digital inlämning till Bolagsverket. Kravet på obligatorisk digital
  inlämning bevakas i registret
- INK2, INK2R och INK2S verifieras mot årets SRU-specifikation och testas i
  Skatteverkets testmiljö

### Fas 4 — Årsrullning (återkommande varje november–december)

- Årschecklistan i `docs/REGELVERK.md` körs: nya rader i `rule_values`, ny
  BAS-kontoplan, momssatser, skattetabeller, frister, blankettkoder
- En migration per år, namngiven `YYYYMMDD_rule_values_YYYY.sql`
- Registret får nya verifieringsdatum

### Fas 5 — Senare, lägre prioritet

- Stöd för brutet och förlängt räkenskapsår
- Underlag för K10 (utdelningsutrymme enligt 3:12-reglerna)
- E-faktura via Peppol. ViDA-kraven bevakas
- Fler bankformat i CSV-importen

## Utanför scope

- AI-tolkning av kvitton och automatisk bokföring. Systemet föreslår, ägaren
  bokför
- Flera bolag i samma installation
- Funktioner för handelsbolag
