ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS tracking_type text DEFAULT 'weight' CHECK (tracking_type IN ('weight', 'time'));
