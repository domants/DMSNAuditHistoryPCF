# Audit History Control PCF

![1](https://github.com/domants/DMSNAuditHistoryPCF/blob/main/assets/1.png)
![gif](https://github.com/domants/DMSNAuditHistoryPCF/blob/main/assets/Audit%20Timeline.gif)

## Overview

The **DMSN Audit Timeline** PCF control renders Dataverse audit logs as an interactive timeline. It groups related audit events, exposes the underlying field-level changes, and lets makers surface the activity feed directly on any model-driven form. The experience automatically adapts between desktop grids and mobile-friendly cards, keeping change intelligence close to the record.

## Features

- **Interactive timeline grid:** Fluent UI DataGrid shows grouped operations, timestamps, users, and every changed field with old/new values plus deep links to the related records.
- **Powerful filtering:** Combine field pickers, text search, and a date range selector to isolate only the changes that matter before rendering.
- **Load-more pagination:** Optional paging pulls additional `audit` rows on demand, preserving context while navigating long histories.
- **Sorting & sizing controls:** Makers can enable column sorting and per-column resizing via manifest inputs—great for investigative work.
- **Change-detail enrichment:** Toggle inclusion of attribute-level metadata (`includeChangeData`) to surface the exact before/after values directly in the UI.
- **Responsive layout:** Automatically switches to stacked cards on smaller breakpoints while preserving the same filters and actions.

## Installation

1. Import the solution into your D365 environment.
   - Download the managed solution here:
     - [DMSNAuditHistorySolutions](https://github.com/domants/DMSNAuditHistoryPCF/blob/main/DMSNAuditHistorySolutions/DMSNAuditHistorySolutions.zip)
       ![7](https://github.com/domants/DMSNAuditHistoryPCF/blob/main/assets/7.png)

3. Configure the control on the desired entity forms.

## How to Use

1. Add the **DMSN Audit Timeline** to a model-driven form and bind the required parameters (see below).
2. Open any record; the control detects the bound record ID and immediately loads audit events.
3. Use the filter bar to:
   - Narrow to specific attributes (multi-select + search)
   - Apply a date window
   - Reset/refresh the feed on demand
4. Inspect audit rows from the grid or card layout. Each entry shows:
   - Operation, timestamp, and user
   - Every field that changed with old/new values (lookup values open the referenced record in a new tab)
5. If enabled, use **Load more** to page through additional history and **Sort**/**Resize** to adjust the presentation.

![2](https://github.com/domants/DMSNAuditHistoryPCF/blob/main/assets/2.png)

![3](https://github.com/domants/DMSNAuditHistoryPCF/blob/main/assets/3.png)

![4](https://github.com/domants/DMSNAuditHistoryPCF/blob/main/assets/4.png)

![8](https://github.com/domants/DMSNAuditHistoryPCF/blob/main/assets/8.png)

![9](https://github.com/domants/DMSNAuditHistoryPCF/blob/main/assets/9.png)

## Configuration Inputs

| Input                | Type            | Description                                                                    |
| -------------------- | --------------- | ------------------------------------------------------------------------------ |
| `value`              | Text (required) | Record identifier used to scope the audit query.                               |
| `recordName`         | Text (bound)    | Optional primary name value supplied by the host for display context.          |
| `pageSize`           | Whole Number    | Max audit rows retrieved per request (defaults inside the control if omitted). |
| `showLoadMore`       | Two Options     | Enables the "Load more" button so users can fetch additional pages.            |
| `includeChangeData`  | Two Options     | When true, fetches and parses field-level change payloads (old/new values).    |
| `height`             | Whole Number    | Fixed control height in pixels.                                                |
| `enableSort`         | Two Options     | Toggles column sorting in the desktop grid experience.                         |
| `enableColumnSizing` | Two Options     | Allows users to resize columns when sorting is enabled.                        |

## Use Cases

- **Change intelligence on any table:** Surface timeline context on Account, Case, or custom entities without writing custom dashboards.
- **Audit & compliance reviews:** Provide auditors with sortable, filterable evidence directly within Dynamics 365.
- **Support troubleshooting:** Give frontline teams a quick way to see who changed what before acting on a ticket.

## Contributions

Contributions to improve or enhance this control are welcome. If you encounter issues or have feature requests, please create an issue or submit a pull request in the repository.

---

### License

This control is licensed under the MIT License. See the LICENSE file for details.
