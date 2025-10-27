# OTTO v2 - Claude Code Documentation

**Last Updated:** 2025-10-27
**Project Location:** `C:\projects\otto-v2`

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Documentation Files](#documentation-files)
3. [Recent Updates](#recent-updates)
4. [Project Structure](#project-structure)
5. [Development Setup](#development-setup)
6. [Key Features](#key-features)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [PDF Generation](#pdf-generation)
10. [Troubleshooting](#troubleshooting)

---

## 📖 Project Overview

OTTO v2 is a comprehensive logistics management system built for Nucleus Mining Logistics. The system manages the complete lifecycle of freight operations including:

- Invoice processing and tracking
- Purchase order management
- Load confirmation handling
- Manifest creation and PDF generation
- Cross-border shipment tracking
- Document management and storage
- FERI (Foreign Exchange Risk Insurance) processing

**Tech Stack:**
- **Backend:** Laravel 10+ (PHP 8.4)
- **Frontend:** React 18 + Vite + Material-UI
- **Database:** MySQL 8.0
- **PDF Generation:** DomPDF + Simple QR Code
- **Package Management:** Composer, NPM

---

## 📚 Documentation Files

All documentation is located in the project root: `C:\projects\otto-v2`

### Core Documentation
- **[README.md](./README.md)** - Main project README
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick reference guide
- **[OTTO_V2_USER_GUIDE.md](./OTTO_V2_USER_GUIDE.md)** - Complete user guide
- **[USER_QUICK_GUIDE.md](./USER_QUICK_GUIDE.md)** - Quick start user guide

### Feature Documentation
- **[MANIFEST_PROCESS_AUDIT.md](./MANIFEST_PROCESS_AUDIT.md)** - Manifest process audit trail
- **[MANIFEST_SESSION_NOTES.md](./MANIFEST_SESSION_NOTES.md)** - Development session notes for manifests
- **[DASHBOARD_FEATURES.md](./DASHBOARD_FEATURES.md)** - Dashboard feature documentation
- **[WORKFLOW_DIAGRAM.md](./WORKFLOW_DIAGRAM.md)** - Workflow diagrams and processes

### Integration Documentation
- **[N8N_LOAD_CONFIRMATION_SETUP.md](./N8N_LOAD_CONFIRMATION_SETUP.md)** - n8n workflow setup for load confirmations
- **[HANDOFF_2025_10_23_Invoice_Upload_Workflow.md](./HANDOFF_2025_10_23_Invoice_Upload_Workflow.md)** - Invoice upload workflow handoff notes

---

## 🚀 Recent Updates

### Manifest PDF Generation Improvements (2025-10-27)

#### 1. Landscape Orientation
- Fixed PDF orientation to landscape (A4 landscape)
- Added `size: A4 landscape;` to `@page` CSS rule
- File: `backend/resources/views/pdf/manifest.blade.php:8`

#### 2. Footer Layout Redesign
- Changed footer from vertical stack to horizontal two-column layout
- Left box: Driver Instruction 1
- Right box: Driver Instruction 2 or DRC contact information
- Increased box sizing: padding `15px 20px`, font-size `10px`, min-height `50px`
- File: `backend/resources/views/pdf/manifest.blade.php:168-189, 342-352`

#### 3. Consistent Margins
Added 5px left/right margins to all sections:
- Header bar (Road freight manifest)
- Transport/Clearing table
- Shipment Details header
- Shipment Details table
- Footer container

#### 4. Right-Aligned Date and Page Number
- Wrapped date and page in flexbox container
- Ensures both elements stay grouped and right-aligned
- File: `backend/resources/views/pdf/manifest.blade.php:76-81, 219-222`

#### 5. Uppercase Text Transformation
- Added `text-transform: uppercase;` to body for professional, uniform appearance
- All text in manifest automatically converts to uppercase
- File: `backend/resources/views/pdf/manifest.blade.php:25`

#### 6. Logo Integration
- Added Nucleus Mining Logistics logo to PDF header
- Logo file: `backend/public/nucleusmlsmall_1.gif`
- Also added to frontend: `frontend/public/nucleusmlsmall_1.gif`
- File: `backend/resources/views/pdf/manifest.blade.php:206`

#### 7. QR Code Generation
- Implemented QR code generation using SimpleSoftwareIO/simple-qrcode
- Uses SVG format (no imagick extension required)
- QR code contains manifest number
- Right-aligned in header
- File: `backend/app/Http/Controllers/Api/ManifestController.php:307-309`

---

## 📁 Project Structure

```
C:\projects\otto-v2\
├── backend/                          # Laravel Backend
│   ├── app/
│   │   ├── Console/
│   │   │   └── Commands/             # Artisan commands
│   │   ├── Http/
│   │   │   └── Controllers/
│   │   │       └── Api/
│   │   │           ├── InvoiceController.php
│   │   │           ├── LoadConfirmationController.php
│   │   │           ├── ManifestController.php
│   │   │           └── WebhookController.php
│   │   ├── Models/                   # Eloquent models
│   │   │   ├── Invoice.php
│   │   │   ├── LoadConfirmation.php
│   │   │   ├── Manifest.php
│   │   │   ├── PackingDetail.php
│   │   │   └── Document.php
│   │   └── Services/                 # Business logic services
│   ├── database/
│   │   └── migrations/               # Database migrations
│   ├── public/
│   │   └── nucleusmlsmall_1.gif     # Company logo
│   ├── resources/
│   │   └── views/
│   │       └── pdf/
│   │           ├── manifest.blade.php # Manifest PDF template
│   │           └── invoice.blade.php  # Invoice PDF template
│   ├── routes/
│   │   └── api.php                   # API routes
│   └── composer.json                 # PHP dependencies
│
├── frontend/                         # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── ManifestForm.jsx
│   │   │   ├── ManifestList.jsx
│   │   │   ├── ManifestDetailView.jsx
│   │   │   └── OttoChatbot.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   └── PurchaseOrders.jsx
│   │   ├── services/
│   │   │   ├── manifestService.js
│   │   │   └── api.js
│   │   └── App.jsx
│   ├── public/
│   │   └── nucleusmlsmall_1.gif     # Company logo
│   └── package.json                  # NPM dependencies
│
├── examples/                         # Example files and screenshots
│   └── Screenshot 2025-10-27 202435.jpg
│
└── *.md                              # Documentation files (this file included)
```

---

## 🛠️ Development Setup

### Prerequisites
- PHP 8.4+
- MySQL 8.0+
- Node.js 18+
- Composer
- Git

### Backend Setup

```bash
cd C:\projects\otto-v2\backend

# Install dependencies
composer install

# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Run migrations
php artisan migrate

# Start development server
php artisan serve
# Server runs at: http://localhost:8000
```

### Frontend Setup

```bash
cd C:\projects\otto-v2\frontend

# Install dependencies
npm install

# Start development server
npm run dev
# Server runs at: http://localhost:5173
```

### Database Configuration

**MySQL Connection:**
```
Host: 127.0.0.1
Port: 3306
Database: otto_v2
Username: ottouser
Password: otto2025
```

**Environment Variables (.env):**
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=otto_v2
DB_USERNAME=ottouser
DB_PASSWORD=otto2025
```

---

## 🎯 Key Features

### 1. Invoice Management
- Commercial invoice processing
- Packing list integration
- Purchase order tracking
- Consumption tracking for parent POs
- Automatic weight calculations
- Document storage and retrieval

### 2. Load Confirmation System
- PDF upload and storage
- Many-to-many relationship with packages
- Manual file_name assignment at package level
- Bidirectional synchronization
- Vehicle and transporter information
- DRC contact details

### 3. Manifest Creation
- Automated manifest generation from load confirmations
- PDF generation with QR codes
- Landscape A4 format
- Professional uppercase formatting
- Driver instructions
- FERI processing workflow

### 4. Document Management
- Multi-type document support
- Automatic classification
- Version control
- Secure storage
- Download and preview capabilities

### 5. Workflow Management
- Invoice lifecycle tracking (receiving → delivered)
- Current stage ENUM tracking
- Owner assignment (operations, finance, feri_department, etc.)
- Automated status updates
- Audit trail

---

## 💾 Database Schema

### Key Tables

#### `invoices`
Core invoice tracking table
- `id` - Primary key
- `invoice_number` - Unique invoice identifier
- `invoice_type` - commercial_invoice, packing_list, purchase_order
- `parent_invoice_id` - For linking child invoices to parent PO
- `current_stage` - Workflow stage ENUM
- `current_owner` - Current department/role
- `expected_weight_kg` - Expected shipment weight
- `actual_weight_kg` - Actual shipment weight
- `entry_agent` - Entry/destination agent (e.g., "Malabar")

#### `load_confirmations`
Load confirmation documents
- `id` - Primary key
- `file_reference` - Unique reference (e.g., "S00037737")
- `transporter_name` - Transporter company
- `vehicle_type` - Vehicle type (e.g., "12 TON")
- `truck_registration` - Horse/truck registration
- `trailer_1_registration` - First trailer
- `trailer_2_registration` - Second trailer (optional)
- `clearing_agent` - Clearing agent
- `entry_agent` - Destination clearing agent
- `commodity_description` - Goods description
- `delivery_address` - Destination address
- `contact_for_nucleus_drc` - DRC contact information
- `pdf_generated` - Boolean flag

#### `manifests`
Freight manifests
- `id` - Primary key
- `manifest_number` - Uses load_confirmation.file_reference
- `load_confirmation_id` - FK to load_confirmations
- `export_date` - Shipment date
- `border_post` - Border crossing point
- `customs_office` - Customs office
- `contract_number` - Contract reference
- `area_and_phase` - Area and phase information
- `project_code` - Project code
- `driver_instruction_1` - First driver instruction
- `driver_instruction_2` - Second driver instruction
- `cod_number` - Certificate of Destination number
- `status` - draft, pending_feri, feri_approved, in_transit, delivered
- `customs_status` - pending, in_progress, cleared, rejected

#### `packing_details`
Package-level details
- `id` - Primary key
- `invoice_id` - FK to invoices
- `package_number` - Package identifier
- `file_name` - **Manually entered load confirmation reference**
- `gross_weight_kg` - Package weight
- `cbm` - Volume in cubic meters
- `dimensions` - Package dimensions

#### `invoice_load_confirmation` (Pivot)
Many-to-many relationship between invoices and load confirmations
- `invoice_id` - FK to invoices
- `load_confirmation_id` - FK to load_confirmations
- `created_at` - Timestamp
- `updated_at` - Timestamp

#### `invoice_manifest` (Pivot)
Many-to-many relationship between invoices and manifests
- `invoice_id` - FK to invoices
- `manifest_id` - FK to manifests
- `created_at` - Timestamp
- `updated_at` - Timestamp

---

## 🔌 API Endpoints

### Manifest Endpoints

**Base URL:** `http://localhost:8000/api`

```
GET    /manifests                    # List all manifests
GET    /manifests/{id}               # Get single manifest
POST   /manifests                    # Create manifest
PUT    /manifests/{id}               # Update manifest
DELETE /manifests/{id}               # Delete manifest
GET    /manifests/{id}/download-pdf  # Download manifest PDF

POST   /manifests/{id}/submit-feri   # Submit to FERI
POST   /manifests/{id}/approve-feri  # Approve FERI
POST   /manifests/{id}/mark-delivered # Mark as delivered

POST   /manifests/{id}/attach-invoices   # Attach invoices
POST   /manifests/{id}/detach-invoices   # Detach invoices
```

### Load Confirmation Endpoints

```
GET    /load-confirmations           # List all load confirmations
GET    /load-confirmations/{id}      # Get single load confirmation
POST   /load-confirmations           # Create load confirmation
PUT    /load-confirmations/{id}      # Update load confirmation
DELETE /load-confirmations/{id}      # Delete load confirmation
```

### Invoice Endpoints

```
GET    /invoices                     # List all invoices
GET    /invoices/{id}                # Get single invoice
POST   /invoices                     # Create invoice
PUT    /invoices/{id}                # Update invoice
DELETE /invoices/{id}                # Delete invoice

GET    /purchase-orders/{id}         # Get purchase order details
PUT    /invoices/{id}/packing-details # Update packing details
```

### Webhook Endpoints

```
POST   /webhooks/invoice-uploaded     # n8n webhook for invoice upload
POST   /webhooks/load-confirmation    # n8n webhook for load confirmation upload
```

---

## 📄 PDF Generation

### Manifest PDF Template

**Location:** `backend/resources/views/pdf/manifest.blade.php`

**Controller Method:** `ManifestController::downloadPdf()`

**Key Features:**
1. **A4 Landscape Format**
2. **QR Code** - SVG format, contains manifest number
3. **Company Logo** - Top left corner
4. **Header Bar** - Purple (#3d2d6b) with manifest number, date, page
5. **Transport Details** - Transporter, agents, vehicle info
6. **Shipment Details** - Consignor, consignee, goods description, DRC agent
7. **Footer** - Two-column layout with driver instructions
8. **Uppercase Text** - All text automatically transformed to uppercase

**CSS Highlights:**
```css
@page {
    size: A4 landscape;
    margin: 15px;
}

body {
    text-transform: uppercase;
}

.header-bar {
    background-color: #3d2d6b;
    margin-left: 5px;
    margin-right: 5px;
}

.footer-container {
    position: absolute;
    bottom: 15px;
    left: 20px;
    right: 20px;
}
```

**Data Flow:**
```
Manifest Model
  → Load Confirmation (transporter, vehicle, agents)
  → Invoices (customer, supplier, PO)
  → Packing Details (pieces, weight, CBM)
  → QR Code (generated from manifest_number)
  → Logo (public/nucleusmlsmall_1.gif)
  → DomPDF rendering
  → Download as PDF
```

---

## 🔄 Bidirectional Synchronization

### Packing Details ↔ Load Confirmations

The system maintains a many-to-many relationship at the package level:

**Direction 1: File Name → Load Confirmation**
- User manually enters load confirmation reference in `packing_details.file_name`
- System finds matching `load_confirmations.file_reference`
- Syncs `invoice_load_confirmation` pivot table
- Method: `InvoiceController::syncLoadConfirmationRelationships()`
- Location: `backend/app/Http/Controllers/Api/InvoiceController.php:1653-1685`

**Direction 2: Load Confirmation → File Name**
- When `load_confirmations.file_reference` is updated
- System updates all matching `packing_details.file_name` records
- Method: `LoadConfirmationController::update()`
- Location: `backend/app/Http/Controllers/Api/LoadConfirmationController.php:176-189`

**Important:** Users manually control package assignments via the `file_name` field in the Packing Details list. One package can go on multiple load confirmations, or multiple packages from the same invoice can be split across different load confirmations.

---

## 🐛 Troubleshooting

### Common Issues

#### 1. PDF Generation Fails
**Symptom:** Error when downloading manifest PDF

**Solutions:**
- Ensure logo file exists: `backend/public/nucleusmlsmall_1.gif`
- Check DomPDF cache: `storage/framework/cache/dompdf`
- Clear Laravel cache: `php artisan cache:clear`
- Verify QR code package installed: `composer show simplesoftwareio/simple-qrcode`

#### 2. Manifest Number Shows MAN- Prefix
**Symptom:** Old auto-generated numbers instead of load confirmation reference

**Solution:**
- Delete old manifests: `DELETE FROM manifests WHERE manifest_number LIKE 'MAN-%';`
- Verify ManifestForm.jsx uses: `initialLoadConfirmation?.file_reference`

#### 3. Entry Agent Not Showing
**Symptom:** Entry agent displays as "-" in forms

**Solutions:**
- Check database: `SELECT entry_agent FROM invoices WHERE id = X;`
- Verify API includes field: InvoiceController.php:1151
- Update records: `UPDATE invoices SET entry_agent = 'Malabar';`

#### 4. Load Confirmation Relationships Not Syncing
**Symptom:** Invoice not linked to load confirmation after file_name update

**Solutions:**
- Check `packing_details.file_name` matches `load_confirmations.file_reference` exactly
- Run sync manually: Edit and save packing details
- Verify pivot table: `SELECT * FROM invoice_load_confirmation WHERE invoice_id = X;`

#### 5. Portrait Instead of Landscape PDF
**Symptom:** PDF generates in portrait with white space

**Solutions:**
- Verify @page CSS: `size: A4 landscape;` (line 8)
- Check controller: `setPaper('a4', 'landscape')` (line 319)
- Clear browser cache and re-download

---

## 📞 Support

For technical support or questions:
- Review this documentation and referenced MD files
- Check Laravel logs: `backend/storage/logs/laravel.log`
- Check browser console for frontend errors
- Review database state with MySQL queries

---

## 🔐 Security Notes

- Database credentials are in `.env` file (not committed to git)
- n8n webhooks use authentication tokens
- Document uploads are validated and sanitized
- API endpoints require authentication (implement as needed)

---

## 📝 Development Notes

### Running Both Servers

**Terminal 1 - Backend:**
```bash
cd C:\projects\otto-v2\backend
php artisan serve
```

**Terminal 2 - Frontend:**
```bash
cd C:\projects\otto-v2\frontend
npm run dev
```

### Database Access

**Command Line:**
```bash
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql" -h 127.0.0.1 -u ottouser -potto2025 otto_v2
```

### Useful Commands

**Clear all caches:**
```bash
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

**Run migrations:**
```bash
php artisan migrate
php artisan migrate:fresh  # WARNING: Drops all tables
```

**Generate models:**
```bash
php artisan make:model ModelName -m  # With migration
```

---

## 📅 Version History

### v2.0 (2025-10-27)
- ✅ Manifest PDF generation with landscape orientation
- ✅ QR code integration
- ✅ Two-column footer layout
- ✅ Consistent margins throughout
- ✅ Uppercase text transformation
- ✅ Logo integration in PDF and UI
- ✅ Right-aligned header elements
- ✅ Bidirectional load confirmation sync
- ✅ Package-level relationship management

### v1.0 (2025-10-23)
- ✅ Initial invoice upload workflow
- ✅ Load confirmation system
- ✅ Dashboard features
- ✅ n8n integration
- ✅ Document management

---

**End of Documentation**

*This file serves as the master reference for all OTTO v2 development work. All other MD files in this directory contain detailed information about specific features and processes.*
