-- Adicionar coluna dni_nie à tabela profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS dni_nie text;

-- Comentário para documentar
COMMENT ON COLUMN profiles.dni_nie IS 'DNI/NIE del agente - requerido para contratos';

-- Atualizar campos do template de contrato
UPDATE contract_templates
SET campos_formulario = '[
  {
    "name": "nombre_completo",
    "label": "Nombre Completo",
    "type": "text",
    "required": true,
    "placeholder": "Ej: Juan García López"
  },
  {
    "name": "direccion_actual",
    "label": "Dirección Actual",
    "type": "text",
    "required": true,
    "placeholder": "Ej: Calle Mayor 123, Madrid"
  },
  {
    "name": "dni_nie",
    "label": "DNI/NIE",
    "type": "text",
    "required": true,
    "placeholder": "12345678X"
  },
  {
    "name": "email",
    "label": "Email",
    "type": "email",
    "required": true
  },
  {
    "name": "agente_id",
    "label": "Seleccionar Agente",
    "type": "agente_select",
    "required": true
  },
  {
    "name": "fecha_firma",
    "label": "Fecha de Firma",
    "type": "date",
    "required": true
  }
]'::jsonb
WHERE nombre = 'Contrato de Mandato de Compra con Exclusividad';