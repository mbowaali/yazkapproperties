-- November 2026 rent transactions.
-- The source rows did not include a day, so new records use November 1 as the
-- month marker. Run in Vercel Dashboard -> Storage -> database -> Query.
-- Existing single matching tenant/month records are updated; multiple matches
-- abort the transaction so they can be reviewed instead of changed ambiguously.

BEGIN;

DO $$
DECLARE
  payment RECORD;
  matching_count BIGINT;
  matching_id INTEGER;
BEGIN
  FOR payment IN
    SELECT *
    FROM (VALUES
      ('Danny', 1200.00::NUMERIC, 'Paid'),
      ('Tonny', 1300.00::NUMERIC, 'Paid'),
      ('Jenie & Bridget', 1300.00::NUMERIC, 'Paid'),
      ('Shakirah Nakiyemba', 2300.00::NUMERIC, 'Paid'),
      ('Max', 2100.00::NUMERIC, 'Paid'),
      ('SHAKIRAH KALUNJI', 1100.00::NUMERIC, 'Pending'),
      ('NYAKATO VANESA WILLIAMS', 2100.00::NUMERIC, 'Paid')
    ) AS incoming(tenant_name, amount, status)
  LOOP
    SELECT COUNT(*), MIN(id)
    INTO matching_count, matching_id
    FROM transactions
    WHERE date >= DATE '2026-11-01'
      AND date < DATE '2026-12-01'
      AND LOWER(BTRIM(tenant_name)) = LOWER(BTRIM(payment.tenant_name));

    IF matching_count > 1 THEN
      RAISE EXCEPTION
        'Multiple November 2026 transactions found for tenant "%"; no changes committed',
        payment.tenant_name;
    ELSIF matching_count = 1 THEN
      UPDATE transactions
      SET tenant_name = payment.tenant_name,
          date = DATE '2026-11-01',
          amount = payment.amount,
          currency = 'AED',
          type = 'rent',
          method = 'Bank Transfer',
          status = payment.status
      WHERE id = matching_id;
    ELSE
      INSERT INTO transactions
        (tenant_name, date, amount, currency, type, method, status)
      VALUES
        (payment.tenant_name, DATE '2026-11-01', payment.amount, 'AED',
         'rent', 'Bank Transfer', payment.status);
    END IF;
  END LOOP;
END
$$;

COMMIT;
