-- Agendar verificação diária de faturas próximas ao vencimento
-- Executa todos os dias às 9h da manhã (UTC)
SELECT cron.schedule(
  'check-invoice-deadlines-daily',
  '0 9 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://tnzgpzablwfptagfbnvb.supabase.co/functions/v1/check-invoice-deadlines',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuemdwemFibHdmcHRhZ2ZibnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNDMzMDIsImV4cCI6MjA3MzYxOTMwMn0.s1IIGpfIrufl4Bik6PODOKm11W7aKNkvhiagCteFYbc"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);