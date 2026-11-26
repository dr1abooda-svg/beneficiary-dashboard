-- Read-only; names and types match the reviewed source schema.
SELECT TOP (1) t.CreateDate AS LatestCreateDate
FROM dbo.Ticket AS t
WHERE t.FlagDel = 0 AND t.CreateDate IS NOT NULL
ORDER BY t.CreateDate DESC, t.ID DESC;

SELECT c.ID, c.Name
FROM dbo.Ticket_Channel AS c
ORDER BY c.Name, c.ID;

SELECT r.ID, r.Name
FROM dbo.Region AS r
ORDER BY r.Name, r.ID;

SELECT s.ID, s.ServiceName
FROM dbo.Sup_GroupService AS s
ORDER BY s.ServiceName, s.ID;
