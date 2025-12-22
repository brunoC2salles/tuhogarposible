-- Drop both triggers temporarily
DROP TRIGGER IF EXISTS log_lead_stage_change_trigger ON leads;
DROP TRIGGER IF EXISTS on_lead_stage_change ON leads;

-- Migrate existing leads from old stage to new stage
UPDATE leads 
SET stage = 'recopilacion_expediente', 
    updated_at = now()
WHERE stage = 'preparacion_expediente';

-- Recreate only one trigger (avoid duplicates)
CREATE TRIGGER on_lead_stage_change
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION log_lead_stage_change();