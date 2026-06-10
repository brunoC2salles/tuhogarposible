DROP FUNCTION IF EXISTS public.auto_insert_scraping_queue() CASCADE;
DROP FUNCTION IF EXISTS public.get_distinct_filter_values() CASCADE;
DROP FUNCTION IF EXISTS public.get_protected_inmuebles(text) CASCADE;

DROP TABLE IF EXISTS public.scraping_progress CASCADE;
DROP TABLE IF EXISTS public.reservas CASCADE;
DROP TABLE IF EXISTS public.lead_inmuebles CASCADE;
DROP TABLE IF EXISTS public.inmuebles CASCADE;