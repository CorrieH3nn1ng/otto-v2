import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  TextField,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  LocalShipping as ShippingIcon,
} from '@mui/icons-material';
import { loadConfirmationService } from '../services/loadConfirmationService';
import { vehicleTypes, equipmentLabels, getEquipmentForVehicleType } from '../config/vehicleTypes';

const AutoTransportPreviewDialog = ({ open, onClose, selectedData, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vehicleType, setVehicleType] = useState('');
  const [collectionDate, setCollectionDate] = useState('');
  const [currency, setCurrency] = useState('');
  const [equipment, setEquipment] = useState({
    straps: false,
    chains: false,
    tarpaulin: false,
    corner_plates: false,
    uprights: false,
    rubber_protection: false,
  });

  const handleVehicleTypeChange = (value) => {
    setVehicleType(value);
    // Auto-populate equipment based on vehicle type
    const autoEquipment = getEquipmentForVehicleType(value);
    setEquipment(autoEquipment);
  };

  const handleEquipmentChange = (field, checked) => {
    setEquipment({ ...equipment, [field]: checked });
  };

  const handleConfirm = async () => {
    // Validate required fields
    if (!vehicleType || !collectionDate || !currency) {
      setError('Please provide Vehicle Type, Collection Date, and Currency');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create Load Confirmations for each selected file name (Stage 1: REQUEST TRANSPORT)
      const results = [];

      for (const fileData of selectedData) {
        // Transpose data from invoice to Load Confirmation format
        const lcData = {
          file_reference: fileData.file_name,
          confirmation_date: null, // Will be set by Transport Planner in Stage 2
          collection_date: collectionDate, // Requested collection date
          collection_address: fileData.collection_address,
          delivery_address: fileData.delivery_address,
          currency: currency,
          clearing_agent: fileData.exit_agent,
          entry_agent: fileData.entry_agent,
          commodity_description: 'Auto-generated from invoice packing details',
          vehicle_type: vehicleType, // User-specified vehicle type
          contact_for_nucleus_drc: 'BEN +243 992 168 908 & LIEVAIN CIZA +243 997 335 177', // Default KAMOA contacts (temporary - will use user profile later)
          // Transport details will be filled in by Transport Planner during Stage 2 (CONFIRM TRANSPORT)
          transporter_id: null,
          transporter_name: null,
          truck_registration: null,
          attention: null,
          contact_details: null,
          // Equipment from form
          ...equipment,
          // Link to invoice
          invoice_ids: [fileData.invoice_id],
        };

        // Create Load Confirmation (status: 'draft' - awaiting Transport Planner assignment)
        const result = await loadConfirmationService.create(lcData);
        results.push(result);
      }

      if (onSuccess) {
        onSuccess(results);
      }

      onClose();
    } catch (err) {
      setError('Failed to create Load Confirmations: ' + err.message);
      setLoading(false);
    }
  };

  if (!selectedData || selectedData.length === 0) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle sx={{ bgcolor: '#001f3f', color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ShippingIcon />
        Confirm Transport Request
      </DialogTitle>
      <DialogContent sx={{ pt: '32px' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 3 }}>
          Review the data below and provide transport requirements. Load Confirmations will be created (Stage 1: REQUEST TRANSPORT) and appear in the Load Confirmation table awaiting Transport Planner assignment.
        </Alert>

        {/* Transport Requirements */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: '#e6f9f5', border: '2px solid #73e9c7' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#001f3f' }}>
            Transport Requirements (Required)
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              fullWidth
              required
              label="Vehicle Type"
              value={vehicleType}
              onChange={(e) => handleVehicleTypeChange(e.target.value)}
              error={!vehicleType && error !== null}
              helperText={!vehicleType && error !== null ? 'Vehicle type is required' : ''}
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
            <TextField
              type="date"
              fullWidth
              required
              label="Collection Date"
              value={collectionDate}
              onChange={(e) => setCollectionDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: new Date().toISOString().split('T')[0] }}
              error={!collectionDate && error !== null}
              helperText={!collectionDate && error !== null ? 'Collection date is required' : ''}
            />
            <TextField
              select
              fullWidth
              required
              label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              error={!currency && error !== null}
              helperText={!currency && error !== null ? 'Currency is required' : ''}
            >
              <MenuItem value="">
                <em>Select Currency</em>
              </MenuItem>
              <MenuItem value="USD">USD - US Dollar</MenuItem>
              <MenuItem value="EUR">EUR - Euro</MenuItem>
              <MenuItem value="ZAR">ZAR - South African Rand</MenuItem>
              <MenuItem value="GBP">GBP - British Pound</MenuItem>
            </TextField>
          </Box>

          {/* Equipment Requirements Section */}
          {vehicleType && (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: '#001f3f',
                  display: 'block',
                  mb: 1,
                }}
              >
                Equipment Requirements for {vehicleType}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                Pre-selected based on typical requirements. You can modify as needed.
              </Typography>
              <FormGroup>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 1 }}>
                  {Object.keys(equipmentLabels).map((key) => (
                    <FormControlLabel
                      key={key}
                      control={
                        <Checkbox
                          checked={equipment[key]}
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
                  ))}
                </Box>
              </FormGroup>
            </Box>
          )}
        </Paper>

        {/* File Summary */}
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#001f3f' }}>
          Creating {selectedData.length} Load Confirmation{selectedData.length !== 1 ? 's' : ''} (Stage 1)
        </Typography>

        {selectedData.map((fileData, index) => (
          <Paper key={fileData.file_name} elevation={1} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#001f3f', mb: 1 }}>
              {fileData.file_name}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <Box>
                <Typography variant="caption" color="textSecondary">Invoice</Typography>
                <Typography variant="body2">{fileData.invoice_number}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary">Customer</Typography>
                <Typography variant="body2">{fileData.customer_name}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary">Packages</Typography>
                <Typography variant="body2">{fileData.package_count}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary">Total CBM</Typography>
                <Typography variant="body2">{fileData.total_cbm.toFixed(3)} m³</Typography>
              </Box>
              <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                <Typography variant="caption" color="textSecondary">Collection Address</Typography>
                <Typography variant="body2">{fileData.collection_address || 'Not specified'}</Typography>
              </Box>
              <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                <Typography variant="caption" color="textSecondary">Delivery Address</Typography>
                <Typography variant="body2">{fileData.delivery_address || 'Not specified'}</Typography>
              </Box>
            </Box>
          </Paper>
        ))}
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '2px solid #001f3f' }}>
        <Button onClick={onClose} disabled={loading} sx={{ color: '#001f3f' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={loading || !vehicleType || !collectionDate || !currency}
          startIcon={loading ? <CircularProgress size={20} /> : <ShippingIcon />}
          sx={{
            bgcolor: '#73e9c7',
            color: '#001f3f',
            fontWeight: 600,
            px: 3,
            '&:hover': { bgcolor: '#5fd4b3' },
            '&:disabled': { bgcolor: '#e0e0e0', color: '#999' }
          }}
        >
          {loading ? 'Creating Load Confirmations...' : `Confirm & Request Transport`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AutoTransportPreviewDialog;
