-- Bankimportens dubblettspärr slog ihop äkta transaktioner.
-- unique (booking_date, amount, description) where external_id is null gjorde
-- två äkta identiska Swish-betalningar samma dag till en enda rad: den andra
-- försvann tyst och kontot gick aldrig att stämma av. Banken skiljer dem åt i
-- kolumnen "Bokfört saldo", som CSV-tolken redan läser in i balance_after men
-- som inte satt i nyckeln. Med saldot i nyckeln överlever äkta upprepningar,
-- samtidigt som en ominläsning av samma fil fortfarande dedupliceras — samma
-- fil ger samma saldon.
--
-- nulls not distinct behövs: utan den räknas två rader utan saldo som olika
-- och dedupliceringen skulle sluta fungera helt för feeds som inte lämnar
-- saldo. Med den faller de tillbaka på exakt det gamla beteendet.
drop index if exists bank_transactions_dedup;
create unique index bank_transactions_dedup
  on bank_transactions (booking_date, amount, description, balance_after)
  nulls not distinct
  where external_id is null;
