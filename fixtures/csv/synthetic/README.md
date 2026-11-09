> Historical development samples only. These files are not a dashboard feature and are not required for Schedule → Review care → Billing. See the [project introduction](../../../README.md).

# Synthetic CSV fixtures

These three files contain entirely invented people, phone numbers, identifiers, dates, notes, and hours. No original client files were opened, read, or copied to create them. They are development fixtures, not anonymized extracts of real records.

## Files and intended use

| File | Contents | Intended use |
| --- | --- | --- |
| `DEMO_Reports_Visits_By_Client.csv` | Report metadata, October 2026 totals, and 20 client/caregiver summary rows | Test report-preamble detection and monthly planned-hour summaries |
| `DEMO_CDHCI_Client_Monthly_Hours_Billing_Tracking.csv` | Four clients with monthly allowances and fictional billing notes | Test client matching, numeric identifiers, dates, and mixed private-charge values |
| `DEMO_Custom_Daily_Schedule.csv` | 66 scheduled visits with dates, times, stable visit IDs, and client IDs | Test future visit-level import, preview, duplicate handling, and completion confirmation |

**The daily schedule uses our own proposed test schema. It is not a verified AxisCare export.** The summary and allowance headers are based on column names supplied by the team, with an illustrative report preamble based on its screenshot. Actual field names, layouts, time formats, and identifiers must be checked against an authorized real export before claiming compatibility.

AxisCare publicly documents custom reports with selectable visit-related fields and CSV export, but this does not establish these fixture headers as its native schema: [AxisCare reporting](https://axiscare.com/features/reporting/).

## Meaning of the data

- Every detail record has `Status=scheduled`. None is confirmed completed, submitted, or paid.
- In this fixture, `Billable Hours` means total **planned hours** for the summary group's visits, as specified by the team. It is not monthly allowance divided by visit count, and does not imply a billing submission.
- The summary's `Thu Oct 2026` column contains values such as `5 visits` and `1 visit`, not service dates.
- A summary count cannot establish individual service dates. The dates in the detail file are independently invented to form a consistent example; they do not reconstruct a real schedule from aggregates.
- The daily file's `Client ID` matches the allowance file's fictional `ID #`. A real AxisCare internal client ID and a payer/member ID may differ; verify their relationship rather than assuming this match in production.
- `Private Charge` contains both numbers and literal `n/a`. Do not silently convert `n/a` to zero. Notes containing amounts are illustrative text, not calculated charges or confirmed business rules.
- `Date Hours Established` is provisionally treated as an allowance effective date. Its real business meaning needs confirmation.
- Dates in the detail file are in October 2026. Select that month when demonstrating monthly calculations. Past dates alone must not automatically confirm scheduled work as completed.

## Expected reconciliation

| Client | Monthly allowance (h) | Scheduled visits | Planned hours (h) | Projected remaining (h), with no completed work |
| --- | ---: | ---: | ---: | ---: |
| Mara Linden | 80 | 15 | 54.20 | 25.80 |
| Owen Alder | 60 | 20 | 70.00 | -10.00 |
| Nora Vale | 75 | 20 | 75.00 | 0.00 |
| Theo Birch | 90 | 11 | 40.25 | 49.75 |
| Total | 305 | 66 | 239.45 | 65.55 |

For every client/caregiver pair, detail counts and hour sums equal its summary row. Each shift's start/end duration equals its scheduled hours. Caregiver shifts do not overlap; same-day shifts for one caregiver have a 30-minute gap. `Visit ID` is unique per visit.

The report CSV has 15 metadata/blank rows before the real column header on **row 16**. Its totals are 66 visits, 4 clients, 5 caregivers, and 239.45 hours. Do not import metadata or totals as service records, or add summary hours on top of the corresponding detailed visits.

## Acceptance targets for the importer

These files do not demonstrate that an importer is already implemented or compatible. Use them to verify:

1. Preview and identify the file type before saving anything.
2. Match clients without creating unintended duplicates; report unmatched or ambiguous identities for review.
3. Import detail as scheduled work; initial used, unbilled completed, and billed hours remain zero in an otherwise empty test database.
4. Confirming one visit creates completed/unbilled work once, removing that visit from outstanding scheduled totals so forecasts do not double-count it.
5. Re-importing the same file does not create additional visits. Proposed changes to already imported visits require review; do not silently overwrite completed work.
6. Summary-only imports support monthly aggregate checks, not fabricated per-day visits or service-date claims.

UTF-8 CSV files include a BOM for Excel, CRLF line endings, and quoted fields where needed for notes containing commas. There are no formulas or macros. Keep real exports, secrets, and databases out of GitHub and the hosted demo.

## 中文说明

三份文件全部为虚构测试素材，没有读取真实客户文件。

- 汇总报表：测试跳过说明行、识别月份和核对总计。
- 月额度表：测试客户、批准小时、日期、备注和私费字段。
- 逐日明细：测试一行一次服务的计划导入，以及后续确认实际完成。

逐日明细是自定义测试格式，不代表已确认的 AxisCare 原始导出。三份文件对应同一批虚构数据，不能将汇总和明细重复累加。开发时可以继续使用，实际对接前仍需核对导出格式。
