CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS province (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS city_municipality (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), province_id UUID NOT NULL REFERENCES province(id) ON DELETE CASCADE, name TEXT NOT NULL,
  UNIQUE (province_id, name)
);
CREATE TABLE IF NOT EXISTS area (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), city_id UUID NOT NULL REFERENCES city_municipality(id) ON DELETE CASCADE, name TEXT NOT NULL,
  UNIQUE (city_id, name)
);
CREATE TABLE IF NOT EXISTS suburb (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), area_id UUID NOT NULL REFERENCES area(id) ON DELETE CASCADE, name TEXT NOT NULL,
  UNIQUE (area_id, name)
);
CREATE TABLE IF NOT EXISTS zone_block (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), suburb_id UUID NOT NULL REFERENCES suburb(id) ON DELETE CASCADE, name TEXT NOT NULL,
  UNIQUE (suburb_id, name)
);
CREATE TABLE IF NOT EXISTS schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), zone_block_id UUID NOT NULL REFERENCES zone_block(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL CHECK (stage BETWEEN 1 AND 8), date DATE NOT NULL, start_time TIME NOT NULL, end_time TIME NOT NULL,
  source TEXT NOT NULL DEFAULT 'ADMIN' CHECK (source IN ('ADMIN', 'EXTERNAL', 'PREDICTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (start_time < end_time)
);
CREATE TABLE IF NOT EXISTS administrator (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'ADMIN', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admin_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), administrator_id UUID NOT NULL REFERENCES administrator(id) ON DELETE CASCADE, token_id TEXT NOT NULL UNIQUE, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);