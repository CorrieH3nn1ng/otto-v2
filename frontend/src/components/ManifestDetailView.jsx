import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Assignment as ManifestIcon,
  LocalShipping as TruckIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Description as InvoiceIcon,
} from '@mui/icons-material';

export default function ManifestDetailView({ manifest: initialManifest, manifestId }) {
  const [manifest, setManifest] = useState(initialManifest);
  const [loading, setLoading] = useState(!initialManifest && !!manifestId);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!initialManifest && manifestId) {
      // TODO: Fetch manifest by ID
      // For now, we'll use the passed manifest
      setLoading(false);
    }
  }, [manifestId, initialManifest]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!manifest) {
    return <Alert severity="warning">No manifest data available</Alert>;
  }

  // Get load confirmation data
  const loadConfirmation = manifest.load_confirmation || {};

  // Get invoices data
  const invoices = manifest.invoices || [];

  // Calculate totals from invoices
  const calculateTotals = () => {
    let totalPieces = 0;
    let totalWeight = 0;
    let totalCBM = 0;
    let totalValue = 0;
    let currency = 'USD';

    invoices.forEach(invoice => {
      const packingDetails = invoice.packing_details || [];
      totalPieces += packingDetails.length;

      packingDetails.forEach(pkg => {
        totalWeight += parseFloat(pkg.gross_weight_kg || 0);
        totalCBM += parseFloat(pkg.cbm_volume || 0);
      });

      totalValue += parseFloat(invoice.total_value || 0);
      if (invoice.currency) currency = invoice.currency;
    });

    return {
      pieces: totalPieces,
      weight: totalWeight.toFixed(2),
      cbm: totalCBM.toFixed(2),
      value: totalValue.toFixed(2),
      currency
    };
  };

  const totals = calculateTotals();

  // Get supplier and customer info from first invoice
  const firstInvoice = invoices[0] || {};
  const supplier = firstInvoice.supplier || {};
  const customer = firstInvoice.customer || {};

  // Concatenate invoice and PO numbers
  const invoiceNumbers = invoices.map(inv => inv.invoice_number).filter(Boolean).join(' / ');
  const poNumbers = invoices.map(inv => inv.purchase_order_number).filter(Boolean).join(' / ');

  return (
    <Box sx={{ p: 2 }}>
      {/* Header Section */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          bgcolor: '#001f3f',
          color: 'white',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <ManifestIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {manifest.manifest_number}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Road Freight Manifest
            </Typography>
          </Box>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>Export Date:</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {manifest.export_date ? new Date(manifest.export_date).toLocaleDateString() : 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>Status:</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {manifest.status?.replace(/_/g, ' ').toUpperCase()}
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>Customs Status:</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {manifest.customs_status?.toUpperCase()}
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>FERI Date:</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {manifest.feri_application_date
                ? new Date(manifest.feri_application_date).toLocaleDateString()
                : 'Not Submitted'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Transport & Clearing Information */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#001f3f' }}>
          Transport & Clearing Information
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Box sx={{ p: 2, bgcolor: '#e6f9f5', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">TRANSPORTER</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#001f3f' }}>
                {loadConfirmation.transporter_name || 'N/A'}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box sx={{ p: 2, bgcolor: '#e6f9f5', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">CLEARING AGENT (Exit)</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#001f3f' }}>
                {loadConfirmation.clearing_agent || 'N/A'}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box sx={{ p: 2, bgcolor: '#e6f9f5', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">DRC AGENT (Entry)</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#001f3f' }}>
                {loadConfirmation.entry_agent || 'N/A'}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box sx={{ p: 2, bgcolor: '#e6f9f5', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">PLACE OF OFFLOADING</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#001f3f' }}>
                {manifest.border_post || loadConfirmation.delivery_address || 'N/A'}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={6} md={2}>
            <Typography variant="caption" color="text.secondary">MODE</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>ROAD</Typography>
          </Grid>
          <Grid item xs={6} md={2}>
            <Typography variant="caption" color="text.secondary">TRUCK TYPE</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {loadConfirmation.vehicle_type || 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={6} md={2}>
            <Typography variant="caption" color="text.secondary">BORDER</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {manifest.border_post || 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={6} md={2}>
            <Typography variant="caption" color="text.secondary">HORSE</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {loadConfirmation.truck_registration || 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={6} md={2}>
            <Typography variant="caption" color="text.secondary">TRAILER</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {loadConfirmation.trailer_1_registration || 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={6} md={2}>
            <Typography variant="caption" color="text.secondary">TRAILER 2</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {loadConfirmation.trailer_2_registration || '-'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Shipment Details */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#001f3f' }}>
          Shipment Details
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#001f3f' }}>
                CONSIGNOR (Supplier)
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {supplier.name || 'N/A'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {supplier.address || ''}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#001f3f' }}>
                CONSIGNEE (Customer)
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {customer.name || 'N/A'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {customer.address || ''}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#001f3f' }}>
                GOODS DESCRIPTION
              </Typography>
              <Typography variant="body2">
                {loadConfirmation.commodity_description || 'Mining Equipment'}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" color="text.secondary">Pieces:</Typography>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#001f3f' }}>
              {totals.pieces}
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" color="text.secondary">Weight (kg):</Typography>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#001f3f' }}>
              {totals.weight}
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" color="text.secondary">CBM:</Typography>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#001f3f' }}>
              {totals.cbm}
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" color="text.secondary">Total Value:</Typography>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#001f3f' }}>
              {totals.currency} {totals.value}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Additional Details */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#001f3f' }}>
          Additional Details
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">Contract Number:</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {manifest.contract_number || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">Area and Phase:</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {manifest.area_and_phase || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">Project Code:</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {manifest.project_code || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">COD Number:</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {manifest.cod_number || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">Invoice Numbers:</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {invoiceNumbers || 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">PO Numbers:</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {poNumbers || 'N/A'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Invoices Table */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#001f3f' }}>
          Invoices on Manifest ({invoices.length})
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8f9fa' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Invoice #</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Supplier</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Packages</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Weight (kg)</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((invoice) => {
                const pkgs = invoice.packing_details || [];
                const weight = pkgs.reduce((sum, p) => sum + parseFloat(p.gross_weight_kg || 0), 0);

                return (
                  <TableRow key={invoice.id} hover>
                    <TableCell>{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.customer?.name || 'N/A'}</TableCell>
                    <TableCell>{invoice.supplier?.name || 'N/A'}</TableCell>
                    <TableCell>{pkgs.length}</TableCell>
                    <TableCell>{weight.toFixed(2)}</TableCell>
                    <TableCell>{invoice.currency} {parseFloat(invoice.total_value || 0).toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Driver Instructions */}
      {(manifest.driver_instruction_1 || manifest.driver_instruction_2) && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            bgcolor: '#001f3f',
            color: 'white',
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Driver Instructions
          </Typography>
          {manifest.driver_instruction_1 && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
              <Typography variant="body2">{manifest.driver_instruction_1}</Typography>
            </Box>
          )}
          {manifest.driver_instruction_2 && (
            <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
              <Typography variant="body2">{manifest.driver_instruction_2}</Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}
