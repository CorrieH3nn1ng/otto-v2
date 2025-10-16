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
  Button,
  Chip,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Alert,
} from '@mui/material';
import {
  Assignment as AssignIcon,
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
} from '@mui/icons-material';
import { loadConfirmationService } from '../../services/loadConfirmationService';
import { transporterService } from '../../services/transporterService';

export default function PendingRequestsTab() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [transporters, setTransporters] = useState([]);
  const [assignmentData, setAssignmentData] = useState({
    transporter_id: '',
    transporter_name: '',
    confirmation_date: '',
    vehicle_type: '',
    truck_registration: '',
    trailer_1_registration: '',
    trailer_2_registration: '',
    driver_name: '',
    driver_contact: '',
    planner_notes: '',
  });

  useEffect(() => {
    fetchPendingRequests();
    fetchTransporters();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const data = await loadConfirmationService.getPending();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransporters = async () => {
    try {
      const data = await transporterService.getAll();
      setTransporters(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching transporters:', error);
      setTransporters([]);
    }
  };

  const handleAssignClick = (request) => {
    setSelectedRequest(request);
    // Default confirmation date to today
    const today = new Date().toISOString().split('T')[0];
    setAssignmentData({
      transporter_id: '',
      transporter_name: '',
      confirmation_date: today,
      vehicle_type: request.vehicle_type || '',
      truck_registration: '',
      trailer_1_registration: '',
      trailer_2_registration: '',
      driver_name: '',
      driver_contact: '',
      planner_notes: '',
    });
    setAssignDialogOpen(true);
  };

  const handleTransporterChange = (transporterId) => {
    const transporter = transporters.find(t => t.id === transporterId);
    setAssignmentData({
      ...assignmentData,
      transporter_id: transporterId,
      transporter_name: transporter?.company_name || '',
    });
  };

  const handleAssignSubmit = async () => {
    try {
      const response = await loadConfirmationService.assign(selectedRequest.id, assignmentData);
      alert(response.message || 'Transport assigned successfully!');
      setAssignDialogOpen(false);
      fetchPendingRequests();
    } catch (error) {
      console.error('Error assigning transport:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to assign transport';
      alert(errorMsg);
    }
  };

  const getEquipmentList = (request) => {
    const equipment = [];
    if (request.straps) equipment.push('Straps');
    if (request.chains) equipment.push('Chains');
    if (request.tarpaulin) equipment.push('Tarpaulin');
    if (request.corner_plates) equipment.push('Corner Plates');
    if (request.uprights) equipment.push('Uprights');
    if (request.rubber_protection) equipment.push('Rubber Protection');
    return equipment.join(', ') || 'None';
  };

  if (loading) {
    return <Typography>Loading pending requests...</Typography>;
  }

  if (requests.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary">
          No pending transport requests
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          All requests have been assigned
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        You have <strong>{requests.length}</strong> pending transport request{requests.length !== 1 ? 's' : ''} requiring assignment
      </Alert>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f5f5f5' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>File Reference</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Collection Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Vehicle Type</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Equipment</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Currency</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id} hover>
                <TableCell>{request.file_reference}</TableCell>
                <TableCell>{request.collection_date ? new Date(request.collection_date).toLocaleDateString() : 'N/A'}</TableCell>
                <TableCell>{request.vehicle_type || 'N/A'}</TableCell>
                <TableCell sx={{ fontSize: '0.85rem' }}>{getEquipmentList(request)}</TableCell>
                <TableCell>{request.currency}</TableCell>
                <TableCell>
                  <Chip
                    label="Draft"
                    size="small"
                    sx={{
                      bgcolor: '#ff9800',
                      color: 'white',
                      fontWeight: 600,
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AssignIcon />}
                    onClick={() => handleAssignClick(request)}
                    sx={{
                      bgcolor: '#38b2ac',
                      '&:hover': { bgcolor: '#2c9a8f' },
                    }}
                  >
                    Assign
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#001f3f', color: 'white', fontWeight: 600 }}>
          Assign Transport - {selectedRequest?.file_reference}
        </DialogTitle>
        <DialogContent sx={{ pt: '32px' }}>
          <Grid container spacing={2}>
            <Grid size={12}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Request Details:</strong> {selectedRequest?.file_reference} | Collection: {selectedRequest && selectedRequest.collection_date && new Date(selectedRequest.collection_date).toLocaleDateString()} | Vehicle: {selectedRequest?.vehicle_type || 'N/A'}
              </Alert>
            </Grid>

            <Grid size={12}>
              <TextField
                label="Select Transporter"
                value={assignmentData.transporter_id}
                onChange={(e) => handleTransporterChange(e.target.value)}
                fullWidth
                required
                select
              >
                <MenuItem value="">
                  <em>Select a transporter...</em>
                </MenuItem>
                {transporters.map((transporter) => (
                  <MenuItem key={transporter.id} value={transporter.id}>
                    {transporter.company_name} - {transporter.phone}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={12}>
              <TextField
                label="Confirmation Date"
                type="date"
                value={assignmentData.confirmation_date}
                onChange={(e) => setAssignmentData({ ...assignmentData, confirmation_date: e.target.value })}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                helperText="Date when transport was confirmed (can be different from collection date)"
              />
            </Grid>

            <Grid size={12}>
              <TextField
                label="Vehicle Type"
                value={assignmentData.vehicle_type}
                onChange={(e) => setAssignmentData({ ...assignmentData, vehicle_type: e.target.value })}
                fullWidth
                required
              />
            </Grid>

            <Grid size={12}>
              <TextField
                label="Truck Registration"
                value={assignmentData.truck_registration}
                onChange={(e) => setAssignmentData({ ...assignmentData, truck_registration: e.target.value })}
                fullWidth
                required
                placeholder="e.g., ABC 123 GP"
              />
            </Grid>

            <Grid size={6}>
              <TextField
                label="Trailer 1 Registration"
                value={assignmentData.trailer_1_registration}
                onChange={(e) => setAssignmentData({ ...assignmentData, trailer_1_registration: e.target.value })}
                fullWidth
                placeholder="Optional"
              />
            </Grid>

            <Grid size={6}>
              <TextField
                label="Trailer 2 Registration"
                value={assignmentData.trailer_2_registration}
                onChange={(e) => setAssignmentData({ ...assignmentData, trailer_2_registration: e.target.value })}
                fullWidth
                placeholder="Optional"
              />
            </Grid>

            <Grid size={6}>
              <TextField
                label="Driver Name"
                value={assignmentData.driver_name}
                onChange={(e) => setAssignmentData({ ...assignmentData, driver_name: e.target.value })}
                fullWidth
                required
              />
            </Grid>

            <Grid size={6}>
              <TextField
                label="Driver Contact"
                value={assignmentData.driver_contact}
                onChange={(e) => setAssignmentData({ ...assignmentData, driver_contact: e.target.value })}
                fullWidth
                required
                placeholder="e.g., 083 123 4567"
              />
            </Grid>

            <Grid size={12}>
              <TextField
                label="Planner Notes"
                value={assignmentData.planner_notes}
                onChange={(e) => setAssignmentData({ ...assignmentData, planner_notes: e.target.value })}
                fullWidth
                multiline
                rows={3}
                placeholder="Any special instructions or notes..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '2px solid #001f3f' }}>
          <Button onClick={() => setAssignDialogOpen(false)} sx={{ color: '#001f3f' }}>
            Cancel
          </Button>
          <Button
            onClick={handleAssignSubmit}
            variant="contained"
            disabled={!assignmentData.transporter_id || !assignmentData.truck_registration || !assignmentData.driver_name}
            sx={{
              bgcolor: '#38b2ac',
              '&:hover': { bgcolor: '#2c9a8f' },
            }}
          >
            Assign Transport
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
