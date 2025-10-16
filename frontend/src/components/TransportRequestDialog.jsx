import React, { useState } from 'react';
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
  FormGroup,
  FormControlLabel,
  Checkbox,
  Paper,
  Box,
} from '@mui/material';
import { transportRequestService } from '../services/transportRequestService';
import { vehicleTypes, equipmentLabels, getEquipmentForVehicleType } from '../config/vehicleTypes';

// Updated: All fields now stack vertically (xs={12})
export default function TransportRequestDialog({ open, onClose, invoice, onSuccess }) {
  const [formData, setFormData] = useState({
    file_ref: '',
    vehicle_type: '',
    requested_collection_date: '',
    currency: 'USD',
    straps: false,
    chains: false,
    tarpaulin: false,
    corner_plates: false,
    uprights: false,
    rubber_protection: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Log when dialog opens
  React.useEffect(() => {
    if (open) {
      console.log('🚀 REQUEST TRANSPORT DIALOG OPENED - Version: 2.0 - ALL FIELDS xs={12}');
      console.log('📋 Grid Configuration: File Reference xs=12, Vehicle Type xs=12, Collection Date xs=12, Currency xs=12');
    }
  }, [open]);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleVehicleTypeChange = (value) => {
    // Get typical equipment requirements for selected vehicle type
    const equipment = getEquipmentForVehicleType(value);

    // Update form data with vehicle type and auto-populate equipment
    setFormData({
      ...formData,
      vehicle_type: value,
      ...equipment,
    });
  };

  const handleEquipmentChange = (field, checked) => {
    setFormData({ ...formData, [field]: checked });
  };

  const handleSubmit = async () => {
    if (!formData.file_ref) {
      setError('Please enter a file reference number');
      return;
    }
    if (!formData.vehicle_type) {
      setError('Please select a vehicle type');
      return;
    }
    if (!formData.requested_collection_date) {
      setError('Please select a collection date');
      return;
    }
    if (!formData.currency) {
      setError('Please select a currency');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = {
        ...formData,
      };

      // If coming from Invoice, attach invoice_ids
      if (invoice) {
        data.invoice_ids = [invoice.id];
      }

      const result = await transportRequestService.create(data);
      alert(`Transport request created successfully!\nReference: ${result.transport_request.request_reference}`);
      onSuccess();
      onClose();

      // Reset form
      setFormData({
        file_ref: '',
        vehicle_type: '',
        requested_collection_date: '',
        currency: 'USD',
        straps: false,
        chains: false,
        tarpaulin: false,
        corner_plates: false,
        uprights: false,
        rubber_protection: false,
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create transport request');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (invoice) {
      return `Request Transport - Invoice ${invoice.invoice_number}`;
    }
    return 'Request Transport';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: '#001f3f', color: 'white', fontWeight: 600 }}>
        {getTitle()}
      </DialogTitle>
      <DialogContent sx={{ pt: '32px', minHeight: '400px' }}>
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField
              label="File Reference Number"
              value={formData.file_ref}
              onChange={(e) => handleChange('file_ref', e.target.value)}
              fullWidth
              required
              placeholder="Enter file reference number"
            />
          </Grid>

          <Grid size={12}>
            <TextField
              label="Vehicle Type"
              value={formData.vehicle_type}
              onChange={(e) => handleVehicleTypeChange(e.target.value)}
              fullWidth
              required
              select
            >
              <MenuItem value="">
                <em>Select Vehicle Type</em>
              </MenuItem>
              {vehicleTypes.map((vehicle) => (
                <MenuItem key={vehicle.value} value={vehicle.value}>
                  {vehicle.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={12}>
            <TextField
              label="Collection Date"
              type="date"
              value={formData.requested_collection_date}
              onChange={(e) => handleChange('requested_collection_date', e.target.value)}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid size={12}>
            <TextField
              label="Currency"
              value={formData.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
              fullWidth
              required
              select
            >
              <MenuItem value="USD">USD - US Dollar</MenuItem>
              <MenuItem value="EUR">EUR - Euro</MenuItem>
              <MenuItem value="ZAR">ZAR - South African Rand</MenuItem>
              <MenuItem value="GBP">GBP - British Pound</MenuItem>
            </TextField>
          </Grid>

          {/* Equipment Requirements Section */}
          {formData.vehicle_type && (
            <Grid size={12}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: '#e6f9f5',
                  border: '1px solid #73e9c7',
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    color: '#001f3f',
                    mb: 1.5,
                  }}
                >
                  Equipment Requirements for {formData.vehicle_type}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                  Pre-selected based on typical requirements. You can modify as needed.
                </Typography>
                <FormGroup>
                  <Grid container spacing={1}>
                    {Object.keys(equipmentLabels).map((key) => (
                      <Grid size={{ xs: 6, md: 4 }} key={key}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={formData[key]}
                              onChange={(e) => handleEquipmentChange(key, e.target.checked)}
                              sx={{
                                color: '#001f3f',
                                '&.Mui-checked': {
                                  color: '#73e9c7',
                                },
                              }}
                            />
                          }
                          label={equipmentLabels[key]}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </FormGroup>
              </Paper>
            </Grid>
          )}

          {error && (
            <Grid size={12}>
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
          disabled={loading}
          sx={{
            bgcolor: '#73e9c7',
            color: '#001f3f',
            '&:hover': { bgcolor: '#5fd4b3' },
          }}
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
