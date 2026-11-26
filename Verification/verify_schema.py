#!/usr/bin/env python3
"""Offline checks only; never connects to SQL Server or alters databases."""
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
src = root / 'BeneficiaryDashboards'
ddl = (root / 'Verification' / 'schema_fixture.sql').read_text(encoding='utf-8')

# SQL Server CREATE TABLE statements. Extract only columns before CONSTRAINT.
tables = {}
for match in re.finditer(r'CREATE\s+TABLE\s+\[dbo\]\.\[([^\]]+)\]\s*\((.*?)\s+CONSTRAINT\s+', ddl, re.I | re.S):
    name, body = match.group(1), match.group(2)
    columns = {m.group(1).lower() for m in re.finditer(r'^\s*\[([^\]]+)\]\s+\[(?:int|bigint|datetime|nvarchar|bit|decimal|smallint|tinyint|float|varchar|date|uniqueidentifier|numeric|smalldatetime|char)\]',body,re.I|re.M)}
    tables[name.lower()] = columns
assert 'ticket' in tables, 'Ticket DDL not found'

queries = list((src / 'App_Data' / 'Queries').glob('*.sql'))
assert queries, 'No SQL query files'
errors=[]
for query in queries:
    sql = query.read_text(encoding='utf-8')
    # Strip comments before assessing statements/references.
    clean = re.sub(r'--[^\r\n]*', '', sql)
    if re.search(r'\b(CREATE|ALTER|DROP|DELETE|INSERT|UPDATE|MERGE|TRUNCATE|GRANT|REVOKE|EXEC|DBCC)\b', clean, re.I):
        errors.append(f'{query.name}: contains non-read-only SQL')
    aliases={}
    for m in re.finditer(r'\b(?:FROM|JOIN)\s+dbo\.([A-Za-z0-9_]+)(?:\s+AS\s+([A-Za-z0-9_]+))?',clean,re.I):
        tbl,alias=m.group(1),m.group(2) or m.group(1)
        if tbl.lower() not in tables:
            errors.append(f'{query.name}: dbo.{tbl} missing from schema fixture')
        aliases[alias.lower()]=tbl.lower()
    for m in re.finditer(r'\b([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\b',clean):
        alias,col=m.group(1).lower(),m.group(2).lower()
        if alias in aliases and col not in tables[aliases[alias]]:
            errors.append(f'{query.name}: column {alias}.{col} missing from dbo.{aliases[alias]}')
    # Query file content must be SELECT only (comments aside).
    if not re.search(r'\bSELECT\b', clean,re.I):
        errors.append(f'{query.name}: lacks SELECT')

# Exact column order required by DashboardRepository's SqlDataReader.
ticket_sql=re.sub(r'--[^\r\n]*', '', (src/'App_Data/Queries/TicketRows.sql').read_text(encoding='utf-8'))
columns=re.search(r'\bSELECT\s+(.*?)\s+FROM\s+dbo\.Ticket', ticket_sql, re.S|re.I).group(1)
select_parts=[p.strip() for p in columns.split(',')]
expected=['t.ID','t.CreateDate','t.ClosedDate','t.ExpectDate','t.RatingValue',
          't.ChannelID','ch.Name AS ChannelName','t.ActionStatusID',
          'ts.Name AS StatusName','lv.Name AS TypeName','r.Name AS RegionName']
if [x.lower() for x in select_parts] != [x.lower() for x in expected]:
    errors.append('TicketRows SELECT column order differs from C# SqlDataReader ordinals')

# MVC project/ASP.NET XML sanity checks.
for path in (src/'web.config',src/'Views/web.config',src/'packages.config',src/'BeneficiaryDashboards.csproj'):
    try: ET.parse(str(path))
    except Exception as e: errors.append(f'{path.name}: invalid XML: {e}')
proj=(src/'BeneficiaryDashboards.csproj').read_text(encoding='utf-8')
for ref in re.findall(r'<(?:Compile|Content) Include="([^"]+)"',proj):
    if not (src / ref.replace('\\','/')).is_file(): errors.append(f'csproj missing file: {ref}')

# SQL constraints for exact schema, no beneficiary personal data references.
queries_text='\n'.join(p.read_text(encoding='utf-8') for p in queries if p.name!='InspectData.sql')
for sensitive in ('NationalityID','PersonName','Mobile','Password','Email'):
    if re.search(r'\b'+sensitive+r'\b', queries_text,re.I): errors.append(f'PII or secret reference in runtime SQL: {sensitive}')

if errors:
    print('\n'.join('FAIL: '+err for err in errors))
    sys.exit(1)
print(f'PASS: {len(tables)} dbo tables parsed from the schema fixture')
for q in queries: print('PASS:',q.name,'read-only and referenced columns exist')
print('PASS: SqlDataReader SELECT order matches code, XML parses, project files exist, no PII selected')
