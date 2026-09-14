ALTER TABLE "StudioSettings"
ADD COLUMN IF NOT EXISTS "publicBookingCatalog" JSONB NOT NULL DEFAULT '[]';

UPDATE "StudioSettings"
SET "publicBookingCatalog" = COALESCE((
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', category."id",
      'name', category."name",
      'position', category."position",
      'services', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', service."id",
            'name', service."name",
            'durationMinutes', service."defaultDurationMinutes",
            'price', service."defaultPrice"::text,
            'currency', service."currency",
            'position', row_number
          ) ORDER BY row_number
        )
        FROM (
          SELECT service.*, row_number() OVER (ORDER BY service."name") - 1 AS row_number
          FROM "Service" service
          WHERE service."categoryId" = category."id"
            AND service."active" = true
            AND service."deletedAt" IS NULL
        ) service
      ), '[]'::jsonb)
    ) ORDER BY category."position", category."name"
  )
  FROM "StudioCategory" category
  WHERE category."active" = true
    AND category."deletedAt" IS NULL
    AND EXISTS (
      SELECT 1 FROM "Service" service
      WHERE service."categoryId" = category."id"
        AND service."active" = true
        AND service."deletedAt" IS NULL
    )
), '[]'::jsonb);
