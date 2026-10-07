CREATE OR REPLACE FUNCTION public.normalize_admission(raw text)
 RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $function$
  select case
    when upper(btrim(coalesce(raw, ''))) ~ '^MBCHB[[:space:]/\-_.]*[0-9]{9}$'
    then regexp_replace(upper(btrim(raw)), '^MBCHB[[:space:]/\-_.]*([0-9]{9})$', 'MBCHB\1')
    when upper(btrim(coalesce(raw, ''))) ~ '^BMS[[:space:]/\-_.]*[0-9]{4}[[:space:]/\-_.]*[0-9]{3,6}$'
    then regexp_replace(upper(btrim(raw)), '^BMS[[:space:]/\-_.]*([0-9]{4})[[:space:]/\-_.]*([0-9]{3,6})$', 'BMS/\1/\2')
    else null
  end
$function$;