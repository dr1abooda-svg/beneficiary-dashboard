-- Read-only diagnostic.  Returns actual lookup values without imposing any mappings.
SELECT 'Ticket_Channel' AS SourceTable, CAST(ID AS nvarchar(30)) AS SourceID, Name AS SourceName
FROM dbo.Ticket_Channel
UNION ALL
SELECT 'Ticket_Level', CAST(ID AS nvarchar(30)), Name FROM dbo.Ticket_Level
UNION ALL
SELECT 'Ticket_Status', CAST(ID AS nvarchar(30)), Name FROM dbo.Ticket_Status
UNION ALL
SELECT 'Ticket_Pirority', CAST(ID AS nvarchar(30)), Name FROM dbo.Ticket_Pirority
ORDER BY SourceTable, SourceID;
