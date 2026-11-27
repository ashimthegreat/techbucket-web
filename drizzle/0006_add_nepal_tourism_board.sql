-- Adds the client Nepal Tourism Board (requested 27 Nov 2026). Skips it if it already exists.
INSERT INTO "clients" ("name", "sector", "website", "show_on_home", "sort_order", "published")
SELECT 'Nepal Tourism Board', 'Tourism', 'https://ntb.gov.np', true, 5, true
WHERE NOT EXISTS (SELECT 1 FROM "clients" WHERE lower("name") = lower('Nepal Tourism Board'));
