import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  CircularProgress,
  Alert,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  InputLabel,
  FormControl,
  InputAdornment,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  LocalShipping as ShippingIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { invoiceService } from '../services/invoiceService';
import InvoiceTabbedView from './InvoiceTabbedView';
import TransportRequestDialog from './TransportRequestDialog';

const statusColors = {
  draft: 'default',
  pending_transport: 'warning',
  transport_requested: 'info',
  in_transit: 'primary',
  delivered: 'success',
  cancelled: 'error',
};

const stageLabels = {
  invoice_received: 'Invoice Received',
  awaiting_documents: 'Awaiting Documents',
  documents_complete: 'Documents Complete',
  transport_requested: 'Transport Requested',
  load_confirmed: 'Load Confirmed',
  in_transit: 'In Transit',
  delivered: 'Delivered',
};

const ownerLabels = {
  key_accounts_manager: 'Key Accounts Manager',
  transport_planner: 'Transport Planner',
  manifest: 'Manifest',
  delivered: 'Delivered',
};

export default function InvoiceList() {
  const { enqueueSnackbar } = useSnackbar();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailInvoice, setDetailInvoice] = useState(null);
  const [transportRequestDialogOpen, setTransportRequestDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [orderBy, setOrderBy] = useState('id');
  const [order, setOrder] = useState('desc');

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await invoiceService.getAll();
      // Filter to only show commercial invoices (not purchase orders)
      const commercialInvoices = (data.data || []).filter(
        invoice => invoice.invoice_type === 'commercial_invoice'
      );
      setInvoices(commercialInvoices);
    } catch (err) {
      setError('Failed to load invoices: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(0);
  }, [searchTerm, statusFilter, stageFilter]);

  // Sorting function
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const getComparatorValue = (invoice, property) => {
    switch (property) {
      case 'invoice_number':
        return invoice.invoice_number || '';
      case 'invoice_date':
        return invoice.invoice_date || '';
      case 'supplier':
        return invoice.supplier?.name || '';
      case 'customer':
        return invoice.customer?.name || '';
      case 'total_amount':
        return parseFloat(invoice.total_amount) || 0;
      case 'current_stage':
        return invoice.current_stage || '';
      case 'current_owner':
        return invoice.current_owner || '';
      case 'status':
        return invoice.status || '';
      default:
        return invoice[property] || '';
    }
  };

  // Filter and sort invoices based on search term, status, and stage
  const getFilteredInvoices = () => {
    let filtered = [...invoices];

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(invoice => {
        const invoiceNumber = (invoice.invoice_number || '').toLowerCase();
        const supplierName = (invoice.supplier?.name || '').toLowerCase();
        const customerName = (invoice.customer?.name || '').toLowerCase();
        const supplierCode = (invoice.supplier?.code || '').toLowerCase();
        const customerCode = (invoice.customer?.code || '').toLowerCase();

        return invoiceNumber.includes(search) ||
               supplierName.includes(search) ||
               customerName.includes(search) ||
               supplierCode.includes(search) ||
               customerCode.includes(search);
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }

    // Apply stage filter
    if (stageFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.current_stage === stageFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = getComparatorValue(a, orderBy);
      const bValue = getComparatorValue(b, orderBy);

      if (aValue < bValue) {
        return order === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return order === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  };

  const filteredInvoices = getFilteredInvoices();

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuOpen = (event, invoice) => {
    setAnchorEl(event.currentTarget);
    setSelectedInvoice(invoice);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedInvoice(null);
  };

  const handleRequestTransport = () => {
    if (!selectedInvoice) return;
    setTransportRequestDialogOpen(true);
    handleMenuClose();
  };

  const handleTransportRequestSuccess = () => {
    loadInvoices();
  };

  const handleCheckDocuments = async () => {
    if (!selectedInvoice) return;

    try {
      const result = await invoiceService.checkDocuments(selectedInvoice.id);
      enqueueSnackbar(`Documents check: ${result.can_proceed ? 'Complete ✓' : 'Incomplete ✗'} - ${result.message}`, {
        variant: result.can_proceed ? 'success' : 'warning'
      });
      handleMenuClose();
      loadInvoices(); // Reload list
    } catch (err) {
      setError('Failed to check documents: ' + err.message);
    }
  };

  const handleViewDetails = async () => {
    if (!selectedInvoice) return;

    try {
      const data = await invoiceService.getById(selectedInvoice.id);
      setDetailInvoice(data);
      setDetailDialogOpen(true);
      handleMenuClose();
    } catch (err) {
      setError('Failed to load invoice details: ' + err.message);
    }
  };

  const handleSaveInvoice = async (updatedInvoice) => {
    try {
      await invoiceService.update(updatedInvoice.id, updatedInvoice);
      enqueueSnackbar('Invoice updated successfully!', { variant: 'success' });

      // Refresh the invoice details
      const refreshedData = await invoiceService.getById(updatedInvoice.id);
      setDetailInvoice(refreshedData);

      // Refresh the main invoice list to show updated status
      loadInvoices();
    } catch (err) {
      enqueueSnackbar('Failed to save invoice: ' + err.message, { variant: 'error' });
      throw err; // Re-throw so the detail view knows save failed
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (invoices.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No invoices found. Upload your first invoice to get started.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Compact Filter Section */}
      <Paper sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search by invoice number, supplier, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300, bgcolor: 'white' }}
          />
          <FormControl size="small" sx={{ minWidth: 150, bgcolor: 'white' }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
              startAdornment={
                <InputAdornment position="start">
                  <FilterListIcon fontSize="small" />
                </InputAdornment>
              }
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="pending_transport">Pending Transport</MenuItem>
              <MenuItem value="transport_requested">Transport Requested</MenuItem>
              <MenuItem value="in_transit">In Transit</MenuItem>
              <MenuItem value="delivered">Delivered</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180, bgcolor: 'white' }}>
            <InputLabel>Stage</InputLabel>
            <Select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              label="Stage"
            >
              <MenuItem value="all">All Stages</MenuItem>
              <MenuItem value="invoice_received">Invoice Received</MenuItem>
              <MenuItem value="awaiting_documents">Awaiting Documents</MenuItem>
              <MenuItem value="documents_complete">Documents Complete</MenuItem>
              <MenuItem value="transport_requested">Transport Requested</MenuItem>
              <MenuItem value="load_confirmed">Load Confirmed</MenuItem>
              <MenuItem value="in_transit">In Transit</MenuItem>
              <MenuItem value="delivered">Delivered</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            Showing {filteredInvoices.length} of {invoices.length} invoices
          </Typography>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#001f3f' }}>
              <TableCell
                sx={{ color: 'white', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleRequestSort('invoice_number')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Invoice Number
                  {orderBy === 'invoice_number' && (
                    order === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell
                sx={{ color: 'white', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleRequestSort('invoice_date')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Date
                  {orderBy === 'invoice_date' && (
                    order === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell
                sx={{ color: 'white', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleRequestSort('supplier')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Supplier
                  {orderBy === 'supplier' && (
                    order === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell
                sx={{ color: 'white', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleRequestSort('customer')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Customer
                  {orderBy === 'customer' && (
                    order === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell
                sx={{ color: 'white', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleRequestSort('total_amount')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Amount
                  {orderBy === 'total_amount' && (
                    order === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell
                sx={{ color: 'white', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleRequestSort('current_stage')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Stage
                  {orderBy === 'current_stage' && (
                    order === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell
                sx={{ color: 'white', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleRequestSort('current_owner')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Owner
                  {orderBy === 'current_owner' && (
                    order === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell
                sx={{ color: 'white', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleRequestSort('status')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Status
                  {orderBy === 'status' && (
                    order === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Documents</TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredInvoices
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((invoice) => (
                <TableRow
                  key={invoice.id}
                  hover
                  sx={{
                    '&:nth-of-type(odd)': { bgcolor: '#e6f9f5' },
                    '&:hover': { bgcolor: '#d0f2ea !important' }
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#001f3f' }}>
                      {invoice.invoice_number}
                    </Typography>
                  </TableCell>
                  <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{invoice.supplier?.name || 'N/A'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {invoice.supplier?.code || ''}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{invoice.customer?.name || 'N/A'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {invoice.customer?.code || ''}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {invoice.currency} {parseFloat(invoice.total_amount).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                      {stageLabels[invoice.current_stage] || invoice.current_stage}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                      {ownerLabels[invoice.current_owner] || invoice.current_owner}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={invoice.status}
                      color={statusColors[invoice.status] || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {invoice.can_proceed_to_transport ? (
                        <Tooltip title="Ready for transport">
                          <CheckCircleIcon fontSize="small" sx={{ color: 'success.main' }} />
                        </Tooltip>
                      ) : (
                        <Tooltip title="Waiting for documents">
                          <ErrorIcon fontSize="small" sx={{ color: 'warning.main' }} />
                        </Tooltip>
                      )}
                      {invoice.requires_qc && (
                        <Tooltip title={`QC ${invoice.has_qc_certificate ? '✓' : '✗'}`}>
                          <Chip
                            label="QC"
                            size="small"
                            color={invoice.has_qc_certificate ? 'success' : 'default'}
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Tooltip>
                      )}
                      {invoice.requires_bv && (
                        <Tooltip title={`BV ${invoice.has_bv_certificate ? '✓' : '✗'}`}>
                          <Chip
                            label="BV"
                            size="small"
                            color={invoice.has_bv_certificate ? 'success' : 'default'}
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Tooltip>
                      )}
                      {invoice.requires_feri && (
                        <Tooltip title={`FERI ${invoice.has_feri_certificate ? '✓' : '✗'}`}>
                          <Chip
                            label="FERI"
                            size="small"
                            color={invoice.has_feri_certificate ? 'success' : 'default'}
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, invoice)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={filteredInvoices.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewDetails}>
          <VisibilityIcon fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={handleCheckDocuments}>
          <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
          Check Documents
        </MenuItem>
        <MenuItem
          onClick={handleRequestTransport}
          disabled={!selectedInvoice?.can_proceed_to_transport}
        >
          <ShippingIcon fontSize="small" sx={{ mr: 1 }} />
          Request Transport
        </MenuItem>
      </Menu>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#001f3f', color: 'white', fontWeight: 600 }}>
          Invoice Details - {detailInvoice?.invoice_number}
        </DialogTitle>
        <DialogContent>
          {detailInvoice && (
            <InvoiceTabbedView
              invoice={detailInvoice}
              mode="readonly"
              onSave={handleSaveInvoice}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '2px solid #001f3f' }}>
          <Button
            onClick={() => setDetailDialogOpen(false)}
            sx={{
              borderColor: '#001f3f',
              color: '#001f3f',
              '&:hover': {
                borderColor: '#001f3f',
                bgcolor: '#e6f9f5'
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transport Request Dialog */}
      <TransportRequestDialog
        open={transportRequestDialogOpen}
        onClose={() => {
          setTransportRequestDialogOpen(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        onSuccess={handleTransportRequestSuccess}
      />
    </Box>
  );
}
