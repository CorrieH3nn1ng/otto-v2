# Split Package Feature - Integration Instructions

## Changes Required to InvoiceDetailView.jsx

### 1. Import SplitPackageDialog at the top of the file

Add this import after line 37:
```javascript
import SplitPackageDialog from './SplitPackageDialog';
```

### 2. Add canSplitPackages to PackingDetailsTab props

Change line 469 from:
```javascript
<PackingDetailsTab
  details={editedInvoice.packing_details || []}
  isEditable={isEditable}
  onChange={(details) => setEditedInvoice({ ...editedInvoice, packing_details: details })}
/>
```

To:
```javascript
<PackingDetailsTab
  details={editedInvoice.packing_details || []}
  isEditable={isEditable}
  onChange={(details) => setEditedInvoice({ ...editedInvoice, packing_details: details })}
  canSplitPackages={canSplitPackages()}
/>
```

### 3. Update PackingDetailsTab Component Signature

Change line 688 from:
```javascript
const PackingDetailsTab = ({ details, isEditable, onChange }) => {
```

To:
```javascript
const PackingDetailsTab = ({ details, isEditable, onChange, canSplitPackages }) => {
```

### 4. Add Split Dialog State (after line 691)

Add these state declarations:
```javascript
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [selectedPackageIndex, setSelectedPackageIndex] = useState(null);
```

### 5. Add Split Handler Function (after handleUpdateDetail function, around line 818)

Add this complete function:
```javascript
  const handleSplitPackage = (splitData) => {
    if (selectedPackageIndex === null) return;

    const originalPackage = details[selectedPackageIndex];

    // Calculate remaining values for original package
    const remainingPackage = {
      ...originalPackage,
      gross_weight_kg: (parseFloat(originalPackage.gross_weight_kg) - parseFloat(splitData.gross_weight_kg)).toFixed(2),
      net_weight_kg: (parseFloat(originalPackage.net_weight_kg) - parseFloat(splitData.net_weight_kg)).toFixed(2),
      length_cm: originalPackage.length_cm, // Keep original dimensions for remaining
      width_cm: originalPackage.width_cm,
      height_cm: originalPackage.height_cm,
      cbm: originalPackage.cbm, // Recalculated automatically
      volumetric_weight_kg: originalPackage.volumetric_weight_kg,
      file_name: originalPackage.file_name, // Keep original file name
    };

    // Create new split package
    const newPackage = {
      package_number: details.length + 1, // Will be renumbered
      package_type: originalPackage.package_type,
      gross_weight_kg: parseFloat(splitData.gross_weight_kg),
      net_weight_kg: parseFloat(splitData.net_weight_kg),
      length_cm: parseFloat(splitData.length_cm),
      width_cm: parseFloat(splitData.width_cm),
      height_cm: parseFloat(splitData.height_cm),
      cbm: splitData.cbm,
      volumetric_weight_kg: splitData.volumetric_weight_kg,
      contents_description: splitData.contents_description,
      file_name: '', // New package starts with empty file name
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

### 6. Add Split Button to Actions Column (around line 1001-1006)

Replace the Actions TableCell from:
```javascript
                {isEditable && (
                  <TableCell>
                    <IconButton size="small" onClick={() => handleDeleteDetail(index)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                )}
```

To:
```javascript
                {isEditable && (
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
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
                      <IconButton size="small" onClick={() => handleDeleteDetail(index)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                )}
```

### 7. Add Split Dialog Component (before the closing </Box> tag, around line 1013)

Add this before the closing `</Box>` of the return statement:
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
    </Box>
```

---

## Summary

After these changes, the split package functionality will:

1. Show a "Split" button (CallSplitIcon) next to the Delete button for each packing item
2. Only Admin and Key Account Manager users will see the Split button
3. Clicking Split opens a dialog where they can specify split quantities
4. The system will:
   - Create a new package with the split quantities
   - Subtract those quantities from the original package
   - Renumber all packages sequentially
   - Clear the file_name for the new package (so it can be assigned separately)

## Testing Checklist

- [ ] Switch to Admin profile and verify Split button appears
- [ ] Switch to Key Account Manager and verify Split button appears
- [ ] Switch to Transport Planner and verify Split button does NOT appear
- [ ] Click Split button and verify dialog opens with original package info
- [ ] Enter split values and verify validation works
- [ ] Submit split and verify two packages exist with correct values
- [ ] Verify package numbers are renumbered correctly
- [ ] Verify original package file_name is retained
- [ ] Verify new package has empty file_name
