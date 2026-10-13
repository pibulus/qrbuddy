-- This pure math helper needs only built-in PostgreSQL functions.
ALTER FUNCTION public.coarse_distance_km(numeric, numeric, numeric, numeric)
  SET search_path = pg_catalog;
