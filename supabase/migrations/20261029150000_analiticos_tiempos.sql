-- Analíticos: tiempo por etapa y proceso completo (alta -> FEIN) para leads creados desde p_desde.
-- Solo administradores. Usada por la página /admin/analiticos.
CREATE OR REPLACE FUNCTION public.analiticos_tiempos(p_desde timestamptz DEFAULT timestamptz '2026-10-31 23:00:00+00')
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  resultado jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::user_role) THEN
    RAISE EXCEPTION 'Solo administradores' USING ERRCODE = '42501';
  END IF;

  WITH ev AS (
  SELECT lead_id, created_at AS ts, stage_anterior::text AS a, stage_nuevo::text AS n
  FROM lead_historico WHERE stage_anterior IS DISTINCT FROM stage_nuevo
),
firstev AS (SELECT DISTINCT ON (lead_id) lead_id, a FROM ev ORDER BY lead_id, ts),
inicial AS (
  SELECT l.id AS lead_id, l.created_at AS ts, coalesce(f.a, l.stage::text) AS n
  FROM leads l LEFT JOIN firstev f ON f.lead_id = l.id
  WHERE l.created_at >= p_desde
),
todos AS (
  SELECT e.lead_id, e.ts, e.n FROM ev e JOIN inicial i ON i.lead_id = e.lead_id
  UNION ALL SELECT lead_id, ts, n FROM inicial
),
est0 AS (
  SELECT lead_id, n AS etapa_id, ts AS inicio, lead(ts) OVER (PARTITION BY lead_id ORDER BY ts) AS sig
  FROM todos
),
est AS (
  SELECT e.lead_id, e.etapa_id, e.inicio,
    coalesce(e.sig, l.archivado_at, now()) AS fin,
    (e.sig IS NULL AND l.archivado_at IS NULL) AS abierta
  FROM est0 e JOIN leads l ON l.id = e.lead_id
),
kanban AS (
  SELECT * FROM est WHERE etapa_id IN ('buscando_vivienda','vivienda_encontrada','documentacion_ok','tasacion_prevision','firma_contrato','informacion_riesgos','fein')
),
primera AS (SELECT DISTINCT ON (lead_id) lead_id, etapa_id FROM kanban ORDER BY lead_id, inicio),
fein AS (SELECT lead_id, min(inicio) AS fein_at FROM kanban WHERE etapa_id = 'fein' GROUP BY lead_id),
salida AS (SELECT lead_id, min(inicio) AS desc_at FROM est WHERE etapa_id = 'descualificados' GROUP BY lead_id),
cohorte AS (
  SELECT l.id AS lead_id, l.nombre_completo AS nombre, l.created_at,
    to_char(l.created_at AT TIME ZONE 'Europe/Madrid', 'YYYY-MM') AS mes,
    CASE
      WHEN l.source::text = 'tally' THEN 'Sin vivienda'
      WHEN l.source::text = 'meta_ads' AND lower(l.simulador_hipotecario_data->>'meta_vivienda_seleccionada') = 'si' THEN 'Con vivienda'
      WHEN l.source::text = 'meta_ads' AND lower(l.simulador_hipotecario_data->>'meta_vivienda_seleccionada') = 'no' THEN 'Sin vivienda'
      WHEN p.etapa_id = 'buscando_vivienda' THEN 'Sin vivienda'
      WHEN p.etapa_id = 'vivienda_encontrada' THEN 'Con vivienda'
      ELSE 'Sin clasificar'
    END AS vivienda,
    l.stage::text AS etapa_actual_id,
    f.fein_at,
    CASE
      WHEN f.fein_at IS NOT NULL THEN 'Completado'
      WHEN l.stage::text = 'descualificados' OR l.archivado_at IS NOT NULL THEN 'Fuera del proceso'
      ELSE 'En curso'
    END AS estado,
    extract(epoch FROM (coalesce(f.fein_at,
      CASE WHEN l.stage::text = 'descualificados' THEN s.desc_at END,
      l.archivado_at, now()) - l.created_at)) / 86400.0 AS dias_proceso
  FROM leads l
  JOIN primera p ON p.lead_id = l.id
  LEFT JOIN fein f ON f.lead_id = l.id
  LEFT JOIN salida s ON s.lead_id = l.id
  WHERE l.created_at >= p_desde
),
por_etapa AS (
  SELECT k.lead_id, k.etapa_id,
    sum(extract(epoch FROM (k.fin - k.inicio))) / 86400.0 AS dias,
    bool_or(k.abierta) AS sigue
  FROM kanban k JOIN cohorte c ON c.lead_id = k.lead_id
  GROUP BY k.lead_id, k.etapa_id
),
ind AS (
SELECT c.lead_id::text AS id, c.mes, c.nombre, c.vivienda, CASE c.etapa_actual_id WHEN 'buscando_vivienda' THEN 'Buscando vivienda' WHEN 'vivienda_encontrada' THEN 'Vivienda encontrada' WHEN 'documentacion_ok' THEN 'Documentación OK' WHEN 'tasacion_prevision' THEN 'Tasación' WHEN 'firma_contrato' THEN 'Firma del contrato' WHEN 'informacion_riesgos' THEN 'Documentación a riesgos' WHEN 'fein' THEN 'FEIN' WHEN 'descualificados' THEN 'Descualificados' WHEN 'nuevo_lead' THEN 'Cualificado (oculta)' WHEN 'llamada_consultoria' THEN 'Avanzo con Unicaja (oculta)' ELSE c.etapa_actual_id END AS etapa_actual, c.estado, round(c.dias_proceso::numeric, 1) AS dias_proceso,
  round((max(pe.dias) FILTER (WHERE pe.etapa_id = 'buscando_vivienda'))::numeric, 1) AS d_buscando,
  round((max(pe.dias) FILTER (WHERE pe.etapa_id = 'vivienda_encontrada'))::numeric, 1) AS d_encontrada,
  round((max(pe.dias) FILTER (WHERE pe.etapa_id = 'documentacion_ok'))::numeric, 1) AS d_doc_ok,
  round((max(pe.dias) FILTER (WHERE pe.etapa_id = 'tasacion_prevision'))::numeric, 1) AS d_tasacion,
  round((max(pe.dias) FILTER (WHERE pe.etapa_id = 'firma_contrato'))::numeric, 1) AS d_firma,
  round((max(pe.dias) FILTER (WHERE pe.etapa_id = 'informacion_riesgos'))::numeric, 1) AS d_riesgos,
  round((max(pe.dias) FILTER (WHERE pe.etapa_id = 'fein'))::numeric, 1) AS d_fein
FROM cohorte c LEFT JOIN por_etapa pe ON pe.lead_id = c.lead_id
GROUP BY c.lead_id, c.mes, c.nombre, c.vivienda, c.etapa_actual_id, c.estado, c.dias_proceso
),
et AS (
SELECT c.mes, CASE pe.etapa_id WHEN 'buscando_vivienda' THEN 'Buscando vivienda' WHEN 'vivienda_encontrada' THEN 'Vivienda encontrada' WHEN 'documentacion_ok' THEN 'Documentación OK' WHEN 'tasacion_prevision' THEN 'Tasación' WHEN 'firma_contrato' THEN 'Firma del contrato' WHEN 'informacion_riesgos' THEN 'Documentación a riesgos' WHEN 'fein' THEN 'FEIN' WHEN 'descualificados' THEN 'Descualificados' WHEN 'nuevo_lead' THEN 'Cualificado (oculta)' WHEN 'llamada_consultoria' THEN 'Avanzo con Unicaja (oculta)' ELSE pe.etapa_id END AS etapa, CASE pe.etapa_id WHEN 'buscando_vivienda' THEN 1 WHEN 'vivienda_encontrada' THEN 2 WHEN 'documentacion_ok' THEN 3 WHEN 'tasacion_prevision' THEN 4 WHEN 'firma_contrato' THEN 5 WHEN 'informacion_riesgos' THEN 6 WHEN 'fein' THEN 7 ELSE 9 END AS orden,
  coalesce(c.vivienda, 'Todos') AS vivienda,
  count(*) AS leads,
  count(*) FILTER (WHERE pe.sigue) AS siguen,
  count(*) FILTER (WHERE NOT pe.sigue) AS salieron,
  round(avg(pe.dias)::numeric, 1) AS media_dias,
  round((percentile_cont(0.5) WITHIN GROUP (ORDER BY pe.dias))::numeric, 1) AS mediana_dias,
  round((avg(pe.dias) FILTER (WHERE NOT pe.sigue))::numeric, 1) AS media_salieron,
  round((avg(pe.dias) FILTER (WHERE pe.sigue))::numeric, 1) AS media_siguen,
  round(max(pe.dias)::numeric, 1) AS max_dias
FROM por_etapa pe JOIN cohorte c ON c.lead_id = pe.lead_id
GROUP BY GROUPING SETS ((c.mes, pe.etapa_id), (c.mes, pe.etapa_id, c.vivienda))
),
pr AS (
SELECT c.mes, coalesce(c.vivienda, 'Todos') AS vivienda,
  count(*) AS leads,
  count(*) FILTER (WHERE c.estado = 'Completado') AS completados,
  count(*) FILTER (WHERE c.estado = 'En curso') AS en_curso,
  count(*) FILTER (WHERE c.estado = 'Fuera del proceso') AS fuera,
  round((avg(c.dias_proceso) FILTER (WHERE c.estado = 'Completado'))::numeric, 1) AS media_completados,
  round((percentile_cont(0.5) WITHIN GROUP (ORDER BY c.dias_proceso) FILTER (WHERE c.estado = 'Completado'))::numeric, 1) AS mediana_completados,
  round((avg(c.dias_proceso) FILTER (WHERE c.estado = 'En curso'))::numeric, 1) AS media_en_curso,
  round((avg(c.dias_proceso) FILTER (WHERE c.estado = 'Fuera del proceso'))::numeric, 1) AS media_fuera
FROM cohorte c
GROUP BY GROUPING SETS ((c.mes), (c.mes, c.vivienda))
)
SELECT jsonb_build_object(
  'desde', p_desde,
  'generado', now(),
  'individuales', coalesce((SELECT jsonb_agg(to_jsonb(ind)) FROM ind), '[]'::jsonb),
  'etapas', coalesce((SELECT jsonb_agg(to_jsonb(et)) FROM et), '[]'::jsonb),
  'proceso', coalesce((SELECT jsonb_agg(to_jsonb(pr)) FROM pr), '[]'::jsonb)
)
  INTO resultado;

  RETURN resultado;
END;
$fn$;

REVOKE ALL ON FUNCTION public.analiticos_tiempos(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analiticos_tiempos(timestamptz) TO authenticated;
