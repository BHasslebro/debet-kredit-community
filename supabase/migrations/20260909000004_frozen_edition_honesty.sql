-- ============================================================
-- Ärligheten i den frysta utgåvans schema (Olivers beslut B1/B2, 6 sep).
--
-- B1: AI-kolumnerna i settings BEHÅLLS — de läses inte av Community-
-- utgåvan, men de är skälet till att en uppgradering till licensen sker
-- på samma databas utan schemaändring, och det löftet väger tyngre än
-- ett renare schema. Deras kolumnkommentarer skrevs dock för licensen
-- och läste som säljtext här; de skrivs om till att säga exakt vad som
-- gäller i den här utgåvan.
--
-- B2: bank_rules.auto_book RIVS. Ingen kod har någonsin läst den, och
-- dess kommentar lovade automatisk bokföring som utgåvan inte utför —
-- regelträffar bokförs när användaren väljer det. Det som inte finns
-- ska inte stå i schemat.
-- ============================================================

comment on column settings.ai_api_key is
  'Läses inte av Community-utgåvan. Kolumnen finns så att en uppgradering till licensutgåvan sker på samma databas utan schemaändring; licensens AI-bokförare lagrar sin nyckel här.';
comment on column settings.ai_model is
  'Läses inte av Community-utgåvan. Behålls för uppgraderingsvägen till licensutgåvan.';
comment on column settings.ai_rules is
  'Läses inte av Community-utgåvan. Behålls för uppgraderingsvägen till licensutgåvan.';

alter table bank_rules drop column if exists auto_book;
