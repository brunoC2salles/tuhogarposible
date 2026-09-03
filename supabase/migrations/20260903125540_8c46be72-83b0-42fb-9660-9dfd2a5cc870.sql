UPDATE leads
SET notas = regexp_replace(notas, '(Ingresos mensuales: [0-9]+),([0-9]{3}€)', '\1.\2', 'g')
WHERE notas ~ 'Ingresos mensuales: [0-9]+,[0-9]';

UPDATE leads
SET notas = regexp_replace(notas, '(Deudas mensuales: [0-9]+),([0-9]{3}€)', '\1.\2', 'g')
WHERE notas ~ 'Deudas mensuales: [0-9]+,[0-9]';