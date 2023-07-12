-- SQLite
SELECT LOWER(text) as text, num_results, COUNT(text) as Filas
FROM `searches`
GROUP BY LOWER(TRIM(text))
ORDER BY Filas DESC
LIMIT 100;