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
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Assignment as AssignmentIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { transportRequestService } from '../services/transportRequestService';
import TransportRequestDialog from '../components/TransportRequestDialog';
import AssignTransportDialog from '../components/AssignTransportDialog';

const statusColors = {
  pending: 'warning',
  assigned: 'success',
  rejected: 'error',
  completed: 'info',
};

const statusLabels = {
  pending: 'Pending',
  assigned: 'Assigned',
  rejected: 'Rejected',
  completed: 'Completed',
};

export default function TransportRequestList() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await transportRequestService.getAll();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load transport requests: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuOpen = (event, request) => {
    setAnchorEl(event.currentTarget);
    setSelectedRequest(request);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRequest(null);
  };

  const handleCreateNew = () => {
    setCreateDialogOpen(true);
  };

  const handleCreateSuccess = () => {
    loadRequests();
    setCreateDialogOpen(false);
  };

  const handleAssign = () => {
    if (!selectedRequest) return;
    setAssignDialogOpen(true);
    handleMenuClose();
  };

  const handleAssignSuccess = () => {
    loadRequests();
    setAssignDialogOpen(false);
    setSelectedRequest(null);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    const notes = prompt('Enter rejection notes (optional):');
    if (notes === null) return; // User cancelled

    try {
      await transportRequestService.reject(selectedRequest.id, notes);
      alert('Transport request rejected successfully.');
      handleMenuClose();
      loadRequests();
    } catch (err) {
      alert('Failed to reject request: ' + err.message);
    }
  };

  const handleViewDetails = () => {
    if (!selectedRequest) return;
    // TODO: Open detail dialog when implemented
    alert(`View details for request: ${selectedRequest.request_reference}`);
    handleMenuClose();
  };

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ flex: 1, p: 2.5, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography
            variant="h5"
            sx={{
              color: '#2d3748',
              fontWeight: 700,
            }}
          >
            Transport Requests
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateNew}
            sx={{
              bgcolor: '#73e9c7',
              color: '#001f3f',
              '&:hover': { bgcolor: '#5fd4b3' },
            }}
          >
            Request Transport
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {requests.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No transport requests found. Create your first request to get started.
            </Typography>
          </Paper>
        ) : (
          <>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#001f3f' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Reference</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>File Ref</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Vehicle Type</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Collection Date</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Currency</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Transporter</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Created</TableCell>
                    <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requests
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((request) => (
                      <TableRow
                        key={request.id}
                        hover
                        sx={{
                          '&:nth-of-type(odd)': { bgcolor: '#e6f9f5' },
                          '&:hover': { bgcolor: '#d0f2ea !important' }
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#001f3f' }}>
                            {request.request_reference}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {request.file_ref}
                          </Typography>
                        </TableCell>
                        <TableCell>{request.vehicle_type}</TableCell>
                        <TableCell>
                          {new Date(request.requested_collection_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{request.currency}</TableCell>
                        <TableCell>
                          {request.transporter ? (
                            <>
                              <Typography variant="body2">{request.transporter_name}</Typography>
                              {request.truck_registration && (
                                <Typography variant="caption" color="text.secondary">
                                  {request.truck_registration}
                                </Typography>
                              )}
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Not assigned
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={statusLabels[request.status] || request.status}
                            color={statusColors[request.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(request.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, request)}
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
              count={requests.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleViewDetails}>
            <VisibilityIcon fontSize="small" sx={{ mr: 1 }} />
            View Details
          </MenuItem>
          <MenuItem
            onClick={handleAssign}
            disabled={selectedRequest?.status !== 'pending'}
          >
            <AssignmentIcon fontSize="small" sx={{ mr: 1 }} />
            Assign Transport
          </MenuItem>
          <MenuItem
            onClick={handleReject}
            disabled={selectedRequest?.status !== 'pending'}
          >
            <CancelIcon fontSize="small" sx={{ mr: 1 }} />
            Reject Request
          </MenuItem>
        </Menu>

        {/* Create Transport Request Dialog */}
        <TransportRequestDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onSuccess={handleCreateSuccess}
        />

        {/* Assign Transport Dialog */}
        {selectedRequest && (
          <AssignTransportDialog
            open={assignDialogOpen}
            onClose={() => {
              setAssignDialogOpen(false);
              setSelectedRequest(null);
            }}
            transportRequest={selectedRequest}
            onSuccess={handleAssignSuccess}
          />
        )}
      </Box>
    </Layout>
  );
}
