# VATTENTÄTT / COMMUNITYJAKTEN — JÄGARE 1: bokföring + export

Miljö: färsk klon av `Isakssol/debet-kredit-community` @ `6104538`, pnpm install,
**lokal Supabase med repots migrationer från noll** (`supabase db reset` — hela
migrationskedjan, 35 migrationer, gick igenom rent). Prod-bygge (`next build` +
`next start`, port 3111) mot lokal databas. Ingen xulyjo-post skapad — allt låg lokalt.

Gates före och efter: `tsc --noEmit` rent, `vitest run` **652 gröna / 58 skippade
(2 integrationsfiler)**. Klonen lämnas orörd (mina probe-filer borttagna).

## Mätapparaten: bruten momsformel → rött → återställd

Golden-sviterna körda separat: **7 filer, 151 tester, gröna.**

Medveten sabotage i `src/lib/vat/report.ts`:
`boxes["49"] = output - (boxes["48"] ?? 0)` → `output + (...)`.

Resultat: **8 röda** i 2 filer — `moms-rapport.golden.test.ts` A1, A2, A4, B3, C7 och
`calculations.test.ts` ("mappar konton till rätt rutor", "eSKD-filen följer
Skatteverkets format", omvänd skattskyldighet). Återställd → 652 gröna igen.
Apparaten fångar en momsformel som ändras. Noterat: `eskd.golden.test.ts` fångade
den **inte** (den matar in färdiga rutor), så ruta 49-invarianten hänger på
moms-rapport-sviten ensam.

---

## FYND

### 1. KRITISKT — 12 % och 6 % moms går inte att bokföra rätt. Alls.

`vat_codes` definierar `SALES_12` och `SALES_6`. `vat_rates` har `reduced_12`/`reduced_6`.
Utgående momskonton **2621** (12 %) och **2631** (6 %) finns i seeden. Momsrapporten har
ruta 11 och 12 och rimlighetskontroller för båda satserna. Artikel- och fakturaformulären
erbjuder 25/12/6/0 %.

Men **inget intäktskonto i seeden har `vat_code = SALES_12` eller `SALES_6`** — bara 3001
och 3011 (`SALES_25`). Och `/kontoplan` är **helt läsvy**: ingen "ny konto"-knapp, ingen
möjlighet att sätta `vat_code`. Kedjan har ingen ände.

Bevis (hela vägen genom appen): artikel "Massage 6 % moms", momssats 6 %, försäljningskonto
= det enda appen erbjuder (`3011 Försäljning tjänster Sverige 25 %` — appen varnar inte).
Faktura 1 000 kr + 60 kr moms bokförd. Momsdeklaration Q2 2026:

```
05  Momspliktig försäljning …            1 500
12  Utgående moms 6 %                       60
Momskontroller
!  Utgående moms 25 % stämmer mot underlaget
   Bokförd moms 0 kr men 25 % av underlaget är 375 kr — kontrollera konteringen
!  Utgående moms 6 % stämmer mot underlaget
   Bokförd moms 60 kr men 6 % av underlaget är 0 kr — kontrollera konteringen
```

Två röda kontroller av en helt korrekt faktura, och **ingenting användaren kan göra**.
`Godkänn momsrapport` är dessutom **inte spärrad** av de röda kontrollerna, och
bekräftelsedialogen nämner dem inte.

### 2. KRITISKT — SIE-importen ger en momsdeklaration utan beskattningsunderlag

`src/lib/actions/sie-import.ts:39` och `:53` skapar okända konton med **enbart**
`number`, `name`, `description` — ingen `vat_code`, ingen `ne_field`. `UNDERLAG_BOX`
i momsmotorn slår på `vat_code`, inte kontonummer. Alltså: allt som importeras från
Fortnox/Visma/Bokio hamnar **aldrig** i ruta 05/20–24/35–42.

Bevis på riktig fil (`studio-plaza/docs/sie4-example-2026-08.si`, CP437, 7 verifikat):
importen gick igenom rent — "3 nya konton, 7 verifikat, 0 överhoppade", CP437 avkodat rätt,
belopp identiska. Kontot `3003 Försäljning inom Sverige, 6 % moms` skapades med
`vat_code = NULL`. Momsdeklaration Q3 2026:

```
05   14 256      (skulle varit 166 803 — 152 547 kr saknas)
12    9 152
!  Bokförd moms 9 152,83 kr men 6 % av underlaget är 0 kr
```

Onboardingens steg 3 pekar aktivt hit ("Jag byter från ett annat program"). Samma
grundfel som 1 — kontoplanen går inte att rätta i appen.

### 3. KRITISKT — momslåset kan tvättas bort i tre REST-anrop

`period_locks_block_unlock` är en **BEFORE DELETE**-trigger som testar
`old.reason <> 'manual'`. Det finns **ingen BEFORE UPDATE-vakt på `reason`**.
Som vanlig inloggad användare (inte API-maskin — den RESTRIKTIVA policyn
`"api andrar aldrig"` täcker bara `is_api_machine()`):

```
1. UPDATE period_locks SET reason='manual' WHERE month=2   →  1 rad ändrad
2. DELETE FROM period_locks WHERE month=2                  →  1 rad raderad
3. book_verification('A','2026-02-14', …)                  →  A10 bokfört
```

En redan inlämnad momsperiod fick alltså en ny manuell bokning i efterhand.
`arsavslut.golden.test.ts` → "en momslåst period kan inte låsas upp [BFL 5:1]"
**passerar** ändå, för testet kontrollerar bara att DELETE-triggern finns och att
den nämner `old.reason <> 'manual'`. Invarianten testet påstår sig skydda finns inte.

(Det som *fungerar*: DELETE direkt på ett `vat_report`-lås nekas, manuellt bokförd rad
i låst period nekas, `year_end`/`vat_report`/`opening_balance` släpps igenom
systemundantaget, ett avslutat räkenskapsår kan inte återöppnas.)

### 4. ALLVARLIGT — företagsnamnet saknas på varje faktura-PDF

`src/app/(app)/fakturor/[id]/pdf/route.ts:73` skickar `company: settings`.
`InvoicePdfData["company"]` deklarerar fältet **`name`**; settings-raden heter
**`company_name`**. `d.company.name` är `undefined` → `<Text>` renderar ingenting.

pdfplumber på en verkligt genererad faktura (84 ord, inga överlapp, inget utanför sidan):

```
top=49.0  x=48.0  'Storgatan'      ← rubrikblocket börjar på ADRESSEN
top=795.2 x=48.0  'Storgatan'      ← sidfoten likaså
```

Rubriken saknar avsändarens namn, den lagstadgade sidfoten likaså. Att namnet finns
i "Vår referens" är just beviset — den raden använder `settings.company_name`
(route.ts:65). Samma miss finns inte i påminnelse-routen eller rapport-routen.
Fångades inte av tsc: `select("*")` på en otypad klient ger `any`.

### 5. ALLVARLIGT — minustecknet försvinner i alla PDF:er

`fmtKr` / `fmt` = `n.toLocaleString("sv-SE")`. sv-SE ger **U+2212 MINUS SIGN**
(inte `-`). @react-pdf kör standard-Helvetica utan `Font.register`, och U+2212 finns
inte där. pdfplumber:

```
'(cid:18)'  Helvetica  x0=444.1  width=0.0
```

**Bredd 0, ingen ToUnicode-mappning** → ingenting ritas. I resultatrapporten står
kostnaderna som `(cid:18)5 000,00`, i balansrapporten `(cid:18)0,00`. Alltså:
kostnader och skulder trycks **som positiva tal** i resultatrapport, balansrapport,
huvudbok — och i arkiv-zippen som ska bevaras i sju år. Samma `fmt` sitter i
`invoice-pdf.tsx`, så kreditfakturor drabbas likadant. (Tusenavskiljaren U+00A0 finns
i WinAnsi och renderas rätt — det är bara minustecknet.)

Bonus i samma spår: `fmtKr(-0)` ger `−0,00` på nollrader i balansrapporten.

### 6. ALLVARLIGT — K2-årsredovisningen tappar hela kontogrupper

`buildK2Report` summerar fasta intervall. Luckorna:

| Lucka | BAS-grupp | Effekt |
|---|---|---|
| **1800–1899** | Kortfristiga placeringar | faller ur SUMMA TILLGÅNGAR |
| **2200–2299** | Avsättningar | faller ur EK OCH SKULDER |
| **2082–2090** | Reservfond, uppskrivningsfond, ej reg. aktiekapital | faller ur eget kapital |
| **2000–2080** | Enskild firmas eget kapital (2010/2012/2013/2018) | faller ur EK OCH SKULDER |

Verifierat: `1810 = 50 000` → tillgångar 100 000 mot EK+skulder 150 000.
`2220 = −50 000` → 150 000 mot 100 000. `2086 = −50 000` → 150 000 mot 100 000.

Sista raden är den värsta, för den är **ett klick bort i appen**: snabbhändelsen
"Eget uttag" (`quick-events.ts`, ingen `company_type`-koll alls) bokar D 2013 / K 1930
och erbjuds även ett aktiebolag. Kört skarpt på testbolaget, 5 000 kr:

```
Obs: balansräkningen balanserar inte (tillgångar 191 206 kr,
     eget kapital & skulder 196 206 kr).
     Kontrollera att alla bokslutsposter (avskrivningar, skatt, årets resultat)
     är bokförda innan dokumentet används.
```

Differensen = exakt uttaget. Varningen pekar på fel sak, och den ligger i en `print:hidden`-ruta
(`k2-annual-report.tsx:59`) — **det utskrivna dokumentet till Bolagsverket visar en
obalanserad balansräkning utan ett ord om saken.**

### 7. K2 och SRU: raderna summerar inte till den utskrivna summan

Varje rad rundas för sig, totalen rundas från det orundade. På testbolaget:

```
Resultaträkning:  165 350 − 5 000 − 2 988 = 157 362,  men "Rörelseresultat" 157 361
Balansräkning:    157 361 + 5 000 + 15 527 + 18 396 = 196 284,
                  men "SUMMA EGET KAPITAL OCH SKULDER" 196 285
```

Samma en-krona följer med till Skatteverket via SRU: `BLANKETTER.SRU` INK2R har
`7410 165350`, `7511 5000`, `7513 2988`, `7450 157361` — 165350−5000−2988 = 157362.

Och i flerårsöversikten: raden **"Resultat efter finansiella poster"** skriver
`report.result`, som är *årets resultat* (efter bokslutsdispositioner och skatt).
Så snart skatt är bokförd är etiketten fel.

Samt: `Aktiekapital −0` och `Balanserat resultat −0` i "Förändringar i eget kapital"
— `-sum(...)` av ett nollkonto ger `-0`, och den tabellen filtrerar inte som
`balanceEquityLiabilities` gör.

### 8. Bankimportens dubblettspärr slår ihop äkta transaktioner

`bank_transactions_dedup UNIQUE (booking_date, amount, description) WHERE external_id IS NULL`.
CSV-rader har inget `external_id`. Två **äkta** identiska Swish-betalningar samma dag
(250,50 kr, samma text) → den andra tyst bortkastad, bara "1 dubbletter" i en toast.
Kontot kan aldrig stämmas av, och den försvunna raden går inte att få fram.
CSV:n bär `Bokfört saldo` som skiljer raderna åt (182 455,14 / 182 204,64) — den
används inte i nyckeln.

(Resten av bankkedjan är stark: Swedbank-formatet autodetekterat, fakturamatchning
på OCR+belopp hittade "Inbetalning faktura 1 — Testkund AB", regelförslaget
"Bankkostnad (D 6570, momsfri)" rätt, avstämningssidan "Stämmer på öret".)

### 9. Analys-sidan räknar "affärer" på två sätt på samma sida

`salesVerIds` filtrerar `v.source !== "correction"` (analys/page.tsx:137) medan
`byCustomer`/`byService` räknar alla verifikat med intäktsrad. På testdatat:
"Total omsättning: 165 349,79 kr · **11 affärer**", medan tabellen ovanför summerar
12 + 1 = **13** och intäktskontotabellen 10 + 2 + 1 = **13**.

Diagrammens matematik är däremot rätt — handräknat mot `analysis-charts.ts`:
kostnadsklasser 100/300/100/500 → 10/30/10/50 % (klass 3 och 8 uteslutna),
bruttomarginal 60 / null / −20, pareto-andelar mot hela totalen inte topplistan,
åldersanalys `null` förfallodatum → "Inte förfallet", 14 d → 1–30, 45 d → 31–60,
410 d → över 60. Allt stämmer. Och sidan verifierat: klass 4 = 63 %, klass 6 = 37 %
av 7 988,36 kr; CAC-nämnaren 5 000/11 = 454,55.

### 10. "Verifikat utan underlag" anklagar appens egna verifikat

`analys/page.tsx:178` filtrerar bort `correction` men **inte** `vat_report`,
`year_end` eller `customer_invoice`. Momsomföringen, bokslutsverifikatet och varje
kundfaktura räknas som "verifikat utan underlag — arkiveringsplikt 7 år". Ingen av
dem kan någonsin få ett externt underlag, så räknaren kan aldrig bli noll.
På testbolaget: "16 st". Avstämningssidan har samma räknare ("13 verifikat saknar underlag").

### 11. Aktiebolag är halvstött och texterna säger emot valet

Onboardingen erbjuder Aktiebolag och Handelsbolag; `company_type` respekteras i
`/skatt`, `/arsavslut`, `/export/sru` och inställningarna. Men:

- `/kontoplan`: "BAS 2026-urval **för enskild firma** (tjänsteföretag)."
- `/verifikat/ny`: "Vanliga händelser med färdig kontering **för enskild firma**."
- Översiktens checklista: "**Personnummer** och bankgiro krävs på fakturorna"
  (`page.tsx:96`, hårdkodad) — för ett AB är det organisationsnummer.
- Nyckeltal "Egna uttag i år · inkl. F-skatt" visas för aktiebolaget.
- Snabbhändelserna bokar 2012/2013/2018 utan `company_type`-koll → se fynd 6.

### 12. Småfel

- `kunder/page.tsx:60`: `{c.payment_terms ?? "standard"} dgr` → varje kund utan
  betalningsvillkor visas som "**standard dgr**".
- Artikelns försäljningskonto-lista innehåller `3740 Öres- och kronutjämning`
  (systemkonto för avrundning) och `3973 Vinst vid avyttring` som valbara intäktskonton.
- Faktura-PDF med tomt bankgiro trycker rubriken "BETALAS TILL" utan värde;
  inget hindrar bokföring av fakturan.

---

## Det som höll

- **Migrationskedjan från noll**: `supabase db reset` rent, 35 migrationer, 38 tabeller.
- **Motorn**: obalans (`debet 100 ≠ kredit 90`) nekas, nollverifikat ("Verifikatet saknar
  belopp.") nekas, okänt konto nekas.
- **Oföränderlighet (BFL)**: UPDATE och DELETE på `verifications` och
  `verification_rows` nekas alla fyra, beskrivningen oförändrad efteråt.
  `correct_verification` skapar rätt par (reversal + replacement) och vägrar rätta
  ett redan rättat verifikat.
- **Underlagens raderingsskydd**: länkat underlag går varken att radera ("arkiveringskrav
  7 år") eller koppla loss ("BFL 7 kap. 2 §"); olänkat underlag i inkorgen går att radera.
- **Periodlåsets systemundantag**: `year_end` bokas i låst period, `manual` nekas,
  och `year_end`-källan hålls utanför momsunderlaget (verifierat: ruta 05 = 11 100,
  inte 11 200).
- **Momsgodkännandet [SFL 26:26]**: Q3 nekades — "Perioden 2026-07-01 – 2026-09-30 är
  inte slut än."
- **eSKD-filen**: ISO-8859-1 på riktigt (hexdump), taggordning enligt Skatteverket,
  `&`/`<`/`>` XML-escapade, `<Period>202603</Period>`, U+2014 i upplysningen avvisad
  med rätt felmeddelande, orgnr formaterat `556000-0000`.
- **Omföringsverifikatet**: 2611 D 2 750, 2614 D 1 250, 2645 K 1 250, 2650 K 2 750 —
  26xx-saldona nollställda, jan–mar låsta med `reason='vat_report'`.
- **SIE-exporten**: CP437, `#KPTYP BAS2026`, `#KONTO`/`#UB 0`/`#RES 0`/`#VER`/`#TRANS`
  kompletta, belopp identiska med källfilen efter import→export-rundgång.
- **Arkiv-zippen**: SIE + resultat-, balans- och huvudboks-PDF + `underlag/`.
- **Avstämningen**: "Tillgångar = eget kapital + skulder + beräknat resultat —
  Stämmer på öret"; bankkonto, reskontror, momskonton, inkorg, körjournal, utkast.
- **PDF-geometrin**: pdfplumber hittar **inga överlapp**, inga ord utanför sidan,
  inga ord mot högerkanten i vare sig faktura-, resultat- eller balans-PDF:en.
  K2-dokumentet är HTML med `breakBefore: "page"` på fastställelseintyget (ingen
  PDF-motor inblandad — mätapparaten från huvudrepot är inte porterad hit).

## Utanför min yta

- Lönefunktion finns inte i community-utgåvan (ingen `/lon`, inga 7xxx-lönerutiner
  utöver kontona). Nämns här bara som konstaterande — paritetsfrågan är JÄGARE 2:s.
- De 2 skippade vitest-filerna (`byra-live`, `mfa-live`) är plattformens.
