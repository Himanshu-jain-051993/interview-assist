SELECT DISTINCT r.title, r.category 
FROM "Role" r 
LEFT JOIN "Rubric" rub ON r.category = rub.category 
WHERE rub.id IS NULL;
