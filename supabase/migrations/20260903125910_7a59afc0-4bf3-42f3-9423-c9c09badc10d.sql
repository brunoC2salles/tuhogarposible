-- Normalizar separador de milhar nas 5 linhas restantes (valores históricos anômalos, apenas formato)
UPDATE leads
SET notas = (
  SELECT string_agg(
    CASE
      WHEN linha ~ '^(Ingresos|Deudas) mensuales: [0-9]+(,[0-9]{3})+€$'
      THEN regexp_replace(linha, ',', '.', 'g')
      ELSE linha
    END,
    E'\n'
  )
  FROM unnest(string_to_array(notas, E'\n')) AS linha
)
WHERE notas ~ '(Ingresos|Deudas) mensuales: [0-9]+,[0-9]';