using System;
using System.Collections.Generic;

namespace BeneficiaryDashboards.Models
{
    public sealed class SelectOption
    {
        public int Id { get; set; }
        public string Name { get; set; }
    }

    public sealed class DashboardOptions
    {
        public string LatestMonth { get; set; }
        public List<SelectOption> Channels { get; set; } = new List<SelectOption>();
        public List<SelectOption> Regions { get; set; } = new List<SelectOption>();
        public List<SelectOption> Services { get; set; } = new List<SelectOption>();
    }

    public sealed class BreakdownItem
    {
        public int? Id { get; set; }
        public string Name { get; set; }
        public long Count { get; set; }
        public double Percent { get; set; }
    }

    public sealed class DailyItem
    {
        public int Day { get; set; }
        public long Count { get; set; }
    }

    public sealed class DayPoint
    {
        public int Day { get; set; }
        public long Count { get; set; }
    }

    public sealed class RecentTicket
    {
        public int Id { get; set; }
        public string CreatedAt { get; set; }
        public string Channel { get; set; }
        public string Type { get; set; }
        public string Region { get; set; }
        public string Status { get; set; }
    }

    public sealed class DashboardSnapshot
    {
        public string Month { get; set; }
        public string RetrievedAt { get; set; }
        public string LatestTicketAt { get; set; }
        public long Total { get; set; }
        public long Closed { get; set; }
        public double? ClosureRate { get; set; }
        public long SlaEligible { get; set; }
        public long SlaMet { get; set; }
        public long SlaExcluded { get; set; }
        public double? SlaRate { get; set; }
        public long RatingsCount { get; set; }
        public double? AverageRating { get; set; }
        public double? DailyAverage { get; set; }
        public DayPoint HighestDay { get; set; }
        public DayPoint LowestDay { get; set; }
        public List<BreakdownItem> Channels { get; set; } = new List<BreakdownItem>();
        public List<BreakdownItem> Statuses { get; set; } = new List<BreakdownItem>();
        public List<DailyItem> Daily { get; set; } = new List<DailyItem>();
        public List<RecentTicket> LatestTickets { get; set; } = new List<RecentTicket>();
    }
}
