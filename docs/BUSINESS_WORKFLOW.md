# OTTO V2 - Business Workflow

## Complete Process Flow

Based on the workflow diagram provided by the client.

---

## Primary Flow

### 1. Document Intake
```
Client sends e-mail to Nucleus
    OR
Nucleus user uploads invoices/documents to system
    ↓
Invoices and delivery notes and Packing List are extracted
```

### 2. Invoice Generation & Line Items
```
System generate invoices
    ↓
Generate invoice line items
    ↓
Generate packing list line items
```

### 3. Invoice Editing & Data Quality
```
User edit or add more data to invoice
(e.g., adding, approving, uploading extra documents)
```

### 4. Load Confirmation (Transportation Arrangement)
```
User create a load confirmation
    ↓
User request for transportation
    ↓
User add invoices to load confirmation
    ↓
Other user confirm transportation
```

### 5. Additional Documents
```
User add other required documents
(national or regional one on invoice level and load-confirmation level)
```

### 6. Manifest Creation (Export Documentation)
```
User generate Manifest from LoadConfirmation
    ↓
User submit FERI application to FERI
    ↓
FERI Department uploads FERI Certificate
```

### 7. Dispatch & Delivery
```
manifest done and depart at all necessary borders
    ↓
Manifest is delivered at client
    ↓
POD is uploaded by on site staff or Finance department
```

---

## Key System Features Required

### Document Management
- Email intake automation
- Manual upload capability
- Document classification (Invoice, Delivery Note, Packing List)
- AI-powered data extraction
- Document linking to invoices and load confirmations

### Invoice Management
- Auto-generation from extracted data
- Line item management (invoice + packing list)
- Editing and approval workflow
- Additional document attachment

### Load Confirmation (Transportation)
- Create load confirmation
- Request transportation
- Link multiple invoices to one load
- Transportation confirmation workflow

### Manifest Management
- Generate manifest from load confirmation
- Link to multiple load confirmations
- Track document completeness
- FERI application submission
- Certificate upload capability

### Delivery Tracking
- Border crossing tracking
- Client delivery confirmation
- POD (Proof of Delivery) upload
- Final archive

---

## User Roles & Permissions

### Standard User
- Upload documents
- Edit invoice data
- Create load confirmations
- Request transportation
- View manifests

### Transportation Coordinator
- Confirm transportation requests
- Assign transporters
- Update delivery status

### FERI/Customs User
- Submit FERI applications
- Upload certificates
- Update customs clearance status

### Finance/Admin
- Upload POD documents
- Mark deliveries complete
- Generate reports
- Archive completed shipments

---

## Document Requirements by Stage

### Invoice Stage
**Required:**
- Commercial Invoice (auto-extracted)
- Delivery Note (auto-extracted)
- Packing List (auto-extracted)

**Optional (based on QC/BV rules):**
- QC Certificate
- BV Certificate
- MSDS (Material Safety Data Sheet)

### Load Confirmation Stage
**Required:**
- All invoice documents complete
- Transportation details confirmed

**Optional:**
- Special handling instructions
- Transport insurance documents

### Manifest Stage
**Required:**
- All load confirmation documents
- FERI application
- Certificate of Destination (after FERI approval)

**Optional:**
- Border-specific documents
- Customer-specific requirements

---

## Status Tracking

### Invoice Status
- `draft` - Auto-generated, needs review
- `pending_approval` - User edited, awaiting approval
- `approved` - Ready for load confirmation
- `in_transit` - Part of active shipment
- `delivered` - Delivered to client
- `archived` - POD uploaded, completed

### Load Confirmation Status
- `draft` - Being created
- `pending_transport` - Awaiting transporter confirmation
- `transport_confirmed` - Transporter assigned
- `ready_for_manifest` - All docs complete
- `in_manifest` - Added to manifest

### Manifest Status
- `draft` - Being created
- `pending_feri` - FERI application submitted
- `feri_approved` - Certificate received
- `in_transit` - Crossing borders
- `delivered` - At client location
- `completed` - POD uploaded

---

## Integration Points

### Email System → OTTO
- Auto-extract attachments
- Classify documents
- Create invoice records

### OTTO → Transportation System
- Send transportation requests
- Receive confirmations
- Track vehicle location (future)

### OTTO → FERI System
- Submit applications
- Receive certificate updates
- Track clearance status

### OTTO → Client Portal (future)
- Real-time tracking
- Document access
- POD confirmation

---

## Notifications & Alerts

### Email Notifications
- Invoice auto-generated (needs review)
- Transportation confirmed
- FERI certificate uploaded
- Manifest delivered
- POD required

### Dashboard Alerts
- Incomplete documents
- QC/BV validation failures
- Pending approvals
- Overdue FERI applications
- Missing PODs

---

## Reporting Requirements

### Operational Reports
- Active invoices by status
- Load confirmations pending transport
- Manifests in transit
- Overdue deliveries

### Financial Reports
- Invoice value by period
- Outstanding deliveries by customer
- Transportation costs
- FERI application costs

### Compliance Reports
- QC/BV compliance by supplier
- Document completeness by customer
- Border clearance times
- Delivery performance metrics

---

## Next Steps for Implementation

1. ✅ Design architecture (COMPLETED)
2. ⏳ Initialize Laravel backend
3. ⏳ Create database schema matching workflow
4. ⏳ Build Invoice models and API
5. ⏳ Create React frontend for invoice management
6. ⏳ Integrate document classification
7. ⏳ Build load confirmation module
8. ⏳ Build manifest module
9. ⏳ Add FERI integration
10. ⏳ Add POD tracking

---

## This workflow diagram will guide:
- Database table relationships
- UI/UX design decisions
- API endpoint structure
- Status transition logic
- User permission requirements
- Validation rules at each stage
