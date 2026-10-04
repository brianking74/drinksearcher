-- 051_clear_imported_descriptions.sql
-- The Shopify ecommerce scan for That Wine Co imported each product's body_html as
-- a `description`. Descriptions are not wanted on imported bottles, so clear them.
-- (scan-catalog was also updated to stop importing descriptions on future scans.)

UPDATE drinks
SET description = ''
WHERE supplier_name ILIKE '%That Wine%';
