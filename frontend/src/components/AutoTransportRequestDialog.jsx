import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  LocalShipping as ShippingIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { invoiceService } from '../services/invoiceService';

const AutoTransportRequestDialog = ({ open, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileNames, setFileNames] = useState([]);
  const [selectedFileNames, setSelectedFileNames] = useState([]);

  useEffect(() => {
    if (open) {
      fetchFileNames();
    }
  }, [open]);

  const fetchFileNames = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await invoiceService.getUniqueFileNames();
      setFileNames(response.data.available || []);
      setSelectedFileNames([]); // Reset selection
    } catch (err) {
      setError('Failed to load file names: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedFileNames.length === fileNames.length) {
      setSelectedFileNames([]);
    } else {
      setSelectedFileNames(fileNames.map(fn => fn.file_name));
    }
  };

  const handleSelectOne = (fileName) => {
    if (selectedFileNames.includes(fileName)) {
      setSelectedFileNames(selectedFileNames.filter(fn => fn !== fileName));
    } else {
      setSelectedFileNames([...selectedFileNames, fileName]);
    }
  };

  const handleProceed = () => {
    if (selectedFileNames.length === 0) {
      alert('Please select at least one file name to proceed');
      return;
    }

    // Get the full data for selected file names
    const selectedData = fileNames.filter(fn => selectedFileNames.includes(fn.file_name));

    // Call success handler with selected data
    if (onSuccess) {
      onSuccess(selectedData);
    }

    onClose();
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'available':
        return <Chip label="Ready" size="small" color="success" icon={<CheckCircleIcon />} />;
      case 'confirmed':
        return <Chip label="Has LC" size="small" color="info" />;
      case 'locked':
        return <Chip label="Locked" size="small" color="error" icon={<WarningIcon />} />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle sx={{ bgcolor: '#73e9c7', color: '#001f3f', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ShippingIcon />
        AUTO TRANSPORT REQUEST
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : fileNames.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No File Names Available
            </Typography>
            <Typography variant="body2" color="textSecondary">
              There are no packing details with File Names ready for transport request.
              Please add File Names to your invoice packing details first.
            </Typography>
          </Box>
        ) : (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Select the File Names you want to create Load Confirmations for.
              Data will be automatically transposed from the invoices.
            </Alert>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Available File Names ({fileNames.length})
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Selected: {selectedFileNames.length}
              </Typography>
            </Box>

            <TableContainer component={Paper} sx={{ border: '1px solid #e0e0e0' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#001f3f' }}>
                    <TableCell padding="checkbox" sx={{ color: 'white' }}>
                      <Checkbox
                        checked={selectedFileNames.length === fileNames.length && fileNames.length > 0}
                        indeterminate={selectedFileNames.length > 0 && selectedFileNames.length < fileNames.length}
                        onChange={handleSelectAll}
                        sx={{ color: 'white', '&.Mui-checked': { color: '#73e9c7' } }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>File Name</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Invoice</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Customer</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Packages</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>CBM</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Weight (kg)</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fileNames.map((fn) => (
                    <TableRow
                      key={fn.file_name}
                      hover
                      sx={{
                        cursor: 'pointer',
                        bgcolor: selectedFileNames.includes(fn.file_name) ? '#e8f5e9' : 'inherit',
                        '&:nth-of-type(odd)': {
                          bgcolor: selectedFileNames.includes(fn.file_name) ? '#e8f5e9' : '#f5f5f5'
                        },
                        '&:hover': {
                          bgcolor: selectedFileNames.includes(fn.file_name) ? '#c8e6c9 !important' : '#e0e0e0 !important'
                        }
                      }}
                      onClick={() => handleSelectOne(fn.file_name)}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedFileNames.includes(fn.file_name)}
                          sx={{
                            '&.Mui-checked': { color: '#4caf50' }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                          {fn.file_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{fn.invoice_number}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{fn.customer_name || 'N/A'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{fn.package_count}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{fn.total_cbm.toFixed(3)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{fn.total_gross_weight_kg.toFixed(2)}</Typography>
                      </TableCell>
                      <TableCell>
                        {getStatusChip(fn.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '2px solid #e0e0e0' }}>
        <Button onClick={onClose} sx={{ color: '#666' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleProceed}
          disabled={selectedFileNames.length === 0}
          startIcon={<ShippingIcon />}
          sx={{
            bgcolor: '#73e9c7',
            color: '#001f3f',
            fontWeight: 600,
            '&:hover': { bgcolor: '#5fd4b3' },
            '&:disabled': { bgcolor: '#e0e0e0', color: '#999' }
          }}
        >
          Proceed with {selectedFileNames.length} File{selectedFileNames.length !== 1 ? 's' : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AutoTransportRequestDialog;
