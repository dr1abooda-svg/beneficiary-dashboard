-- One read-only SELECT provides one consistent result set for all panels.
-- All KPIs are calculated from these same rows in DashboardRepository.
-- Table and column names follow the reviewed source schema.
SELECT
    t.ID,
    t.CreateDate,
    t.ClosedDate,
    t.ExpectDate,
    t.RatingValue,
    t.ChannelID,
    ch.Name AS ChannelName,
    t.ActionStatusID,
    ts.Name AS StatusName,
    lv.Name AS TypeName,
    r.Name AS RegionName
FROM dbo.Ticket AS t
LEFT JOIN dbo.Ticket_Channel AS ch ON ch.ID = t.ChannelID
LEFT JOIN dbo.Ticket_Status AS ts ON ts.ID = t.ActionStatusID
LEFT JOIN dbo.Ticket_Level AS lv ON lv.ID = t.LevelID
LEFT JOIN dbo.Region AS r ON r.ID = t.RegionID
WHERE t.FlagDel = 0
  AND t.CreateDate >= @StartDate
  AND t.CreateDate < @EndDate
  AND (@ChannelID IS NULL OR t.ChannelID = @ChannelID)
  AND (@RegionID IS NULL OR t.RegionID = @RegionID)
  AND (@ServiceID IS NULL OR t.ServiceID = @ServiceID)
ORDER BY t.CreateDate DESC, t.ID DESC;
