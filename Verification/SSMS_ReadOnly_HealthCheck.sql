-- Run ONLY against an authorized copy / read-only login. No schema or data changes.
-- Select the authorized ticket database in SSMS before running these queries.

-- A) Confirm source objects exist and Count ticket records.
SELECT OBJECT_ID(N'dbo.Ticket', N'U') AS TicketTableId,
       OBJECT_ID(N'dbo.Ticket_Channel', N'U') AS ChannelTableId,
       OBJECT_ID(N'dbo.Ticket_Level', N'U') AS LevelTableId,
       OBJECT_ID(N'dbo.Ticket_Status', N'U') AS StatusTableId,
       OBJECT_ID(N'dbo.Sup_GroupService', N'U') AS ServiceTableId,
       OBJECT_ID(N'dbo.Region', N'U') AS RegionTableId;

-- B) Report actual active-ticket coverage; do not invent a reference period.
SELECT COUNT_BIG(*) AS AllActiveTickets,
       MIN(CreateDate) AS FirstTicketCreatedAt,
       MAX(CreateDate) AS LastTicketCreatedAt
FROM dbo.Ticket
WHERE FlagDel = 0 AND CreateDate IS NOT NULL;

-- C) Inspect all actual channel, type and status labels (no hardcoded IDs).
SELECT ID, Name FROM dbo.Ticket_Channel ORDER BY ID;
SELECT ID, Name FROM dbo.Ticket_Level ORDER BY ID;
SELECT ID, Name FROM dbo.Ticket_Status ORDER BY ID;

-- D) Inspect timestamp completeness affecting SLA without assuming a deadline.
SELECT
    COUNT_BIG(CASE WHEN ClosedDate IS NOT NULL THEN 1 END) AS WithClosedDate,
    COUNT_BIG(CASE WHEN ClosedDate IS NOT NULL AND ExpectDate IS NOT NULL THEN 1 END) AS ClosedWithDeadline,
    COUNT_BIG(CASE WHEN ClosedDate IS NOT NULL AND ExpectDate IS NULL THEN 1 END) AS ClosedWithoutDeadline
FROM dbo.Ticket WHERE FlagDel = 0;
