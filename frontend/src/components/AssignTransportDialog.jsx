import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { transportRequestService } from '../services/transportRequestService';
import api from '../services/api';

export default function AssignTransportDialog({ open, onClose, transportRequest, onSuccess }) {
  const [formData, setFormData] = useState({
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

  const [transporters, setTransporters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingTransporters, setLoadingTransporters] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      loadTransporters();
      // Pre-fill vehicle type from transport request
      if (transportRequest) {
        setFormData(prev => ({
          ...prev,
          vehicle_type: transportRequest.vehicle_type || '',
        }));
      }
    }
  }, [open, transportRequest]);

  const loadTransporters = async () => {
    try {
      setLoadingTransporters(true);
      const response = await api.get('/transporters');
      setTransporters(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to load transporters:', err);
      setError('Failed to load transporters list');
    } finally {
      setLoadingTransporters(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });

    // Auto-fill transporter name when transporter is selected
    if (field === 'transporter_id' && value) {
      const selectedTransporter = transporters.find(t => t.id === value);
      if (selectedTransporter) {
        setFormData(prev => ({
          ...prev,
          transporter_id: value,
          transporter_name: selectedTransporter.name,
        }));
      }
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.transporter_id) {
      setError('Please select a transporter');
      return;
    }
    if (!formData.transporter_name) {
      setError('Transporter name is required');
      return;
    }
    if (!formData.vehicle_type) {
      setError('Please enter vehicle type');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await transportRequestService.assign(transportRequest.id, formData);

      alert(
        `Transport assigned successfully!\n` +
        `Transport Request: ${result.transport_request?.request_reference}\n` +
        `Load Confirmation created: ${result.load_confirmation?.file_reference || 'N/A'}`
      );

      onSuccess();
      onClose();

      // Reset form
      setFormData({
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
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to assign transport');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: '#001f3f', color: 'white', fontWeight: 600 }}>
        Assign Transport - {transportRequest?.request_reference}
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Grid container spacing={3}>
          {/* Transport Request Info */}
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              <strong>File Reference:</strong> {transportRequest?.file_ref}<br />
              <strong>Collection Date:</strong> {transportRequest?.requested_collection_date ?
                new Date(transportRequest.requested_collection_date).toLocaleDateString() : 'N/A'}<br />
              <strong>Currency:</strong> {transportRequest?.currency}
            </Typography>
          </Grid>

          {/* Transporter Selection */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Transporter"
              value={formData.transporter_id}
              onChange={(e) => handleChange('transporter_id', e.target.value)}
              fullWidth
              required
              select
              disabled={loadingTransporters}
            >
              <MenuItem value="">
                {loadingTransporters ? 'Loading...' : 'Select Transporter'}
              </MenuItem>
              {transporters.map((transporter) => (
                <MenuItem key={transporter.id} value={transporter.id}>
                  {transporter.name} {transporter.code ? `(${transporter.code})` : ''}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Transporter Name"
              value={formData.transporter_name}
              onChange={(e) => handleChange('transporter_name', e.target.value)}
              fullWidth
              required
              placeholder="Auto-filled from selection"
              InputProps={{
                readOnly: true,
              }}
            />
          </Grid>

          {/* Vehicle Details */}
          <Grid item xs={12}>
            <TextField
              label="Vehicle Type"
              value={formData.vehicle_type}
              onChange={(e) => handleChange('vehicle_type', e.target.value)}
              fullWidth
              required
              placeholder="e.g., 40ft Flatbed, 20ft Container"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="Truck Registration"
              value={formData.truck_registration}
              onChange={(e) => handleChange('truck_registration', e.target.value)}
              fullWidth
              placeholder="e.g., ABC-123-GP"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="Trailer 1 Registration"
              value={formData.trailer_1_registration}
              onChange={(e) => handleChange('trailer_1_registration', e.target.value)}
              fullWidth
              placeholder="Optional"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="Trailer 2 Registration"
              value={formData.trailer_2_registration}
              onChange={(e) => handleChange('trailer_2_registration', e.target.value)}
              fullWidth
              placeholder="Optional"
            />
          </Grid>

          {/* Driver Details */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Driver Name"
              value={formData.driver_name}
              onChange={(e) => handleChange('driver_name', e.target.value)}
              fullWidth
              placeholder="Optional"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Driver Contact"
              value={formData.driver_contact}
              onChange={(e) => handleChange('driver_contact', e.target.value)}
              fullWidth
              placeholder="Phone number or email"
            />
          </Grid>

          {/* Planner Notes */}
          <Grid item xs={12}>
            <TextField
              label="Planner Notes"
              value={formData.planner_notes}
              onChange={(e) => handleChange('planner_notes', e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Any special instructions or notes..."
            />
          </Grid>

          {error && (
            <Grid item xs={12}>
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '2px solid #001f3f' }}>
        <Button
          onClick={onClose}
          disabled={loading}
          sx={{ borderColor: '#001f3f', color: '#001f3f' }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || loadingTransporters}
          sx={{
            bgcolor: '#73e9c7',
            color: '#001f3f',
            '&:hover': { bgcolor: '#5fd4b3' },
          }}
        >
          {loading ? <CircularProgress size={24} /> : 'Assign Transport'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
