# Otto V2 Quick Reference Guide

## Dashboard Workflow Indicators (In Order)

| Icon | Indicator | Meaning |
|------|-----------|---------|
| 📋 | Total Invoices | All invoices in system |
| ✏️ | Draft | Not yet approved |
| 🔬 | Awaiting QC | Needs quality control certificate |
| 📦 | Ready for Dispatch | Approved, awaiting transport |
| 🚛 | Load Confirmations | Transport arranged |
| 📜 | Manifests | Load confirmations grouped |
| 🚚 | In Transit | Currently being transported |
| ✅ | Delivered | Successfully delivered |

---

## Quick Filtering

### Load Confirmations
- **Search**: File ref, transporter, registrations
- **Filter**: Status dropdown
- **Shortcut**: Type transporter name to find quickly

### Invoices
- **Search**: Invoice #, supplier, customer
- **Filter**: Status + Stage dropdowns
- **Shortcut**: Use stage filter to find ready invoices

### Purchase Orders
- **Search**: PO #, customer, end user
- **Filter**: Usage status (Green/Yellow/Red)
- **Shortcut**: Filter "Critical" to see over-budget POs

---

## Quick Sorting

**Click any column header to sort**
- Click once = Ascending ↑
- Click twice = Descending ↓
- Arrow shows current sort direction

**Most Used Sorts**:
- Invoices by Date (newest first)
- Amount (highest first)
- Load Confirmations by Collection Date
- PO Usage % (highest first)

---

## Common Actions

### Upload Load Confirmation
1. Go to Active Invoices tab
2. Click "Upload Load Confirmation" button
3. Select PDF file
4. System auto-extracts data and updates invoice to "In Transit"

### Find Ready Invoices
1. Go to Active Invoices tab
2. Stage Filter → "Ready Dispatch"
3. Result shows all invoices awaiting transport

### Check In-Transit Shipments
1. Dashboard shows "In Transit" count
2. Active Invoices tab → Status Filter → "In Transit"
3. Or Stage Filter → "In Transit"

### Monitor PO Budget
1. Go to Purchase Orders tab
2. Usage Status Filter → "Critical (Red)"
3. Shows POs over 90% budget

---

## Package-Level Manifest Management

### ⚠️ CRITICAL: Manifests work at PACKAGE level, not invoice level!

**What this means:**
- One invoice can have packages on multiple manifests (split shipments)
- One manifest can have packages from multiple invoices (mixed loads)
- You control which individual packages go on which manifest

### Add Packages to Manifest
1. Open manifest detail → **INVOICES** tab
2. Click **+ ADD INVOICE**
3. Click the **Qty number** (e.g., "7") for the invoice
4. **Select specific packages** to add (not all required!)
5. Click "Add X Package(s)"
6. ✅ Only selected packages assigned to manifest

### Remove Packages from Manifest
1. Open manifest detail → **INVOICES** tab
2. Click the **Packages number** (e.g., "3") for the invoice
3. **Select packages to remove**
4. Click "Remove X Package(s)"
5. ✅ Selected packages removed, others stay

### Understanding Package Status
- 🟢 **Green chip**: Package on this manifest
- 🟡 **Yellow chip**: Package on different manifest
- ⚪ **White chip**: Package not assigned yet

### Quick Examples

**Split Shipment:**
- Invoice IN018177 has 7 packages
- Add 3 packages to Manifest A
- Add 4 packages to Manifest B
- Result: One invoice split across two trucks

**Mixed Load:**
- Manifest S00037754 needs to fill capacity
- Add 2 packages from Invoice A
- Add 5 packages from Invoice B
- Add 3 packages from Invoice C
- Result: Optimized truck load from multiple orders

---

## Keyboard Shortcuts

- `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac): Hard refresh
- `F12`: Open browser console for debugging
- `Ctrl + Click`: Sort while holding Ctrl to multi-sort (not implemented yet)

---

## Troubleshooting Quick Fixes

| Problem | Quick Fix |
|---------|-----------|
| Dashboard shows zeros | Hard refresh browser (Ctrl + F5) |
| Can't find invoice | Clear all filters, then search again |
| Wrong sort order | Click column header again to reverse |
| Load confirmation not updating invoice | Check if invoice number matches exactly |

---

## File Locations Reference

### Frontend Components
- Dashboard: `frontend/src/pages/Dashboard.jsx`
- Load Confirmations: `frontend/src/components/LoadConfirmationList.jsx`
- Invoices: `frontend/src/components/InvoiceList.jsx`
- Purchase Orders: `frontend/src/components/PurchaseOrderList.jsx`

### Backend Controllers
- Invoice API: `backend/app/Http/Controllers/Api/InvoiceController.php`
- Webhook (Load Conf): `backend/app/Http/Controllers/Api/WebhookController.php`

### Documentation
- Full Features: `DASHBOARD_FEATURES.md`
- This Guide: `QUICK_REFERENCE.md`

---

**Quick Tip**: Bookmark this page for fast reference!
