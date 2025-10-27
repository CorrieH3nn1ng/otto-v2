# Session Handoff Document - October 23, 2025
## Invoice Upload Workflow - n8n Integration

---

## 🎯 Session Summary

**Primary Goal:** Fix and enhance the n8n Commercial Invoice Upload workflow to work with the new duplicate invoice handling system.

**Status:** ⚠️ PARTIALLY COMPLETE - Workflow v5 created but not yet tested with production data.

---

## 🔴 CRITICAL ISSUES TO RESOLVE

### 1. **Workflow Not Triggering (HIGH PRIORITY)**
- **Problem:** v5 workflow imported but webhook not firing when invoices uploaded
- **Root Cause:** n8n creates NEW workflows on import instead of replacing existing ones
- **Solution Required:**
  1. Delete/deactivate old "OTTO Commercial Invoice Upload" workflows
  2. Re-import the updated v5 file: `C:\Users\corri\n8n-automation\OTTO_Commercial_Invoice_Upload_v5_Enhanced_PO_Extraction.json`
  3. Activate the new v5 workflow
  4. Test with invoice IN018161 from Altecrete

### 2. **PO Number Extraction Failing**
- **Problem:** Gemini AI extracting `"po_number": null` from invoices
- **Example:** Invoice IN018161 should have PO "01013-01-65140" but Gemini returns null
- **Impact:** Workflow fails because PO linking is required (business rule)
- **Fix Applied (NOT YET TESTED):** Enhanced Gemini prompt with explicit PO extraction instructions
- **File:** Lines 43-44 in `OTTO_Commercial_Invoice_Upload_v5_Enhanced_PO_Extraction.json`

---

## 📁 Key Files & Locations

### n8n Workflow Files
- **Latest Version:** `C:\Users\corri\n8n-automation\OTTO_Commercial_Invoice_Upload_v5_Enhanced_PO_Extraction.json`
- **Previous Versions:**
  - v4: `C:\Users\corri\n8n-automation\OTTO_Commercial_Invoice_Upload_v4_With_Weight_And_Vehicle.json`
  - v3: `C:\Users\corri\n8n-automation\OTTO_Commercial_Invoice_Upload_v3_With_Duplicate_Handling.json`

### Backend Files (Laravel)
- **Migration:** `C:\projects\otto-v2\backend\database\migrations\2025_10_23_183410_add_vehicle_registration_to_invoices_table.php`
  - Added `vehicle_registration` field (nullable, VARCHAR 50)
  - Status: ✅ MIGRATED

- **Model:** `C:\projects\otto-v2\backend\app\Models\Invoice.php`
  - Updated $fillable array to include 'vehicle_registration'

- **Controller:** `C:\projects\otto-v2\backend\app\Http\Controllers\Api\InvoiceController.php`
  - Added validation for vehicle_registration, delivery_address, supplier_address, supplier_contact

### SQL Queries
- **Upload Summary:** `C:\Users\corri\n8n-automation\check_upload_summary.sql`
  - Queries to monitor invoice uploads, versioning, and status

---

## 🗄️ Current Database State

### Invoices Table
```
ID 35: PO 01013-01-65140 (VIBRAMECH) - Purchase Order - draft
ID 37: Invoice IN018159 (Altecrete) - Commercial Invoice - draft - Links to PO 35
```

### Important Schema Details
- **Unique Constraint:** `unique_supplier_invoice` on (supplier_id, active_invoice_number)
- **Partial Unique Index:** On active_invoice_number WHERE is_superseded = 0
- **Required Fields for Commercial Invoices:**
  - supplier_id
  - customer_id
  - invoice_number
  - invoice_type = 'commercial_invoice'
  - parent_invoice_id (links to Purchase Order) - **CRITICAL: This is required per business rules**

### Database Credentials
- Host: 127.0.0.1
- User: ottouser
- Password: otto2025
- Database: otto_v2

---

## 🔧 What Changed in v5 Workflow

### 1. Enhanced Gemini Prompt (Analyze Document Node)
**OLD PROMPT (v4):**
```
"po_number": "Referenced PO number (if any)"
```

**NEW PROMPT (v5):**
```
- po_number: Search ANYWHERE in the document for Purchase Order number.
  Look for labels like "PO Number", "Purchase Order", "Order Number", "P.O.",
  "PO#", "Order No", "Cust Order", "Customer Order", or similar.
  The format is typically {5 digits}-{2 digits}-{5 digits} (e.g. "01013-01-65140").
  May also appear as a simple reference number near the invoice details.
  This field is CRITICAL - search thoroughly throughout the entire document.
```

### 2. Fixed Build Invoice Node (Lines 181-183)
**Changed from:**
```javascript
const invoice = $node['Parse Response'].json;
const customer = $node['Create Customer If Missing'].json;
const supplier = $node['Create Or Update Supplier'].json;
const parentPO = $node['Find Parent PO'].json;
```

**Changed to:**
```javascript
const invoice = $node['Parse Response'].first().json;
const customer = $node['Create Customer If Missing'].first().json;
const supplier = $node['Create Or Update Supplier'].first().json;
const parentPO = $node['Find Parent PO'].first()?.json;  // Optional chaining
```

**Why:** n8n requires `.first()` to access single item results. Optional chaining (`?.`) prevents errors when PO query returns empty results.

### 3. Updated Success Response (Lines 343)
- Added `po_number` field to response for debugging
- Fixed `po_id` to use `.first()?.json.id`

### 4. Webhook Configuration
- **Path:** `commercial-invoice-upload` (standard path, not versioned)
- **Webhook ID:** `commercial-invoice-upload`
- **Method:** POST

---

## 🏗️ System Architecture Context

### Duplicate Invoice Handling Flow
1. **Draft Invoice + Same Invoice Number → UPDATE**
   - Existing status: draft
   - Action: Update existing record

2. **Approved Invoice + Same Invoice Number → VERSION**
   - Existing status: approved/other
   - Action:
     - Mark old invoice as superseded
     - Create new invoice as draft
     - Link via superseded_by_invoice_id

3. **No Existing Invoice → CREATE**
   - Action: Create new invoice record

### Invoice Upload Workflow
1. **Webhook receives PDF** (base64 encoded)
2. **Extract File node** - Prepares binary data for Gemini
3. **Analyze Document (Gemini)** - Extracts invoice data using AI
   - Now includes enhanced PO extraction
4. **Parse Response** - Cleans Gemini JSON response
5. **Find/Create Customer** - MySQL query + insert if needed
6. **Find/Create Supplier** - MySQL query + upsert
7. **Find Parent PO** - MySQL query for Purchase Order
8. **Build Invoice** - Constructs invoice payload
9. **Create/Update Invoice via API** - POST to Laravel `/api/invoices`
10. **Extract Invoice Result** - Parses Laravel response
11. **Prepare Line Items** - Builds line item insert queries
12. **Insert Line Items** - MySQL bulk insert
13. **Success Response** - Returns result to caller

---

## 🐛 Known Issues & Debugging

### Issue 1: Workflow Says "Success" But No Invoice Created
**Symptoms:**
- n8n shows workflow completed successfully
- Database has no new invoices
- Laravel logs show no POST to `/api/invoices`

**Likely Causes:**
1. Wrong workflow is active (old version)
2. Multiple workflows with same webhook path
3. Workflow stopped at earlier node without error

**Debug Steps:**
1. Check n8n execution details - which nodes ran?
2. Check "Create or Update Invoice via API" node output
3. Verify webhook path matches caller's configuration
4. Check Laravel logs for API calls: `php artisan serve` output

### Issue 2: PO Number Returns Null
**Symptoms:**
- Parse Response shows `"po_number": null`
- "Find Parent PO" returns no results
- Build Invoice node fails

**Debug Steps:**
1. Check the actual PDF - where is PO number located?
2. Check Gemini's raw response in Parse Response node
3. Verify PO exists in database with exact format
4. May need to further enhance Gemini prompt with PDF-specific patterns

---

## 📊 Monitoring & Verification

### Check Recent Uploads
```sql
SELECT i.id, i.invoice_number, s.name as supplier, i.status,
       i.is_superseded, i.created_at
FROM invoices i
JOIN suppliers s ON i.supplier_id = s.id
WHERE i.created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
ORDER BY i.created_at DESC;
```

### Check Invoice Counts by Supplier
```sql
SELECT s.name as supplier,
  COUNT(*) as total_invoices,
  SUM(CASE WHEN i.is_superseded = 0 THEN 1 ELSE 0 END) as active_invoices,
  SUM(CASE WHEN i.is_superseded = 1 THEN 1 ELSE 0 END) as superseded_invoices,
  GROUP_CONCAT(DISTINCT i.status) as statuses
FROM invoices i
JOIN suppliers s ON i.supplier_id = s.id
GROUP BY s.name
ORDER BY total_invoices DESC;
```

### Check Versioning Activity
```sql
SELECT i1.invoice_number, s.name as supplier,
  i1.id as old_id, i1.status as old_status,
  i2.id as new_id, i2.status as new_status,
  i1.superseded_at
FROM invoices i1
JOIN suppliers s ON i1.supplier_id = s.id
LEFT JOIN invoices i2 ON i1.superseded_by_invoice_id = i2.id
WHERE i1.is_superseded = 1
ORDER BY i1.superseded_at DESC;
```

---

## 🎬 Immediate Next Steps

### Step 1: Activate v5 Workflow
1. Open n8n interface
2. Deactivate/delete ALL old "OTTO Commercial Invoice Upload" workflows
3. Import: `C:\Users\corri\n8n-automation\OTTO_Commercial_Invoice_Upload_v5_Enhanced_PO_Extraction.json`
4. Activate the new workflow
5. Verify webhook URL is accessible

### Step 2: Test with Invoice IN018161
1. Upload invoice IN018161 (Altecrete supplier)
2. Expected PO: 01013-01-65140 (exists as ID 35 in database)
3. Monitor n8n execution in real-time
4. Check each node's output, especially:
   - Parse Response → verify po_number is extracted
   - Find Parent PO → should return ID 35
   - Create or Update Invoice via API → should POST to Laravel

### Step 3: If PO Still Returns Null
1. Examine the actual PDF for IN018161
2. Note exact location and label of PO number
3. Update Gemini prompt with more specific patterns
4. Consider adding example in prompt: "For example: 'Customer Order: 01013-01-65140'"

### Step 4: Batch Upload Remaining Invoices
1. Once single invoice works, proceed with batch
2. Use `check_upload_summary.sql` to monitor results
3. Review any failures or duplicates

---

## 📝 Important Business Rules

1. **PO Linking is MANDATORY** - Every commercial invoice MUST link to a Purchase Order
2. **Weight Extraction Pattern** - "Total Weight: {number} kg" (exact pattern required)
3. **Vehicle Registration** - Alphanumeric codes (e.g., XHD579GP), nullable, can appear anywhere
4. **Duplicate Handling** - Based on (supplier_id, invoice_number) and status
5. **Supplier Names** - Current active suppliers: VIBRAMECH, Altecrete, ALTECRETE (case variations exist)

---

## 🔗 Related Systems

### Laravel Backend
- Running on: http://127.0.0.1:8000
- API Endpoint: POST /api/invoices
- Background process: `cd "C:\projects\otto-v2\backend" && php artisan serve`

### Frontend
- Running on: http://localhost:5173 (or similar Vite dev server)
- Background process: `cd "C:\projects\otto-v2\frontend" && npm run dev`

### n8n
- Interface: (user knows the URL)
- Webhook base path: `/webhook/`
- Full webhook URL: `{n8n_base_url}/webhook/commercial-invoice-upload`

---

## 🧪 Test Data

### Successful Invoice (Reference)
**Invoice IN018159** - Successfully extracted in previous version:
```json
{
  "invoice_number": "IN018159",
  "invoice_date": "2025-10-22",
  "po_number": "01013-01-65140",  // ✅ This worked
  "supplier_name": "ALTECRETE",
  "total_amount": 319904.30,
  "currency": "ZAR"
}
```

### Failing Invoice (Current Issue)
**Invoice IN018161** - Returns null for PO:
```json
{
  "invoice_number": "IN018161",
  "po_number": null,  // ❌ This should be "01013-01-65140"
  ...
}
```

---

## 💡 Tips for Next Session

1. **Always check which workflow is active** - n8n can have multiple workflows with similar names
2. **Monitor Laravel logs in real-time** - Watch for POST /api/invoices calls
3. **Use n8n execution viewer** - Step through each node to see data flow
4. **Test Gemini prompt changes incrementally** - Don't change too much at once
5. **Keep test invoices for comparison** - Helps identify what changed between working and broken

---

## 📞 User Context

- **Working Directory:** `C:\Users\corri\n8n-automation` (for n8n files)
- **Project Directory:** `C:\projects\otto-v2`
- **User's Workflow:** Uploading batches of commercial invoices from Nucleus Mining
- **Current Blocker:** Cannot upload invoices until PO extraction works
- **User mentioned:** "I'm going to call it a day" - frustrated with workflow not triggering

---

## 🔍 Additional Investigation Needed

1. **PDF Structure Analysis** - Need to examine actual PDF of IN018161 to see PO number location
2. **Gemini Model Performance** - May need to test with different models or temperature settings
3. **Alternative PO Extraction** - Consider regex fallback if Gemini continues to fail
4. **Webhook Configuration** - Verify the system calling the webhook is using correct URL

---

## ✅ Completed in This Session

- ✅ Added vehicle_registration field to database
- ✅ Updated Invoice model and controller
- ✅ Created v3 workflow with Laravel API integration
- ✅ Created v4 workflow with weight/vehicle extraction
- ✅ Created v5 workflow with enhanced PO extraction and .first() fixes
- ✅ Fixed Build Invoice node to handle empty PO results
- ✅ Cleaned up test invoices from database
- ✅ Documented webhook path configuration
- ✅ Updated Success response to include debugging info

---

## ❌ Not Completed / Blocked

- ❌ v5 workflow not tested with real data
- ❌ PO extraction issue not verified as fixed
- ❌ No production invoices uploaded successfully
- ❌ Workflow activation/triggering issue not resolved

---

## 🎯 Success Criteria for Next Session

1. Upload invoice IN018161 successfully with correct PO linking
2. Verify Gemini extracts all required fields (invoice_number, po_number, weight, vehicle_registration)
3. Confirm duplicate handling works correctly
4. Process batch upload of remaining Nucleus Mining invoices
5. Monitor upload results with check_upload_summary.sql

---

**Document Created:** October 23, 2025, 21:27
**Session Duration:** ~3 hours
**Primary Issue:** n8n workflow integration with duplicate invoice handling
**Status:** Awaiting workflow activation and testing
