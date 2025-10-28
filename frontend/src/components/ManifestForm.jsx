import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Grid,
  Paper,
  Checkbox,
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Assignment as ManifestIcon,
  Save as SaveIcon,
  LocalShipping as TruckIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as PreviewIcon,
  Business as BusinessIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { manifestService } from '../services/manifestService';
import { invoiceService } from '../services/invoiceService';

export default function ManifestForm({ loadConfirmation: initialLoadConfirmation, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [allRows, setAllRows] = useState([]); // All invoice rows (linked + available)
  const [displayedInvoices, setDisplayedInvoices] = useState([]);
  const [showLinkedOnly, setShowLinkedOnly] = useState(true);

  // Editable load confirmation fields
  const [loadConfirmation, setLoadConfirmation] = useState({
    ...initialLoadConfirmation,
    clearing_agent: initialLoadConfirmation?.clearing_agent || '',
    entry_agent: initialLoadConfirmation?.entry_agent || '',
    commodity_description: initialLoadConfirmation?.commodity_description || 'Mining Equipment',
  });

  // Helper to get place of offloading
  const getPlaceOfOffloading = () => {
    // Try delivery address first
    if (initialLoadConfirmation?.delivery_address) {
      return initialLoadConfirmation.delivery_address.split(',')[0];
    }
    // Try customer name from invoices
    if (initialLoadConfirmation?.invoices && initialLoadConfirmation.invoices.length > 0) {
      const firstInvoice = initialLoadConfirmation.invoices[0];
      if (firstInvoice?.customer?.name) {
        return firstInvoice.customer.name;
      }
    }
    return '';
  };

  const [formData, setFormData] = useState({
    manifest_number: initialLoadConfirmation?.file_reference || '',
    load_confirmation_id: initialLoadConfirmation?.id || '',
    export_date: new Date().toISOString().split('T')[0],
    border_post: getPlaceOfOffloading(),
    customs_office: '',
    invoice_ids: [],
    contract_number: '',
    area_and_phase: '',
    project_code: '',
    driver_instruction_1: '',
    driver_instruction_2: '',
  });

  const [summary, setSummary] = useState({
    total_invoices: 0,
    total_packages: 0,
    total_weight: 0,
    total_cbm: 0,
    total_value: 0,
    currency: 'USD',
  });

  // Load invoices
  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const fileRef = initialLoadConfirmation?.file_reference;
      const invoiceRows = []; // Array of invoices with all their items
      const preSelectedIds = new Set(); // Track which invoice IDs to pre-select

      // Get all invoices from the system
      const response = await invoiceService.getAll();
      const allInvoices = response.data || response;

      console.log('Processing invoices for file ref:', fileRef);

      // Process each invoice - group ALL items together per invoice
      allInvoices.forEach(invoice => {
        const allItems = invoice.packingDetails || invoice.packing_details || [];

        // Check if this invoice has ANY items linked to this Load Confirmation
        const hasLinkedItems = allItems.some(item => item.file_name === fileRef);

        // Check if invoice has ANY unassigned items
        const hasUnassignedItems = allItems.some(item =>
          !item.file_name || item.file_name === '' || item.file_name === '-'
        );

        console.log(`Invoice ${invoice.invoice_number}: ${allItems.length} total, hasLinked: ${hasLinkedItems}, hasUnassigned: ${hasUnassignedItems}`);

        // Determine category based on items
        let category;
        if (hasLinkedItems) {
          // If it has any linked items, it's a "linked" invoice
          category = 'linked';
          preSelectedIds.add(invoice.id);
        } else if (hasUnassignedItems) {
          // If all items are unassigned, it's "available"
          category = 'available';
        } else {
          // Skip invoices with all items assigned to OTHER load confirmations
          return;
        }

        // Create one row per invoice with ALL its items
        invoiceRows.push({
          ...invoice,
          rowId: `invoice-${invoice.id}`,
          category,
          packingDetails: allItems,
          packing_details: allItems,
        });
      });

      console.log('Invoice rows:', invoiceRows.length);
      console.log('Pre-selected invoice IDs:', Array.from(preSelectedIds));

      setAllRows(invoiceRows);
      setFormData(prev => ({ ...prev, invoice_ids: Array.from(preSelectedIds) }));

    } catch (err) {
      console.error('Error loading invoices:', err);
      setError('Failed to load invoices: ' + (err.message || 'Unknown error'));
    }
  };

  // Update displayed invoices when toggle changes or selection changes
  useEffect(() => {
    console.log('=== Updating displayed invoices ===');
    console.log('showLinkedOnly:', showLinkedOnly);
    console.log('formData.invoice_ids:', formData.invoice_ids);
    console.log('allRows count:', allRows.length);

    if (showLinkedOnly) {
      // Show ONLY selected rows (both linked and available categories)
      const selectedRows = allRows.filter(row => formData.invoice_ids.includes(row.id));
      console.log('Selected rows for Linked view:', selectedRows.length);
      setDisplayedInvoices(selectedRows);
    } else {
      // Show ONLY unselected rows
      const unselectedRows = allRows.filter(row => !formData.invoice_ids.includes(row.id));
      console.log('Unselected rows for Available view:', unselectedRows.length);
      setDisplayedInvoices(unselectedRows);
    }
  }, [showLinkedOnly, allRows, formData.invoice_ids]);

  const handleToggleInvoices = () => {
    setShowLinkedOnly(!showLinkedOnly);
  };


  // Calculate summary when invoice selection changes
  useEffect(() => {
    calculateSummary();
  }, [formData.invoice_ids, allRows]);

  const calculateSummary = () => {
    // Calculate from both LINKED rows and AVAILABLE rows that are selected
    const selectedRows = allRows.filter(row => formData.invoice_ids.includes(row.id));

    const totalPackages = selectedRows.reduce((sum, row) => {
      const items = row.packingDetails || row.packing_details || [];
      return sum + items.reduce((pkgSum, pkg) => pkgSum + (parseInt(pkg.quantity) || 1), 0);
    }, 0);

    const totalWeight = selectedRows.reduce((sum, row) => {
      const items = row.packingDetails || row.packing_details || [];
      return sum + items.reduce((w, pkg) => {
        const quantity = parseInt(pkg.quantity) || 1;
        const weight = parseFloat(pkg.gross_weight_kg) || 0;
        return w + (quantity * weight);
      }, 0);
    }, 0);

    const totalCBM = selectedRows.reduce((sum, row) => {
      const items = row.packingDetails || row.packing_details || [];
      return sum + items.reduce((c, pkg) => {
        const quantity = parseInt(pkg.quantity) || 1;
        const cbm = parseFloat(pkg.cbm) || 0;
        return c + (quantity * cbm);
      }, 0);
    }, 0);

    // Count unique invoice IDs for total_invoices
    const uniqueInvoiceIds = new Set(selectedRows.map(row => row.id));

    const currency = selectedRows[0]?.currency || 'USD';

    setSummary({
      total_invoices: uniqueInvoiceIds.size,
      total_packages: totalPackages,
      total_weight: totalWeight.toFixed(2),
      total_cbm: totalCBM.toFixed(2),
      currency,
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLoadConfirmationChange = (e) => {
    const { name, value } = e.target;
    setLoadConfirmation(prev => ({ ...prev, [name]: value }));
  };

  const handleInvoiceSelection = (invoiceId) => {
    console.log('Clicked invoice ID:', invoiceId);
    console.log('Current selection:', formData.invoice_ids);

    setFormData(prev => {
      const isCurrentlySelected = prev.invoice_ids.includes(invoiceId);
      const invoice_ids = isCurrentlySelected
        ? prev.invoice_ids.filter(id => id !== invoiceId)
        : [...prev.invoice_ids, invoiceId];

      console.log('Was selected:', isCurrentlySelected);
      console.log('New selection:', invoice_ids);

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
      // Create manifest with all form data
      const result = await manifestService.create({
        ...formData,
        // Include updated load confirmation fields if they've changed
        clearing_agent: loadConfirmation.clearing_agent,
        entry_agent: loadConfirmation.entry_agent,
        commodity_description: loadConfirmation.commodity_description,
      });
      onSuccess(result);
    } catch (err) {
      console.error('Error creating manifest:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create manifest');
    } finally {
      setLoading(false);
    }
  };

  // Count for button labels
  // Linked view shows: all selected rows
  const linkedCount = allRows.filter(row => formData.invoice_ids.includes(row.id)).length;
  // Available view shows: all unselected rows
  const availableCount = allRows.filter(row => !formData.invoice_ids.includes(row.id)).length;

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Header Section - Manifest Info */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          overflow: 'hidden',
          border: '1px solid #e0e0e0',
          borderRadius: 1,
        }}
      >
        {/* Navy Header */}
        <Box sx={{
          bgcolor: '#001f3f',
          color: 'white',
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Road freight manifest: {initialLoadConfirmation?.file_reference || formData.manifest_number}
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {new Date(formData.export_date).toLocaleDateString()}
          </Typography>
        </Box>

        {/* Transport & Clearing Details Table */}
        <Table size="small">
          <TableBody>
            {/* Row 1: Headers */}
            <TableRow sx={{ bgcolor: 'black' }}>
              <TableCell sx={{ color: 'white', fontWeight: 600, border: '1px solid white', textAlign: 'center' }}>
                TRANSPORTER
              </TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600, border: '1px solid white', textAlign: 'center' }}>
                CLEARING AGENT
              </TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600, border: '1px solid white', textAlign: 'center' }}>
                DESTINATION CLEARING AGENT
              </TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600, border: '1px solid white', textAlign: 'center' }}>
                PLACE OF OFFLOADING
              </TableCell>
            </TableRow>

            {/* Row 2: Values */}
            <TableRow>
              <TableCell sx={{ border: '1px solid #ddd', textAlign: 'center', fontWeight: 600 }}>
                {loadConfirmation?.transporter_name || 'N/A'}
              </TableCell>
              <TableCell sx={{ border: '1px solid #ddd', textAlign: 'center', fontWeight: 600 }}>
                <TextField
                  fullWidth
                  size="small"
                  name="clearing_agent"
                  value={loadConfirmation?.clearing_agent || ''}
                  onChange={handleLoadConfirmationChange}
                  placeholder="e.g., KG&R - BBR"
                  variant="standard"
                  InputProps={{ disableUnderline: false }}
                  sx={{ textAlign: 'center' }}
                />
              </TableCell>
              <TableCell sx={{ border: '1px solid #ddd', textAlign: 'center', fontWeight: 600 }}>
                <TextField
                  fullWidth
                  size="small"
                  name="entry_agent"
                  value={loadConfirmation?.entry_agent || ''}
                  onChange={handleLoadConfirmationChange}
                  placeholder="e.g., CARGO CONGO"
                  variant="standard"
                  InputProps={{ disableUnderline: false }}
                />
              </TableCell>
              <TableCell sx={{ border: '1px solid #ddd', textAlign: 'center', fontWeight: 600 }}>
                <TextField
                  fullWidth
                  size="small"
                  name="border_post"
                  value={formData.border_post}
                  onChange={handleChange}
                  placeholder="e.g., KAMOA KOPPER - KOLWEZI"
                  variant="standard"
                  InputProps={{ disableUnderline: false }}
                />
              </TableCell>
            </TableRow>

            {/* Row 3: Sub-headers */}
            <TableRow sx={{ bgcolor: 'black' }}>
              <TableCell sx={{ color: 'white', fontWeight: 600, border: '1px solid white', textAlign: 'center' }}>
                MODE
              </TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600, border: '1px solid white', textAlign: 'center' }}>
                TRUCK TYPE
              </TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600, border: '1px solid white', textAlign: 'center' }}>
                BORDER
              </TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600, border: '1px solid white', textAlign: 'center' }}>
                REGISTRATION DETAILS
              </TableCell>
            </TableRow>

            {/* Row 4: Sub-values */}
            <TableRow>
              <TableCell sx={{ border: '1px solid #ddd', textAlign: 'center', fontWeight: 600 }}>
                ROAD
              </TableCell>
              <TableCell sx={{ border: '1px solid #ddd', textAlign: 'center', fontWeight: 600 }}>
                {loadConfirmation?.vehicle_type || 'N/A'}
              </TableCell>
              <TableCell sx={{ border: '1px solid #ddd', textAlign: 'center', fontWeight: 600 }}>
                <TextField
                  fullWidth
                  size="small"
                  name="customs_office"
                  value={formData.customs_office}
                  onChange={handleChange}
                  placeholder="e.g., KASUMBALESA"
                  variant="standard"
                  InputProps={{ disableUnderline: false }}
                />
              </TableCell>
              <TableCell sx={{ border: '1px solid #ddd', textAlign: 'center', fontWeight: 600 }}>
                HORSE: {loadConfirmation?.truck_registration || 'N/A'} |
                TRAILER: {loadConfirmation?.trailer_1_registration || 'N/A'}
                {loadConfirmation?.trailer_2_registration && ` | TRAILER 2: ${loadConfirmation.trailer_2_registration}`}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>

      {/* Invoice Selection */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#001f3f' }}>
          {showLinkedOnly ? 'Linked Invoices' : 'Available Invoices'}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={handleToggleInvoices}
          sx={{
            borderColor: '#001f3f',
            color: '#001f3f',
            textTransform: 'none',
            fontWeight: 500,
            '&:hover': {
              borderColor: '#003d5c',
              bgcolor: '#e6f9f5',
            },
          }}
        >
          {showLinkedOnly ? `Show Available Invoices (${availableCount})` : `Show Linked Invoices (${linkedCount})`}
        </Button>
      </Box>

      {displayedInvoices.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          {showLinkedOnly
            ? 'No linked invoices. Click "Show Available Invoices" to add invoices to this manifest.'
            : 'No available invoices. All invoices are already assigned or on other manifests.'}
        </Alert>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ mb: 3, border: '1px solid #e0e0e0' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#001f3f' }}>
              <TableRow>
                <TableCell padding="checkbox" sx={{ color: 'white' }}></TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Invoice Number</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Supplier</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Customer</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Purchase Order Number</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Amount</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Total Items</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Gross (Kg)</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>CBM</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Clearing Agent</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedInvoices.map((row) => {
                // Show as selected if the invoice ID is in selection (for both linked and available)
                const isSelected = formData.invoice_ids.includes(row.id);
                const packingDetails = row.packingDetails || [];
                const totalWeight = packingDetails.reduce((sum, pkg) => {
                  const quantity = parseInt(pkg.quantity) || 1;
                  const weight = parseFloat(pkg.gross_weight_kg) || 0;
                  return sum + (quantity * weight);
                }, 0);
                const totalCBM = packingDetails.reduce((sum, pkg) => {
                  const quantity = parseInt(pkg.quantity) || 1;
                  const cbm = parseFloat(pkg.cbm) || 0;
                  return sum + (quantity * cbm);
                }, 0);

                return (
                  <TableRow
                    key={row.rowId}
                    hover
                    onClick={() => handleInvoiceSelection(row.id)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: isSelected ? '#e6f9f5' : 'inherit',
                      '&:hover': { bgcolor: isSelected ? '#d0f2ea' : '#f5f5f5' },
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation(); // Prevent row click from also firing
                          handleInvoiceSelection(row.id);
                        }}
                        onClick={(e) => e.stopPropagation()} // Also stop on click
                        sx={{
                          color: '#73e9c7',
                          '&.Mui-checked': { color: '#73e9c7' },
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {row.invoice_number}
                      </Typography>
                      {row.purchase_order && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {row.purchase_order}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.invoice_date ? new Date(row.invoice_date).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>{row.supplier?.name || 'N/A'}</TableCell>
                    <TableCell>{row.customer?.name || 'N/A'}</TableCell>
                    <TableCell>{row.purchase_order || '-'}</TableCell>
                    <TableCell>
                      {row.currency} {parseFloat(row.total_amount || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>{packingDetails.length}</TableCell>
                    <TableCell>{totalWeight.toFixed(2)}</TableCell>
                    <TableCell>{totalCBM.toFixed(2)}</TableCell>
                    <TableCell>
                      {row.clearing_agent && (
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {row.clearing_agent}
                        </Typography>
                      )}
                      {row.entry_agent && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {row.entry_agent}
                        </Typography>
                      )}
                      {!row.clearing_agent && !row.entry_agent && '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Total Block */}
      {formData.invoice_ids.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            bgcolor: '#e6f9f5',
            border: '2px solid #73e9c7',
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#001f3f' }}>
            Totals
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Total Invoices</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#001f3f' }}>
                  {summary.total_invoices}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Total Items</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#001f3f' }}>
                  {summary.total_packages}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Total Weight (kg)</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#001f3f' }}>
                  {summary.total_weight}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Total CBM</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#001f3f' }}>
                  {summary.total_cbm}
                </Typography>
              </Box>
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
