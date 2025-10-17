# OTTO V2 - User Guide & Feature Documentation

**Last Updated:** October 16, 2025
**Version:** 2.0
**Status:** Production Ready

---

## Table of Contents

1. [System Overview](#system-overview)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Invoice Processing Workflow](#invoice-processing-workflow)
4. [Features by User Role](#features-by-user-role)
5. [Invoice Management](#invoice-management)
6. [Package Splitting](#package-splitting)
7. [Load Confirmation Process](#load-confirmation-process)
8. [Manifest Management](#manifest-management)
9. [Document Management](#document-management)
10. [Workflow Stages](#workflow-stages)
11. [Troubleshooting](#troubleshooting)

---

## System Overview

OTTO V2 is an invoice-centric freight forwarding management system designed to streamline logistics operations from invoice receipt to final delivery. The system uses AI-powered document classification to automatically process incoming invoices and manage the entire freight forwarding workflow.

### Key Components

- **React Frontend** - Modern UI built with Material-UI
- **Laravel Backend** - RESTful API with MySQL database
- **n8n Integration** - Automated document processing with Claude Vision AI
- **Email Integration** - Automated load confirmation emails
- **PDF Generation** - Print-ready load confirmations and manifests

### Technology Stack

- Frontend: React 18 + Vite + Material-UI
- Backend: Laravel 12.33.0 + PHP 8.2
- Database: MySQL 8.0
- AI: Claude Vision API (Anthropic)
- Automation: n8n workflows

---

## User Roles & Permissions

### 1. Admin
**Full System Access**
- Complete access to all features
- User management
- System configuration
- Can split packages
- Override workflow restrictions

### 2. Key Account Manager (KAM)
**Invoice & Customer Management**
- Upload and process invoices
- Manage customer relationships
- Create and edit invoices
- Split packages
- Create transport requests
- Manage QC/BV inspections
- Upload documents
- Create load confirmations

### 3. Transport Planner (Cindy)
**Transport & Logistics**
- View transport requests
- Create load confirmations
- Assign transporters
- Email load confirmations
- Create manifests
- Track shipments
- **Cannot** split packages

### 4. FERI Department
**Customs & Compliance**
- Process FERI applications
- Approve manifests
- Upload certificates of destination
- Track customs clearance

---

## Invoice Processing Workflow

### Stage 1: Document Upload & Classification

**Who:** Key Account Manager
**Process:**
1. Upload PDF via dashboard
2. n8n receives webhook
3. Claude Vision AI classifies all pages
4. System extracts:
   - Invoice header (number, date, supplier, customer)
   - Line items (description, quantity, price)
   - Packing details (weights, dimensions, packages)
   - Delivery note items
5. Data appears in "Pending Review" tab

### Stage 2: Review & Acknowledge

**Who:** Key Account Manager
**Process:**
1. Review extracted data in Pending Review tab
2. Verify accuracy of:
   - Supplier and customer information
   - Invoice amounts and currency
   - Line items
   - Packing details
3. Click "Acknowledge" to create invoice record
4. Invoice moves to "Active Invoices"

### Stage 3: Invoice Editing & File Assignment

**Who:** Key Account Manager
**Process:**
1. Open invoice from Active Invoices tab
2. Edit invoice details if needed
3. Assign file names to packages (e.g., "KAMOA001")
4. File name status colors:
   - 🟢 **Green:** Empty (ready for transport)
   - 🟡 **Yellow:** Filled (planning stage)
   - 🔵 **Blue:** Transport requested
   - ⚫ **Grey:** On manifest (locked)
   - 🔴 **Red:** Duplicate error

### Stage 4: QC/BV Inspections (if required)

**Who:** Key Account Manager
**Process:**
1. Go to "Workflow & Requirements" tab
2. Update QC status (if required):
   - Pending
   - Scheduled
   - In Progress
   - Passed
   - Failed
   - In Order
   - Blocked
3. Update BV status (if required)
4. Upload QC/BV certificates in Documents tab
5. Add notes for each inspection

### Stage 5: Transport Request

**Who:** Key Account Manager
**Process:**
1. Click "Request Transport" button
2. Select packages to transport (by file name)
3. Fill in transport details:
   - Collection date
   - Collection address
   - Delivery address
   - Vehicle type
   - Special instructions
4. Submit request
5. Invoice workflow advances to "Transport Requested"

### Stage 6: Load Confirmation Creation

**Who:** Transport Planner
**Process:**
1. View pending requests in Transport Planner dashboard
2. Click "Create Load Confirmation"
3. System auto-populates from transport request
4. Add/edit:
   - Transporter details
   - Vehicle information
   - Driver details
   - Freight charges
5. Save load confirmation
6. Email to transporter with PDF attachment

### Stage 7: Manifest Creation

**Who:** Key Account Manager / Transport Planner
**Process:**
1. Create manifest from load confirmation
2. Attach multiple invoices if consolidating
3. Set export date and border post
4. Submit for FERI (if required)
5. Track customs clearance

### Stage 8: Delivery & Completion

**Who:** Transport Planner / FERI
**Process:**
1. Update manifest delivery status
2. Upload proof of delivery documents
3. Mark as delivered
4. Invoice workflow completes

---

## Features by User Role

### Admin Features

✅ All KAM features
✅ All Transport Planner features
✅ User management
✅ System configuration
✅ Delete any records
✅ Override workflow restrictions

### Key Account Manager Features

✅ Upload invoices (PDF)
✅ Review pending documents
✅ Acknowledge and create invoices
✅ Edit invoice details
✅ Split packages
✅ Assign file names to packages
✅ Manage QC/BV inspections
✅ Upload documents
✅ Create transport requests
✅ Create load confirmations
✅ Create manifests
✅ View all invoices and shipments

### Transport Planner Features

✅ View transport requests
✅ Create load confirmations
✅ Assign transporters
✅ Email load confirmations
✅ Print load confirmations
✅ Create manifests
✅ Track shipments
❌ Cannot split packages
❌ Cannot edit invoices
❌ Cannot upload invoices

---

## Invoice Management

### Creating an Invoice

**Method 1: Upload PDF (Recommended)**
1. Click "Upload Invoice" button
2. Select PDF file (supports multi-page)
3. Wait for AI processing (15-30 seconds)
4. Review extracted data in "Pending Review" tab
5. Click "Acknowledge" to create invoice

**Method 2: Manual Entry**
1. Click "New Invoice" button
2. Fill in all required fields manually
3. Add line items
4. Add packing details
5. Save invoice

### Invoice Detail Tabs

**Tab 1: Invoices & Details**
- Invoice header information
- Supplier and customer details
- Financial information
- Sub-tabs:
  - Line Items
  - Packing Details
  - Delivery Note

**Tab 2: Workflow & Requirements**
- Current workflow stage
- QC inspection status
- BV inspection status
- Document requirements checklist
- Workflow blockers/warnings

**Tab 3: Documents**
- Upload new documents
- View/download existing documents
- Document types:
  - Invoice
  - Packing List
  - QC Certificate
  - BV Report
  - SAD 500
  - FERI Certificate
  - Manifest
  - Quote
  - Insurance

### File Name Assignment

File names link packages to transport requests and load confirmations.

**Best Practices:**
- Use customer code prefix (e.g., "KAMOA", "ALPHA")
- Add sequential number (e.g., "KAMOA001", "KAMOA002")
- Keep it short and memorable
- Avoid special characters

**Validation:**
- System checks for duplicates in real-time
- Debounced validation (500ms delay)
- Color-coded status indicators

**Status Colors:**
- 🟢 **Green:** Empty or unique (safe to use)
- 🟡 **Yellow:** Assigned but not yet in transport
- 🔵 **Blue:** In active transport request
- ⚫ **Grey:** On manifest (cannot edit)
- 🔴 **Red:** Duplicate (must change)

---

## Package Splitting

**Purpose:** Split large packages when certain items need priority shipping or separate handling.

**Who Can Split:** Admin and Key Account Manager only

### How to Split a Package

1. Open invoice in edit mode
2. Go to "Invoices & Details" → "Packing Details" tab
3. Find package to split
4. Click **Split** button (scissors icon)
5. Enter split quantities:
   - Gross weight (kg)
   - Net weight (kg)
   - Length (cm)
   - Width (cm)
   - Height (cm)
   - Contents description
6. System auto-calculates:
   - CBM (cubic meters)
   - Volumetric weight (CBM × 167)
7. Click "Split Package"

### What Happens When You Split

✅ **Original package** keeps its file name, dimensions reduced
✅ **New package** created with split quantities, empty file name
✅ **All packages** renumbered sequentially (1, 2, 3...)
✅ **Weights subtracted** from original package

### Validation Rules

- Cannot split more weight than original package
- Cannot split if package is on a manifest (locked)
- Must enter all dimension fields
- Gross weight must be ≥ net weight

### Example Scenario

**Original Package:**
- Package #1: 1000 kg gross, 900 kg net
- File name: "KAMOA001"

**After Splitting 300 kg:**
- Package #1: 700 kg gross, 600 kg net, File: "KAMOA001"
- Package #2: 300 kg gross, 300 kg net, File: "" (empty)

You can then assign a different file name to Package #2 and transport separately.

---

## Load Confirmation Process

### Creating a Load Confirmation

**Method 1: From Transport Request (Recommended)**
1. Go to Transport Planner Dashboard
2. Click "Pending Requests" tab
3. Find transport request
4. Click "Create Load Confirmation"
5. System auto-fills from request
6. Add transporter details
7. Save

**Method 2: Manual Creation**
1. Click "New Load Confirmation"
2. Select invoice(s)
3. Fill in all fields manually
4. Save

### Load Confirmation Fields

**Required Fields:**
- File reference (unique identifier)
- Collection date
- Collection address
- Delivery address
- Transporter
- Vehicle type
- Currency

**Optional Fields:**
- Vehicle registration
- Driver name
- Driver phone
- Trailer registration
- Freight charges
- Special instructions

**Auto-Populated Fields:**
- Invoice details
- Package information
- Customer details
- Supplier details
- Total weight and CBM

### Vehicle Types

The system supports 37+ vehicle types including:
- **Trucks:** Flatbed, Curtain Side, Tautliner, Closed Body
- **Specialized:** Refrigerated, Tanker, Tipper, Container Carrier
- **Heavy:** Lowbed, Side Tipper, Superlink
- **International:** Cross-border equipped vehicles

Each vehicle type has predefined:
- Maximum payload capacity
- Typical dimensions
- Suitability for cargo types

### Emailing Load Confirmations

1. Open load confirmation
2. Click "Email" button
3. System generates PDF attachment
4. Email auto-sent to transporter
5. Activity logged in system

**Email Contents:**
- Load confirmation PDF (professional format)
- Collection and delivery details
- Contact information
- Special instructions

### Load Confirmation Statuses

- **Draft:** Being created, not finalized
- **Confirmed:** Sent to transporter
- **Assigned:** Driver assigned
- **Collected:** Goods picked up
- **In Transit:** En route
- **Delivered:** Completed
- **Cancelled:** Voided

### Activity Logging

All actions logged automatically:
- Created by [User] on [Date]
- Emailed to [Transporter] on [Date]
- Assigned to [Driver] on [Date]
- Modified by [User] on [Date]
- Deleted by [User] on [Date]

---

## Manifest Management

### What is a Manifest?

A manifest is a customs document listing all shipments crossing a border. It's required for:
- FERI application (DRC imports)
- Customs clearance
- Border crossing
- Proof of export/import

### Creating a Manifest

1. Navigate to Manifests section
2. Click "Create Manifest"
3. Select load confirmation
4. Attach invoice(s)
5. Set:
   - Manifest number (auto-generated or manual)
   - Export date
   - Border post/port of entry
6. Save manifest

### Consolidation (Groupage)

**Multiple invoices on one manifest:**
1. Create manifest from first load confirmation
2. Click "Attach Invoices"
3. Select additional invoices
4. System combines all line items
5. Generate consolidated manifest PDF

### FERI Workflow

**Stage 1: Draft**
- Manifest created
- Not yet submitted to FERI

**Stage 2: Submit FERI**
1. Click "Submit FERI" menu option
2. System sets submission date
3. Invoice workflow → "FERI Pending"
4. Current owner → FERI Department

**Stage 3: FERI Approval**
1. FERI department logs in
2. Reviews manifest
3. Clicks "Approve FERI"
4. Enters certificate date
5. Uploads certificate of destination
6. Invoice workflow → "In Transit"

**Stage 4: Delivery**
1. Click "Mark Delivered"
2. System updates all invoices
3. Invoice workflow → "Delivered"
4. Status → "Completed"

### Manifest Statuses

- **Draft:** Being created
- **Pending FERI:** Submitted, awaiting approval
- **FERI Approved:** Ready for export
- **In Transit:** Cleared customs, en route
- **Delivered:** Completed
- **Cancelled:** Voided

---

## Document Management

### Uploading Documents

1. Open invoice
2. Go to "Documents" tab
3. Select document type from dropdown
4. Choose PDF file
5. Click "Upload"
6. Document appears in list

### Document Types

**Required for FERI:**
- ✅ Invoice
- ✅ Packing List
- ✅ BV Report (if value > $2,500)
- ✅ SAD 500
- ✅ Manifest

**Optional:**
- Freight Statement
- Insurance Certificate
- Quote
- QC Certificate

### Viewing Documents

1. Click "View" button next to document
2. PDF opens in browser
3. Can download or print

### Document Version Control

- System tracks all document uploads
- Can replace documents (uploads new version)
- Old versions retained for audit trail
- Version history visible to admin

---

## Workflow Stages

### Invoice Workflow Stages

1. **Invoice Received**
   - Initial stage after acknowledgment
   - Owner: Key Account Manager

2. **Document Verification**
   - Checking completeness
   - Owner: Key Account Manager

3. **QC Inspection** (if required)
   - Quality control check
   - Owner: Key Account Manager

4. **BV Inspection** (if required, value > $2,500)
   - Bureau Veritas inspection
   - Owner: External Inspector

5. **Transport Requested**
   - Awaiting transport arrangement
   - Owner: Transport Planner

6. **Transport Arranged**
   - Load confirmation created
   - Owner: Transport Planner

7. **Manifest Created**
   - Ready for customs
   - Owner: Key Account Manager

8. **FERI Pending** (if required)
   - Awaiting FERI approval
   - Owner: FERI Department

9. **In Transit**
   - Customs cleared, shipping
   - Owner: Transport Planner

10. **Delivered**
    - Final stage, completed
    - Owner: Finance

### Current Owner Roles

- **key_account_manager:** KAM handling invoice
- **transport_planner:** Cindy arranging transport
- **feri_department:** FERI processing team
- **operations:** General operations team
- **finance:** Finance department (post-delivery)

### Workflow Blockers

System prevents progression when:
- ❌ Required documents missing
- ❌ QC inspection not complete (if required)
- ❌ BV inspection not complete (if required)
- ❌ No file name assigned to packages
- ❌ FERI not approved (if required)

Blockers shown in "Workflow & Requirements" tab with clear messages.

---

## Troubleshooting

### Invoice Upload Issues

**Problem:** PDF upload fails
**Solution:**
- Check file size (max 10 MB)
- Ensure PDF is not password-protected
- Try uploading one page at a time
- Contact admin if issue persists

**Problem:** AI extraction inaccurate
**Solution:**
- Review and edit data in Pending Review tab
- Manually correct fields before acknowledging
- Report pattern to admin for prompt improvement

### File Name Issues

**Problem:** Red duplicate error
**Solution:**
- Change file name to unique value
- Check other invoices for conflicts
- Use customer code prefix for organization

**Problem:** Cannot edit file name (grey)
**Solution:**
- Package is on manifest (locked)
- Must remove from manifest to edit
- Contact transport planner if urgent

### Transport Request Issues

**Problem:** "Cannot proceed to transport" message
**Solution:**
- Check Workflow & Requirements tab
- Resolve blockers:
  - Upload missing documents
  - Complete QC/BV inspections
  - Assign file names to all packages

**Problem:** Transport request not appearing in planner dashboard
**Solution:**
- Refresh dashboard
- Check transport request status
- Verify request was actually submitted
- Check current owner field

### Load Confirmation Issues

**Problem:** Email not sending
**Solution:**
- Verify transporter has email address
- Check email configuration
- Contact admin to check mail logs

**Problem:** PDF not generating
**Solution:**
- Verify all required fields filled
- Check invoice has valid data
- Try saving and regenerating
- Contact admin if error persists

### Permission Issues

**Problem:** "You do not have permission" message
**Solution:**
- Check your user role
- Admin and KAM can split packages
- Transport Planner cannot split
- Contact admin for role change if needed

### Performance Issues

**Problem:** Slow loading
**Solution:**
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh page (Ctrl+Shift+R)
- Check internet connection
- Contact admin if server issue

**Problem:** Page not updating
**Solution:**
- Refresh page (F5)
- Check if another user made changes
- Re-login if session expired
- Clear cache and reload

---

## System URLs & Ports

**Frontend:** http://localhost:5177 (or current Vite port)
**Backend API:** http://localhost:8000
**Database:** MySQL on localhost:3306
**n8n Automation:** http://localhost:5678

---

## Support & Feedback

**Technical Issues:**
- Contact system administrator
- Check Laravel logs: `C:/projects/otto-v2/backend/storage/logs/laravel.log`
- Check browser console (F12) for errors

**Feature Requests:**
- Submit to administrator
- Document current workaround
- Describe desired functionality

**Training:**
- Request one-on-one training session
- Review this user guide
- Practice with test data before production use

---

## Glossary

**BV (Bureau Veritas):** Independent inspection company for high-value shipments (> $2,500)

**CBM (Cubic Meters):** Volume calculation (Length × Width × Height ÷ 1,000,000)

**FERI (Foreign Exchange Risk Insurance):** Certificate required for DRC imports to prove goods will enter the country

**File Name/File Reference:** Unique identifier linking packages to transport requests and manifests

**Groupage/Consolidation:** Multiple shipments combined on one vehicle/manifest

**HS Code (Harmonized System):** International product classification code for customs

**Incoterms:** International commercial terms (EXW, FOB, CIF, DDP, etc.)

**KAM (Key Account Manager):** User role managing customer relationships and invoices

**Load Confirmation:** Transport booking document sent to transporter/driver

**Manifest:** Customs document listing all shipments crossing a border

**QC (Quality Control):** Internal inspection of incoming goods

**SAD 500 (Single Administrative Document):** Customs declaration form

**Volumetric Weight:** Calculated weight based on package size (CBM × 167 kg/m³)

---

## Version History

**Version 2.0 (October 16, 2025)**
- Package splitting feature
- Enhanced load confirmation workflow
- File name validation system
- Activity logging
- Email integration
- Manifest FERI workflow
- Agent management

**Version 1.0 (October 8, 2025)**
- Initial release
- Invoice upload and AI classification
- Basic workflow management
- Document management
- User roles and permissions

---

**End of User Guide**

For latest updates and additional documentation, contact your system administrator.
