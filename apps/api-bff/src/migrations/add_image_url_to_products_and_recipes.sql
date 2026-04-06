-- Migration: Add image_url to products and recipes
-- Both columns are optional (nullable)

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS description VARCHAR(500);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS show_in_catalog BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS show_in_catalog BOOLEAN NOT NULL DEFAULT false;
