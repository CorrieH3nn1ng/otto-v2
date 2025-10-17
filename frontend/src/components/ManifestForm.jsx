import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
} from '@mui/material';
import {
  Assignment as ManifestIcon,
  Save as SaveIcon,
  LocalShipping as TruckIcon,
} from '@mui/icons-material';
import { manifestService } from '../services/manifestService';
import { invoiceService } from '../services/invoiceService';

export default function ManifestForm({ loadConfirmation, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [formData, setFormData] = useState({
    manifest_number: '',
    load_confirmation_id: loadConfirmation?.id || '',
    export_date: new Date().toISOString().split('T')[0],
    border_post: '',
    customs_office: '',
    invoice_ids: [],
  });
  const [summary, setSummary] = useState({
    total_invoices: 0,
    total_packages: 0,
    total_weight: 0,
    total_value: 0,
    currency: 'USD',
  });

  // Auto-generate manifest number
  useEffect(() => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const manifestNumber = `MAN-${dateStr}-${randomNum}`;
    setFormData(prev => ({ ...prev, manifest_number: manifestNumber }));
  }, []);

  // Load available invoices
  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      // Get all invoices that are ready for manifest
      const response = await invoiceService.getAll();
      const data = response.data || response;

      // Filter invoices that are in stage "transport_arranged" or later
      const eligibleInvoices = data.filter(inv =>
        ['transport_arranged', 'ready_for_manifest'].includes(inv.current_stage) &&
        !inv.manifest_id // Not already on a manifest
      );

      setInvoices(eligibleInvoices);

      // If load confirmation provided, pre-select its invoices
      if (loadConfirmation?.invoices) {
        const lcInvoiceIds = loadConfirmation.invoices.map(inv => inv.id);
        setFormData(prev => ({ ...prev, invoice_ids: lcInvoiceIds }));
      }
    } catch (err) {
      console.error('Error loading invoices:', err);
    }
  };

  // Calculate summary when invoice selection changes
  useEffect(() => {
    calculateSummary();
  }, [formData.invoice_ids, invoices]);

  const calculateSummary = () => {
    const selectedInvoices = invoices.filter(inv => formData.invoice_ids.includes(inv.id));

    const totalPackages = selectedInvoices.reduce((sum, inv) => {
      return sum + (inv.packing_details?.length || 0);
    }, 0);

    const totalWeight = selectedInvoices.reduce((sum, inv) => {
      return sum + (inv.packing_details || []).reduce((w, pkg) => w + (parseFloat(pkg.gross_weight_kg) || 0), 0);
    }, 0);

    const totalValue = selectedInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total_value) || 0), 0);

    const currency = selectedInvoices[0]?.currency || 'USD';

    setSummary({
      total_invoices: selectedInvoices.length,
      total_packages: totalPackages,
      total_weight: totalWeight.toFixed(2),
      total_value: totalValue.toFixed(2),
      currency,
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleInvoiceSelection = (invoiceId) => {
    setFormData(prev => {
      const invoice_ids = prev.invoice_ids.includes(invoiceId)
        ? prev.invoice_ids.filter(id => id !== invoiceId)
        : [...prev.invoice_ids, invoiceId];
      return { ...prev, invoice_ids };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.invoice_ids.length === 0) {
      setError('Please select at least one invoice');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await manifestService.create(formData);
      onSuccess(result);
    } catch (err) {
      console.error('Error creating manifest:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create manifest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2 }}>
      {/* Header Info from Load Confirmation */}
      {loadConfirmation && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            bgcolor: '#e6f9f5',
            border: '2px solid #73e9c7',
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <TruckIcon sx={{ color: '#001f3f', fontSize: 32 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#001f3f' }}>
                Load Confirmation: {loadConfirmation.file_reference}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Creating manifest from this load confirmation
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Transporter:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {loadConfirmation.transporter_name || 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Vehicle Type:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {loadConfirmation.vehicle_type || 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Collection Date:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {loadConfirmation.collection_date ? new Date(loadConfirmation.collection_date).toLocaleDateString() : 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Truck Reg:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {loadConfirmation.truck_registration || 'N/A'}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Manifest Details */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#001f3f' }}>
        Manifest Details
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Manifest Number"
            name="manifest_number"
            value={formData.manifest_number}
            onChange={handleChange}
            required
            InputProps={{
              readOnly: true,
            }}
            helperText="Auto-generated"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="date"
            label="Export Date"
            name="export_date"
            value={formData.export_date}
            onChange={handleChange}
            required
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Border Post / Port of Entry"
            name="border_post"
            value={formData.border_post}
            onChange={handleChange}
            placeholder="e.g., Kasumbalesa, Chirundu"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Customs Office"
            name="customs_office"
            value={formData.customs_office}
            onChange={handleChange}
            placeholder="e.g., Lubumbashi Customs"
          />
        </Grid>
      </Grid>

      {/* Invoice Selection */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#001f3f' }}>
        Select Invoices
      </Typography>

      {invoices.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          No eligible invoices available. Invoices must be in "Transport Arranged" stage and not already on a manifest.
        </Alert>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ mb: 3, border: '1px solid #e0e0e0' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#001f3f' }}>
              <TableRow>
                <TableCell padding="checkbox" sx={{ color: 'white' }}></TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Invoice #</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Customer</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>File Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Packages</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Weight (kg)</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((invoice) => {
                const isSelected = formData.invoice_ids.includes(invoice.id);
                const totalWeight = (invoice.packing_details || []).reduce((sum, pkg) =>
                  sum + (parseFloat(pkg.gross_weight_kg) || 0), 0
                );

                return (
                  <TableRow
                    key={invoice.id}
                    hover
                    onClick={() => handleInvoiceSelection(invoice.id)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: isSelected ? '#e6f9f5' : 'inherit',
                      '&:hover': { bgcolor: isSelected ? '#d0f2ea' : '#f5f5f5' },
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleInvoiceSelection(invoice.id)}
                        sx={{
                          color: '#73e9c7',
                          '&.Mui-checked': { color: '#73e9c7' },
                        }}
                      />
                    </TableCell>
                    <TableCell>{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.customer?.name || 'N/A'}</TableCell>
                    <TableCell>
                      {invoice.packing_details?.[0]?.file_name || 'N/A'}
                    </TableCell>
                    <TableCell>{invoice.packing_details?.length || 0}</TableCell>
                    <TableCell>{totalWeight.toFixed(2)}</TableCell>
                    <TableCell>
                      {invoice.currency} {parseFloat(invoice.total_value || 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Summary */}
      {formData.invoice_ids.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            bgcolor: '#f8f9fa',
            border: '2px solid #001f3f',
            borderRadius: 2,
          }}
        >
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#001f3f' }}>
            Manifest Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Total Invoices:</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#001f3f' }}>
                {summary.total_invoices}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Total Packages:</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#001f3f' }}>
                {summary.total_packages}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Total Weight (kg):</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#001f3f' }}>
                {summary.total_weight}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Total Value:</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#001f3f' }}>
                {summary.currency} {summary.total_value}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          disabled={loading}
          sx={{
            borderColor: '#001f3f',
            color: '#001f3f',
            '&:hover': {
              borderColor: '#003d5c',
              bgcolor: '#f5f5f5',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading || formData.invoice_ids.length === 0}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          sx={{
            bgcolor: '#001f3f',
            color: 'white',
            '&:hover': {
              bgcolor: '#003d5c',
            },
          }}
        >
          {loading ? 'Creating...' : 'Create Manifest'}
        </Button>
      </Box>
    </Box>
  );
}
