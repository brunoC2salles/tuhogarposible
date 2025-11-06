-- Fix security warning: Set search_path for auto_insert_scraping_queue function
ALTER FUNCTION auto_insert_scraping_queue() SET search_path = public;