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
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  LocalShipping as ShippingIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
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

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await invoiceService.getAll();
      setInvoices(data.data || []);
    } catch (err) {
      setError('Failed to load invoices: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

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
      alert(`Documents check: ${result.can_proceed ? 'Complete ✓' : 'Incomplete ✗'}\n${result.message}`);
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
      alert('Invoice updated successfully!');

      // Refresh the invoice details
      const refreshedData = await invoiceService.getById(updatedInvoice.id);
      setDetailInvoice(refreshedData);

      // Reload the list
      loadInvoices();
    } catch (err) {
      alert('Failed to save invoice: ' + err.message);
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
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#001f3f' }}>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Invoice Number</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Date</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Supplier</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Customer</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Amount</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Stage</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Owner</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Documents</TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices
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
        count={invoices.length}
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
