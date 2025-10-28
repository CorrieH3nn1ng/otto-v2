# OTTO v2 - Reporting Requirements Documentation

**Created:** 2025-10-28
**Status:** PENDING IMPLEMENTATION
**Priority:** HIGH - Manager requires daily reports before 08:00

---

## Overview

The manager currently maintains 3 Excel reports manually that need to be automated in OTTO v2. These reports track daily operations, loading schedules, and freight reconciliation.

---

## Current Excel Reports

### 1. Daily Tracker Master.xlsx
**Purpose:** Track manifest progress from dispatch to delivery

**Sheets:**
- EXPRESS
- TRI & LINKS

**Columns Required:**
- Week
- KAM (Key Account Manager)
- Transporter
- Truck size (e.g., 8T, 12T, Tri-Axle, Superlink)
- Manifest #
- Load capacity (tons)
- Balance (remaining capacity)
- Dispatch Date SA (South Africa)
- Dispatch Date Bond Yard
- Offloaded date
- Standing time applicable
- Tonnage ordered
- Export loaded date
- Export Lot No
- Export Dispatch Date
- Arrival Date SA

### 2. Daily Transporter notification loading.xlsx
**Purpose:** Daily loading schedule by truck type

**Structure:**
- One sheet per day (e.g., "23 Oct", "24 Oct")
- Grouped by truck types:
  - 8 tonners
  - 12 Tonners
  - 15 Tonners
  - Tri Axles
  - Superlinks

**Data:**
- Loading date
- List of trucks per category
- Transporter assignments

### 3. BV & Freight Recon_65140 OI.xlsx
**Purpose:** BV Inspection and Freight Reconciliation

**Columns:**
- PO Number (65140 OI)
- BV Invoice # / FOB amount
- Altecrete Invoice # Shipped
- Invoice value
- Tons loaded
- Manifest Number
- Date loaded
- ETA Kamoa Site
- Freight Invoiced amount
- Quote Number

---

## Current System Analysis

### ✅ Data ALREADY in OTTO v2:

| Field | Current Location | Table/Model |
|-------|------------------|-------------|
| Manifest Number | `manifests.manifest_number` | Manifest |
| KAM | User/Auth system | User |
| Transporter | `load_confirmations.transporter_name` | LoadConfirmation |
| Truck size/type | `load_confirmations.vehicle_type` | LoadConfirmation |
| Invoice # | `invoices.invoice_number` | Invoice |
| Invoice value | `invoices.total_amount` | Invoice |
| Currency | `invoices.currency` | Invoice |
| Tons loaded | Calculated from `packing_details.gross_weight_kg * quantity` | PackingDetail |
| Export date | `manifests.export_date` | Manifest |
| PO Number | `invoices.purchase_order` | Invoice |
| Customer | `customers.name` | Customer |
| Supplier | `suppliers.name` | Supplier |

### ❌ MISSING Data Fields:

| Field | Description | Required For |
|-------|-------------|--------------|
| **Dispatch Date SA** | When truck leaves South Africa warehouse | Daily Tracker |
| **Dispatch Date Bond Yard** | When truck leaves bond yard | Daily Tracker |
| **Offloaded Date** | When cargo is offloaded at destination | Daily Tracker |
| **Arrival Date Kamoa** | When truck arrives at Kamoa site | Daily Tracker, BV Recon |
| **ETA Kamoa** | Expected arrival date | BV Recon |
| **Standing Time** | Idle time charges (hours/days) | Daily Tracker |
| **Load Capacity** | Total truck capacity in tons | Daily Tracker |
| **Balance** | Remaining capacity (capacity - loaded) | Daily Tracker |
| **Freight Quote Number** | Quote reference for freight | BV Recon |
| **Freight Invoiced Amount** | Actual freight cost | BV Recon |
| **Export Loaded Date** | Date loaded for export | Daily Tracker |
| **Export Lot No** | Export batch number | Daily Tracker |
| **Export Dispatch Date** | When export shipment dispatched | Daily Tracker |
| **BV Invoice #** | Bureau Veritas invoice number | BV Recon |
| **FOB Amount** | Free On Board value | BV Recon |
| **Week Number** | Week of year | Daily Tracker |

---

## Proposed Database Changes

### Migration: Add fields to `manifests` table

```php
Schema::table('manifests', function (Blueprint $table) {
    // Dispatch & Arrival Dates
    $table->date('dispatch_date_sa')->nullable()->after('export_date');
    $table->date('dispatch_date_bond_yard')->nullable()->after('dispatch_date_sa');
    $table->date('arrival_date_kamoa')->nullable()->after('dispatch_date_bond_yard');
    $table->date('eta_kamoa')->nullable()->after('arrival_date_kamoa');
    $table->date('offloaded_date')->nullable()->after('arrival_date_kamoa');

    // Export tracking
    $table->date('export_loaded_date')->nullable();
    $table->string('export_lot_number')->nullable();
    $table->date('export_dispatch_date')->nullable();

    // Capacity & Standing Time
    $table->decimal('load_capacity_tons', 10, 2)->nullable();
    $table->decimal('balance_tons', 10, 2)->nullable();
    $table->decimal('standing_time_hours', 10, 2)->nullable();
    $table->text('standing_time_notes')->nullable();

    // Freight Information
    $table->string('freight_quote_number')->nullable();
    $table->decimal('freight_invoiced_amount', 12, 2)->nullable();
    $table->string('freight_invoice_number')->nullable();

    // BV Inspection
    $table->string('bv_invoice_number')->nullable();
    $table->decimal('fob_amount', 12, 2)->nullable();
    $table->date('bv_inspection_date')->nullable();
});
```

### Migration: Add vehicle capacity reference data

```php
Schema::create('vehicle_capacities', function (Blueprint $table) {
    $table->id();
    $table->string('vehicle_type'); // 8T, 12T, 15T, Tri-Axle, Superlink
    $table->decimal('capacity_tons', 10, 2);
    $table->decimal('capacity_cbm', 10, 2)->nullable();
    $table->timestamps();
});

// Seed data
DB::table('vehicle_capacities')->insert([
    ['vehicle_type' => '8 TON', 'capacity_tons' => 8.00, 'capacity_cbm' => null],
    ['vehicle_type' => '12 TON', 'capacity_tons' => 12.00, 'capacity_cbm' => null],
    ['vehicle_type' => '15 TON', 'capacity_tons' => 15.00, 'capacity_cbm' => null],
    ['vehicle_type' => 'TRI-AXLE', 'capacity_tons' => 28.00, 'capacity_cbm' => null],
    ['vehicle_type' => 'SUPERLINK', 'capacity_tons' => 34.00, 'capacity_cbm' => null],
]);
```

---

## Proposed UI/UX Implementation

### 1. Dashboard - New "Reports" Tab

Add a new tab in the main dashboard navigation:
- Dashboard (existing)
- Load Confirmations (existing)
- Manifests (existing)
- **Reports (NEW)** ← Add here

### 2. Reports Tab Structure

```
┌─────────────────────────────────────────────────┐
│  REPORTS                                         │
├─────────────────────────────────────────────────┤
│  Sub-tabs:                                       │
│  ┌─────────────┬──────────────┬─────────────┐  │
│  │ Daily       │ Loading      │ BV & Freight│  │
│  │ Tracker     │ Schedule     │ Recon       │  │
│  └─────────────┴──────────────┴─────────────┘  │
└─────────────────────────────────────────────────┘
```

### Report 1: Daily Tracker

**Features:**
- Date range filter (default: current week)
- Export to Excel button
- Group by: Transporter, Week, KAM
- Real-time data from manifests table
- Color coding:
  - 🔴 Red: Overdue (ETA passed, no arrival)
  - 🟡 Yellow: In transit
  - 🟢 Green: Delivered/Offloaded
- Editable fields:
  - Dispatch dates (SA, Bond Yard)
  - Arrival dates
  - Offloaded date
  - Standing time

**Columns:**
1. Week #
2. KAM
3. Transporter
4. Truck Size
5. Manifest #
6. Load Capacity
7. Tons Loaded
8. Balance
9. Dispatch Date SA
10. Dispatch Date Bond Yard
11. ETA Kamoa
12. Arrival Date
13. Offloaded Date
14. Standing Time
15. Status

**Calculations:**
- Tons Loaded = SUM(packing_details.gross_weight_kg * quantity) / 1000
- Balance = Load Capacity - Tons Loaded
- Standing Time = (Offloaded Date - Arrival Date) in hours/days
- Week # = ISO week number of export_date

### Report 2: Daily Loading Schedule

**Features:**
- Date selector (default: today)
- Group by truck type (8T, 12T, 15T, Tri-Axle, Superlink)
- Show scheduled manifests for loading
- Filter by status: Draft, Ready, In Progress, Loaded

**Layout:**
```
Date: [Date Picker]  [Download Excel]

┌─────────────────────────────────────────┐
│ 8 TONNERS (5 trucks)                    │
├─────────────────────────────────────────┤
│ S00037741 - Express Logistics - 7.5T    │
│ S00037755 - Express Logistics - 8.0T    │
│ ...                                      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 12 TONNERS (3 trucks)                   │
├─────────────────────────────────────────┤
│ S00037754 - TRI Links - 12.0T           │
│ ...                                      │
└─────────────────────────────────────────┘
```

### Report 3: BV & Freight Reconciliation

**Features:**
- Filter by PO Number
- Show all manifests for a PO
- Track BV inspection status
- Track freight invoicing
- Calculate totals

**Columns:**
1. PO Number
2. BV Invoice #
3. FOB Amount
4. Altecrete Invoice #
5. Invoice Value
6. Tons Loaded
7. Manifest #
8. Date Loaded
9. ETA Kamoa
10. Arrival Date
11. Freight Quote #
12. Freight Invoiced
13. Status

**Calculations:**
- Total FOB Amount
- Total Freight Cost
- Total Tons Shipped
- Average Cost per Ton

---

## Data Entry Points

### Where to capture the new data:

**1. Manifest Creation (ManifestForm.jsx)**
- ETA Kamoa (user input)
- Load Capacity (auto-populate from vehicle type, editable)
- Freight Quote Number

**2. Manifest Detail View - New "Logistics" Tab**
Add 4th tab: LOGISTICS (after PREVIEW, INVOICES, DOCUMENTS)

**Fields:**
```
┌─────────────────────────────────────────┐
│ LOGISTICS & TRACKING                    │
├─────────────────────────────────────────┤
│                                          │
│ Dispatch & Transit                       │
│ ├─ Dispatch Date SA:     [Date picker]  │
│ ├─ Dispatch Bond Yard:   [Date picker]  │
│ ├─ ETA Kamoa:            [Date picker]  │
│ ├─ Arrival Date Kamoa:   [Date picker]  │
│ └─ Offloaded Date:       [Date picker]  │
│                                          │
│ Capacity & Loading                       │
│ ├─ Load Capacity:        [12.00] tons   │
│ ├─ Tons Loaded:          [7.50] (calc)  │
│ └─ Balance:              [4.50] (calc)  │
│                                          │
│ Standing Time                            │
│ ├─ Hours:                [0.00] (calc)  │
│ └─ Notes:                [Text area]    │
│                                          │
│ Freight Information                      │
│ ├─ Quote Number:         [Input]        │
│ ├─ Invoiced Amount:      [ZAR 0.00]     │
│ └─ Invoice Number:       [Input]        │
│                                          │
│ BV Inspection                            │
│ ├─ BV Invoice #:         [Input]        │
│ ├─ FOB Amount:           [USD 0.00]     │
│ └─ Inspection Date:      [Date picker]  │
│                                          │
│ Export Details                           │
│ ├─ Export Loaded Date:   [Date picker]  │
│ ├─ Export Lot Number:    [Input]        │
│ └─ Export Dispatch Date: [Date picker]  │
│                                          │
│         [Save Changes] [Cancel]          │
└─────────────────────────────────────────┘
```

**3. Status Auto-updates**
- When `dispatch_date_sa` is set → Manifest status = "dispatched"
- When `arrival_date_kamoa` is set → Manifest status = "in_transit"
- When `offloaded_date` is set → Manifest status = "delivered"

---

## Excel Export Requirements

All reports must have "Download Excel" button that generates:
- Formatted XLSX file
- Proper column headers
- Date formatting (YYYY-MM-DD)
- Number formatting (2 decimal places for amounts, weights)
- Conditional formatting (color coding for status)
- Auto-width columns
- Freeze top row

**Libraries to use:**
- Backend: `maatwebsite/excel` (Laravel Excel)
- Or Frontend: `xlsx` (SheetJS)

---

## API Endpoints Needed

```php
// Reports
GET    /api/reports/daily-tracker?from=2025-10-01&to=2025-10-31
GET    /api/reports/loading-schedule?date=2025-10-28
GET    /api/reports/bv-freight-recon?po=65140
GET    /api/reports/daily-tracker/export  // Download Excel
GET    /api/reports/loading-schedule/export
GET    /api/reports/bv-freight-recon/export

// Manifest logistics update
PUT    /api/manifests/{id}/logistics
PATCH  /api/manifests/{id}/dispatch-sa
PATCH  /api/manifests/{id}/arrival-kamoa
PATCH  /api/manifests/{id}/offloaded
```

---

## Automation Opportunities

### 1. Standing Time Calculation
- Auto-calculate when arrival_date and offloaded_date are both set
- Formula: `(offloaded_date - arrival_date_kamoa) * 24` hours
- Alert if standing time > 24 hours

### 2. Balance Calculation
- Auto-calculate when load_capacity and tons loaded are known
- Formula: `load_capacity - SUM(packing_details weights)`
- Warning if balance < 0 (overloaded)

### 3. Status Progression
- Draft → Dispatched SA → In Transit → Arrived → Offloaded → Delivered
- Email notifications at each stage
- SMS to transporter on dispatch
- Alert to KAM on arrival

### 4. Daily Email Report
- Scheduled task (cron) at 07:00 daily
- Email manager with:
  - Manifests dispatched yesterday
  - Manifests expected to arrive today
  - Manifests with standing time issues
  - Loading schedule for today

---

## Implementation Phases

### Phase 1: Database Schema (1-2 hours)
- [ ] Create migration for manifest fields
- [ ] Create vehicle_capacities table
- [ ] Seed vehicle capacity data
- [ ] Update Manifest model with new fillable fields
- [ ] Test migrations

### Phase 2: Logistics Tab in Manifest Detail (3-4 hours)
- [ ] Add 4th tab "LOGISTICS" to ManifestDetailView
- [ ] Create form fields for all logistics data
- [ ] Implement save/update functionality
- [ ] Add validation rules
- [ ] Auto-calculations (balance, standing time)
- [ ] Test CRUD operations

### Phase 3: Daily Tracker Report (4-5 hours)
- [ ] Create DailyTrackerController
- [ ] Build API endpoint with filters
- [ ] Create frontend Reports page/tab
- [ ] Build Daily Tracker sub-tab
- [ ] Add date range filters
- [ ] Implement table with all columns
- [ ] Add color coding by status
- [ ] Excel export functionality
- [ ] Test with real data

### Phase 4: Loading Schedule Report (2-3 hours)
- [ ] Create LoadingScheduleController
- [ ] Build API endpoint
- [ ] Create Loading Schedule sub-tab
- [ ] Group by truck type
- [ ] Add date selector
- [ ] Excel export
- [ ] Test

### Phase 5: BV & Freight Recon Report (3-4 hours)
- [ ] Create BVFreightReconController
- [ ] Build API endpoint with PO filter
- [ ] Create BV Recon sub-tab
- [ ] Display all columns
- [ ] Calculate totals
- [ ] Excel export
- [ ] Test

### Phase 6: Automation & Alerts (2-3 hours)
- [ ] Create scheduled command for daily email
- [ ] Implement status auto-progression
- [ ] Add standing time alerts
- [ ] Test cron jobs
- [ ] Configure email templates

**Total Estimated Time: 17-23 hours**

---

## Testing Checklist

- [ ] All new manifest fields save correctly
- [ ] Calculations are accurate (balance, standing time)
- [ ] Date validations work (arrival can't be before dispatch)
- [ ] Reports show correct data
- [ ] Excel exports match Excel format
- [ ] Filters work correctly
- [ ] Color coding displays properly
- [ ] Email reports send successfully
- [ ] Mobile responsive (reports viewable on mobile)
- [ ] Performance with 100+ manifests

---

## Questions for Stakeholder

1. Should standing time trigger automatic charges/alerts?
2. Who should receive daily email reports? (Just manager or KAM too?)
3. Should reports be accessible by all users or restricted to managers?
4. Do we need historical data import from existing Excel files?
5. Should we track additional metrics like fuel costs, toll fees, etc.?
6. Are there SLA targets for delivery times we should track?
7. Should we integrate with transporter systems for real-time location tracking?

---

## Notes

- All date/time calculations should account for timezone (Africa/Johannesburg)
- Excel exports should match exact format of current manual reports for easy transition
- Consider adding dashboard widgets showing key metrics:
  - Manifests in transit today
  - Overdue deliveries
  - Standing time this week
  - Total freight cost this month
- Future enhancement: GPS tracking integration for real-time truck location

---

**Next Steps:** Complete current manifest details functionality, then proceed with Phase 1 (Database Schema) of reporting implementation.
