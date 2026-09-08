-- Intäktskonton för 12 % och 6 % moms.
-- Momskoderna SALES_12/SALES_6, momskontona 2621/2631, momsrapportens ruta
-- 11/12 med rimlighetskontroller och artikelformulärets 25/12/6/0 % fanns
-- alla — men inget intäktskonto bar koden. En artikel med 6 % moms fick
-- bokföras på ett 25 %-konto, och momsrapporten svarade med två röda
-- kontroller som användaren inte kunde rätta: kontoplanen är en läsvy.
-- Kedjan saknade sin sista länk. Numren följer BAS 2026.
insert into accounts (number, name, vat_code, default_vat_rate, ne_field, blocked, description) values
  (3002, 'Försäljning varor Sverige 12 %',    'SALES_12', 12, 'R1', false, 'Livsmedel, restaurang, hotell'),
  (3003, 'Försäljning varor Sverige 6 %',     'SALES_6',   6, 'R1', false, 'Böcker, tidningar, persontransport'),
  (3012, 'Försäljning tjänster Sverige 12 %', 'SALES_12', 12, 'R1', false, null),
  (3013, 'Försäljning tjänster Sverige 6 %',  'SALES_6',   6, 'R1', false, 'Kultur, idrott, persontransport')
-- Finns kontot redan UTAN momskod är det SIE-importen som skapat det: den
-- sätter bara number/name/description, och ett intäktskonto utan vat_code
-- faller ur momsdeklarationens beskattningsunderlag (ruta 05) helt tyst.
-- Då lagas det här, i stället för att lämnas kvar trasigt. Namnet lämnas som
-- importen satte det — det är användarens eget. Ett konto som redan HAR en
-- momskod rörs inte.
on conflict (number) do update
  set vat_code         = excluded.vat_code,
      default_vat_rate = coalesce(accounts.default_vat_rate, excluded.default_vat_rate),
      ne_field         = coalesce(accounts.ne_field, excluded.ne_field)
  where accounts.vat_code is null;

-- 3740 bokförs bara av fakturamotorns öresavrundning, precis som 2650 bara
-- bokförs av momsrapporten. Den erbjöds ändå som försäljningskonto på artiklar.
update accounts
   set blocked = true,
       description = 'Öresavrundning på fakturor — bokförs endast av fakturamotorn'
 where number = 3740;
