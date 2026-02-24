
-- Step 1: Add new array column
ALTER TABLE profiles ADD COLUMN region_round_robin_new text[];

-- Step 2: Migrate data
UPDATE profiles SET region_round_robin_new = CASE 
    WHEN region_round_robin = 'General' THEN ARRAY['Andalucía','Aragón','Principado de Asturias','Islas Baleares','Canarias','Cantabria','Castilla-La Mancha','Castilla y León','Comunidad Valenciana','Extremadura','Galicia','La Rioja','Comunidad de Madrid','Región de Murcia','Ceuta','Melilla']
    WHEN region_round_robin = 'Cataluña' THEN ARRAY['Cataluña']
    WHEN region_round_robin IS NULL THEN NULL
    ELSE ARRAY[region_round_robin]
  END;

-- Step 3: Drop old column and rename new one
ALTER TABLE profiles DROP COLUMN region_round_robin;
ALTER TABLE profiles RENAME COLUMN region_round_robin_new TO region_round_robin;
