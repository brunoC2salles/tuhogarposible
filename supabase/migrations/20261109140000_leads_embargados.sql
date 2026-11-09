-- 09/11/2026 (decisión Bruno): los leads Embargados aptos pasan al CRM principal,
-- etapa Vivienda encontrada, con la etiqueta "Embargado" y asignados a Albert.
-- El envío a Inmolender de los embargados sigue igual (planilla "embargados a inmolender" desde embargados-webhook),
-- por eso los embargados no disparan la planilla de leads ni Documentación OK -> Inmolender.
-- Tampoco reciben el email de bienvenida ni entran en Analíticos.

alter table public.leads add column if not exists embargado boolean not null default false;
alter table public.leads add column if not exists embargados_lead_id uuid unique
  references public.embargados_leads(id) on delete set null;
create index if not exists leads_embargado_idx on public.leads (embargado) where embargado;

create or replace function public.notify_lead_inmolender_planilla()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare v_secret text;
begin
  -- Embargados: van a Inmolender por su propia planilla (embargados-webhook), nunca por esta
  if new.embargado then
    return new;
  end if;
  if new.stage::text in ('descualificados', 'no_cualificado', 'llamada_consultoria') or new.archivado_at is not null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.stage is not distinct from new.stage then
    return new;
  end if;
  if exists (select 1 from public.inmolender_envios where lead_id = new.id) then
    return new;
  end if;
  select value into v_secret from public.admin_settings where key = 'inmolender_trigger_secret';
  perform net.http_post(
    url := 'https://tnzgpzablwfptagfbnvb.supabase.co/functions/v1/lead-inmolender-planilla',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object('secret', v_secret, 'lead_id', new.id,
      'origen', case when tg_op = 'UPDATE' then 'cambio_etapa' else 'alta' end),
    timeout_milliseconds := 30000
  );
  return new;
end $function$;

create or replace function public.notify_documentacion_ok()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare v_secret text;
begin
  -- Embargados: sin envío a Inmolender desde el CRM (09/11/2026)
  if new.embargado then
    return new;
  end if;
  if new.stage = 'documentacion_ok' and old.stage is distinct from new.stage then
    select value into v_secret from public.admin_settings where key = 'inmolender_trigger_secret';
    perform net.http_post(
      url := 'https://tnzgpzablwfptagfbnvb.supabase.co/functions/v1/lead-documentacion-ok',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object('secret', v_secret, 'lead_id', new.id),
      timeout_milliseconds := 30000
    );
  end if;
  return new;
end $function$;

-- Analíticos: sin embargados
do $$
declare d text;
begin
  select pg_get_functiondef('public.analiticos_tiempos(timestamptz)'::regprocedure) into d;
  if position('not l.embargado' in d) = 0 then
    d := replace(d, 'WHERE l.created_at >= p_desde', 'WHERE l.created_at >= p_desde AND NOT l.embargado');
    execute d;
  end if;
end $$;
