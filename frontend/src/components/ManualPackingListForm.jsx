import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  Grid,
  Alert,
  MenuItem,
  CircularProgress,
  Divider,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  PictureAsPdf as PdfIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const PACKAGE_TYPES = [
  { value: 'PALLET', label: 'Pallet' },
  { value: 'BOX', label: 'Box' },
  { value: 'CRATE', label: 'Crate' },
  { value: 'CARTON', label: 'Carton' },
  { value: 'DRUM', label: 'Drum' },
  { value: 'BAG', label: 'Bag' },
  { value: 'OTHER', label: 'Other' }
];

const ManualPackingListForm = ({ open, onClose, invoice, onSaved }) => {
  const [packages, setPackages] = useState([createEmptyPackage()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [totals, setTotals] = useState({
    totalPackages: 0,
    totalGrossWeight: 0,
    totalNetWeight: 0,
    totalCBM: 0
  });

  function createEmptyPackage() {
    return {
      package_type: 'PALLET',
      quantity: 1,
      description: '',
      weight_per_unit_kg: '',
      weight_kg: '',
      dimensions: {
        length: '',
        width: '',
        height: ''
      }
    };
  }

  // Calculate totals whenever packages change
  useEffect(() => {
    calculateTotals();
  }, [packages]);

  const calculateTotals = () => {
    let totalGrossWeight = 0;
    let totalCBM = 0;

    packages.forEach(pkg => {
      // Calculate weight
      let weight = 0;
      if (pkg.weight_per_unit_kg && pkg.quantity) {
        weight = parseFloat(pkg.weight_per_unit_kg) * parseInt(pkg.quantity);
      } else if (pkg.weight_kg) {
        weight = parseFloat(pkg.weight_kg);
      }
      totalGrossWeight += weight;

      // Calculate CBM
      if (pkg.dimensions.length && pkg.dimensions.width && pkg.dimensions.height && pkg.quantity) {
        const cbm = (parseFloat(pkg.dimensions.length) / 100) *
                    (parseFloat(pkg.dimensions.width) / 100) *
                    (parseFloat(pkg.dimensions.height) / 100) *
                    parseInt(pkg.quantity);
        totalCBM += cbm;
      }
    });

    const totalNetWeight = totalGrossWeight * 0.95; // 95% of gross

    setTotals({
      totalPackages: packages.length,
      totalGrossWeight: totalGrossWeight.toFixed(2),
      totalNetWeight: totalNetWeight.toFixed(2),
      totalCBM: totalCBM.toFixed(3)
    });
  };

  const handleAddPackage = () => {
    setPackages([...packages, createEmptyPackage()]);
  };

  const handleRemovePackage = (index) => {
    if (packages.length > 1) {
      const newPackages = packages.filter((_, i) => i !== index);
      setPackages(newPackages);
    }
  };

  const handlePackageChange = (index, field, value) => {
    const newPackages = [...packages];
    if (field.includes('.')) {
      // Handle nested fields (dimensions)
      const [parent, child] = field.split('.');
      newPackages[index][parent][child] = value;
    } else {
      newPackages[index][field] = value;
    }
    setPackages(newPackages);
  };

  const validateForm = () => {
    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];

      if (!pkg.package_type) {
        setError(`Package ${i + 1}: Package type is required`);
        return false;
      }

      if (!pkg.description || pkg.description.trim() === '') {
        setError(`Package ${i + 1}: Description is required`);
        return false;
      }

      if (!pkg.quantity || pkg.quantity < 1) {
        setError(`Package ${i + 1}: Quantity must be at least 1`);
        return false;
      }

      if (!pkg.weight_per_unit_kg && !pkg.weight_kg) {
        setError(`Package ${i + 1}: Either weight per unit or total weight must be provided`);
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/invoices/${invoice.id}/packing-list`,
        { packages }
      );

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          if (onSaved) {
            onSaved(response.data.data);
          }
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error('Error saving packing list:', err);
      setError(err.response?.data?.message || 'Failed to save packing list');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/invoices/${invoice.id}/packing-list/pdf`,
        { responseType: 'blob' }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Packing_List_${invoice.invoice_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError('Failed to download PDF. Please save the packing list first.');
    }
  };

  const handleClose = () => {
    if (!loading) {
      setPackages([createEmptyPackage()]);
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Create Manual Packing List - {invoice?.invoice_number}
          </Typography>
          <IconButton onClick={handleClose} disabled={loading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Packing list saved successfully!
          </Alert>
        )}

        <Box mb={2}>
          <Alert severity="info" icon={false}>
            <Typography variant="body2">
              <strong>Invoice:</strong> {invoice?.invoice_number} |
              <strong> Customer:</strong> {invoice?.customer?.name} |
              <strong> Supplier:</strong> {invoice?.supplier?.name}
            </Typography>
          </Alert>
        </Box>

        <TableContainer component={Paper} sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>#</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Type</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Description</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Qty</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Weight/Unit (kg)</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Total Weight (kg)</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Dimensions (cm)</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {packages.map((pkg, index) => (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      value={pkg.package_type}
                      onChange={(e) => handlePackageChange(index, 'package_type', e.target.value)}
                      fullWidth
                      required
                    >
                      {PACKAGE_TYPES.map(type => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={pkg.description}
                      onChange={(e) => handlePackageChange(index, 'description', e.target.value)}
                      placeholder="Product description"
                      fullWidth
                      required
                      multiline
                      rows={2}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={pkg.quantity}
                      onChange={(e) => handlePackageChange(index, 'quantity', e.target.value)}
                      fullWidth
                      required
                      inputProps={{ min: 1 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={pkg.weight_per_unit_kg}
                      onChange={(e) => handlePackageChange(index, 'weight_per_unit_kg', e.target.value)}
                      placeholder="Per unit"
                      fullWidth
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={pkg.weight_kg}
                      onChange={(e) => handlePackageChange(index, 'weight_kg', e.target.value)}
                      placeholder="Total"
                      fullWidth
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Grid container spacing={0.5}>
                      <Grid item xs={4}>
                        <TextField
                          size="small"
                          type="number"
                          value={pkg.dimensions.length}
                          onChange={(e) => handlePackageChange(index, 'dimensions.length', e.target.value)}
                          placeholder="L"
                          fullWidth
                          inputProps={{ min: 0 }}
                        />
                      </Grid>
                      <Grid item xs={4}>
                        <TextField
                          size="small"
                          type="number"
                          value={pkg.dimensions.width}
                          onChange={(e) => handlePackageChange(index, 'dimensions.width', e.target.value)}
                          placeholder="W"
                          fullWidth
                          inputProps={{ min: 0 }}
                        />
                      </Grid>
                      <Grid item xs={4}>
                        <TextField
                          size="small"
                          type="number"
                          value={pkg.dimensions.height}
                          onChange={(e) => handlePackageChange(index, 'dimensions.height', e.target.value)}
                          placeholder="H"
                          fullWidth
                          inputProps={{ min: 0 }}
                        />
                      </Grid>
                    </Grid>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemovePackage(index)}
                      disabled={packages.length === 1}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddPackage}
            disabled={loading}
          >
            Add Package
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Paper elevation={3} sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Typography variant="h6" gutterBottom>
            Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <Box textAlign="center">
                <Typography variant="caption" color="textSecondary">
                  Total Packages
                </Typography>
                <Typography variant="h5" color="primary">
                  {totals.totalPackages}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box textAlign="center">
                <Typography variant="caption" color="textSecondary">
                  Gross Weight
                </Typography>
                <Typography variant="h5" color="primary">
                  {totals.totalGrossWeight} kg
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box textAlign="center">
                <Typography variant="caption" color="textSecondary">
                  Net Weight
                </Typography>
                <Typography variant="h5" color="primary">
                  {totals.totalNetWeight} kg
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box textAlign="center">
                <Typography variant="caption" color="textSecondary">
                  Total CBM
                </Typography>
                <Typography variant="h5" color="primary">
                  {totals.totalCBM} m³
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        {invoice?.packingDetails?.length > 0 && (
          <Button
            startIcon={<PdfIcon />}
            onClick={handleDownloadPDF}
            disabled={loading}
            variant="outlined"
          >
            Download PDF
          </Button>
        )}
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={loading || packages.length === 0}
        >
          {loading ? 'Saving...' : 'Save Packing List'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManualPackingListForm;
