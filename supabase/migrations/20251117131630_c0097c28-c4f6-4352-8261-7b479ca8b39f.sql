-- Deactivate agent Bruno Salles who was deleted but still showing as active
UPDATE profiles 
SET activo = false, updated_at = now()
WHERE id = '8c088d8b-156b-45a2-9559-9cb13cedfc22';