-- Desabilitar apenas triggers de usuário (não os de sistema)
ALTER TABLE leads DISABLE TRIGGER USER;

-- Migrar leads existentes (Opção A: mapeamento 1:1)
UPDATE leads SET stage = 'preparacion_expediente' WHERE stage = 'lead_cualificado';
UPDATE leads SET stage = 'pretasacion' WHERE stage = 'mensaje_whatsapp';
UPDATE leads SET stage = 'aprobacion_bancaria' WHERE stage = 'primera_llamada';
UPDATE leads SET stage = 'tasacion' WHERE stage = 'reunion_contrato';
UPDATE leads SET stage = 'cobrar' WHERE stage = 'firma_pago';

-- Reabilitar triggers de usuário
ALTER TABLE leads ENABLE TRIGGER USER;

-- Atualizar histórico de leads (lead_historico) - stage_nuevo
UPDATE lead_historico SET stage_nuevo = 'preparacion_expediente' WHERE stage_nuevo = 'lead_cualificado';
UPDATE lead_historico SET stage_nuevo = 'pretasacion' WHERE stage_nuevo = 'mensaje_whatsapp';
UPDATE lead_historico SET stage_nuevo = 'aprobacion_bancaria' WHERE stage_nuevo = 'primera_llamada';
UPDATE lead_historico SET stage_nuevo = 'tasacion' WHERE stage_nuevo = 'reunion_contrato';
UPDATE lead_historico SET stage_nuevo = 'cobrar' WHERE stage_nuevo = 'firma_pago';

-- Atualizar histórico de leads (lead_historico) - stage_anterior
UPDATE lead_historico SET stage_anterior = 'preparacion_expediente' WHERE stage_anterior = 'lead_cualificado';
UPDATE lead_historico SET stage_anterior = 'pretasacion' WHERE stage_anterior = 'mensaje_whatsapp';
UPDATE lead_historico SET stage_anterior = 'aprobacion_bancaria' WHERE stage_anterior = 'primera_llamada';
UPDATE lead_historico SET stage_anterior = 'tasacion' WHERE stage_anterior = 'reunion_contrato';
UPDATE lead_historico SET stage_anterior = 'cobrar' WHERE stage_anterior = 'firma_pago';