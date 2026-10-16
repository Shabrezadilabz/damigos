-- Remove Playwright publish-menu test rows (safe prefix match)
DELETE FROM menu_items WHERE name LIKE 'E2E Publish%';
