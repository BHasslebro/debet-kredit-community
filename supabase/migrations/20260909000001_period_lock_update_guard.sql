-- Momslåset går inte längre att skriva om till ett manuellt lås.
-- Raderingsvakten (period_locks_block_unlock) släpper igenom lås med
-- reason = 'manual'. Det fanns ingen vakt på UPDATE, så vem som helst med ett
-- vanligt inlogg kunde gå direkt på PostgREST och göra
--
--   UPDATE period_locks SET reason = 'manual' WHERE month = 2;   -- 1 rad
--   DELETE FROM period_locks            WHERE month = 2;         -- 1 rad
--   select book_verification(..., '2026-02-14', ...);            -- bokfört
--
-- och därmed bokföra i en redan inlämnad momsperiod. [BFL 5:1]
--
-- Uppgradering av ett manuellt lås till ett systemlås måste däremot fortsätta
-- fungera: approveVatReport gör upsert på (fiscal_year_id, month) och skriver
-- reason = 'vat_report' över en månad användaren redan låst för hand.
create or replace function period_locks_block_downgrade() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.reason <> 'manual' and new.reason is distinct from old.reason then
    raise exception
      'Perioden är låst av % och låset kan inte skrivas om.', old.reason;
  end if;
  if new.fiscal_year_id is distinct from old.fiscal_year_id
     or new.month is distinct from old.month then
    raise exception 'Ett periodlås kan inte flyttas till en annan period.';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_period_locks_block_downgrade on period_locks;
create trigger trg_period_locks_block_downgrade
  before update on period_locks
  for each row execute function period_locks_block_downgrade();
