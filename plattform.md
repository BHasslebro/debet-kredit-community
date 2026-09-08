# JÄGARE 2 — Plattform + frysningsrevisionen

Klon: `scratchpad/comjakt` @ `6104538`. Gates efter min ändring: **tsc EXIT=0**,
**vitest 652 passed / 58 skipped (35 filer passed, 2 skipped)**.

## Miljöblockering (inte repots fel)

Maskinens datavolym är **100 % full** — 409 Gi av 460 Gi, 458 Mi kvar. Docker-daemonen
kastar I/O-fel (`snapshotter.Usage failed ... input/output error`) och en parallell
Supabase-stack (`byrajakt`) körs redan. Jag kunde därför **inte** starta en lokal stack
och köra repots migrationer från noll.

De 58 överhoppade proven är `mfa-live.integration.test.ts` och
`byra-live.integration.test.ts` — båda i min ruta. **De är alltså oprövade skarpt.**
Jag raderade inte användardata för att få plats. I stället prövade jag
byrå-kontraktet mot testprojektet `xulyjoziterdqlzbqvku` (fjärr, ingen lokal disk).

## Verifierat OK

**Byrå-läskontraktet — fält för fält, mot levande DB.** Vyn `public.byra_stats` i
`xulyjoziterdqlzbqvku` har exakt de 11 kolumnerna `ByraStatsRow` väntar sig, i rätt
ordning och typ. Portalen (`debea-byra/app/src/lib/collector/normalize.ts`) läser exakt
dessa, med toleranta alias (`unbooked`, `unmatched_bank_transactions`,
`last_verification_date`, `period_lock`, `next_vat_due_date`). `fiscal_year` är ett
objekt i båda ändar. Skillnaden `schema_version` (kontraktets form) vs
`installation_schema_version` (antal körda migrationer) hedras på båda sidor — portalen
läser medvetet bara den senare. **Inget glapp.** Endast public-schemat lästes; byrå-schemat
rördes aldrig, och inga poster skapades (inget att städa).

**API-ytan.** Sluten scope-vokabulär (2 ord, check-villkor i DB). Kvoten prövas **före**
scope-kontrollen — medveten spärr mot att kartlägga scopes gratis. Nyckeln läses bara ur
`Authorization`, aldrig ur frågesträngen. Uppslag på SHA-256 i unikt index. Idempotens
obligatorisk på skrivning; samma huvud + annan kropp → 409. Kundfaktura-POST kräver både
`ledger:write` och `data:read` och säger varför i ett begripligt 403. Periodlås → 422 med
utkastet kvar. `/api/v1/verifikat` har medvetet ingen POST; råa verifikatskrivningar är
stängda (commit `f2b994a`). Felformatet är enhetligt med stabil maskinkod + `request_id`.

**2FA.** `aal1`/`aal2`-grinden, kodsteget nåbart på aal1, RLS-migrationen
`20260908000004_mfa_second_step_in_rls.sql` på plats. *Skarpa vägen oprövad — se blockeringen.*

**Roller.** Medvetet frånvarande, dokumenterat på tre ställen i koden ("Licensutgåvan
kräver rollen admin här. Den här utgåvan har ingen…") och i README. Konsekvent.

**Logotypen.** Uppladdning → `logo_path` → sidomeny (`app-brand.tsx`) → faktura-PDF
(`logoDataUrl`). Hela kedjan hänger ihop.

**Felrapporten.** Går till `https://debea.se/api/feedback`, med prov för sanering,
buffert, kontrakt, namn och skärmbild.

**Arbetar-lägen.** Finns genomgående på långköparna (Sparar…, Importerar…, Bokför…,
Beräknar…, Laddar upp…, Skapar…).

## Frysningsrevisionens dom: **håller i beteende, läcker i framing**

Ingen AI-yta är nåbar. `/api/radgivare`, `/api/inbound/order`, `/api/inbound/peppol` och
scopet `intake:write` saknas alla, och det gyllene provet
`golden/api-spec.golden.test.ts` vaktar aktivt att de förblir borta. Kreditupplysning och
månadsavslut: inga spår någonstans. Motor-framingen är konsekvent.

Men två licensfunktioner lever kvar **i schemat** med säljande kommentarer:

### F1 — AI-nyckelytor kvar i migrationerna (medel)
`supabase/migrations/20260831000001_multi_company_ai.sql` lägger fortfarande till
`settings.ai_api_key`, `ai_model`, `ai_rules`. Kolumnkommentaren lyder ordagrant:
*"API-nyckel för AI-bokföraren (Anthropic sk-ant-… eller OpenAI sk-…). Lagras i klartext i
databasen"*. Ingen kod läser dem — inställningssidan strippar `ai_api_key` explicit. Men
filen heter `multi_company_ai.sql` och den som läser migrationerna i det publika repot ser
en AI-nyckelkolumn med instruktion om klartextlagring. Frysningen gäller beteendet; det här
är kvarlämnad marknadsföring av en funktion som inte finns, plus en latent klartext-hemlighet.

### F2 — `bank_rules.auto_book` är en död kolumn med licens-framing (medel)
`20260831000004_bank_rules.sql` inleds *"Bokföringsregler för banktransaktioner:
'självgående bokföring'. … auto_book=true → bokförs automatiskt vid entydig träff."*
`auto_book` har **noll** referenser i `src/`. README säger uttryckligen motsatsen:
"Community-versionen räknar fram och föreslår; den agerar aldrig på egen hand."
Beteendet är rätt, schemat och kommentaren motsäger README.

### F3 — `.env.example` saknade Enable Banking-nycklarna (**lagat**)
`ENABLE_BANKING_APP_ID` och `ENABLE_BANKING_PRIVATE_KEY` driver funktionalitet som är
**dokumenterad i README rad 99** ("Bank — PSD2-koppling (Enable Banking)") och i
docs/INSTALLATION.md, men var de enda två körtidsvariablerna som saknades i
`.env.example`, där varje annan valfri nyckel (RESEND, STATS, SERVICE_ROLE) står
utkommenterad. Den som följer env-mallen kunde aldrig slå på en dokumenterad funktion —
exakt config-döda vinkeln. **Lagat**: block tillagt i filens egen ton. Gates gröna efter.

### F4 — Sparkles-ikonen på demons ytterdörr (kosmetiskt, bedömningsfråga)
`src/components/demo-gate.tsx:10,41` använder `Sparkles` från lucide-react på knappen
"Öppna demon". Husregeln (`design_no_sparkle_icon`) förbjuder ✨/Sparkles för **AI-ytor**;
demogrinden är strikt sett ingen AI-yta, så regeln biter inte formellt. Men det är exakt
den ikon som läser som "AI" för en besökare, och den sitter på gratisvägens ytterdörr
under en frysning vars hela poäng är att inte antyda AI. **Jag ändrade den inte** — det är
ett designval, inte ett fel.

## Beslutsfrågor till Oliver

**B1 (F1).** Ska AI-kolumnerna städas ur community-migrationerna med en ny migration som
droppar dem — eller behållas för att hålla migrationsliggaren identisk med licensens så att
`UPPGRADERA-FRAN-COMMUNITY.md` fungerar? Behålls de: ska kommentartexten ändå skrivas om så
den inte marknadsför AI-bokföraren och inte instruerar om klartextlagring? (Filnamnet går
inte att döpa om retroaktivt utan att bryta liggaren.)

**B2 (F2).** Samma fråga för `auto_book`: död kolumn — droppa, eller behålla för
uppgraderingsparitet? Och ska migrationens rubrik skrivas om så den inte lovar
"självgående bokföring" som README uttryckligen säger inte finns?

**B3 (PSD2).** Ingen avvikelse — Enable Banking är avsiktligt med, dokumenterat i README
rad 99. Frågan stängd.

## Push

Jag har **inte** pushat. Enda ändringen är `.env.example` (F3), lämnad **ocommittad** med
flit: klonen delas med Jägare 1 och en commit härifrån hade kunnat kollidera med deras
arbete. Push till det publika repot `Isakssol/debet-kredit-community` ändrar dessutom
publikt innehåll och bör ha Olivers uttryckliga ja.
