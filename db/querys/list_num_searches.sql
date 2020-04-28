-- SQLite
SELECT id, text, ip, num_results, COUNT(*) as Filas, createdAt
FROM `searches`
GROUP BY `text`
ORDER BY Filas DESC;