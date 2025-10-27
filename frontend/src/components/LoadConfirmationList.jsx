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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  InputLabel,
  FormControl,
  InputAdornment,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  LocalShipping as ShippingIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
  Print as PrintIcon,
  Email as EmailIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as ManifestIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { loadConfirmationService } from '../services/loadConfirmationService';
import LoadConfirmationForm from './LoadConfirmationForm';
import LoadConfirmationDetailView from './LoadConfirmationDetailView';
import LoadConfirmationPrintView from './LoadConfirmationPrintView';
import TransportRequestDialog from './TransportRequestDialog';
import AutoTransportRequestDialog from './AutoTransportRequestDialog';
import AutoTransportPreviewDialog from './AutoTransportPreviewDialog';
import ManifestForm from './ManifestForm';
import html2pdf from 'html2pdf.js';

const statusColors = {
  draft: 'default',
  pending: 'warning',
  confirmed: 'success',
  in_transit: 'info',
  delivered: 'primary',
  cancelled: 'error',
};

export default function LoadConfirmationList() {
  const { enqueueSnackbar } = useSnackbar();
  const [loadConfirmations, setLoadConfirmations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedLC, setSelectedLC] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [transportRequestDialogOpen, setTransportRequestDialogOpen] = useState(false);
  const [autoTransportDialogOpen, setAutoTransportDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedFileData, setSelectedFileData] = useState([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [manifestDialogOpen, setManifestDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderBy, setOrderBy] = useState('id');
  const [order, setOrder] = useState('desc');
  const [emailForm, setEmailForm] = useState({
    recipientEmail: '',
    ccEmails: '',
    subject: '',
    message: ''
  });

  // Helper function to get current user profile
  const getCurrentProfile = () => {
    return localStorage.getItem('test_profile') || 'key_account_manager';
  };

  // Helper function to check if current user can delete
  const canDelete = () => {
    const profile = getCurrentProfile();
    // Only admin and key_account_manager can delete load confirmations
    return profile === 'admin' || profile === 'key_account_manager';
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await loadConfirmationService.getAll();
      // API returns array directly, not wrapped in data property
      setLoadConfirmations(Array.isArray(data) ? data : (data.data || []));
    } catch (err) {
      setError('Failed to load confirmations: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(0);
  }, [searchTerm, statusFilter]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuOpen = (event, lc) => {
    setAnchorEl(event.currentTarget);
    setSelectedLC(lc);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleViewDetails = () => {
    if (!selectedLC) return;
    setViewDialogOpen(true);
    handleMenuClose();
  };

  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
    setSelectedLC(null);
  };

  const handlePrintLC = async () => {
    if (!selectedLC) return;
    setPrintDialogOpen(true);
    handleMenuClose();
  };

  const generatePDF = async () => {
    const element = document.getElementById('pdf-content');
    const opt = {
      margin: 5,
      filename: `Load_Confirmation_${selectedLC.file_reference || selectedLC.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    try {
      await html2pdf().set(opt).from(element).save();

      // Update backend to mark PDF as generated
      try {
        await loadConfirmationService.update(selectedLC.id, { pdf_generated: true });
        // Refresh the list to update the UI with new flags
        await loadData();
      } catch (updateError) {
        console.error('Failed to update pdf_generated flag:', updateError);
        // Don't show error to user, PDF was still generated
      }

      setPrintDialogOpen(false);
      setSelectedLC(null);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleEmailLC = () => {
    if (!selectedLC) return;

    // Pre-populate with transporter email if available
    setEmailForm({
      recipientEmail: selectedLC.transporter?.email || '',
      ccEmails: '',
      subject: `Load Confirmation - ${selectedLC.file_reference || selectedLC.id}`,
      message: 'Please find attached the load confirmation for your review.'
    });

    setEmailDialogOpen(true);
    handleMenuClose();
  };

  const handleSendEmail = async () => {
    if (!selectedLC || !emailForm.recipientEmail) {
      alert('Please enter a recipient email address');
      return;
    }

    try {
      // Parse CC emails (comma-separated)
      const ccEmails = emailForm.ccEmails
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0);

      const result = await loadConfirmationService.emailLoadConfirmation(
        selectedLC.id,
        emailForm.recipientEmail,
        ccEmails.length > 0 ? ccEmails : null
      );

      alert(`Success: ${result.message}`);
      setEmailDialogOpen(false);
      setSelectedLC(null);
      loadData(); // Refresh the list to show updated status
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to send email';
      alert(`Error: ${errorMsg}`);
    }
  };

  const handleCreateSuccess = (newLC) => {
    console.log('Load confirmation created:', newLC);
    setCreateDialogOpen(false);
    loadData(); // Refresh the list
  };

  const handleEdit = async () => {
    if (!selectedLC) return;
    try {
      // Fetch fresh data from API to ensure we have all fields
      const freshData = await loadConfirmationService.getById(selectedLC.id);
      setSelectedLC(freshData);
      setEditDialogOpen(true);
      handleMenuClose();
    } catch (error) {
      console.error('Error fetching load confirmation:', error);
      alert('Failed to load load confirmation details');
    }
  };

  const handleEditSuccess = (updatedLC) => {
    console.log('Load confirmation updated:', updatedLC);
    setEditDialogOpen(false);
    setSelectedLC(null);
    loadData(); // Refresh the list
  };

  const handleRequestTransport = () => {
    if (!selectedLC) return;
    setTransportRequestDialogOpen(true);
    handleMenuClose();
  };

  const handleTransportRequestSuccess = () => {
    loadData(); // Refresh the list to show updated status
  };

  const handleAutoTransportSuccess = (selectedFileNames) => {
    console.log('Selected file names for auto transport:', selectedFileNames);
    setSelectedFileData(selectedFileNames);
    setPreviewDialogOpen(true);
  };

  const handlePreviewSuccess = (results) => {
    alert(`Successfully created ${results.length} Load Confirmation(s)! Awaiting Transport Planner assignment (Stage 2: CONFIRM TRANSPORT).`);
    setPreviewDialogOpen(false);
    setSelectedFileData([]);
    loadData(); // Refresh the list
  };

  const handleDelete = () => {
    if (!selectedLC) return;

    // Double-check permission before showing delete dialog
    if (!canDelete()) {
      alert('You do not have permission to delete load confirmations. Only Admin and Key Account Manager roles can delete.');
      handleMenuClose();
      return;
    }

    setDeleteConfirmOpen(true);
    handleMenuClose();
  };

  const handleConfirmDelete = async () => {
    if (!selectedLC) return;

    setDeleting(true);
    try {
      await loadConfirmationService.delete(selectedLC.id);
      alert('Load Confirmation deleted successfully. All changes have been logged for audit purposes.');
      setDeleteConfirmOpen(false);
      setSelectedLC(null);
      loadData(); // Refresh the list
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to delete load confirmation';
      alert(`Error: ${errorMsg}`);
    } finally {
      setDeleting(false);
    }
  };

  // Helper function to check if manifest can be generated
  const canGenerateManifest = (lc) => {
    if (!lc) return false;
    // Enable manifest generation if PDF was generated OR email was sent
    // Handle both boolean and integer values from API
    return Boolean(lc.pdf_generated) || Boolean(lc.email_sent);
  };

  const handleGenerateManifest = () => {
    if (!selectedLC) return;
    setManifestDialogOpen(true);
    handleMenuClose();
  };

  const handleManifestSuccess = (manifest) => {
    console.log('Manifest created:', manifest);
    enqueueSnackbar(`Manifest ${manifest.manifest_number} created successfully!`, {
      variant: 'success',
      autoHideDuration: 5000
    });
    setManifestDialogOpen(false);
    setSelectedLC(null);
    loadData(); // Refresh the list
  };

  // Sorting function
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const getComparatorValue = (lc, property) => {
    switch (property) {
      case 'file_reference':
        return lc.file_reference || lc.lc_number || '';
      case 'confirmation_date':
        return lc.confirmation_date || lc.date_issued || '';
      case 'collection_date':
        return lc.collection_date || '';
      case 'transporter':
        return lc.transporter?.company_name || lc.transporter_name || '';
      case 'vehicle_type':
        return lc.vehicle_type || '';
      case 'truck_registration':
        return lc.truck_registration || '';
      case 'status':
        return lc.status || 'draft';
      default:
        return lc[property] || '';
    }
  };

  // Filter and sort load confirmations
  const getFilteredLoadConfirmations = () => {
    let filtered = [...loadConfirmations];

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(lc => {
        const fileRef = (lc.file_reference || lc.lc_number || '').toLowerCase();
        const transporter = (lc.transporter?.company_name || lc.transporter_name || '').toLowerCase();
        const truckReg = (lc.truck_registration || '').toLowerCase();
        const trailer1 = (lc.trailer_1_registration || '').toLowerCase();
        const trailer2 = (lc.trailer_2_registration || '').toLowerCase();

        return fileRef.includes(search) ||
               transporter.includes(search) ||
               truckReg.includes(search) ||
               trailer1.includes(search) ||
               trailer2.includes(search);
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(lc => (lc.status || 'draft') === statusFilter);
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

  const filteredLoadConfirmations = getFilteredLoadConfirmations();

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

  if (loadConfirmations.length === 0) {
    return (
      <>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ShippingIcon sx={{ fontSize: 64, color: '#38b2ac', opacity: 0.5, mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No load confirmations yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create a load confirmation to arrange transport for your invoices
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{
                backgroundColor: '#38b2ac',
                textTransform: 'none',
                fontWeight: 500,
                px: 3,
                '&:hover': { backgroundColor: '#2c9a8f' },
              }}
            >
              Create Load Confirmation
            </Button>
            <Button
              variant="contained"
              startIcon={<ShippingIcon />}
              onClick={() => setAutoTransportDialogOpen(true)}
              sx={{
                bgcolor: '#73e9c7',
                color: '#001f3f',
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                '&:hover': { bgcolor: '#5fd4b3' },
              }}
            >
              AUTO TRANSPORT REQUEST
            </Button>
          </Box>
        </Paper>

        <Dialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          maxWidth="xl"
          fullWidth
        >
          <DialogTitle sx={{ backgroundColor: '#38b2ac', color: 'white', fontWeight: 600 }}>
            Create Load Confirmation
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            <LoadConfirmationForm
              onSuccess={handleCreateSuccess}
              onCancel={() => setCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* AUTO TRANSPORT REQUEST Dialog */}
        <AutoTransportRequestDialog
          open={autoTransportDialogOpen}
          onClose={() => setAutoTransportDialogOpen(false)}
          onSuccess={handleAutoTransportSuccess}
        />

        {/* AUTO TRANSPORT PREVIEW Dialog */}
        <AutoTransportPreviewDialog
          open={previewDialogOpen}
          onClose={() => {
            setPreviewDialogOpen(false);
            setSelectedFileData([]);
          }}
          selectedData={selectedFileData}
          onSuccess={handlePreviewSuccess}
        />
      </>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#001f3f' }}>
          Load Confirmations
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{
              backgroundColor: '#38b2ac',
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': { backgroundColor: '#2c9a8f' },
            }}
          >
            Create New
          </Button>
          <Button
            variant="contained"
            startIcon={<ShippingIcon />}
            onClick={() => setAutoTransportDialogOpen(true)}
            sx={{
              bgcolor: '#73e9c7',
              color: '#001f3f',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              '&:hover': { bgcolor: '#5fd4b3' },
            }}
          >
            AUTO TRANSPORT REQUEST
          </Button>
          <Button
            variant="outlined"
            startIcon={<ShippingIcon />}
            onClick={() => setTransportRequestDialogOpen(true)}
            sx={{
              borderColor: '#73e9c7',
              color: '#001f3f',
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': {
                borderColor: '#5fd4b3',
                bgcolor: '#e6f9f5'
              },
            }}
          >
            Request Transport
          </Button>
        </Box>
      </Box>

      {/* Compact Filter Section */}
      <Paper sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search by file ref, transporter, or registration..."
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
          <FormControl size="small" sx={{ minWidth: 180, bgcolor: 'white' }}>
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
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="confirmed">Confirmed</MenuItem>
              <MenuItem value="transport_confirmed">Transport Confirmed</MenuItem>
              <MenuItem value="ready_for_manifest">Ready for Manifest</MenuItem>
              <MenuItem value="in_manifest">In Manifest</MenuItem>
              <MenuItem value="in_transit">In Transit</MenuItem>
              <MenuItem value="delivered">Delivered</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            Showing {filteredLoadConfirmations.length} of {loadConfirmations.length} load confirmations
          </Typography>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#001f3f' }}>
              <TableCell
                sx={{ color: 'white', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleRequestSort('file_reference')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  File Reference
                  {orderBy === 'file_reference' && (
                    order === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell
                sx={{ color: 'white', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleRequestSort('confirmation_date')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Confirmation Date
                  {orderBy === 'confirmation_date' && (
                    order === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell
                sx={{ color: 'white', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleRequestSort('collection_date')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Collection Date
                  {orderBy === 'collection_date' && (
                    order === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell
                sx={{ color: 'white', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleRequestSort('transporter')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Transporter
                  {orderBy === 'transporter' && (
                    order === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell
                sx={{ color: 'white', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleRequestSort('vehicle_type')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Vehicle Type
                  {orderBy === 'vehicle_type' && (
                    order === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell
                sx={{ color: 'white', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleRequestSort('truck_registration')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Truck Reg
                  {orderBy === 'truck_registration' && (
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
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Equipment</TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLoadConfirmations
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((lc) => (
                <TableRow
                  key={lc.id}
                  hover
                  sx={{
                    '&:nth-of-type(odd)': { bgcolor: '#e6f9f5' },
                    '&:hover': { bgcolor: '#d0f2ea !important' }
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#001f3f' }}>
                      {lc.file_reference || lc.lc_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {lc.confirmation_date ? new Date(lc.confirmation_date).toLocaleDateString() :
                     lc.date_issued ? new Date(lc.date_issued).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {lc.collection_date ? new Date(lc.collection_date).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {lc.transporter?.company_name || lc.transporter_name || 'N/A'}
                    </Typography>
                    {lc.attention && (
                      <Typography variant="caption" color="text.secondary">
                        Attn: {lc.attention}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{lc.vehicle_type || 'N/A'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {lc.truck_registration || 'N/A'}
                    </Typography>
                    {lc.trailer_1_registration && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        T1: {lc.trailer_1_registration}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={lc.status || 'draft'}
                      color={statusColors[lc.status] || 'default'}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {lc.straps && (
                        <Tooltip title="Straps">
                          <Chip label="S" size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#38b2ac', color: 'white' }} />
                        </Tooltip>
                      )}
                      {lc.chains && (
                        <Tooltip title="Chains">
                          <Chip label="C" size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#38b2ac', color: 'white' }} />
                        </Tooltip>
                      )}
                      {lc.tarpaulin && (
                        <Tooltip title="Tarpaulin">
                          <Chip label="T" size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#38b2ac', color: 'white' }} />
                        </Tooltip>
                      )}
                      {lc.corner_plates && (
                        <Tooltip title="Corner Plates">
                          <Chip label="CP" size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#38b2ac', color: 'white' }} />
                        </Tooltip>
                      )}
                      {lc.uprights && (
                        <Tooltip title="Uprights">
                          <Chip label="U" size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#38b2ac', color: 'white' }} />
                        </Tooltip>
                      )}
                      {lc.rubber_protection && (
                        <Tooltip title="Rubber Protection">
                          <Chip label="RP" size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#38b2ac', color: 'white' }} />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, lc)}
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
        count={filteredLoadConfirmations.length}
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
        <MenuItem onClick={handlePrintLC}>
          <PrintIcon fontSize="small" sx={{ mr: 1 }} />
          Print PDF
        </MenuItem>
        <MenuItem onClick={handleEmailLC}>
          <EmailIcon fontSize="small" sx={{ mr: 1 }} />
          Email LC
        </MenuItem>
        <MenuItem
          onClick={handleGenerateManifest}
          disabled={!canGenerateManifest(selectedLC)}
        >
          <ManifestIcon fontSize="small" sx={{ mr: 1 }} />
          Generate Manifest
        </MenuItem>
        <MenuItem onClick={handleRequestTransport}>
          <ShippingIcon fontSize="small" sx={{ mr: 1 }} />
          Request Transport
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        {canDelete() && (
          <MenuItem onClick={handleDelete} sx={{ color: '#d32f2f' }}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
      </Menu>

      {/* Create Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: '#38b2ac', color: 'white', fontWeight: 600 }}>
          Create Load Confirmation
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <LoadConfirmationForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={handleCloseViewDialog}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: '#001f3f', color: 'white', fontWeight: 600 }}>
          Load Confirmation Details
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedLC && <LoadConfirmationDetailView loadConfirmation={selectedLC} />}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: '#38b2ac', color: 'white', fontWeight: 600 }}>
          Edit Load Confirmation
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedLC && (
            <LoadConfirmationForm
              initialData={selectedLC}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Print PDF Dialog */}
      <Dialog
        open={printDialogOpen}
        onClose={() => {
          setPrintDialogOpen(false);
          setSelectedLC(null);
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: '#001f3f', color: 'white', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Print Load Confirmation</span>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={generatePDF}
            sx={{
              backgroundColor: '#38b2ac',
              '&:hover': { backgroundColor: '#2c9a8f' },
            }}
          >
            Download PDF
          </Button>
        </DialogTitle>
        <DialogContent sx={{ mt: 2, p: 0 }}>
          {selectedLC && <LoadConfirmationPrintView loadConfirmation={selectedLC} />}
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog
        open={emailDialogOpen}
        onClose={() => {
          setEmailDialogOpen(false);
          setSelectedLC(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: '#38b2ac', color: 'white', fontWeight: 600 }}>
          Email Load Confirmation
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Recipient Email *"
              type="email"
              fullWidth
              value={emailForm.recipientEmail}
              onChange={(e) => setEmailForm({ ...emailForm, recipientEmail: e.target.value })}
              helperText="Enter the email address of the transporter"
              required
            />
            <TextField
              label="CC Emails"
              type="text"
              fullWidth
              value={emailForm.ccEmails}
              onChange={(e) => setEmailForm({ ...emailForm, ccEmails: e.target.value })}
              helperText="Enter multiple email addresses separated by commas"
            />
            <TextField
              label="Subject"
              type="text"
              fullWidth
              value={emailForm.subject}
              onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
            />
            <TextField
              label="Message"
              multiline
              rows={4}
              fullWidth
              value={emailForm.message}
              onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
              helperText="This message will appear in the email body"
            />
            <Alert severity="info" sx={{ mt: 1 }}>
              The load confirmation PDF will be automatically attached to this email.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setEmailDialogOpen(false);
              setSelectedLC(null);
            }}
            sx={{ color: '#666' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<EmailIcon />}
            onClick={handleSendEmail}
            sx={{
              backgroundColor: '#38b2ac',
              '&:hover': { backgroundColor: '#2c9a8f' },
            }}
          >
            Send Email
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transport Request Dialog */}
      <TransportRequestDialog
        open={transportRequestDialogOpen}
        onClose={() => {
          setTransportRequestDialogOpen(false);
          setSelectedLC(null);
        }}
        loadConfirmation={selectedLC}
        onSuccess={handleTransportRequestSuccess}
      />

      {/* AUTO TRANSPORT REQUEST Dialog */}
      <AutoTransportRequestDialog
        open={autoTransportDialogOpen}
        onClose={() => setAutoTransportDialogOpen(false)}
        onSuccess={handleAutoTransportSuccess}
      />

      {/* AUTO TRANSPORT PREVIEW Dialog */}
      <AutoTransportPreviewDialog
        open={previewDialogOpen}
        onClose={() => {
          setPreviewDialogOpen(false);
          setSelectedFileData([]);
        }}
        selectedData={selectedFileData}
        onSuccess={handlePreviewSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => !deleting && setDeleteConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: '#d32f2f', color: 'white', fontWeight: 600 }}>
          Confirm Deletion
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone!
          </Alert>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to delete this Load Confirmation?
          </Typography>
          {selectedLC && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#001f3f' }}>
                File Reference: {selectedLC.file_reference}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Status: {selectedLC.status}
              </Typography>
              {selectedLC.transporter_name && (
                <Typography variant="body2" color="text.secondary">
                  Transporter: {selectedLC.transporter_name}
                </Typography>
              )}
            </Box>
          )}
          <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
            This deletion will be logged for audit purposes. Any associated invoices will be reverted to "Ready for Transport" status.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setDeleteConfirmOpen(false)}
            disabled={deleting}
            sx={{ color: '#666' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={deleting ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
            onClick={handleConfirmDelete}
            disabled={deleting}
            sx={{
              backgroundColor: '#d32f2f',
              '&:hover': { backgroundColor: '#b71c1c' },
            }}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Generate Manifest Dialog */}
      <Dialog
        open={manifestDialogOpen}
        onClose={() => {
          setManifestDialogOpen(false);
          setSelectedLC(null);
        }}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: '#001f3f', color: 'white', fontWeight: 600 }}>
          Create Manifest from Load Confirmation
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedLC && (
            <ManifestForm
              loadConfirmation={selectedLC}
              onSuccess={handleManifestSuccess}
              onCancel={() => {
                setManifestDialogOpen(false);
                setSelectedLC(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
