# Dashboard Features Documentation

## Overview
The Otto V2 Dashboard provides real-time visibility into the logistics workflow, from invoice receipt through delivery. All features are designed to follow the natural process flow of the business.

---

## Dashboard Indicators

The dashboard displays 8 key performance indicators in workflow order:

### Workflow Order (Left to Right)

1. **📋 Total Invoices**
   - Total count of all invoices in the system
   - Includes all statuses: draft, approved, in transit, delivered

2. **✏️ Draft**
   - Invoices in draft status
   - Not yet approved or ready for processing

3. **🔬 Awaiting QC**
   - Invoices requiring QC (Quality Control) certificate
   - Must be completed before dispatch

4. **📦 Ready for Dispatch**
   - Invoices approved and ready for transport arrangement
   - Status: `approved`, Stage: `ready_dispatch`
   - Next step: Create load confirmation

5. **🚛 Load Confirmations**
   - Total load confirmations created
   - Indicates transport has been arranged
   - Next step: Create manifest

6. **📜 Manifests**
   - Total manifests created
   - Groups multiple load confirmations
   - Next step: Mark as in transit

7. **🚚 In Transit**
   - Invoices currently being transported
   - Status: `in_transit`, Stage: `in_transit`
   - Automatically updated when load confirmation is uploaded

8. **✅ Delivered**
   - Invoices successfully delivered to customer
   - Final stage of the workflow

---

## Table Filtering Features

All main tables (Load Confirmations, Invoices, Purchase Orders) have compact filtering capabilities.

### Common Features Across All Tables

- **Search Field**: Searches across multiple relevant fields
- **Filter Dropdowns**: Category-specific filters
- **Result Counter**: Shows "Showing X of Y items"
- **Real-time Updates**: Filters apply instantly as you type
- **Pagination Reset**: Automatically returns to page 1 when filters change

---

### Load Confirmations Filtering

**Location**: Load Confirmations table

**Search Fields**:
- File reference (e.g., LC-IN018161-1761545240)
- Transporter name (e.g., AMOZA LOGIX)
- Truck registration
- Trailer 1 registration
- Trailer 2 registration

**Status Filter Options**:
- All Statuses
- Draft
- Pending
- Confirmed
- Transport Confirmed
- Ready for Manifest
- In Manifest
- In Transit
- Delivered
- Cancelled

**Usage Example**:
```
Search: "AMOZA" → Finds all load confirmations for AMOZA LOGIX
Filter: "Transport Confirmed" → Shows only confirmed transport
Result: "Showing 2 of 43 load confirmations"
```

---

### Active Invoices Filtering

**Location**: Active Invoices tab

**Search Fields**:
- Invoice number (e.g., IN018161)
- Supplier name
- Supplier code
- Customer name
- Customer code

**Status Filter Options**:
- All Statuses
- Draft
- Pending Transport
- Transport Requested
- In Transit
- Delivered
- Cancelled

**Stage Filter Options**:
- All Stages
- Invoice Received
- Awaiting Documents
- Documents Complete
- Transport Requested
- Load Confirmed
- In Transit
- Delivered

**Usage Example**:
```
Search: "KAMOA" → Finds all invoices for KAMOA customer
Status: "In Transit" → Only in-transit invoices
Stage: "Ready Dispatch" → Only ready for dispatch stage
Result: "Showing 2 of 43 invoices"
```

---

### Purchase Orders Filtering

**Location**: Purchase Orders tab

**Search Fields**:
- PO number
- Customer reference
- End user
- Customer account code
- Customer name

**Usage Status Filter Options**:
- All Status
- Healthy (Green) - Under 70% budget usage
- Monitor (Yellow) - 70-90% budget usage
- Critical (Red) - Over 90% budget usage
- Over Budget - Exceeded 100%

**Usage Example**:
```
Search: "KAMOA" → Finds all POs for KAMOA
Filter: "Critical (Red)" → Shows only POs over 90% budget
Result: "Showing 3 of 15 purchase orders"
```

---

## Table Sorting Features

All main tables support column-based sorting with visual indicators.

### How to Sort

1. **Click Column Header**: Click any sortable column header to sort
2. **Toggle Direction**: Click again to reverse sort direction
3. **Visual Indicator**: Arrow shows current sort (↑ ascending, ↓ descending)

### Sortable Columns

#### Load Confirmations
- File Reference (alphabetical)
- Confirmation Date (chronological)
- Collection Date (chronological)
- Transporter (alphabetical)
- Vehicle Type (alphabetical)
- Truck Registration (alphabetical)
- Status (alphabetical)

#### Active Invoices
- Invoice Number (alphabetical)
- Date (chronological)
- Supplier (alphabetical)
- Customer (alphabetical)
- Amount (numeric)
- Stage (alphabetical)
- Owner (alphabetical)
- Status (alphabetical)

#### Purchase Orders
- PO Number (alphabetical)
- Date (chronological)
- Customer (alphabetical)
- Reference (alphabetical)
- End User (alphabetical)
- Budget (numeric)
- Usage % (numeric)

### Sorting Rules

- **Text Fields**: Case-insensitive alphabetical sorting
- **Date Fields**: Chronological order (oldest to newest or newest to oldest)
- **Numeric Fields**: Mathematical order (smallest to largest or largest to smallest)
- **Null Values**: Always sorted to the end
- **Default Sort**: Most tables default to ID descending (newest first)

### Usage Example
```
Click "Amount" header → Sorts by amount ascending
Click "Amount" header again → Sorts by amount descending
Visual: "Amount ↓" shows descending sort
```

---

## Automatic Invoice Status Updates

### Load Confirmation Upload Workflow

When a load confirmation PDF is uploaded via the AUTO TRANSPORT REQUEST feature:

1. **PDF Processing**:
   - System extracts invoice number from handwritten load confirmation
   - AI (Gemini) reads handwritten text and vehicle details

2. **Auto-Population**:
   - Vehicle registrations (truck, trailer 1, trailer 2)
   - Transporter name and ID
   - Vehicle type (with intelligent suggestions)
   - Delivery address from invoice
   - Collection address
   - Agents (clearing and entry)
   - Driver information
   - Department contact defaults (e.g., KAMOA contacts)

3. **Automatic Status Update**:
   - Invoice status changes: `approved` → `in_transit`
   - Invoice stage changes: `ready_dispatch` → `in_transit`
   - Dashboard indicators update automatically
   - "Ready for Dispatch" count decreases
   - "In Transit" count increases

**Code Location**: `backend/app/Http/Controllers/Api/WebhookController.php:697-707`

---

## Data Refresh & Caching

### Cache Prevention

All API calls include timestamp parameters to prevent browser caching:
- Statistics endpoint: `/api/invoices/statistics?_t=<timestamp>`
- Fresh data on every dashboard load

### Manual Refresh

If you need to force refresh:
- **Windows**: `Ctrl + F5` or `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

---

## Technical Implementation

### Backend API

**Statistics Endpoint**: `GET /api/invoices/statistics`

**Returns**:
```json
{
  "total_invoices": 43,
  "draft": 1,
  "stage_ready_dispatch": 40,
  "stage_in_transit": 2,
  "stage_delivered": 0,
  "load_confirmations": 2,
  "manifests": 0,
  "awaiting_qc": 0
}
```

**Code Location**: `backend/app/Http/Controllers/Api/InvoiceController.php:427-461`

---

### Frontend Components

**Dashboard**: `frontend/src/pages/Dashboard.jsx`
- Displays 8 workflow indicators
- Auto-refreshes on tab change

**Filtering Logic**:
- Load Confirmations: `frontend/src/components/LoadConfirmationList.jsx:336-417`
- Invoices: `frontend/src/components/InvoiceList.jsx:113-196`
- Purchase Orders: `frontend/src/components/PurchaseOrderList.jsx:82-144`

**Sorting Logic**:
- Uses `orderBy` and `order` state variables
- Implements comparator functions for each data type
- Visual indicators with Material-UI icons

---

## Workflow Best Practices

### Typical Invoice Lifecycle

1. **Upload Invoice** → Status: `draft` or `approved`
2. **Complete QC (if required)** → Removes from "Awaiting QC"
3. **Approve Invoice** → Status: `approved`, Stage: `ready_dispatch`
4. **Upload Load Confirmation** → Status: `in_transit`, Stage: `in_transit`
5. **Create Manifest** → Groups multiple load confirmations
6. **Mark as Delivered** → Status: `delivered`, Stage: `delivered`

### Dashboard Monitoring

- **Morning Review**: Check "Ready for Dispatch" count
- **Transport Planning**: Create load confirmations for ready invoices
- **Transit Tracking**: Monitor "In Transit" count
- **Completion**: Verify "Delivered" count matches expectations

---

## Troubleshooting

### Indicators Showing 0 When Data Exists

**Symptoms**: Dashboard shows 0 for indicators that should have data
**Cause**: Browser cache holding old API response
**Solution**: Hard refresh browser (Ctrl + F5 or Cmd + Shift + R)

### Filters Not Working

**Symptoms**: Search returns no results
**Check**:
1. Verify exact spelling in search term
2. Clear search field and try again
3. Check if status/stage filter is too restrictive
4. Combine filters carefully (they use AND logic)

### Sort Not Responding

**Symptoms**: Clicking column header doesn't sort
**Check**:
1. Look for arrow indicator on column header
2. Some columns are not sortable (e.g., Actions, Equipment)
3. Refresh page if no response

---

## Future Enhancements

Potential improvements for consideration:

1. **Export Filtered Data**: Download filtered results to Excel
2. **Saved Filters**: Save commonly used filter combinations
3. **Advanced Search**: Add date range filters
4. **Real-time Updates**: WebSocket for live dashboard updates
5. **Custom Views**: Save custom column orders and visibility

---

## Support

For questions or issues:
1. Check this documentation first
2. Verify data in database using MySQL queries
3. Check browser console for errors (F12)
4. Review backend logs for API errors

**Last Updated**: October 27, 2025
**Version**: 2.0
