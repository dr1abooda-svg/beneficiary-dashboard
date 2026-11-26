using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Web.Hosting;
using BeneficiaryDashboards.Models;

namespace BeneficiaryDashboards.Services
{
    /// <summary>
    /// Only reads existing dbo tables. No DDL/DML, no PII, no guessed lookup IDs.
    /// Every displayed aggregate is calculated from one selected ticket rowset.
    /// </summary>
    public sealed class DashboardRepository
    {
        private readonly string _connectionString;

        public DashboardRepository()
        {
            var entry = ConfigurationManager.ConnectionStrings["TicketDb"];
            if (entry == null || string.IsNullOrWhiteSpace(entry.ConnectionString))
                throw new ConfigurationErrorsException("TicketDb connection string is missing.");
            _connectionString = entry.ConnectionString;
        }

        public DashboardOptions GetOptions()
        {
            var result = new DashboardOptions();
            using (var connection = new SqlConnection(_connectionString))
            using (var command = new SqlCommand(ReadSql("Options.sql"), connection))
            {
                command.CommandType = CommandType.Text;
                command.CommandTimeout = 40;
                connection.Open();
                using (var reader = command.ExecuteReader())
                {
                    if (reader.Read() && !reader.IsDBNull(0))
                    {
                        var latest = reader.GetDateTime(0);
                        result.LatestMonth = latest.ToString("yyyy-MM", CultureInfo.InvariantCulture);
                    }
                    if (!reader.NextResult()) throw new DataException("Channels result missing.");
                    ReadOptions(reader, result.Channels);
                    if (!reader.NextResult()) throw new DataException("Regions result missing.");
                    ReadOptions(reader, result.Regions);
                    if (!reader.NextResult()) throw new DataException("Services result missing.");
                    ReadOptions(reader, result.Services);
                }
            }
            return result;
        }

        private static void ReadOptions(SqlDataReader reader, List<SelectOption> target)
        {
            while (reader.Read())
            {
                var id = reader.GetInt32(0);
                var name = reader.IsDBNull(1) ? null : reader.GetString(1);
                target.Add(new SelectOption { Id = id, Name = name });
            }
        }

        public DashboardSnapshot GetSnapshot(DateTime monthStart, int? channelId, int? regionId, int? serviceId)
        {
            var nextMonth = monthStart.AddMonths(1);
            var snapshot = new DashboardSnapshot
            {
                Month = monthStart.ToString("yyyy-MM", CultureInfo.InvariantCulture)
            };
            var channels = new Dictionary<string, BreakdownItem>();
            var statuses = new Dictionary<string, BreakdownItem>();
            var daily = new long[DateTime.DaysInMonth(monthStart.Year, monthStart.Month) + 1];
            double ratingSum = 0;

            using (var connection = new SqlConnection(_connectionString))
            using (var command = new SqlCommand(ReadSql("TicketRows.sql"), connection))
            {
                command.CommandType = CommandType.Text;
                command.CommandTimeout = 60;
                command.Parameters.Add("@StartDate", SqlDbType.DateTime).Value = monthStart;
                command.Parameters.Add("@EndDate", SqlDbType.DateTime).Value = nextMonth;
                AddNullableInt(command, "@ChannelID", channelId);
                AddNullableInt(command, "@RegionID", regionId);
                AddNullableInt(command, "@ServiceID", serviceId);

                connection.Open();
                using (var reader = command.ExecuteReader(CommandBehavior.SequentialAccess))
                {
                    // The SQL SELECT order is documented in TicketRows.sql.
                    while (reader.Read())
                    {
                        var id = reader.GetInt32(0);
                        var created = reader.GetDateTime(1);
                        var closed = ReadDate(reader, 2);
                        var expected = ReadDate(reader, 3);
                        var rating = ReadInt(reader, 4);
                        var channelIdActual = ReadInt(reader, 5);
                        var channelName = ReadText(reader, 6);
                        var statusIdActual = ReadInt(reader, 7);
                        var statusName = ReadText(reader, 8);
                        var typeName = ReadText(reader, 9);
                        var regionName = ReadText(reader, 10);

                        snapshot.Total++;
                        if (snapshot.LatestTicketAt == null)
                            snapshot.LatestTicketAt = FormatDatabaseDate(created);
                        daily[created.Day]++;
                        AddBreakdown(channels, channelIdActual, channelName);
                        AddBreakdown(statuses, statusIdActual, statusName);

                        if (closed.HasValue)
                        {
                            snapshot.Closed++;
                            if (closed.Value >= created && expected.HasValue && expected.Value >= created)
                            {
                                snapshot.SlaEligible++;
                                if (closed.Value <= expected.Value) snapshot.SlaMet++;
                            }
                            else
                            {
                                snapshot.SlaExcluded++;
                            }
                        }
                        if (rating.HasValue)
                        {
                            snapshot.RatingsCount++;
                            ratingSum += rating.Value;
                        }
                        if (snapshot.LatestTickets.Count < 10)
                        {
                            snapshot.LatestTickets.Add(new RecentTicket
                            {
                                Id = id,
                                CreatedAt = FormatDatabaseDate(created),
                                Channel = channelName,
                                Type = typeName,
                                Region = regionName,
                                Status = statusName
                            });
                        }
                    }
                }
            }

            snapshot.RetrievedAt = DateTimeOffset.Now.ToString("yyyy-MM-ddTHH:mm:sszzz", CultureInfo.InvariantCulture);
            if (snapshot.Total > 0)
                snapshot.ClosureRate = snapshot.Closed * 100.0 / snapshot.Total;
            if (snapshot.SlaEligible > 0)
                snapshot.SlaRate = snapshot.SlaMet * 100.0 / snapshot.SlaEligible;
            if (snapshot.RatingsCount > 0)
                snapshot.AverageRating = ratingSum / snapshot.RatingsCount;

            snapshot.Channels = channels.Values.OrderByDescending(x => x.Count)
                .ThenBy(x => x.Name).ToList();
            snapshot.Statuses = statuses.Values.OrderByDescending(x => x.Count)
                .ThenBy(x => x.Name).ToList();
            foreach (var item in snapshot.Channels)
                item.Percent = snapshot.Total == 0 ? 0 : item.Count * 100.0 / snapshot.Total;
            foreach (var item in snapshot.Statuses)
                item.Percent = snapshot.Total == 0 ? 0 : item.Count * 100.0 / snapshot.Total;

            for (int day = 1; day < daily.Length; day++)
                snapshot.Daily.Add(new DailyItem { Day = day, Count = daily[day] });
            if (snapshot.Total > 0)
            {
                snapshot.DailyAverage = snapshot.Total * 1.0 / (daily.Length - 1);
                var highest = snapshot.Daily.OrderByDescending(x => x.Count).ThenBy(x => x.Day).First();
                var lowest = snapshot.Daily.OrderBy(x => x.Count).ThenBy(x => x.Day).First();
                snapshot.HighestDay = new DayPoint { Day = highest.Day, Count = highest.Count };
                snapshot.LowestDay = new DayPoint { Day = lowest.Day, Count = lowest.Count };
            }
            return snapshot;
        }

        private static string FormatDatabaseDate(DateTime date)
        {
            // No timezone conversion: SQL source is datetime without timezone metadata.
            return date.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);
        }

        private static void AddNullableInt(SqlCommand command, string parameterName, int? value)
        {
            command.Parameters.Add(parameterName, SqlDbType.Int).Value =
                value.HasValue ? (object)value.Value : DBNull.Value;
        }

        private static DateTime? ReadDate(SqlDataReader reader, int ordinal)
        {
            return reader.IsDBNull(ordinal) ? (DateTime?)null : reader.GetDateTime(ordinal);
        }

        private static int? ReadInt(SqlDataReader reader, int ordinal)
        {
            return reader.IsDBNull(ordinal) ? (int?)null : reader.GetInt32(ordinal);
        }

        private static string ReadText(SqlDataReader reader, int ordinal)
        {
            return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
        }

        private static void AddBreakdown(Dictionary<string, BreakdownItem> items, int? id, string name)
        {
            var key = id.HasValue ? "ID:" + id.Value.ToString(CultureInfo.InvariantCulture) : "NULL";
            BreakdownItem existing;
            if (!items.TryGetValue(key, out existing))
            {
                existing = new BreakdownItem { Id = id, Name = name, Count = 0 };
                items.Add(key, existing);
            }
            existing.Count++;
        }

        private static string ReadSql(string filename)
        {
            var path = HostingEnvironment.MapPath("~/App_Data/Queries/" + filename);
            if (string.IsNullOrWhiteSpace(path)) throw new FileNotFoundException("SQL path not available.");
            return File.ReadAllText(path);
        }
    }
}
