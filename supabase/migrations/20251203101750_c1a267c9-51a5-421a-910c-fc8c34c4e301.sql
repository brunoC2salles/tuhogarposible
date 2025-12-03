-- Adicionar campo para indicar compra acompanhada e documentos da pareja
ALTER TABLE lead_document_checklist 
ADD COLUMN IF NOT EXISTS compra_acompanado boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pareja_dni_nie_ambas_caras boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pareja_dni_pais_origen boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pareja_ultima_renta boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pareja_dos_ultimas_rentas_autonomo boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pareja_cuatro_modelos_trimestrales boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pareja_contrato_trabajo boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pareja_tres_ultimas_nominas boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pareja_vida_laboral boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pareja_movimientos_bancarios_6_meses boolean DEFAULT false;