ALTER TABLE zone_block
  ADD COLUMN IF NOT EXISTS geocoder_place_id TEXT,
  ADD COLUMN IF NOT EXISTS osm_type TEXT,
  ADD COLUMN IF NOT EXISTS osm_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS zone_block_geocoder_place_id_uq
  ON zone_block (geocoder_place_id)
  WHERE geocoder_place_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS zone_block_coordinates_idx
  ON zone_block (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;