WITH dados AS (
  SELECT
    id,
    COALESCE(NULLIF((simulador_hipotecario_data->>'ingresos')::text, ''), NULLIF((simulador_hipotecario_data->>'ingresoMensual')::text, ''), '0')::numeric AS ingresos,
    COALESCE(NULLIF((simulador_hipotecario_data->>'deudas')::text, ''), '0')::numeric AS deudas
  FROM leads
  WHERE source IN ('meta_ads', 'tally')
    AND notas IS NOT NULL
    AND notas NOT LIKE '%Ingresos mensuales:%'
)
UPDATE leads l
SET notas =
  l.notas || E'\n' ||
  'Ingresos mensuales: ' || CASE WHEN d.ingresos > 0 THEN to_char(d.ingresos, 'FM999G999G999') || '€' ELSE 'não especificado' END || E'\n' ||
  'Deudas mensuales: ' || CASE WHEN d.deudas > 0 THEN to_char(d.deudas, 'FM999G999G999') || '€' ELSE '0€ / no declaradas' END
FROM dados d
WHERE l.id = d.id;