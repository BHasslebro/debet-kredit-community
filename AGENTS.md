# Debet & Kredit — bokföring för ett aktiebolag

Det här är en fork av `Isakssol/debet-kredit-community` (AGPL-3.0). Uppströms
frystes 2026-09-01 och tar varken emot eller skickar ändringar. Repot används
för bokföringen i ägarens aktiebolag (under bildande): en användare, en databas,
självhostat på Next.js + Supabase. Det är inte en produkt för andra.

Allt underhåll är vårt, inklusive nästa års regelvärden. Ingen annan kommer att
uppdatera momsregler, basbelopp, avgiftssatser eller deklarationsfrister här.

## Uppdrag nummer ett: bevaka regelverket

Systemet ska bokföra rätt enligt gällande svensk lag och god redovisningssed,
varje år, inte bara det år det byggdes. Därför gäller följande för alla agenter:

1. **Lita inte på träningsdata om skatte- och redovisningsregler.** Belopp,
   procentsatser, frister och blanketter ändras varje år. Verifiera mot
   primärkällan innan du ändrar ett regelvärde, en momsregel, en kontering,
   en deadline eller en blankettkod.
2. **`docs/REGELVERK.md` är registret.** Där står vilka regler systemet bygger
   på, var i koden de bor, vilken källa som styrker dem, när de senast
   verifierades och när de ska kontrolleras nästa gång. Uppdatera registret
   varje gång du verifierar eller ändrar en regel. En rad utan
   verifieringsdatum är en obekräftad regel.
3. **Ange källa i commit-meddelandet** när du ändrar regelstyrd logik: URL och
   datumet du läste källan.
4. **Vid sessionsstart** som rör bokföring, skatt eller moms: öppna registret
   och kontrollera poster vars "Nästa kontroll" har passerat. Rapportera dem
   till ägaren även om sessionen handlar om något annat.
5. **Inför varje nytt räkenskapsår** (november–december): gå igenom
   årschecklistan i `docs/REGELVERK.md` och lägg in nästa års värden.
6. **Osäkra regler bevakas, implementeras inte.** En proposition som inte är
   beslutad, eller en ändring utan känt ikraftträdande, läggs in som en post
   med status "bevakas" i registret. Koden ändras först när beslut och
   ikraftträdande är kända.

### Primärkällor

| Område | Källa |
|---|---|
| Lagtext (SFS) | riksdagen.se: Bokföringslagen 1999:1078, Årsredovisningslagen 1995:1554, Mervärdesskattelagen 2023:200, Inkomstskattelagen 1999:1229, Skatteförfarandelagen 2011:1244, Aktiebolagslagen 2005:551, Socialavgiftslagen 2000:980 |
| Skatt, moms, arbetsgivaravgifter, frister, SRU/AGI-specifikationer, belopp per år | skatteverket.se (Rättslig vägledning, "Belopp och procent", tekniska beskrivningar för filöverföring) |
| God redovisningssed, K2/K3, löpande bokföring | bfn.se (BFNAR 2016:10 K2, BFNAR 2012:1 K3, BFNAR 2013:2 bokföring) |
| Kontoplan och SRU-kopplingstabell | bas.se (ny BAS-kontoplan varje år) |
| Årsredovisning, årsstämma, revisor, frister, digital inlämning | bolagsverket.se |
| Referensränta (dröjsmålsränta) | riksbank.se |
| Statslåneränta (schablonintäkt periodiseringsfond m.m.) | riksgalden.se |
| Prisbasbelopp | regeringen.se / scb.se |
| Inkomstbasbelopp | pensionsmyndigheten.se |
| Moms i EU, e-fakturering (ViDA), Peppol | EU-kommissionen, Digg |

Sekundärkällor (bra för att upptäcka ändringar, aldrig som enda källa): BFN:s
och Skatteverkets nyheter, Srf konsulterna, FAR, Björn Lundén.

## Så genomförs en regeländring

- **Värden i tid** ligger i tabellen `rule_values` (nyckel, värde, giltig från,
  giltig till). Aldrig hårdkodat i TypeScript. Nya värden = ny migration i
  `supabase/migrations/` med datumprefix. Ändra aldrig en befintlig migration.
  Gamla rader behålls, så att äldre räkenskapsår fortsätter räkna rätt.
- **Momssatser** ligger i `vat_rates` med giltighetsintervall. **Konton,
  momskoder och SRU-koder** ligger i `accounts`.
- **Frister** genereras i `src/lib/tax-calendar.ts`.
- **Beräkningslogik** (skatt, moms, K2, SRU) ligger under `src/lib/`. En
  ändrad regel ska ha ett test i `src/lib/__tests__/` som låser beteendet med
  kända siffror, helst från myndighetens eget räkneexempel.
- **Dokumentera** i `docs/REGELVERK.md`, och i `docs/KONTERINGSGUIDE.md` om
  ändringen påverkar hur man konterar.

## Oförhandlingsbart i koden

- Bokförda verifikat ändras eller raderas aldrig. Rättelse sker med
  ändringsverifikat (BFNAR 2013:2). Triggers och databasfunktioner som
  upprätthåller detta får inte försvagas.
- Varje verifikat balanserar (summa debet = summa kredit) på databasnivå.
  Obrutna verifikationsnummerserier per serie och räkenskapsår.
- Belopp lagras som `numeric(12,2)`. Räkna med hjälpfunktionerna i
  `src/lib/money.ts`, aldrig med flyttal.
- Låst period tar inte emot verifikat. Godkänd momsrapport låser perioden.
- Underlag (bilagor) raderas aldrig medan verifikatet finns. Arkivering i sju
  år enligt bokföringslagen 7 kap.
- Ingenting bokförs utan att användaren bekräftar. Systemet föreslår, ägaren
  beslutar.
- Row Level Security på alla tabeller. Inga hemligheter i koden.
  Självregistrering ska vara avstängd i Supabase.

## Teknik

- Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, shadcn/ui,
  Supabase (Postgres, Auth, Storage), Vitest.
- Next.js 16 skiljer sig från äldre versioner du kan ha lärt dig. Läs relevant
  guide i `node_modules/next/dist/docs/` innan du skriver Next-specifik kod,
  och följ deprecation-varningar.
- Kommandon: `pnpm install`, `pnpm dev`, `pnpm test`, `pnpm lint`,
  `pnpm build`. Kör test och lint innan commit.
- Migrationer körs mot länkat Supabase-projekt med `npx supabase db push`.
- Struktur: sidor i `src/app/(app)/`, server actions i `src/lib/actions/`
  (all bokföringslogik körs server-side), domänlogik i `src/lib/` (posting,
  vat, tax, k2, sru, sie, bank), schema och seed i `supabase/migrations/`.
- Språk: svenska i UI, dokumentation och registret. Engelska i kod,
  variabelnamn och commit-meddelanden.

## Arbetssätt

- Läs `PLAN.md` för prioriteringar. Håll ändringar små, en regel eller en
  funktion per pull request.
- Fråga inte ägaren om sådant som går att verifiera i källa eller kod. Fråga
  när beslutet är ägarens (räkenskapsår, lön, revisor, momsperiod), se listan
  i `PLAN.md`.
- Uppströms dokumentation (`README.md`, `docs/INSTALLATION*.md`) beskriver
  community-produkten och länkar till debea.se. Den är referens, inte
  instruktion. Licensversionen är irrelevant för det här repot.
- Funktioner för enskild firma (skattesimulator, K1, NE-bilaga) behålls men
  underhålls inte. De ska vara dolda när bolagstypen är aktiebolag.
