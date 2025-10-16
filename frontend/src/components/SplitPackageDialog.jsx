import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';

// Split Package Dialog Component
const SplitPackageDialog = ({ open, onClose, originalPackage, onSplit }) => {
  const [splitData, setSplitData] = useState({
    gross_weight_kg: 0,
    net_weight_kg: 0,
    length_cm: 0,
    width_cm: 0,
    height_cm: 0,
    cbm: 0,
    volumetric_weight_kg: 0,
    contents_description: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open && originalPackage) {
      // Reset split data when dialog opens
      setSplitData({
        gross_weight_kg: 0,
        net_weight_kg: 0,
        length_cm: 0,
        width_cm: 0,
        height_cm: 0,
        cbm: 0,
        volumetric_weight_kg: 0,
        contents_description: '',
      });
      setErrors({});
    }
  }, [open, originalPackage]);

  // Auto-calculate CBM and volumetric weight when dimensions change
  useEffect(() => {
    const l = parseFloat(splitData.length_cm) || 0;
    const w = parseFloat(splitData.width_cm) || 0;
    const h = parseFloat(splitData.height_cm) || 0;
    const calculatedCBM = ((l * w * h) / 1000000).toFixed(6);
    const calculatedVolWeight = (parseFloat(calculatedCBM) * 167).toFixed(3);

    setSplitData(prev => ({
      ...prev,
      cbm: calculatedCBM,
      volumetric_weight_kg: calculatedVolWeight
    }));
  }, [splitData.length_cm, splitData.width_cm, splitData.height_cm]);

  const handleChange = (field, value) => {
    setSplitData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const newErrors = {};

    // Validate weights
    if (parseFloat(splitData.gross_weight_kg) <= 0) {
      newErrors.gross_weight_kg = 'Gross weight must be greater than 0';
    }
    if (parseFloat(splitData.gross_weight_kg) > parseFloat(originalPackage.gross_weight_kg)) {
      newErrors.gross_weight_kg = `Cannot exceed original gross weight (${originalPackage.gross_weight_kg} kg)`;
    }

    if (parseFloat(splitData.net_weight_kg) <= 0) {
      newErrors.net_weight_kg = 'Net weight must be greater than 0';
    }
    if (parseFloat(splitData.net_weight_kg) > parseFloat(originalPackage.net_weight_kg)) {
      newErrors.net_weight_kg = `Cannot exceed original net weight (${originalPackage.net_weight_kg} kg)`;
    }

    // Validate dimensions
    if (parseFloat(splitData.length_cm) <= 0) {
      newErrors.length_cm = 'Length must be greater than 0';
    }
    if (parseFloat(splitData.width_cm) <= 0) {
      newErrors.width_cm = 'Width must be greater than 0';
    }
    if (parseFloat(splitData.height_cm) <= 0) {
      newErrors.height_cm = 'Height must be greater than 0';
    }

    // Validate CBM
    if (parseFloat(splitData.cbm) > parseFloat(originalPackage.cbm)) {
      newErrors.cbm = `Cannot exceed original CBM (${originalPackage.cbm})`;
    }

    // Validate contents description
    if (!splitData.contents_description.trim()) {
      newErrors.contents_description = 'Contents description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSplit = () => {
    if (!validate()) {
      return;
    }

    onSplit(splitData);
    onClose();
  };

  if (!originalPackage) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: '#001f3f', color: 'white', fontWeight: 600 }}>
        Split Package #{originalPackage.package_number}
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Typography variant="body2" sx={{ mb: 2, color: '#666', fontStyle: 'italic' }}>
          Specify the quantities to split off from Package #{originalPackage.package_number}. The remaining values will be subtracted from the original package.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Box sx={{ flex: 1, p: 2, bgcolor: '#e6f9f5', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Original Package</Typography>
            <Typography variant="caption">Gross: {originalPackage.gross_weight_kg} kg</Typography><br />
            <Typography variant="caption">Net: {originalPackage.net_weight_kg} kg</Typography><br />
            <Typography variant="caption">CBM: {originalPackage.cbm}</Typography><br />
            <Typography variant="caption">Dimensions: {originalPackage.length_cm} x {originalPackage.width_cm} x {originalPackage.height_cm} cm</Typography>
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              label="Gross Weight (kg)"
              type="number"
              value={splitData.gross_weight_kg}
              onChange={(e) => handleChange('gross_weight_kg', e.target.value)}
              fullWidth
              size="small"
              error={!!errors.gross_weight_kg}
              helperText={errors.gross_weight_kg}
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Net Weight (kg)"
              type="number"
              value={splitData.net_weight_kg}
              onChange={(e) => handleChange('net_weight_kg', e.target.value)}
              fullWidth
              size="small"
              error={!!errors.net_weight_kg}
              helperText={errors.net_weight_kg}
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>

          <Grid item xs={4}>
            <TextField
              label="Length (cm)"
              type="number"
              value={splitData.length_cm}
              onChange={(e) => handleChange('length_cm', e.target.value)}
              fullWidth
              size="small"
              error={!!errors.length_cm}
              helperText={errors.length_cm}
              inputProps={{ min: 0, step: 0.1 }}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              label="Width (cm)"
              type="number"
              value={splitData.width_cm}
              onChange={(e) => handleChange('width_cm', e.target.value)}
              fullWidth
              size="small"
              error={!!errors.width_cm}
              helperText={errors.width_cm}
              inputProps={{ min: 0, step: 0.1 }}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              label="Height (cm)"
              type="number"
              value={splitData.height_cm}
              onChange={(e) => handleChange('height_cm', e.target.value)}
              fullWidth
              size="small"
              error={!!errors.height_cm}
              helperText={errors.height_cm}
              inputProps={{ min: 0, step: 0.1 }}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              label="CBM (calculated)"
              value={splitData.cbm}
              fullWidth
              size="small"
              disabled
              error={!!errors.cbm}
              helperText={errors.cbm}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Volumetric Weight (kg)"
              value={splitData.volumetric_weight_kg}
              fullWidth
              size="small"
              disabled
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Contents Description"
              value={splitData.contents_description}
              onChange={(e) => handleChange('contents_description', e.target.value)}
              fullWidth
              size="small"
              multiline
              rows={2}
              error={!!errors.contents_description}
              helperText={errors.contents_description}
              placeholder="Describe the contents of this split package"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderColor: '#001f3f', color: '#001f3f' }}>
          Cancel
        </Button>
        <Button
          onClick={handleSplit}
          variant="contained"
          sx={{ bgcolor: '#73e9c7', color: '#001f3f', '&:hover': { bgcolor: '#5fd4b3' } }}
        >
          Split Package
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SplitPackageDialog;
