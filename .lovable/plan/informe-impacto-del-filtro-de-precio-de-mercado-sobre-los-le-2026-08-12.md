# Informe: impacto del filtro de precio de mercado sobre los leads cualificados

Análisis puntual (no cambia la app) para medir cuántos leads cualificados de los últimos 2 meses quedarían descartados si añadiéramos la regla:

```text
precio_maximo_inmueble del lead  >=  precio_medio de su zona
```

evaluada en 4 escenarios: precio_medio, -10%, -15%, -20%.

## Reglas acordadas

- Métrica del lead: `precio_maximo_inmueble` (precio máximo de vivienda realista, hipoteca + ahorros + crédito personal), guardado en `simulador_hipotecario_data`.
- Universo: solo los leads cualificados de los últimos 2 meses (511 en etapa `nuevo_lead`); los ya descualificados quedan fuera.
- Zona: se usa el municipio **más barato** de la zona indicada por el lead. Si la zona es una ciudad grande, provincia o comunidad, se toma el `precio_medio` mínimo entre todos los municipios del JSON que pertenecen a esa provincia/CCAA.
- Zonas sin correspondencia en el JSON: se aplica la **media nacional** de `precio_medio`.

## Contenido del informe (en español, PDF)

1. Portada con logo, periodo analizado y universo (nº de leads cualificados).
2. Resumen ejecutivo: tabla con los 4 escenarios → leads que pasan, leads descartados, % descartado, y % descartado acumulado sobre el total de leads recibidos.
3. Gráfico de barras comparando los 4 escenarios.
4. Desglose por comunidad autónoma: leads cualificados y descartados en cada escenario, para ver qué zonas concentran el impacto.
5. Distribución del "gap": cuánto le falta al lead para llegar al precio medio (tramos: <10%, 10-25%, 25-50%, >50%), para saber si los descartes son marginales o estructurales.
6. Anexo con la lista de leads descartados en el escenario -20% (nombre, zona, precio máx. del lead, precio medio de referencia, diferencia).
7. Nota metodológica: fuentes, criterio del municipio más barato, tratamiento de zonas sin datos y nº de leads que cayeron en ese caso.

## Detalles técnicos

- Datos de leads vía consulta SQL a `leads` (filtro `created_at >= hoy - 2 meses`, `stage = 'nuevo_lead'`), extrayendo `simulador_hipotecario_data->>'precio_maximo_inmueble'`, `zona_interes`, `ciudad_interes`, `nombre_completo`.
- Datos de mercado desde el JSON adjunto (`datos-2.json`, idéntico al que ya está en el proyecto), filtrando `tipo_construccion_id = 99` y `clase_finca_urbana_id = 99` (medias agregadas), con `precio_medio > 0`.
- Emparejamiento de zona, en este orden: municipio exacto (normalizado sin acentos) → provincia → comunidad autónoma → coincidencia parcial de texto → media nacional. En cada nivel por encima del municipio se toma el mínimo `precio_medio`.
- Se descartan del cómputo los leads sin `precio_maximo_inmueble` numérico y se reportan aparte.
- Generación del PDF con Python + reportlab, reutilizando el estilo de informes anteriores (`/tmp/rep/gen.py`), y entrega en `/mnt/documents/`.
- Verificación: revisión visual de todas las páginas del PDF y contraste de los totales contra la consulta SQL antes de entregar.
