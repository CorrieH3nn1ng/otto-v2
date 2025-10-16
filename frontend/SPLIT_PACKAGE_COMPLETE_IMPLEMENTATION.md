# Split Package Feature - Complete Implementation Guide

## Overview
This feature allows Admin and Key Account Manager users to split packing list items when certain items need priority shipping. When a package is split, the system:
- Creates a new package with the specified split quantities
- Subtracts those quantities from the original package
- Renumbers all packages sequentially
- Clears the file_name for the new package

## Implementation Status: ✅ COMPLETE

All 7 steps have been successfully implemented.

## Files Created/Modified

### 1. SplitPackageDialog.jsx
**Location:** `C:/projects/otto-v2/frontend/src/components/SplitPackageDialog.jsx`
**Status:** ✅ COMPLETE

This file contains a complete dialog component that:
- Shows original package information
- Provides form fields for split quantities (weights, dimensions, contents)
- Auto-calculates CBM and volumetric weight
- Validates that split values don't exceed original values

### 2. InvoiceDetailView.jsx
**Location:** `C:/projects/otto-v2/frontend/src/components/InvoiceDetailView.jsx`
**Status:** ✅ COMPLETE

All integration points have been completed:

## Completed Integration Steps

### Step 1: Import Statement (Line 38) ✅
```javascript
import SplitPackageDialog from './SplitPackageDialog';
```

### Step 2: canSplitPackages Prop (Line 524) ✅
```javascript
<PackingDetailsTab
  details={editedInvoice.packing_details || []}
  isEditable={isEditable}
  onChange={(details) => setEditedInvoice({ ...editedInvoice, packing_details: details })}
  canSplitPackages={canSplitPackages()}
/>
```

### Step 3: Update PackingDetailsTab Component Signature (Line 740) ✅
```javascript
const PackingDetailsTab = ({ details, isEditable, onChange, canSplitPackages }) => {
```

### Step 4: Add Split Dialog State (Lines 744-745) ✅
```javascript
const [splitDialogOpen, setSplitDialogOpen] = useState(false);
const [selectedPackageIndex, setSelectedPackageIndex] = useState(null);
```

### Step 5: Add Handler Functions (Lines 874-930) ✅
```javascript
const handleSplitPackage = (splitData) => {
  if (selectedPackageIndex === null) return;

  const originalPackage = details[selectedPackageIndex];

  // Calculate remaining values for original package
  const remainingPackage = {
    ...originalPackage,
    gross_weight_kg: (parseFloat(originalPackage.gross_weight_kg) - parseFloat(splitData.gross_weight_kg)).toFixed(2),
    net_weight_kg: (parseFloat(originalPackage.net_weight_kg) - parseFloat(splitData.net_weight_kg)).toFixed(2),
    length_cm: originalPackage.length_cm,
    width_cm: originalPackage.width_cm,
    height_cm: originalPackage.height_cm,
    cbm: originalPackage.cbm,
    volumetric_weight_kg: originalPackage.volumetric_weight_kg,
    file_name: originalPackage.file_name,
  };

  // Create new split package
  const newPackage = {
    package_number: details.length + 1,
    package_type: originalPackage.package_type,
    gross_weight_kg: parseFloat(splitData.gross_weight_kg),
    net_weight_kg: parseFloat(splitData.net_weight_kg),
    length_cm: parseFloat(splitData.length_cm),
    width_cm: parseFloat(splitData.width_cm),
    height_cm: parseFloat(splitData.height_cm),
    cbm: splitData.cbm,
    volumetric_weight_kg: splitData.volumetric_weight_kg,
    contents_description: splitData.contents_description,
    file_name: '',
  };

  // Create new array with updated packages
  const newDetails = [...details];
  newDetails[selectedPackageIndex] = remainingPackage;
  newDetails.push(newPackage);

  // Renumber all packages sequentially
  const renumberedDetails = newDetails.map((pkg, idx) => ({
    ...pkg,
    package_number: idx + 1
  }));

  onChange(renumberedDetails);
  setSplitDialogOpen(false);
  setSelectedPackageIndex(null);
};

const handleOpenSplitDialog = (index) => {
  if (!canSplitPackages) {
    alert('You do not have permission to split packages. Only Admin and Key Account Manager roles can split.');
    return;
  }
  setSelectedPackageIndex(index);
  setSplitDialogOpen(true);
};
```

### Step 6: Update Actions Column (Lines 1116-1124) ✅
```javascript
{canSplitPackages && (
  <IconButton
    size="small"
    onClick={() => handleOpenSplitDialog(index)}
    sx={{ color: '#001f3f' }}
    title="Split Package"
  >
    <CallSplitIcon />
  </IconButton>
)}
```

### Step 7: Add SplitPackageDialog Component (Lines 1138-1147) ✅
```javascript
{/* Split Package Dialog */}
<SplitPackageDialog
  open={splitDialogOpen}
  onClose={() => {
    setSplitDialogOpen(false);
    setSelectedPackageIndex(null);
  }}
  originalPackage={selectedPackageIndex !== null ? details[selectedPackageIndex] : null}
  onSplit={handleSplitPackage}
/>
```

## Summary of Implementation

✅ **All 7 steps completed** - The split package feature is fully integrated and ready for testing.

## How the Split Feature Works

1. **User clicks Split button** → Opens dialog with original package info
2. **User enters split quantities** → Form validates that values don't exceed original
3. **User clicks "Split Package"** → System performs:
   - Subtracts split quantities from original package
   - Creates new package with split quantities
   - Renumbers all packages sequentially (1, 2, 3, ...)
   - Clears file_name on new package (so it can be assigned separately)
4. **Result** → Two packages instead of one, with correct quantities

## Testing Checklist

- [ ] Switch to Admin profile and verify Split button appears
- [ ] Switch to Key Account Manager and verify Split button appears
- [ ] Switch to Transport Planner and verify Split button does NOT appear
- [ ] Click Split button and verify dialog opens with original package info
- [ ] Enter split values and verify validation works (can't exceed original)
- [ ] Submit split and verify:
  - Two packages exist with correct values
  - Original package has reduced quantities
  - New package has split quantities
  - All packages are renumbered (1, 2, 3...)
  - Original package keeps its file_name
  - New package has empty file_name

## Profile Permissions

Only these profiles can see and use the Split button:
- ✅ **admin**
- ✅ **key_account_manager**
- ❌ **transport_planner** (no access)
- ❌ **warehouse_manager** (no access)

## Notes

- The split button only appears when the invoice is in edit mode
- Split validation ensures you can't split more than what exists in the original package
- CBM and volumetric weight are auto-calculated based on dimensions entered
- After splitting, save the invoice to persist changes to the backend

## Implementation Date
Completed: 2025-10-15
