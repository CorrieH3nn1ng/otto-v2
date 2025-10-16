import React, { useState, useEffect } from 'react';
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
  Grid,
  TextField,
  Autocomplete,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Assignment as AssignmentIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { transportRequestService } from '../services/transportRequestService';

const statusColors = {
  pending: 'warning',
  assigned: 'success',
  rejected: 'error',
  completed: 'default',
};

export default function TransportRequestList() {
  const [transportRequests, setTransportRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  // Assignment form state
  const [assignmentData, setAssignmentData] = useState({
    transporter_id: '',
    transporter_name: '',
    vehicle_type: '',
    truck_registration: '',
    trailer_1_registration: '',
    trailer_2_registration: '',
    driver_name: '',
    driver_contact: '',
    planner_notes: '',
  });

  const [rejectNotes, setRejectNotes] = useState('');
  const [transporters, setTransporters] = useState([]);

  const loadTransportRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await transportRequestService.getAll();
      setTransportRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load transport requests: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTransporters = async () => {
    try {
      // Assuming there's a transporters endpoint
      const response = await fetch('http://localhost:8000/api/transporters');
      const data = await response.json();
      setTransporters(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load transporters:', err);
    }
  };

  useEffect(() => {
    loadTransportRequests();
    loadTransporters();
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
  };

  const handleViewDetails = () => {
    setDetailDialogOpen(true);
    handleMenuClose();
  };

  const handleOpenAssignDialog = () => {
    setAssignDialogOpen(true);
    handleMenuClose();
  };

  const handleOpenRejectDialog = () => {
    setRejectDialogOpen(true);
    handleMenuClose();
  };

  const handleAssign = async () => {
    if (!selectedRequest) return;

    if (!assignmentData.transporter_id || !assignmentData.transporter_name || !assignmentData.vehicle_type) {
      alert('Please fill in required fields: Transporter, Transporter Name, and Vehicle Type');
      return;
    }

    try {
      const result = await transportRequestService.assign(selectedRequest.id, assignmentData);
      alert(`Transport assigned successfully!\nLoad Confirmation created: ${result.load_confirmation.file_reference}`);
      setAssignDialogOpen(false);
      setSelectedRequest(null);
      setAssignmentData({
        transporter_id: '',
        transporter_name: '',
        vehicle_type: '',
        truck_registration: '',
        trailer_1_registration: '',
        trailer_2_registration: '',
        driver_name: '',
        driver_contact: '',
        planner_notes: '',
      });
      loadTransportRequests();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message || 'Failed to assign transport'));
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    try {
      await transportRequestService.reject(selectedRequest.id, rejectNotes);
      alert('Transport request rejected successfully');
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectNotes('');
      loadTransportRequests();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message || 'Failed to reject transport request'));
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

  if (transportRequests.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No transport requests found
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
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Request Ref</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Collection Date</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Collection Address</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Delivery Address</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Equipment</TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transportRequests
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
                  <TableCell>{new Date(request.requested_collection_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                      {request.collection_address || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                      {request.delivery_address || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={request.status}
                      color={statusColors[request.status] || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {request.straps && (
                        <Chip label="Straps" size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                      )}
                      {request.chains && (
                        <Chip label="Chains" size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                      )}
                      {request.tarpaulin && (
                        <Chip label="Tarpaulin" size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                      )}
                      {request.corner_plates && (
                        <Chip label="Corners" size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                      )}
                      {request.uprights && (
                        <Chip label="Uprights" size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                      )}
                      {request.rubber_protection && (
                        <Chip label="Rubber" size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                      )}
                    </Box>
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
        count={transportRequests.length}
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
        <MenuItem
          onClick={handleOpenAssignDialog}
          disabled={selectedRequest?.status !== 'pending'}
        >
          <AssignmentIcon fontSize="small" sx={{ mr: 1 }} />
          Assign Transport
        </MenuItem>
        <MenuItem
          onClick={handleOpenRejectDialog}
          disabled={selectedRequest?.status !== 'pending'}
        >
          <CancelIcon fontSize="small" sx={{ mr: 1 }} />
          Reject Request
        </MenuItem>
      </Menu>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#001f3f', color: 'white', fontWeight: 600 }}>
          Transport Request Details - {selectedRequest?.request_reference}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedRequest && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#666', fontWeight: 500 }}>
                  Collection Date
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {new Date(selectedRequest.requested_collection_date).toLocaleDateString()}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#666', fontWeight: 500 }}>
                  Status
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  <Chip label={selectedRequest.status} color={statusColors[selectedRequest.status]} size="small" />
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" sx={{ color: '#666', fontWeight: 500 }}>
                  Collection Address
                </Typography>
                <Typography variant="body2">{selectedRequest.collection_address || '-'}</Typography>
                {selectedRequest.collection_address_2 && (
                  <Typography variant="body2">{selectedRequest.collection_address_2}</Typography>
                )}
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" sx={{ color: '#666', fontWeight: 500 }}>
                  Delivery Address
                </Typography>
                <Typography variant="body2">{selectedRequest.delivery_address || '-'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" sx={{ color: '#666', fontWeight: 500 }}>
                  Commodity Description
                </Typography>
                <Typography variant="body2">{selectedRequest.commodity_description || '-'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" sx={{ color: '#666', fontWeight: 500 }}>
                  Special Requirements
                </Typography>
                <Typography variant="body2">{selectedRequest.special_requirements || '-'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" sx={{ color: '#666', fontWeight: 500, display: 'block', mb: 1 }}>
                  Equipment Requirements
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {selectedRequest.straps && <Chip label="Straps" size="small" />}
                  {selectedRequest.chains && <Chip label="Chains" size="small" />}
                  {selectedRequest.tarpaulin && <Chip label="Tarpaulin" size="small" />}
                  {selectedRequest.corner_plates && <Chip label="Corner Plates" size="small" />}
                  {selectedRequest.uprights && <Chip label="Uprights" size="small" />}
                  {selectedRequest.rubber_protection && <Chip label="Rubber Protection" size="small" />}
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '2px solid #001f3f' }}>
          <Button
            onClick={() => setDetailDialogOpen(false)}
            sx={{ borderColor: '#001f3f', color: '#001f3f' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#001f3f', color: 'white', fontWeight: 600 }}>
          Assign Transport - {selectedRequest?.request_reference}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Autocomplete
                options={transporters}
                getOptionLabel={(option) => `${option.name} (${option.code})`}
                value={transporters.find(t => t.id === assignmentData.transporter_id) || null}
                onChange={(event, newValue) => {
                  setAssignmentData({
                    ...assignmentData,
                    transporter_id: newValue?.id || '',
                    transporter_name: newValue?.name || '',
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Transporter *"
                    required
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Transporter Name *"
                value={assignmentData.transporter_name}
                onChange={(e) => setAssignmentData({ ...assignmentData, transporter_name: e.target.value })}
                fullWidth
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Vehicle Type *"
                value={assignmentData.vehicle_type}
                onChange={(e) => setAssignmentData({ ...assignmentData, vehicle_type: e.target.value })}
                fullWidth
                required
                placeholder="e.g., Flatbed Trailer, Box Truck, etc."
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Truck Registration"
                value={assignmentData.truck_registration}
                onChange={(e) => setAssignmentData({ ...assignmentData, truck_registration: e.target.value })}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Trailer 1 Registration"
                value={assignmentData.trailer_1_registration}
                onChange={(e) => setAssignmentData({ ...assignmentData, trailer_1_registration: e.target.value })}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Trailer 2 Registration"
                value={assignmentData.trailer_2_registration}
                onChange={(e) => setAssignmentData({ ...assignmentData, trailer_2_registration: e.target.value })}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Driver Name"
                value={assignmentData.driver_name}
                onChange={(e) => setAssignmentData({ ...assignmentData, driver_name: e.target.value })}
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Driver Contact"
                value={assignmentData.driver_contact}
                onChange={(e) => setAssignmentData({ ...assignmentData, driver_contact: e.target.value })}
                fullWidth
                placeholder="Phone number or email"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Planner Notes"
                value={assignmentData.planner_notes}
                onChange={(e) => setAssignmentData({ ...assignmentData, planner_notes: e.target.value })}
                fullWidth
                multiline
                rows={3}
                placeholder="Any additional notes for this assignment"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '2px solid #001f3f' }}>
          <Button
            onClick={() => setAssignDialogOpen(false)}
            sx={{ borderColor: '#001f3f', color: '#001f3f' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            variant="contained"
            sx={{
              bgcolor: '#73e9c7',
              color: '#001f3f',
              '&:hover': { bgcolor: '#5fd4b3' },
            }}
          >
            Assign & Create Load Confirmation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#001f3f', color: 'white', fontWeight: 600 }}>
          Reject Transport Request - {selectedRequest?.request_reference}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            label="Rejection Reason"
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            fullWidth
            multiline
            rows={4}
            placeholder="Please provide a reason for rejecting this transport request"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '2px solid #001f3f' }}>
          <Button
            onClick={() => setRejectDialogOpen(false)}
            sx={{ borderColor: '#001f3f', color: '#001f3f' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReject}
            variant="contained"
            color="error"
          >
            Reject Request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
