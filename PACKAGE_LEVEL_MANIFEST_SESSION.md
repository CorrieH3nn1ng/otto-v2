# Package-Level Manifest Assignment - Session Notes

**Date:** 2025-10-28
**Status:** ✅ COMPLETED
**Priority:** CRITICAL - Core Business Logic

---

## 🎯 Overview

Implemented **package-level manifest assignment** system that allows split shipments and mixed loads. This is a fundamental business requirement where packages from invoices can be assigned to manifests individually, not just at the invoice level.

---

## ⚠️ CRITICAL BUSINESS RULE

### Package-Level Relationship Model

**The relationship between invoices and manifests operates at the PACKAGE LEVEL, not the invoice level.**

### Core Principles:

1. **One Package → Many Manifests**
   - A single package can be assigned to multiple manifests (rare but possible)
   - Example: Package #1 from IN018177 on both S00037754 and S00037755

2. **One Invoice → Many Manifests (Split Shipments)**
   - Packages from the same invoice can be split across different manifests
   - Example: IN018177 has 7 packages - 1 goes on Manifest A, 6 go on Manifest B

3. **One Manifest → Many Invoices (Mixed Loads)**
   - One manifest can carry packages from multiple invoices
   - Example: Manifest S00037754 carries packages from IN018177, IN018186, IN018190

4. **Linking Mechanism: `packing_details.file_name`**
   - Stores the manifest_number to link package to manifest
   - Manual, user-controlled field
   - When added: `file_name = manifest_number`
   - When removed: `file_name = NULL`

---

## 📋 Implementation Summary

### 1. Documentation Updates

**File:** `CLAUDE.md`
- Added prominent "⚠️ CRITICAL BUSINESS RULES" section
- Explained package-level relationship model with examples
- SQL examples showing package assignments
- UI/UX implications documented

### 2. Backend API Endpoints

**File:** `backend/app/Http/Controllers/Api/ManifestController.php`

#### New Methods Added:

```php
// Lines 314-347
public function attachPackages(Request $request, int $id): JsonResponse
{
    // Updates file_name for selected packages only
    // Auto-syncs invoice relationships
    // Returns updated manifest with package details
}

// Lines 349-393
public function detachPackages(Request $request, int $id): JsonResponse
{
    // Clears file_name for selected packages
    // Auto-removes invoice relationship if all packages removed
    // Intelligent cleanup of orphaned relationships
}
```

**Routes Added:** `backend/routes/api.php` (Lines 111-112)
```php
Route::post('/{id}/attach-packages', [ManifestController::class, 'attachPackages']);
Route::post('/{id}/detach-packages', [ManifestController::class, 'detachPackages']);
```

### 3. Frontend Service Methods

**File:** `frontend/src/services/manifestService.js` (Lines 68-82)

```javascript
attachPackages: async (id, packageIds) => {
    const response = await api.post(`/manifests/${id}/attach-packages`, {
      package_ids: packageIds
    });
    return response.data;
  },

  detachPackages: async (id, packageIds) => {
    const response = await api.post(`/manifests/${id}/detach-packages`, {
      package_ids: packageIds
    });
    return response.data;
  }
```

### 4. Frontend UI Components

**File:** `frontend/src/components/ManifestDetailView.jsx`

#### Key Features Added:

**A. Add Invoices Modal Enhancements** (Lines 753-770)
- Added clickable "Qty" column showing total package count
- Clicking opens Package Selection dialog
- Visual indication with underline and hover effect

**B. Package Selection Dialog for Adding** (Lines 791-922)
- Shows all packages from selected invoice
- Multi-select checkboxes for individual packages
- Displays package details: #, Qty, Weight, CBM
- Shows current manifest assignment status with color-coded chips:
  - 🟢 Green: On current manifest
  - 🟡 Yellow: On different manifest
  - ⚪ Outlined: Not assigned
- "Add X Package(s)" button

**C. Package Management Dialog for Removal** (Lines 924-978)
- Accessed by clicking package count in INVOICES tab
- Shows only packages assigned to THIS manifest
- Multi-select checkboxes (red theme)
- Warning alert about invoice removal
- "Remove X Package(s)" button
- Auto-removes invoice if all packages removed

**D. Filtered Calculations** (Lines 333-364, 607-622)

Updated calculations to filter by `file_name === manifest?.manifest_number`:

```javascript
// PREVIEW Tab Totals
const calculateTotals = () => {
  // Only count packages assigned to THIS manifest
  const packingDetails = allPackingDetails.filter(
    pkg => pkg.file_name === manifest?.manifest_number
  );

  // Proportional invoice value calculation
  const proportion = manifestQuantity / totalInvoiceQuantity;
  totalValue += invoiceAmount * proportion;
}

// INVOICES Tab Display
const pkgs = allPkgs.filter(p => p.file_name === manifest?.manifest_number);
const packages = pkgs.reduce((sum, p) => sum + quantity, 0);
```

---

## 🎨 User Experience Flow

### Adding Packages to Manifest:

1. Navigate to manifest detail view
2. Go to **INVOICES** tab
3. Click **+ ADD INVOICE** button
4. Modal shows available invoices with clickable **Qty** column
5. Click on Qty number (e.g., "7 packages")
6. **Package Selection Dialog** opens showing:
   - All 7 packages from the invoice
   - Package #, Qty, Weight, CBM
   - Current assignment status (green/yellow/white chips)
7. User selects specific packages (e.g., 3 out of 7)
8. Click "Add 3 Package(s)"
9. Backend updates `file_name` for those 3 packages only
10. Success toast: "3 package(s) added to manifest"
11. PREVIEW and INVOICES tabs automatically update with correct counts

### Removing Packages from Manifest:

1. Navigate to manifest detail view
2. Go to **INVOICES** tab
3. Click on clickable **Packages** number (e.g., "3")
4. **Manage Packages Dialog** opens (red theme) showing:
   - Only packages from that invoice on this manifest
   - Package details
5. User selects packages to remove (e.g., 1 out of 3)
6. Click "Remove 1 Package(s)"
7. Backend clears `file_name` for that package
8. Success toast: "1 package(s) removed from manifest"
9. If all packages removed → invoice relationship auto-removed
10. Calculations automatically update

---

## 📊 Data Flow

### Adding Packages:

```
User clicks Qty → Package Selection Dialog
  ↓
User selects package IDs: [14, 15, 16]
  ↓
Frontend: manifestService.attachPackages(manifestId, [14, 15, 16])
  ↓
Backend: POST /api/manifests/{id}/attach-packages
  ↓
UPDATE packing_details
  SET file_name = 'S00037754'
  WHERE id IN (14, 15, 16)
  ↓
Get unique invoice_ids from those packages
  ↓
Sync manifest.invoices() relationship
  ↓
Return updated manifest with packages
  ↓
Frontend reloads → Calculations filter by file_name
  ↓
Display updated counts
```

### Removing Packages:

```
User clicks Packages count → Manage Packages Dialog
  ↓
User selects package IDs to remove: [14]
  ↓
Frontend: manifestService.detachPackages(manifestId, [14])
  ↓
Backend: POST /api/manifests/{id}/detach-packages
  ↓
UPDATE packing_details
  SET file_name = NULL
  WHERE id = 14 AND file_name = 'S00037754'
  ↓
Check remaining packages from that invoice on manifest
  ↓
If count = 0: manifest.invoices()->detach(invoiceId)
  ↓
Return updated manifest
  ↓
Frontend reloads → Calculations filter by file_name
  ↓
Display updated counts
```

---

## 🔍 Technical Details

### Database Structure:

**Key Tables:**
- `packing_details.file_name` - Stores manifest_number (nullable)
- `invoice_manifest` - Pivot table tracking invoice-manifest relationships
- `manifests` - Manifest records with manifest_number

**Example Data:**
```sql
-- Invoice IN018177 has 7 packages
SELECT pd.id, pd.package_number, pd.file_name, i.invoice_number
FROM packing_details pd
JOIN invoices i ON pd.invoice_id = i.id
WHERE i.invoice_number = 'IN018177';

-- Results showing split shipment:
-- id=14, pkg=1, file_name='S00037754'  → Manifest A
-- id=15, pkg=2, file_name='S00037754'  → Manifest A
-- id=16, pkg=3, file_name=NULL         → Not assigned
-- id=17, pkg=4, file_name='S00037755'  → Manifest B
-- id=18, pkg=5, file_name='S00037755'  → Manifest B
-- id=19, pkg=6, file_name='S00037755'  → Manifest B
-- id=20, pkg=7, file_name='S00037755'  → Manifest B
```

### Proportional Value Calculation:

When displaying invoice values on manifests, the system calculates proportional amounts:

```javascript
// If invoice IN018177 = ZAR 60,058.67 with 7 packages
// And only 3 packages are on this manifest:
const totalInvoiceQuantity = 7;
const manifestQuantity = 3;
const proportion = 3 / 7; // 0.4286
const manifestValue = 60058.67 * 0.4286; // ZAR 25,739.43

// Display shows: ZAR 25,739.43 (not the full 60,058.67)
```

---

## 🧪 Testing Checklist

- [x] Add single package from invoice to manifest
- [x] Add multiple packages from invoice to manifest
- [x] Add all packages from invoice to manifest
- [x] Remove single package from manifest
- [x] Remove multiple packages from manifest
- [x] Remove all packages (invoice relationship auto-removed)
- [x] PREVIEW tab shows correct totals (filtered by file_name)
- [x] INVOICES tab shows correct package counts
- [x] Package Selection dialog shows correct status indicators
- [x] Proportional value calculation works correctly
- [x] Toast notifications display on add/remove
- [x] Multiple invoices with split packages on same manifest
- [x] Package on multiple manifests (edge case)

---

## 📝 Files Modified

### Backend:
1. `backend/app/Http/Controllers/Api/ManifestController.php` - Added attachPackages/detachPackages methods
2. `backend/routes/api.php` - Added package-level routes
3. `backend/app/Http/Controllers/Api/InvoiceController.php` - Added relationships to eager loading

### Frontend:
1. `frontend/src/components/ManifestDetailView.jsx` - Major updates with dialogs and filtering
2. `frontend/src/services/manifestService.js` - Added attachPackages/detachPackages methods

### Documentation:
1. `CLAUDE.md` - Added CRITICAL BUSINESS RULES section
2. `PACKAGE_LEVEL_MANIFEST_SESSION.md` - This file (comprehensive session notes)

---

## 🎓 Key Learnings

### Business Logic Insights:

1. **Package-level granularity is essential** for logistics operations
2. **Split shipments** are common when truck capacity doesn't match invoice quantities
3. **Mixed loads** optimize transport costs by combining multiple orders
4. **Proportional costing** provides accurate per-manifest value tracking

### Technical Insights:

1. **Filter calculations consistently** - Always filter packing_details by file_name when displaying manifest data
2. **Auto-cleanup relationships** - Remove invoice relationships when last package removed
3. **Visual status indicators** - Color-coded chips help users understand package assignment state
4. **Dual dialogs for add/remove** - Different UX patterns for different operations (add=blue/green, remove=red)

---

## 🚀 Performance Considerations

- Eager loading includes `packingDetails` to avoid N+1 queries
- Frontend filters packages in memory (fast for typical invoice sizes)
- Backend updates use `whereIn()` for batch package updates
- Invoice relationship sync uses `syncWithoutDetaching()` to avoid duplicates

---

## 🔮 Future Enhancements

### Potential Additions:
1. **Bulk package operations** - Select packages across multiple invoices
2. **Package history tracking** - Audit trail of package movements
3. **Load optimization suggestions** - AI-powered truck loading recommendations
4. **Package barcode scanning** - Mobile app for warehouse operations
5. **Real-time capacity monitoring** - Show truck fill percentage as packages added

### Related Features (Documented Separately):
- Reporting system (see `REPORTING_REQUIREMENTS.md`)
- Daily Tracker with capacity tracking
- Loading Schedule by truck type
- BV & Freight Reconciliation

---

## 💡 Important Notes

### For Future Developers:

1. **Always filter by file_name** when displaying manifest package data
2. **Never assume whole-invoice operations** - always think at package level
3. **Test with split shipments** - common scenario that must work perfectly
4. **Invoice removal is automatic** - backend handles it when last package removed
5. **Proportional values matter** - customers care about accurate per-manifest costs

### For Operations Team:

1. **Click Qty to manage packages** - both when adding and viewing
2. **Color indicators show status** - green=this manifest, yellow=other, white=none
3. **Remove individual packages** - don't remove whole invoice unless intended
4. **Calculations are automatic** - weight, CBM, value all update instantly
5. **Invoice disappears if empty** - removing all packages removes invoice

---

## 📞 Support

For questions about this feature:
- Review `CLAUDE.md` "CRITICAL BUSINESS RULES" section
- Check this session notes file for implementation details
- Examine `ManifestDetailView.jsx` for UI logic
- Review `ManifestController.php` for backend logic

---

**Status:** ✅ COMPLETE - Fully implemented and tested
**Next Steps:** DOCUMENTS tab enhancements (upload/manage/FERI process)
