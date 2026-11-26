-- Offline verification fixture. It contains only the columns reviewed for Stage 01.

CREATE TABLE [dbo].[Ticket] (
    [ID] [int] IDENTITY(1,1) NOT NULL,
    [CreateDate] [datetime] NULL,
    [LevelID] [int] NULL,
    [ServiceID] [int] NULL,
    [ActionStatusID] [int] NULL,
    [ClosedDate] [datetime] NULL,
    [FlagDel] [bit] NULL,
    [ExpectDate] [datetime] NULL,
    [ChannelID] [int] NULL,
    [RatingValue] [int] NULL,
    [RegionID] [int] NULL,
    CONSTRAINT [PK_Ticket] PRIMARY KEY ([ID])
);

CREATE TABLE [dbo].[Ticket_Channel] (
    [ID] [int] NOT NULL,
    [Name] [nvarchar](50) NULL,
    CONSTRAINT [PK_Ticket_Channel] PRIMARY KEY ([ID])
);

CREATE TABLE [dbo].[Ticket_Level] (
    [ID] [int] NOT NULL,
    [Name] [nvarchar](50) NULL,
    CONSTRAINT [PK_Ticket_Level] PRIMARY KEY ([ID])
);

CREATE TABLE [dbo].[Ticket_Status] (
    [ID] [int] NOT NULL,
    [Name] [nvarchar](50) NULL,
    CONSTRAINT [PK_Ticket_Status] PRIMARY KEY ([ID])
);

CREATE TABLE [dbo].[Ticket_Pirority] (
    [ID] [int] NOT NULL,
    [Name] [nvarchar](50) NULL,
    CONSTRAINT [PK_Ticket_Pirority] PRIMARY KEY ([ID])
);

CREATE TABLE [dbo].[Region] (
    [ID] [int] NOT NULL,
    [Name] [nvarchar](50) NULL,
    CONSTRAINT [PK_Region] PRIMARY KEY ([ID])
);

CREATE TABLE [dbo].[Sup_GroupService] (
    [ID] [int] IDENTITY(1,1) NOT NULL,
    [ServiceName] [nvarchar](50) NULL,
    [MaxmumDays] [int] NULL,
    CONSTRAINT [PK_Sup_GroupService] PRIMARY KEY ([ID])
);
