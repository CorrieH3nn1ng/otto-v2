# Manifest Process - Current State Audit

**Date:** October 16, 2025
**Status:** Partial Implementation

---

## Executive Summary

The manifest system has **backend infrastructure** in place but **needs frontend UI** and **PDF generation** to be fully functional.

**Status:**
- ✅ Database schema complete
- ✅ Backend API endpoints complete
- ✅ Frontend list view exists
- ❌ Frontend creation form missing
- ❌ PDF generation missing
- ❌ Integration with load confirmations incomplete

---

## What is a Manifest?

A manifest is a **customs document** that:
- Lists all goods being transported across a border
- Required for FERI (Foreign Exchange Risk Insurance) application
- Contains invoice line items, weights, values, and customs codes
- Must be submitted before goods can cross the border

**Business Purpose:**
- Legal requirement for cross-border shipments (SA → Zambia/DRC)
- Needed to apply for FERI certificate
- Customs clearance document
- Proof of goods in transit

---

## Current Implementation Status

### ✅ What EXISTS

#### 1. Database Schema
**Table: `manifests`**
```sql
- id
- manifest_number (unique)
- load_confirmation_id (links to transport)
- export_date
- customs_status (pending/in_progress/cleared/rejected)
- feri_application_date
- certificate_of_destination_date
- status (draft/pending_feri/feri_approved/in_transit/delivered/completed)
- timestamps
```

**Pivot Table: `invoice_manifest`**
```sql
- Links manifests to multiple invoices (consolidation support)
- Timestamps when invoices added
```

#### 2. Backend API Routes
```
GET    /api/manifests             - List all manifests
POST   /api/manifests             - Create new manifest
GET    /api/manifests/{id}        - View single manifest
PUT    /api/manifests/{id}        - Update manifest
DELETE /api/manifests/{id}        - Delete manifest

POST   /api/manifests/{id}/submit-feri      - Submit to FERI
POST   /api/manifests/{id}/approve-feri     - FERI approval
POST   /api/manifests/{id}/mark-delivered   - Mark completed
POST   /api/manifests/{id}/attach-invoices  - Add more invoices
POST   /api/manifests/{id}/detach-invoices  - Remove invoices
```

#### 3. Backend Controller Features
**File:** `ManifestController.php`

**Features implemented:**
- ✅ List all manifests with relationships
- ✅ Create manifest from load confirmation + invoices
- ✅ Update manifest details
- ✅ Delete manifest (reverts invoice workflow)
- ✅ Submit for FERI processing
- ✅ Approve FERI (updates all linked invoices)
- ✅ Mark as delivered (completes workflow)
- ✅ Attach/detach invoices (consolidation)

**Workflow Management:**
- Auto-updates invoice `current_stage` and `current_owner`
- Reverts invoice state when manifest deleted
- Supports multiple invoices per manifest (groupage)

#### 4. Frontend Components

**File:** `ManifestList.jsx` (310 lines)
- Lists all manifests in table format
- Shows manifest number, invoices count, FERI status
- Action menu for submit FERI, approve FERI, mark delivered
- Status badges and chips
- Pagination support

**File:** `manifestService.js`
- API client for all manifest endpoints
- Methods for CRUD operations
- FERI workflow methods

### ❌ What is MISSING

#### 1. Manifest Creation Form
**Missing:** `ManifestForm.jsx` component

**Needs:**
- Form to create new manifest
- Select load confirmation (dropdown)
- Auto-populate from load confirmation:
  - Transporter details
  - Collection/delivery addresses
  - Vehicle information
- Select invoices to include (multi-select)
- Enter manifest number (auto-generate or manual)
- Set export date
- Set border post/port of entry
- Submit button

#### 2. Manifest Detail View
**Missing:** `ManifestDetailView.jsx` component

**Needs:**
- View manifest header (number, date, status)
- Show linked load confirmation details
- List all invoices in manifest
- Show all line items from invoices (consolidated view)
- Display total weight, value, packages
- Show workflow progress
- Action buttons (submit FERI, approve, etc.)

#### 3. PDF Generation
**Missing:** PDF templates and generation logic

**Required PDF Sections:**
1. **Header:**
   - Manifest number
   - Export date
   - Border post
   - Transporter details

2. **Consignment Details:**
   - Exporter (supplier)
   - Consignee (customer)
   - Collection address
   - Delivery address

3. **Line Items Table:**
   - Description
   - HS Code
   - Quantity
   - Unit value
   - Total value
   - Country of origin
   - Weight

4. **Totals:**
   - Total packages
   - Total gross weight
   - Total value
   - Currency

5. **Signatures:**
   - Transporter signature
   - Customs signature (when cleared)

#### 4. Integration Points
**Missing:**
- Link from load confirmation to "Create Manifest"
- Show manifest status in invoice detail view
- Display manifest number in load confirmation
- Auto-create manifest when load confirmation finalized

---

## Business Process Flow

### Step 1: Load Confirmation Created
- Transport Planner creates load confirmation
- Assigns transporter, vehicle, driver
- Links to one or more invoices
- Status: Confirmed

### Step 2: Manifest Creation
**Trigger:** Load confirmation confirmed
**Who:** Key Account Manager or Transport Planner
**Action:**
1. Click "Create Manifest" from load confirmation
2. System auto-fills manifest details
3. User reviews and confirms
4. Manifest created with status: draft

### Step 3: Document Requirement Check
**Before manifest finalized:**
- ✅ Invoice(s) uploaded
- ✅ Packing list(s) uploaded
- ✅ BV Report (if value > $2,500)
- ✅ SAD 500 uploaded
- ⚠️ Manifest PDF generated

### Step 4: Submit to FERI
**Who:** Key Account Manager
**Action:**
1. Click "Submit FERI" on manifest
2. System sets feri_application_date
3. Invoice workflow → "feri_pending"
4. Current owner → FERI Department

### Step 5: FERI Processing
**Who:** FERI Department
**Action:**
1. Review manifest and documents
2. Apply for Certificate of Destination
3. Receive certificate from authorities
4. Upload certificate to system
5. Click "Approve FERI"
6. System sets certificate_of_destination_date
7. Invoice workflow → "in_transit"
8. Manifest status → "feri_approved"

### Step 6: Delivery
**Who:** Transport Planner
**Action:**
1. Driver delivers goods
2. Click "Mark Delivered" on manifest
3. Invoice workflow → "delivered"
4. Invoice status → "completed"
5. Manifest status → "delivered"

---

## Required Implementations

### Priority 1: Manifest Creation Form

**Component:** `ManifestForm.jsx`

**Features Needed:**
1. Form fields:
   - Manifest number (auto-generate: MAN-YYYYMMDD-001)
   - Load confirmation (dropdown, required)
   - Export date (datepicker, required)
   - Border post (text input)
   - Customs office (text input)

2. Auto-population:
   - When load confirmation selected:
     - Get transporter name
     - Get vehicle type
     - Get collection/delivery addresses
     - Get linked invoice(s)

3. Invoice selection:
   - Multi-select checkbox list
   - Show invoice number, customer, value
   - Pre-select invoices from load confirmation
   - Allow adding additional invoices (consolidation)

4. Summary panel:
   - Total invoices
   - Total packages
   - Total weight
   - Total value
   - Currency

5. Validation:
   - Check all required documents present
   - Warn if FERI documents missing
   - Block if critical docs missing

6. Submit:
   - Create manifest record
   - Link to load confirmation
   - Attach selected invoices
   - Update invoice workflows
   - Generate manifest PDF
   - Show success message

### Priority 2: Manifest PDF Generation

**Backend:** Laravel PDF generation (using `barryvdh/laravel-dompdf` or similar)

**Endpoint:** `GET /api/manifests/{id}/pdf`

**Template:** Blade template for manifest

**Sections:**
1. Header with logo and title
2. Manifest number and date
3. Transporter details
4. Route information
5. Line items table (from all invoices)
6. Totals section
7. Signature blocks

**Storage:**
- Generate PDF on first request
- Store in `storage/app/manifests/`
- Link to manifest record
- Regenerate if manifest updated

### Priority 3: Manifest Detail View

**Component:** `ManifestDetailView.jsx`

**Tabs:**
1. **Overview Tab:**
   - Manifest header info
   - Status indicators
   - Load confirmation summary
   - Transporter details

2. **Invoices Tab:**
   - List of all invoices in manifest
   - Click to view invoice details
   - Remove invoice button (if draft)

3. **Line Items Tab:**
   - Consolidated line items from all invoices
   - HS codes, quantities, values
   - Total calculations

4. **Documents Tab:**
   - All documents from all invoices
   - Document checklist for FERI
   - Upload additional documents

5. **Workflow Tab:**
   - Current status
   - FERI application status
   - Certificate of destination
   - Activity log

**Actions:**
- Edit (if draft)
- Submit FERI (if ready)
- Approve FERI (FERI dept only)
- Mark Delivered (transport planner)
- Print PDF
- Email PDF

### Priority 4: Integration Improvements

**1. Load Confirmation → Manifest Link**
```jsx
// In LoadConfirmationDetailView.jsx
<Button
  variant="contained"
  onClick={createManifest}
  disabled={!canCreateManifest()}
>
  Create Manifest
</Button>
```

**2. Invoice Detail → Show Manifest**
```jsx
// In InvoiceDetailView.jsx
{invoice.manifest && (
  <Chip
    label={`Manifest: ${invoice.manifest.manifest_number}`}
    onClick={() => viewManifest(invoice.manifest.id)}
  />
)}
```

**3. Dashboard Widget**
```jsx
// In Dashboard.jsx
<StatCard
  title="Manifests Pending FERI"
  count={pendingFeriCount}
  icon={<AssignmentIcon />}
/>
```

---

## Technical Requirements

### Frontend Dependencies
```bash
# Already have Material-UI, just need:
npm install react-hook-form  # Form management
npm install date-fns         # Date handling
```

### Backend Dependencies
```bash
# PDF generation
composer require barryvdh/laravel-dompdf

# Excel export (optional)
composer require maatwebsite/excel
```

### Database Migrations
All tables exist, no migrations needed! ✅

---

## Estimated Effort

### Phase 1: Basic Manifest Creation (8-12 hours)
- ✅ Backend API (already done)
- ⏳ Create ManifestForm component (4 hours)
- ⏳ Integration with LoadConfirmation (2 hours)
- ⏳ Testing and validation (2 hours)

### Phase 2: PDF Generation (6-8 hours)
- ⏳ Install PDF library (30 min)
- ⏳ Create Blade template (3 hours)
- ⏳ PDF generation endpoint (2 hours)
- ⏳ Testing with real data (2 hours)

### Phase 3: Manifest Detail View (8-10 hours)
- ⏳ Create ManifestDetailView component (4 hours)
- ⏳ Build all tabs (3 hours)
- ⏳ Action buttons and workflows (2 hours)
- ⏳ Testing (2 hours)

### Phase 4: Polish & Integration (4-6 hours)
- ⏳ Dashboard widgets (2 hours)
- ⏳ Invoice detail integration (1 hour)
- ⏳ Email manifest PDF (2 hours)
- ⏳ Final testing (2 hours)

**Total:** 26-36 hours (3-5 working days)

---

## Recommendations

### Start With:
1. **Manifest Creation Form** - Most critical, blocks entire workflow
2. **PDF Generation** - Required for FERI application
3. **Manifest Detail View** - Needed for workflow management

### Can Wait:
- Excel export
- Advanced reporting
- Email automation
- Batch operations

### Quick Wins:
- Use existing LoadConfirmationForm as template
- Reuse PDF generation patterns from load confirmation
- Leverage existing ManifestList component

---

## Next Steps

**Immediate (Today):**
1. Create ManifestForm.jsx component
2. Add "Create Manifest" button to load confirmation detail view
3. Test manifest creation flow

**Short-term (This Week):**
4. Implement PDF generation
5. Create ManifestDetailView component
6. Add workflow actions (submit FERI, approve, etc.)

**Medium-term (Next Week):**
7. Dashboard integration
8. Email functionality
9. Comprehensive testing
10. User training

---

**Prepared by:** Claude Code
**Date:** October 16, 2025
**Project:** OTTO V2 - Manifest Process Implementation
