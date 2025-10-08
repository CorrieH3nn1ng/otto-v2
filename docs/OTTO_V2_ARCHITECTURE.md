# OTTO V2 - Complete System Architecture

## Vision
Invoice-centric freight forwarding system for international shipments with customs clearance.

---

## Core Business Flow

```
1. INVOICE RECEIVED (via email/manual upload)
   └─> Document Classification (Invoice, Delivery Note, Packing List)
   └─> Data Extraction (Claude Vision AI)
   └─> Invoice Record Created

2. DOCUMENT VALIDATION
   └─> QC Certificate validation rules
   └─> BV Certificate validation rules
   └─> Completeness check

3. LOAD CONFIRMATION REQUEST
   └─> Create transportation request
   └─> Assign transporter
   └─> Schedule pickup

4. MANIFEST CREATION
   └─> Group invoices for export
   └─> Compile required documents
   └─> Export documentation finalization

5. FERI APPLICATION
   └─> Border clearance application
   └─> Certificate of Destination

6. TRACK & DELIVER
   └─> Track shipment progress
   └─> Delivery confirmation
   └─> Archive completed shipment
```

---

## Technology Stack

### Backend
- **Framework:** Laravel 10+
- **Database:** MySQL 8.0
- **API:** RESTful JSON API
- **Queue:** Redis for background jobs
- **Storage:** Local filesystem / S3 for documents

### Frontend
- **Framework:** React 18+
- **State Management:** Redux Toolkit / Zustand
- **UI Library:** Material-UI / Ant Design / Tailwind CSS
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **Forms:** React Hook Form + Yup validation

### Automation
- **n8n:** Email intake, Claude Vision integration
- **Webhooks:** Backend ↔ n8n communication

### AI/ML
- **Claude Sonnet 4:** Document classification and extraction
- **Anthropic Vision API:** PDF/Image document processing

---

## Database Schema (Invoice-Centric)

### Primary Tables

```sql
invoices (PRIMARY ENTITY)
├── id
├── invoice_number (UNIQUE, INDEXED)
├── invoice_date
├── supplier_id (FK)
├── customer_id (FK)
├── total_amount
├── currency
├── purchase_order
├── status (pending, validated, in_transit, delivered)
├── qc_status (not_required, pending, approved, rejected)
├── bv_status (not_required, pending, approved, rejected)
└── timestamps

documents (LINKED TO INVOICES)
├── id
├── invoice_id (FK, NULLABLE for orphaned docs)
├── document_type (invoice, delivery_note, packing_list, qc_cert, bv_cert, other)
├── document_subtype (commercial_invoice, proforma, etc)
├── original_filename
├── file_path
├── file_size_bytes
├── extracted_data (JSON)
├── classification_confidence (0.0-1.0)
├── uploaded_by
└── timestamps

load_confirmations (TRANSPORTATION)
├── id
├── reference_number
├── transporter_id (FK)
├── pickup_date
├── delivery_date
├── vehicle_type
├── driver_name
├── status
└── timestamps

invoice_load_confirmations (MANY-TO-MANY)
├── invoice_id (FK)
├── load_confirmation_id (FK)
└── added_at

manifests (EXPORT DOCUMENTATION)
├── id
├── manifest_number
├── load_confirmation_id (FK, NULLABLE)
├── export_date
├── customs_status
├── feri_application_date
├── certificate_of_destination_date
└── timestamps

invoice_manifests (MANY-TO-MANY)
├── invoice_id (FK)
├── manifest_id (FK)
└── added_at

shipments (TRACKING - SECONDARY)
├── id
├── manifest_id (FK)
├── current_location
├── status
├── estimated_delivery
└── timestamps
```

### Supporting Tables

```sql
suppliers
├── id
├── name
├── code
├── address
├── vat_number
├── country
└── timestamps

customers
├── id
├── name
├── code
├── delivery_address
├── billing_address
├── country
└── timestamps

transporters
├── id
├── name
├── contact_person
├── phone
├── vehicle_types
└── timestamps

validation_rules (QC/BV RULES)
├── id
├── customer_id (FK)
├── rule_type (qc_required, bv_required, msds_required)
├── conditions (JSON: {hs_code: "8421.21", min_value: 10000})
├── is_active
└── timestamps
```

---

## Backend Structure (Laravel)

```
app/
├── Models/
│   ├── Invoice.php              ★ PRIMARY
│   ├── Document.php
│   ├── LoadConfirmation.php
│   ├── Manifest.php
│   ├── Shipment.php
│   ├── Supplier.php
│   ├── Customer.php
│   ├── Transporter.php
│   └── ValidationRule.php
│
├── Services/
│   ├── DocumentClassificationService.php    # Classify doc type
│   ├── InvoiceExtractionService.php         # Extract invoice data
│   ├── DeliveryNoteExtractionService.php
│   ├── PackingListExtractionService.php
│   ├── ValidationService.php                # QC/BV rules engine
│   ├── ManifestService.php
│   └── ClaudeVisionService.php              # Claude API wrapper
│
├── Http/
│   ├── Controllers/
│   │   ├── InvoiceController.php
│   │   ├── DocumentController.php
│   │   ├── LoadConfirmationController.php
│   │   ├── ManifestController.php
│   │   ├── ValidationController.php
│   │   └── WebhookController.php            # n8n → Laravel
│   │
│   └── Requests/
│       ├── CreateInvoiceRequest.php
│       └── UploadDocumentRequest.php
│
├── Jobs/
│   ├── ClassifyDocument.php                 # Background job
│   ├── ExtractInvoiceData.php
│   └── ValidateInvoiceDocuments.php
│
└── Repositories/
    ├── InvoiceRepository.php
    └── DocumentRepository.php
```

---

## Frontend Structure (React)

```
src/
├── pages/
│   ├── Invoices/
│   │   ├── InvoiceList.jsx              ★ MAIN VIEW
│   │   ├── InvoiceDetail.jsx
│   │   ├── InvoiceCreate.jsx
│   │   └── InvoiceUpload.jsx
│   │
│   ├── LoadConfirmations/
│   │   ├── LoadConfirmationList.jsx
│   │   ├── LoadConfirmationDetail.jsx
│   │   └── CreateLoadConfirmation.jsx
│   │
│   ├── Manifests/
│   │   ├── ManifestList.jsx
│   │   ├── ManifestDetail.jsx
│   │   └── CreateManifest.jsx
│   │
│   └── Dashboard/
│       └── Dashboard.jsx                # Overview metrics
│
├── components/
│   ├── common/
│   │   ├── DataTable.jsx
│   │   ├── FileUpload.jsx
│   │   ├── StatusBadge.jsx
│   │   └── LoadingSpinner.jsx
│   │
│   ├── invoice/
│   │   ├── InvoiceCard.jsx
│   │   ├── DocumentViewer.jsx
│   │   ├── ValidationStatus.jsx
│   │   └── QCBVIndicator.jsx
│   │
│   └── manifest/
│       ├── ManifestCard.jsx
│       └── RequiredDocsList.jsx
│
├── services/
│   ├── api.js                           # Axios instance
│   ├── invoiceService.js
│   ├── documentService.js
│   ├── manifestService.js
│   └── authService.js
│
├── store/                               # Redux/Zustand
│   ├── slices/
│   │   ├── invoiceSlice.js
│   │   ├── manifestSlice.js
│   │   └── uiSlice.js
│   └── store.js
│
├── hooks/
│   ├── useInvoices.js
│   ├── useDocuments.js
│   └── useManifests.js
│
├── utils/
│   ├── formatters.js
│   ├── validators.js
│   └── constants.js
│
└── App.jsx
```

---

## n8n Workflows (Simplified)

### 1. Email Intake Workflow
```
Email Trigger
    ↓
Extract Attachments (PDFs only)
    ↓
For each PDF:
    ↓
Call Laravel API: POST /api/documents/classify-and-extract
    ↓
Laravel returns: {invoice_id, document_type, extracted_data}
    ↓
End
```

### 2. Manual Upload Workflow
```
Webhook Trigger
    ↓
Receive: {pdf_base64, manifest_id}
    ↓
Call Laravel API: POST /api/documents/upload
    ↓
Laravel handles everything
    ↓
Return: {success, invoice_ids: [...]}
```

**Key change:** Move ALL logic to Laravel. n8n just triggers Laravel endpoints.

---

## API Endpoints (Laravel Routes)

### Invoices (Primary)
```
GET    /api/invoices                      # List all
POST   /api/invoices                      # Create manually
GET    /api/invoices/{id}                 # Get details
PUT    /api/invoices/{id}                 # Update
DELETE /api/invoices/{id}                 # Soft delete
GET    /api/invoices/{id}/documents       # Get invoice docs
POST   /api/invoices/{id}/validate        # Run QC/BV validation
```

### Documents
```
POST   /api/documents/upload              # Upload & classify & extract
POST   /api/documents/classify-and-extract # n8n endpoint
GET    /api/documents/{id}                # Get document
DELETE /api/documents/{id}                # Delete
GET    /api/documents/{id}/download       # Download file
```

### Load Confirmations
```
GET    /api/load-confirmations
POST   /api/load-confirmations            # Create new
POST   /api/load-confirmations/{id}/add-invoice/{invoice_id}
```

### Manifests
```
GET    /api/manifests
POST   /api/manifests                     # Create new
POST   /api/manifests/{id}/add-invoice/{invoice_id}
GET    /api/manifests/{id}/required-docs  # Check completion
POST   /api/manifests/{id}/finalize       # Mark ready for FERI
```

### Validation Rules
```
GET    /api/validation-rules
POST   /api/validation-rules              # Create rule
PUT    /api/validation-rules/{id}
```

---

## Document Classification Logic

### Step 1: Classify Document Type
**Prompt to Claude:**
```
Analyze this document and classify it as ONE of:
- commercial_invoice
- proforma_invoice
- delivery_note
- packing_list
- qc_certificate
- bv_certificate
- msds
- other

Return JSON: {
  "document_type": "commercial_invoice",
  "confidence": 0.95,
  "indicators": ["invoice number present", "payment terms", "total amount"]
}
```

### Step 2: Extract Based on Type

**If Invoice:**
```
Extract: invoice_number, date, supplier, customer,
         line_items, total, currency, incoterms
```

**If Delivery Note:**
```
Extract: delivery_note_number, date, supplier,
         items_delivered, recipient, vehicle_info
```

**If Packing List:**
```
Extract: packing_list_number, date,
         packages[], dimensions[], weights[],
         shipper, consignee
```

---

## QC/BV Validation Rules Engine

### Rule Examples

```php
// Rule 1: QC required for specific HS codes
[
    'customer_id' => 1, // KAMOA
    'rule_type' => 'qc_required',
    'conditions' => [
        'hs_code' => ['8421.21', '8421.23'], // Filtration equipment
    ]
]

// Rule 2: BV required for high-value shipments
[
    'customer_id' => 1,
    'rule_type' => 'bv_required',
    'conditions' => [
        'min_total_value' => 50000,
        'currency' => 'USD'
    ]
]

// Rule 3: MSDS required for hazardous materials
[
    'customer_id' => 1,
    'rule_type' => 'msds_required',
    'conditions' => [
        'hs_code_prefix' => '29', // Chapter 29: Organic chemicals
    ]
]
```

### Validation Flow
```php
// In InvoiceController@show or @validate

$invoice = Invoice::with('documents')->find($id);
$rules = ValidationRule::where('customer_id', $invoice->customer_id)
                       ->where('is_active', true)
                       ->get();

foreach ($rules as $rule) {
    if (ruleApplies($invoice, $rule)) {
        $hasRequiredDoc = $invoice->documents()
            ->where('document_type', $rule->rule_type)
            ->exists();

        if (!$hasRequiredDoc) {
            $invoice->addValidationIssue($rule->rule_type . ' missing');
        }
    }
}
```

---

## Migration Plan

### Phase 1: Setup (Week 1)
- [ ] Install Laravel in `otto-v2/backend`
- [ ] Install React in `otto-v2/frontend`
- [ ] Create database schema
- [ ] Set up git repository structure

### Phase 2: Core Backend (Week 2)
- [ ] Create Models (Invoice, Document, etc.)
- [ ] Create Services (Classification, Extraction)
- [ ] Build API Controllers
- [ ] Write validation rules engine

### Phase 3: Core Frontend (Week 3)
- [ ] Invoice List view
- [ ] Invoice Detail view
- [ ] Document upload component
- [ ] Validation status indicators

### Phase 4: Integration (Week 4)
- [ ] Connect n8n → Laravel
- [ ] Test email intake flow
- [ ] Test manual upload flow
- [ ] Migrate existing data

### Phase 5: Advanced Features (Week 5+)
- [ ] Load Confirmation management
- [ ] Manifest creation
- [ ] FERI application tracking
- [ ] Reporting dashboard

---

## File Organization

```
C:/projects/otto-v2/
├── backend/              # Laravel
├── frontend/             # React
├── n8n-workflows/        # Export from n8n
├── docs/
│   ├── architecture.md
│   ├── api-docs.md
│   └── deployment.md
└── legacy/               # Move old files here
    └── otto-old/
```

---

## Benefits of This Architecture

✅ **Invoice-Centric:** Clear primary entity, everything flows from invoices
✅ **Clean Separation:** Backend API ↔ Frontend SPA ↔ n8n automation
✅ **Maintainable:** Organized code, clear responsibilities
✅ **Scalable:** Can add features without breaking existing functionality
✅ **Testable:** Services can be unit tested independently
✅ **Document Intelligence:** Proper classification before extraction
✅ **Validation Engine:** Flexible QC/BV rules per customer
✅ **Modern Stack:** Laravel + React + n8n + Claude AI

---

## Next Steps

1. Create project directory structure
2. Initialize Laravel project
3. Initialize React project
4. Create database schema SQL
5. Start with Invoice model + API
6. Build Invoice List frontend
7. Connect n8n to new endpoints
8. Migrate data

**Ready to start?**
