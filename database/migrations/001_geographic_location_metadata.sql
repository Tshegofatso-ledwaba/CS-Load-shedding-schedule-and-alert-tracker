ALTER TABLE province
  ADD COLUMN IF NOT EXISTS official_name TEXT,
  ADD COLUMN IF NOT EXISTS map_provider_id TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE city_municipality
  ADD COLUMN IF NOT EXISTS official_name TEXT,
  ADD COLUMN IF NOT EXISTS map_provider_id TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE area
  ADD COLUMN IF NOT EXISTS official_name TEXT,
  ADD COLUMN IF NOT EXISTS map_provider_id TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE suburb
  ADD COLUMN IF NOT EXISTS official_name TEXT,
  ADD COLUMN IF NOT EXISTS map_provider_id TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE zone_block
  ADD COLUMN IF NOT EXISTS official_name TEXT,
  ADD COLUMN IF NOT EXISTS map_provider_id TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS boundary_geojson JSONB,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS province_map_provider_id_uq ON province (map_provider_id) WHERE map_provider_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS city_map_provider_id_uq ON city_municipality (map_provider_id) WHERE map_provider_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS area_map_provider_id_uq ON area (map_provider_id) WHERE map_provider_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS suburb_map_provider_id_uq ON suburb (map_provider_id) WHERE map_provider_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS zone_block_map_provider_id_uq ON zone_block (map_provider_id) WHERE map_provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS province_name_search_idx ON province USING gin (to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS city_name_search_idx ON city_municipality USING gin (to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS area_name_search_idx ON area USING gin (to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS suburb_name_search_idx ON suburb USING gin (to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS zone_block_name_search_idx ON zone_block USING gin (to_tsvector('simple', name));