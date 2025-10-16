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
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Description as DescriptionIcon,
  CheckCircle as CheckCircleIcon,
  LocalShipping as ShippingIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { manifestService } from '../services/manifestService';

const statusColors = {
  draft: 'default',
  pending_feri: 'warning',
  feri_submitted: 'info',
  feri_approved: 'success',
  in_transit: 'primary',
  delivered: 'success',
  cancelled: 'error',
};

export default function ManifestList() {
  const [manifests, setManifests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedManifest, setSelectedManifest] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await manifestService.getAll();
      setManifests(data.data || []);
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
    setAnchorEl(event.currentTarget);
    setSelectedManifest(manifest);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedManifest(null);
  };

  const handleSubmitFeri = async () => {
    if (!selectedManifest) return;

    try {
      await manifestService.submitFeri(selectedManifest.id);
      handleMenuClose();
      loadData();
    } catch (err) {
      setError('Failed to submit FERI: ' + err.message);
    }
  };

  const handleApproveFeri = async () => {
    if (!selectedManifest) return;

    try {
      await manifestService.approveFeri(selectedManifest.id);
      handleMenuClose();
      loadData();
    } catch (err) {
      setError('Failed to approve FERI: ' + err.message);
    }
  };

  const handleMarkDelivered = async () => {
    if (!selectedManifest) return;

    try {
      await manifestService.markDelivered(selectedManifest.id);
      handleMenuClose();
      loadData();
    } catch (err) {
      setError('Failed to mark as delivered: ' + err.message);
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

  if (manifests.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h1" sx={{ fontSize: '40px', opacity: 0.5, mb: 1 }}>
          📦
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
          No manifests yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manifests are created from load confirmations for customs clearance
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
              <TableCell><strong>Manifest Number</strong></TableCell>
              <TableCell><strong>Created Date</strong></TableCell>
              <TableCell><strong>Border Post</strong></TableCell>
              <TableCell><strong>Invoices</strong></TableCell>
              <TableCell><strong>FERI Status</strong></TableCell>
              <TableCell><strong>Delivery Status</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {manifests
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((manifest) => (
                <TableRow
                  key={manifest.id}
                  hover
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {manifest.manifest_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {new Date(manifest.created_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{manifest.border_post || 'TBD'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={`${manifest.invoices?.length || 0} invoice(s) attached`}>
                      <Chip
                        label={manifest.invoices?.length || 0}
                        size="small"
                        color="primary"
                        icon={<DescriptionIcon />}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {manifest.feri_submitted_at ? (
                        <>
                          <Chip
                            label="Submitted"
                            size="small"
                            color="info"
                            icon={<CheckCircleIcon />}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(manifest.feri_submitted_at).toLocaleDateString()}
                          </Typography>
                        </>
                      ) : (
                        <Chip label="Not Submitted" size="small" color="default" />
                      )}
                      {manifest.feri_approved_at && (
                        <>
                          <Chip
                            label="Approved"
                            size="small"
                            color="success"
                            icon={<CheckCircleIcon />}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(manifest.feri_approved_at).toLocaleDateString()}
                          </Typography>
                        </>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {manifest.delivered_at ? (
                      <>
                        <Chip
                          label="Delivered"
                          size="small"
                          color="success"
                          icon={<CheckCircleIcon />}
                        />
                        <Typography variant="caption" color="text.secondary" display="block">
                          {new Date(manifest.delivered_at).toLocaleDateString()}
                        </Typography>
                      </>
                    ) : (
                      <Chip label="In Transit" size="small" color="primary" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={manifest.status}
                      color={statusColors[manifest.status] || 'default'}
                      size="small"
                    />
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

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={handleSubmitFeri}
          disabled={selectedManifest?.feri_submitted_at != null}
        >
          <AssignmentIcon fontSize="small" sx={{ mr: 1 }} />
          Submit FERI
        </MenuItem>
        <MenuItem
          onClick={handleApproveFeri}
          disabled={
            !selectedManifest?.feri_submitted_at ||
            selectedManifest?.feri_approved_at != null
          }
        >
          <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
          Approve FERI
        </MenuItem>
        <MenuItem
          onClick={handleMarkDelivered}
          disabled={
            !selectedManifest?.feri_approved_at ||
            selectedManifest?.delivered_at != null
          }
        >
          <ShippingIcon fontSize="small" sx={{ mr: 1 }} />
          Mark Delivered
        </MenuItem>
      </Menu>
    </Box>
  );
}
