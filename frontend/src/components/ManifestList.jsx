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
  Grid,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Assignment as ManifestIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Print as PrintIcon,
  CloudUpload as UploadIcon,
  CheckCircle as ApproveIcon,
  LocalShipping as DeliveredIcon,
} from '@mui/icons-material';
import { manifestService } from '../services/manifestService';

const statusColors = {
  draft: 'default',
  pending_feri: 'warning',
  feri_approved: 'success',
  in_transit: 'info',
  delivered: 'primary',
  completed: 'success',
};

const customsStatusColors = {
  pending: 'default',
  in_progress: 'info',
  cleared: 'success',
  rejected: 'error',
};

export default function ManifestList() {
  const [manifests, setManifests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedManifest, setSelectedManifest] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    contract_number: '',
    area_and_phase: '',
    project_code: '',
    cod_number: '',
    driver_instruction_1: '',
    driver_instruction_2: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await manifestService.getAll();
      setManifests(Array.isArray(data) ? data : (data.data || []));
    } catch (err) {
      setError('Failed to load manifests: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuOpen = (event, manifest) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedManifest(manifest);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleRowClick = (manifest) => {
    setSelectedManifest(manifest);
    setEditFormData({
      contract_number: manifest.contract_number || '',
      area_and_phase: manifest.area_and_phase || '',
      project_code: manifest.project_code || '',
      cod_number: manifest.cod_number || '',
      driver_instruction_1: manifest.driver_instruction_1 || '',
      driver_instruction_2: manifest.driver_instruction_2 || '',
    });
    setEditDialogOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    if (!selectedManifest) return;

    try {
      await manifestService.update(selectedManifest.id, editFormData);
      alert('Manifest details updated successfully!');
      setEditDialogOpen(false);
      setSelectedManifest(null);
      loadData(); // Refresh the list
    } catch (err) {
      alert('Failed to update manifest: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleViewDetails = () => {
    // TODO: Open detail view
    console.log('View details for manifest:', selectedManifest);
    handleMenuClose();
  };

  const handlePrintPDF = async () => {
    if (!selectedManifest) return;
    // TODO: Implement PDF download
    console.log('Print PDF for manifest:', selectedManifest);
    handleMenuClose();
  };

  const handleSubmitFERI = async () => {
    if (!selectedManifest) return;

    try {
      await manifestService.submitFERI(selectedManifest.id);
      alert('Manifest submitted to FERI successfully!');
      loadData();
    } catch (err) {
      alert('Failed to submit to FERI: ' + (err.response?.data?.message || err.message));
    }
    handleMenuClose();
  };

  const handleApproveFERI = async () => {
    if (!selectedManifest) return;

    try {
      await manifestService.approveFERI(selectedManifest.id);
      alert('FERI approved successfully!');
      loadData();
    } catch (err) {
      alert('Failed to approve FERI: ' + (err.response?.data?.message || err.message));
    }
    handleMenuClose();
  };

  const handleMarkDelivered = async () => {
    if (!selectedManifest) return;

    try {
      await manifestService.markDelivered(selectedManifest.id);
      alert('Manifest marked as delivered!');
      loadData();
    } catch (err) {
      alert('Failed to mark as delivered: ' + (err.response?.data?.message || err.message));
    }
    handleMenuClose();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  };

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (manifests.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <ManifestIcon sx={{ fontSize: 64, color: '#73e9c7', opacity: 0.5, mb: 2 }} />
        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
          No manifests yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create manifests from load confirmations to manage cross-border shipments
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#001f3f' }}>
          Manifests
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Click on a row to edit manifest details
        </Typography>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#001f3f' }}>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Manifest #</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Export Date</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Load Confirmation</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Invoices</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Customs</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>FERI Date</TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {manifests
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((manifest) => (
                <TableRow
                  key={manifest.id}
                  hover
                  onClick={() => handleRowClick(manifest)}
                  sx={{
                    cursor: 'pointer',
                    '&:nth-of-type(odd)': { bgcolor: '#e6f9f5' },
                    '&:hover': { bgcolor: '#d0f2ea !important' }
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#001f3f' }}>
                      {manifest.manifest_number}
                    </Typography>
                    {manifest.contract_number && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Contract: {manifest.contract_number}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {manifest.export_date ? new Date(manifest.export_date).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {manifest.load_confirmation?.file_reference || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${manifest.invoices?.length || 0} invoice(s)`}
                      size="small"
                      sx={{ bgcolor: '#73e9c7', color: '#001f3f', fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={manifest.status?.replace(/_/g, ' ')}
                      color={statusColors[manifest.status] || 'default'}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={manifest.customs_status}
                      color={customsStatusColors[manifest.customs_status] || 'default'}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>
                    {manifest.feri_application_date
                      ? new Date(manifest.feri_application_date).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, manifest)}
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
        count={manifests.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewDetails}>
          <VisibilityIcon fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={handlePrintPDF}>
          <PrintIcon fontSize="small" sx={{ mr: 1 }} />
          Print PDF
        </MenuItem>
        {selectedManifest?.status === 'draft' && (
          <MenuItem onClick={handleSubmitFERI}>
            <UploadIcon fontSize="small" sx={{ mr: 1 }} />
            Submit to FERI
          </MenuItem>
        )}
        {selectedManifest?.status === 'pending_feri' && (
          <MenuItem onClick={handleApproveFERI}>
            <ApproveIcon fontSize="small" sx={{ mr: 1 }} />
            Approve FERI
          </MenuItem>
        )}
        {['feri_approved', 'in_transit'].includes(selectedManifest?.status) && (
          <MenuItem onClick={handleMarkDelivered}>
            <DeliveredIcon fontSize="small" sx={{ mr: 1 }} />
            Mark Delivered
          </MenuItem>
        )}
      </Menu>

      {/* Edit Manifest Details Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: '#001f3f', color: 'white', fontWeight: 600 }}>
          Edit Manifest Details - {selectedManifest?.manifest_number}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contract Number"
                name="contract_number"
                value={editFormData.contract_number}
                onChange={handleEditChange}
                placeholder="e.g., HUANDAO EAST RD, 1811#"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Area and Phase"
                name="area_and_phase"
                value={editFormData.area_and_phase}
                onChange={handleEditChange}
                placeholder="e.g., SIMING DISTRICT"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Project Code"
                name="project_code"
                value={editFormData.project_code}
                onChange={handleEditChange}
                placeholder="e.g., PO #:56752 OX"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="COD Number"
                name="cod_number"
                value={editFormData.cod_number}
                onChange={handleEditChange}
                placeholder="e.g., COD 2025 247605_0001"
                helperText="Certificate of Destination number"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Driver Instruction 1"
                name="driver_instruction_1"
                value={editFormData.driver_instruction_1}
                onChange={handleEditChange}
                placeholder="e.g., ALL DRIVER TO STOP AT KAMOA LOGISTICS FOR LOGISTICS DEPARTMENT CONTROL, AND PLACE OF OFFLOADING GUIDANCE"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Driver Instruction 2"
                name="driver_instruction_2"
                value={editFormData.driver_instruction_2}
                onChange={handleEditChange}
                placeholder="e.g., DRIVER TO CONTACT LIEVAIN FROM NUCLEUS UPON ARRIVAL IN THE DRC - BEN CONTACT DETAILS ARE : +243 992 168 908 & LIEVAIN CIZA +243 997 335 177"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setEditDialogOpen(false)}
            sx={{ color: '#666' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            sx={{
              bgcolor: '#001f3f',
              color: 'white',
              '&:hover': { bgcolor: '#003d5c' },
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
