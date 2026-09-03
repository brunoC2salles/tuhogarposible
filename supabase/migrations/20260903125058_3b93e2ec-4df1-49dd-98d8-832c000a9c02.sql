UPDATE leads
SET notas = regexp_replace(notas, '(Ingresos mensuales: [0-9]+),([0-9]{3}€)', '\1.\2', 'g')
WHERE notas LIKE 'Ingresos mensuales:%' OR notas LIKE '%\nIngresos mensuales: %,%';