# Manifest Process - Session Handoff Notes

**Date:** October 17, 2025
**Status:** Manifest Creation Form Complete - PDF Generation Next
**Commit:** b5b41fe

---

## 🚨 CRITICAL CONSTRAINTS 🚨

### DO NOT CHANGE EXISTING FUNCTIONALITY
**All existing processes and forms are working perfectly and MUST NOT be modified without explicit user approval.**

**Protected Areas (DO NOT TOUCH):**
- ✅ Invoice processing workflow
- ✅ Package splitting functionality
- ✅ Load Confirmation forms and processes
- ✅ Transport Request workflow
- ✅ All existing API endpoints
- ✅ All existing database tables and relationships

### Rules:
1. **NEVER change existing code** without explicit user confirmation
2. **ALWAYS ask before modifying** any existing functionality
3. **Focus ONLY on manifest process** unless directed otherwise
4. If unsure whether something affects existing processes, **ASK FIRST**

---

## 📊 Current Status

### ✅ COMPLETED (October 17, 2025)

#### 1. Manifest Creation Form
**File:** `frontend/src/components/ManifestForm.jsx` (420 lines)
- Auto-generates manifest numbers (MAN-YYYYMMDD-XXX format)
- Shows load confirmation details in header
- Multi-select invoice table with checkboxes
- Real-time summary (total invoices, packages, weight, value)
- Form validation and error handling
- Successfully creates manifests via backend API

#### 2. Load Confirmation Integration
**File:** `frontend/src/components/LoadConfirmationList.jsx`
- Added "Generate Manifest" menu item (line 604-610)
- Menu item enabled after PDF generated OR email sent
- Opens full-screen dialog with ManifestForm
- Updates `pdf_generated` flag when PDF downloaded
- Helper function `canGenerateManifest()` checks flags (line 298-304)

#### 3. OTTO AI Chatbot
**File:** `frontend/src/components/OttoChatbot.jsx` (395 lines)
- Click OTTO logo to open AI assistant modal
- n8n RAG integration (http://localhost:5678/webhook/otto-rag)
- Example questions and live response timer
- OTTO v2 branding (navy #001f3f, turquoise #73e9c7)

#### 4. Documentation
- `MANIFEST_PROCESS_AUDIT.md` - Complete audit of manifest system
- `OTTO_V2_USER_GUIDE.md` - Comprehensive technical guide
- `USER_QUICK_GUIDE.md` - Simplified user guide

### ⏳ PENDING - Next Steps for Manifest

#### Priority 1: Manifest List View
**Status:** Backend exists, frontend missing
- View all manifests in table format
- Filter by status (draft, pending_feri, approved, etc.)
- Action menu for each manifest
- Link to detail view

#### Priority 2: Manifest Detail View
**Status:** Component needs to be created
- View manifest header (number, date, status)
- Show linked load confirmation
- List all invoices in manifest
- Consolidated line items from all invoices
- Display totals (weight, value, packages)
- Workflow progress indicators

#### Priority 3: PDF Generation
**Status:** Backend needs implementation
- Endpoint: `GET /api/manifests/{id}/pdf`
- Use Laravel PDF library (barryvdh/laravel-dompdf)
- Blade template for manifest document
- Store in `storage/app/manifests/`
- Required sections: header, consignment details, line items, totals, signatures

#### Priority 4: Workflow Actions
**Status:** Backend exists, frontend missing
- Submit to FERI button
- Approve FERI button (FERI dept only)
- Mark Delivered button (Transport Planner)
- Update invoice workflow stages accordingly

---

## 🗄️ Database Schema

### Manifests Table (EXISTS ✅)
```sql
CREATE TABLE manifests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    manifest_number VARCHAR(255) UNIQUE NOT NULL,
    load_confirmation_id BIGINT UNSIGNED,
    export_date DATE,
    border_post VARCHAR(255),
    customs_office VARCHAR(255),
    customs_status ENUM('pending','in_progress','cleared','rejected') DEFAULT 'pending',
    feri_application_date DATE,
    certificate_of_destination_date DATE,
    status ENUM('draft','pending_feri','feri_approved','in_transit','delivered','completed') DEFAULT 'draft',
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (load_confirmation_id) REFERENCES load_confirmations(id)
);
```

### Invoice-Manifest Pivot (EXISTS ✅)
```sql
CREATE TABLE invoice_manifest (
    invoice_id BIGINT UNSIGNED,
    manifest_id BIGINT UNSIGNED,
    created_at TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (manifest_id) REFERENCES manifests(id)
);
```

---

## 🔌 Backend API (EXISTS ✅)

### Manifest Endpoints
All routes in `backend/routes/api.php`:

```php
// Manifest CRUD
GET    /api/manifests              - List all manifests
POST   /api/manifests              - Create new manifest
GET    /api/manifests/{id}         - View single manifest
PUT    /api/manifests/{id}         - Update manifest
DELETE /api/manifests/{id}         - Delete manifest

// Manifest Workflow
POST   /api/manifests/{id}/submit-feri      - Submit to FERI
POST   /api/manifests/{id}/approve-feri     - FERI approval
POST   /api/manifests/{id}/mark-delivered   - Mark completed

// Invoice Management
POST   /api/manifests/{id}/attach-invoices  - Add invoices
POST   /api/manifests/{id}/detach-invoices  - Remove invoices
```

**Controller:** `backend/app/Http/Controllers/Api/ManifestController.php`

---

## 📁 File Locations

### Frontend Components
```
frontend/src/components/
├── ManifestForm.jsx                    ✅ DONE (420 lines)
├── ManifestList.jsx                    ❌ TODO (view all manifests)
├── ManifestDetailView.jsx              ❌ TODO (view single manifest)
├── LoadConfirmationList.jsx            ✅ UPDATED (Generate Manifest menu)
├── OttoChatbot.jsx                     ✅ DONE (AI assistant)
└── Layout.jsx                          ✅ UPDATED (chatbot integration)
```

### Backend Files
```
backend/
├── app/Http/Controllers/Api/
│   └── ManifestController.php          ✅ EXISTS (full CRUD + workflow)
├── app/Models/
│   ├── Manifest.php                    ✅ EXISTS
│   └── LoadConfirmation.php            ✅ EXISTS
├── database/migrations/
│   └── 2025_10_08_184331_create_manifests_table.php  ✅ EXISTS
└── routes/api.php                      ✅ MANIFEST ROUTES EXIST
```

### Services
```
frontend/src/services/
├── manifestService.js                  ✅ EXISTS (API client)
└── loadConfirmationService.js          ✅ EXISTS
```

---

## 🎨 OTTO V2 Branding Colors

**Always use these colors for new components:**

```css
Navy Blue:      #001f3f   /* Primary headers, buttons */
Turquoise:      #73e9c7   /* Accent, highlights */
Light Mint:     #e6f9f5   /* Backgrounds, panels */
Teal:           #38b2ac   /* Secondary buttons */
```

---

## 🧪 Testing Details

### Current Environment
- Backend: Laravel 12.33.0 on http://localhost:8000
- Frontend: React 18 + Vite on http://localhost:5173
- Database: MySQL 8.0 (otto_v2)
- Credentials: ottouser / otto2025

### Test Data
```sql
-- Load Confirmations
SELECT id, file_reference, status, pdf_generated, email_sent
FROM load_confirmations ORDER BY id DESC LIMIT 5;

-- Current Results:
-- id=1, file_reference=SX00123456, status=transport_confirmed, email_sent=1
-- id=2, file_reference=TEST123456789, status=transport_confirmed, email_sent=0

-- Manifests
SELECT id, manifest_number, status FROM manifests ORDER BY id DESC;
```

### Test Workflow
1. Navigate to Load Confirmations tab
2. Click ⋮ menu on "SX00123456"
3. "Generate Manifest" should be enabled (email_sent=1)
4. Click "Generate Manifest"
5. Form opens with load confirmation details pre-populated
6. Select invoices (checkboxes)
7. Review summary panel
8. Click "Create Manifest"
9. Success message shows manifest number

---

## 🚀 Quick Start for Next Session

### What to do when session resumes:

1. **Start servers** (if not running):
   ```bash
   cd C:/projects/otto-v2/backend && php artisan serve
   cd C:/projects/otto-v2/frontend && npm run dev
   ```

2. **Check git status**:
   ```bash
   cd C:/projects/otto-v2 && git status
   ```

3. **Review this document** to understand current state

4. **Ask user which manifest feature to work on next**:
   - Manifest List View?
   - Manifest Detail View?
   - PDF Generation?
   - Workflow Actions?

5. **REMEMBER**: Do NOT change existing functionality without user approval!

---

## 📝 User Preferences

- User wants to **approve ANY changes** to existing code
- User is **focused on manifest process** today
- User has tested manifest creation - **it works**
- User wants **clear confirmation** before modifying anything
- User values **git commits** frequently to backup work

---

## 🔗 Related Documentation

- **Manifest Audit:** `MANIFEST_PROCESS_AUDIT.md` (complete system analysis)
- **User Guide:** `OTTO_V2_USER_GUIDE.md` (end user documentation)
- **Quick Guide:** `USER_QUICK_GUIDE.md` (simplified guide)
- **Business Workflow:** `docs/BUSINESS_WORKFLOW.md` (process flows)
- **Phase 3 Planning:** `../n8n-automation/PHASE3_PLANNING.md` (roadmap)

---

## ⚠️ Important Notes

1. **Git Commit b5b41fe** contains all manifest creation work
2. **Backend is 100% complete** - only frontend components needed
3. **ManifestForm works perfectly** - tested by user
4. **No bugs in existing functionality** - everything working
5. **Focus on manifest only** - don't touch invoice/transport/packing processes

---

**Last Updated:** October 17, 2025
**Next Agent:** Read this first, then ask user which manifest feature to work on next!
