-- Nightly Gemini-only audit of the 20 oldest-checked published pages.
-- Store a random AUDIT_CRON_SECRET in Supabase Vault under the name
-- audit_cron_secret before running this migration.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $schedule$
BEGIN
  IF to_regclass('vault.decrypted_secrets') IS NOT NULL
     AND EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'audit_cron_secret') THEN
    PERFORM cron.unschedule('ompathstudy-nightly-published-audit')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ompathstudy-nightly-published-audit');

    PERFORM cron.schedule(
      'ompathstudy-nightly-published-audit',
      '0 2 * * *',
      $job$
        SELECT net.http_post(
          url := 'https://dekyjrfwvavtoivqivno.supabase.co/functions/v1/audit-published',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (
              SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'audit_cron_secret'
            )
          ),
          body := '{}'::jsonb
        );
      $job$
    );
  END IF;
END
$schedule$;
