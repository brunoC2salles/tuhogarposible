-- Add signature fields to generated_contracts table
ALTER TABLE generated_contracts 
ADD COLUMN IF NOT EXISTS signature_status TEXT CHECK (signature_status IN ('pending', 'sent', 'signed', 'declined')),
ADD COLUMN IF NOT EXISTS signature_submission_id TEXT,
ADD COLUMN IF NOT EXISTS signed_file_path TEXT,
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

-- Add index for faster queries by signature status
CREATE INDEX IF NOT EXISTS idx_generated_contracts_signature_status ON generated_contracts(signature_status);

-- Add index for faster queries by submission ID
CREATE INDEX IF NOT EXISTS idx_generated_contracts_submission_id ON generated_contracts(signature_submission_id);