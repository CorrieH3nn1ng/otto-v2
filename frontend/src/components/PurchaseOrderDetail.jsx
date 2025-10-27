import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Grid,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Autocomplete
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import Layout from './Layout';
import { agentService } from '../services/agentService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const PurchaseOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [po, setPO] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [licenseUploading, setLicenseUploading] = useState(false);
  const [licenseUploadError, setLicenseUploadError] = useState(null);
  const [licenseUploadSuccess, setLicenseUploadSuccess] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showLicenseUpload, setShowLicenseUpload] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [documentUploading, setDocumentUploading] = useState(false);
  const [documentUploadError, setDocumentUploadError] = useState(null);
  const [documentUploadSuccess, setDocumentUploadSuccess] = useState(null);
  const [isDocumentDragging, setIsDocumentDragging] = useState(false);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedPO, setEditedPO] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    fetchPO();
    fetchDocuments();
    fetchAgents();
  }, [id]);

  const fetchAgents = async () => {
    try {
      const agentsData = await agentService.getAll();
      setAgents(agentsData || []);
    } catch (err) {
      console.error('Failed to load agents:', err);
    }
  };

  const fetchPO = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/purchase-orders/${id}`);
      console.log('Fetched PO entry_agent:', response.data.entry_agent);
      setPO(response.data);
    } catch (err) {
      console.error('Error fetching PO:', err);
      setError('Failed to load Purchase Order');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/documents/invoice/${id}`);
      setDocuments(response.data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  const handleDeletePO = async () => {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await axios.delete(`${API_BASE_URL}/invoices/${id}`);
      navigate('/');
    } catch (err) {
      console.error('Error deleting PO:', err);
      setDeleteError(err.response?.data?.error || 'Failed to delete Purchase Order');
      setDeleteLoading(false);
    }
  };

  const processLicenseFile = async (file) => {
    if (!file) return;

    // Check if it's a PDF
    if (file.type !== 'application/pdf') {
      setLicenseUploadError('Please upload a PDF file');
      return;
    }

    setLicenseUploading(true);
    setLicenseUploadError(null);
    setLicenseUploadSuccess(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('purchase_order_id', id);

    try {
      const response = await axios.post(`${API_BASE_URL}/licenses/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minute timeout for AI processing
      });

      setLicenseUploadSuccess(`License uploaded successfully: ${response.data.declaration_number}`);
      // Refresh the PO data to show the new license
      await fetchPO();
      // Hide upload form after successful upload
      setTimeout(() => {
        setShowLicenseUpload(false);
        setLicenseUploadSuccess(null);
      }, 3000); // Show success message for 3 seconds before closing
    } catch (err) {
      console.error('Error uploading license:', err);
      setLicenseUploadError(err.response?.data?.error || 'Failed to upload license');
    } finally {
      setLicenseUploading(false);
    }
  };

  const handleLicenseUpload = async (event) => {
    const file = event.target.files[0];
    await processLicenseFile(file);
    // Clear the file input
    event.target.value = '';
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (licenseUploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processLicenseFile(files[0]);
    }
  };

  // Document upload handlers
  const processDocumentFile = async (file) => {
    if (!file) return;

    setDocumentUploading(true);
    setDocumentUploadError(null);
    setDocumentUploadSuccess(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', 'purchase_order');
    formData.append('description', file.name);

    try {
      await axios.post(`${API_BASE_URL}/invoices/${id}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setDocumentUploadSuccess(`Document uploaded successfully: ${file.name}`);
      await fetchDocuments();
      setTimeout(() => {
        setShowDocumentUpload(false);
        setDocumentUploadSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error uploading document:', err);
      setDocumentUploadError(err.response?.data?.error || 'Failed to upload document');
    } finally {
      setDocumentUploading(false);
    }
  };

  const handleDocumentUpload = async (event) => {
    const file = event.target.files[0];
    await processDocumentFile(file);
    event.target.value = '';
  };

  const handleDocumentDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDocumentDragging(true);
  };

  const handleDocumentDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDocumentDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDocumentDragging(false);
  };

  const handleDocumentDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDocumentDragging(false);

    if (documentUploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processDocumentFile(files[0]);
    }
  };

  const getUsageAlert = (stats) => {
    const percentage = stats.usage_percentage || 0;

    if (percentage > 80) {
      return {
        severity: 'error',
        icon: <ErrorIcon />,
        title: 'CRITICAL: Budget Usage Over 80%',
        message: 'Management intervention required. PO budget is critically low.',
        color: '#c62828'
      };
    } else if (percentage > 50) {
      return {
        severity: 'warning',
        icon: <WarningIcon />,
        title: 'Warning: Budget Usage Over 50%',
        message: 'Monitor budget closely. Consider reviewing remaining allocations.',
        color: '#f57c00'
      };
    } else {
      return {
        severity: 'success',
        icon: <CheckCircleIcon />,
        title: 'Budget Status: Healthy',
        message: 'PO budget is within safe limits.',
        color: '#2e7d32'
      };
    }
  };

  const getVarianceColor = (varianceColor) => {
    switch (varianceColor) {
      case 'success':
        return { bgcolor: '#e8f5e9', color: '#2e7d32' };
      case 'warning':
        return { bgcolor: '#fff9c4', color: '#f57c00' };
      case 'danger':
        return { bgcolor: '#ffebee', color: '#c62828' };
      default:
        return { bgcolor: '#f5f5f5', color: '#666' };
    }
  };

  // Edit mode handlers
  const handleEdit = () => {
    setEditedPO({
      ...po,
      entry_agent: po.entry_agent || ''
    });
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedPO(null);
  };

  const handleSave = async () => {
    if (!editedPO) return;

    try {
      setSaveLoading(true);

      // Prepare data for update
      const updateData = {
        entry_agent: editedPO.entry_agent || null
      };

      console.log('Saving entry_agent:', updateData);

      // Call API to update the PO
      const response = await axios.put(`${API_BASE_URL}/invoices/${id}`, updateData);

      console.log('API Response entry_agent:', response.data.entry_agent);

      enqueueSnackbar('Purchase Order updated successfully!', { variant: 'success' });

      // Refresh the PO data
      await fetchPO();

      // Exit edit mode
      setIsEditMode(false);
      setEditedPO(null);
    } catch (err) {
      console.error('Error updating PO:', err);
      enqueueSnackbar('Failed to update Purchase Order: ' + (err.response?.data?.message || err.message), { variant: 'error' });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setEditedPO({
      ...editedPO,
      [field]: value
    });
  };

  const HeaderField = ({ label, value }) => (
    <Grid item xs={12} sm={6} md={4}>
      <Typography variant="caption" sx={{ color: '#666', fontWeight: 500, textTransform: 'uppercase', fontSize: '0.7rem' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500, color: '#333' }}>
        {value || '-'}
      </Typography>
    </Grid>
  );

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error || !po) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">{error || 'Purchase Order not found'}</Alert>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ mt: 2 }}>
            Back to Dashboard
          </Button>
        </Box>
      </Layout>
    );
  }

  const alert = getUsageAlert(po.budget_stats);

  return (
    <Layout>
      <Box sx={{ p: 3, overflow: 'auto', flex: 1 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ mb: 1 }}>
              Back to Dashboard
            </Button>
            <Typography variant="h4" fontWeight="bold">
              {po.invoice_number}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Purchase Order Details
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {isEditMode ? (
              <>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={saveLoading}
                  sx={{
                    bgcolor: '#73e9c7',
                    color: '#001f3f',
                    '&:hover': { bgcolor: '#5fd4b3' },
                  }}
                >
                  {saveLoading ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={handleCancelEdit}
                  disabled={saveLoading}
                  sx={{ borderColor: '#001f3f', color: '#001f3f' }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={handleEdit}
                  sx={{
                    bgcolor: '#001f3f',
                    color: 'white',
                    '&:hover': { bgcolor: '#003366' },
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<UploadIcon />}
                  onClick={() => {
                    setShowLicenseUpload(!showLicenseUpload);
                    setCurrentTab(1); // Switch to licenses tab
                  }}
                >
                  {showLicenseUpload ? 'Hide Upload' : 'Upload License'}
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<UploadIcon />}
                  onClick={() => {
                    setShowDocumentUpload(!showDocumentUpload);
                    setCurrentTab(2); // Switch to documents tab
                  }}
                >
                  {showDocumentUpload ? 'Hide Upload' : 'Upload Document'}
                </Button>
                {(!po.linked_invoices || po.linked_invoices.length === 0) && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    Delete PO
                  </Button>
                )}
              </>
            )}
          </Box>
        </Box>

        {/* Budget Overview Cards */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} md={9}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="caption" color="textSecondary">PO Budget</Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {po.currency} {parseFloat(po.po_budget_amount).toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: '#e3f2fd', height: '100%' }}>
                  <CardContent>
                    <Typography variant="caption" color="textSecondary">Used</Typography>
                    <Typography variant="h6" fontWeight="bold" color="primary">
                      {po.currency} {parseFloat(po.budget_stats.total_usage).toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: '#e8f5e9', height: '100%' }}>
                  <CardContent>
                    <Typography variant="caption" color="textSecondary">Remaining</Typography>
                    <Typography variant="h6" fontWeight="bold" color="success.main">
                      {po.currency} {parseFloat(po.budget_stats.remaining_budget).toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: getUsageAlert(po.budget_stats).severity === 'error' ? '#ffebee' : '#fff9c4', height: '100%' }}>
                  <CardContent>
                    <Typography variant="caption" color="textSecondary">Usage</Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {po.budget_stats.usage_percentage.toFixed(1)}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12} md={3}>
            <Alert
              severity={alert.severity}
              icon={alert.icon}
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                borderLeft: `4px solid ${alert.color}`
              }}
            >
              <Box>
                <Typography variant="subtitle2" fontWeight="bold">{alert.title}</Typography>
                <Typography variant="caption">{alert.message}</Typography>
              </Box>
            </Alert>
          </Grid>
        </Grid>

        {/* Consumption Tracking - Only show if enabled */}
        {po.consumption_tracking && po.consumption_tracking.enabled && (
          <Paper
            elevation={3}
            sx={{
              p: 3,
              mb: 3,
              background: 'linear-gradient(to bottom, #e6f9f5 0%, #ffffff 100%)',
              borderRadius: 2,
              border: '2px solid #73e9c7'
            }}
          >
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
              pb: 2,
              borderBottom: '2px solid #001f3f'
            }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#001f3f' }}>
                Special Project - Consumption Tracking
              </Typography>
              <Chip
                label={`Item: ${po.consumption_tracking.tracked_item_code}`}
                sx={{
                  bgcolor: '#001f3f',
                  color: 'white',
                  fontWeight: 'bold'
                }}
              />
            </Box>

            <Grid container spacing={2} mb={2}>
              <Grid item xs={12} sm={6} md={2}>
                <Card sx={{ height: '100%', bgcolor: '#ffffff' }}>
                  <CardContent>
                    <Typography variant="caption" color="textSecondary">Ordered</Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {parseFloat(po.consumption_tracking.ordered_quantity_tons).toLocaleString()} tons
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Card sx={{ bgcolor: '#e3f2fd', height: '100%' }}>
                  <CardContent>
                    <Typography variant="caption" color="textSecondary">Consumed</Typography>
                    <Typography variant="h6" fontWeight="bold" color="primary">
                      {parseFloat(po.consumption_tracking.consumed_tons).toLocaleString()} tons
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Card sx={{ bgcolor: '#e8f5e9', height: '100%' }}>
                  <CardContent>
                    <Typography variant="caption" color="textSecondary">Remaining</Typography>
                    <Typography variant="h6" fontWeight="bold" color="success.main">
                      {parseFloat(po.consumption_tracking.remaining_quantity_tons).toLocaleString()} tons
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Card sx={{
                  bgcolor: po.consumption_tracking.consumption_color === 'success' ? '#e8f5e9' :
                           po.consumption_tracking.consumption_color === 'warning' ? '#fff9c4' : '#ffebee',
                  height: '100%'
                }}>
                  <CardContent>
                    <Typography variant="caption" color="textSecondary">Usage %</Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {parseFloat(po.consumption_tracking.consumption_percentage).toFixed(1)}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Card sx={{ bgcolor: '#e3f2fd', height: '100%', border: '2px solid #90caf9' }}>
                  <CardContent>
                    <Typography variant="caption" color="textSecondary">Calculated</Typography>
                    <Typography variant="h6" fontWeight="bold" color="#1976d2">
                      {parseFloat(po.consumption_tracking.calculated_tons || 0).toLocaleString()} tons
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Card sx={{ bgcolor: '#e8f5e9', height: '100%', border: '2px solid #81c784' }}>
                  <CardContent>
                    <Typography variant="caption" color="textSecondary">Actual</Typography>
                    <Typography variant="h6" fontWeight="bold" color="#2e7d32">
                      {parseFloat(po.consumption_tracking.actual_tons || 0).toLocaleString()} tons
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Consumption Rate & Estimated Completion */}
            <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                    Consumption Rate
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 1 }}>
                    {po.consumption_tracking.consumption_rate > 0
                      ? `${parseFloat(po.consumption_tracking.consumption_rate).toFixed(2)} tons/day`
                      : 'Calculating... (Need deliveries on different dates)'
                    }
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                    Estimated Days to Completion
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 1 }}>
                    {po.consumption_tracking.estimated_days_to_completion !== null
                      ? `~${po.consumption_tracking.estimated_days_to_completion} days`
                      : 'Calculating... (Need consumption rate first)'
                    }
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Info Message */}
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Tracking:</strong> Supplier {po.consumption_tracking.tracked_supplier_code} | Item {po.consumption_tracking.tracked_item_code}
                <br />
                Consumption is calculated from the actual weight of linked commercial invoices.
                {po.consumption_tracking.consumption_rate === 0 && (
                  <><br /><em>Consumption rate and estimated completion will be calculated once invoices are delivered on different dates.</em></>
                )}
              </Typography>
            </Alert>
          </Paper>
        )}

        {/* PO Details - Clean Card Layout */}
        <Paper
          elevation={3}
          sx={{
            p: 3,
            mb: 3,
            background: 'linear-gradient(to bottom, #ffffff 0%, #f5f5f5 100%)',
            borderRadius: 2,
            border: '1px solid #d0d0d0'
          }}
        >
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            pb: 2,
            borderBottom: '2px solid #001f3f'
          }}>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#001f3f' }}>
              Purchase Order Information
            </Typography>
          </Box>

          {/* Two columns: Primary Information and Additional Details */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Box sx={{ flex: 1, p: 2, bgcolor: '#e6f9f5', borderRadius: 1, border: '1px solid #73e9c7' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#001f3f', mb: 2 }}>
                Primary Information
              </Typography>
              <Grid container spacing={2}>
                <HeaderField label="PO Number" value={po.invoice_number} />
                <HeaderField
                  label="PO Date"
                  value={po.invoice_date ? new Date(po.invoice_date).toLocaleDateString() : '-'}
                />
                <HeaderField label="Customer" value={po.customer?.name} />
                <HeaderField label="Supplier" value={po.supplier?.name} />
                <HeaderField
                  label="Total Amount"
                  value={`${po.currency} ${parseFloat(po.po_budget_amount).toLocaleString()}`}
                />
                <HeaderField label="Currency" value={po.currency} />
              </Grid>
            </Box>

            <Box sx={{ flex: 1, p: 2, bgcolor: '#e6f9f5', borderRadius: 1, border: '1px solid #73e9c7' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#001f3f', mb: 2 }}>
                Additional Details
              </Typography>
              <Grid container spacing={2}>
                <HeaderField label="Customer Reference" value={po.customer_reference} />
                <HeaderField label="RFQ Number" value={po.rfq_number} />
                <HeaderField label="End User" value={po.end_user} />
                <HeaderField label="Customer Account" value={po.customer_account_code} />
                <HeaderField
                  label="Expected Weight"
                  value={po.expected_weight_kg ? `${po.expected_weight_kg} kg` : '-'}
                />
                <HeaderField label="Tax Reference" value={po.tax_reference_number} />

                {/* Entry Agent - Editable in edit mode */}
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="caption" sx={{ color: '#666', fontWeight: 500, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                    Entry Agent
                  </Typography>
                  {isEditMode ? (
                    <Autocomplete
                      freeSolo
                      options={agents.map((agent) => agent.name)}
                      value={editedPO?.entry_agent || ''}
                      onChange={(event, newValue) => handleFieldChange('entry_agent', newValue)}
                      onInputChange={(event, newInputValue) => handleFieldChange('entry_agent', newInputValue)}
                      ListboxProps={{
                        style: {
                          maxHeight: '300px',
                        }
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          placeholder="Select or type clearing agent"
                          sx={{
                            mt: 0.5,
                            minWidth: '280px',
                            '& .MuiOutlinedInput-root': {
                              bgcolor: 'white',
                            }
                          }}
                        />
                      )}
                      sx={{
                        '& .MuiAutocomplete-popper': {
                          width: '350px !important'
                        }
                      }}
                      componentsProps={{
                        popper: {
                          style: { width: '350px' }
                        }
                      }}
                    />
                  ) : (
                    <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500, color: '#333' }}>
                      {po.entry_agent || '-'}
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </Box>
          </Box>
        </Paper>

        {/* Purchase Order Line Items */}
        <Paper
          elevation={3}
          sx={{
            p: 3,
            mb: 3,
            background: 'linear-gradient(to bottom, #ffffff 0%, #f5f5f5 100%)',
            borderRadius: 2,
            border: '1px solid #d0d0d0'
          }}
        >
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            pb: 2,
            borderBottom: '2px solid #001f3f'
          }}>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#001f3f' }}>
              Purchase Order Line Items
            </Typography>
            <Chip
              label={`${po.line_items?.length || 0} items`}
              color="primary"
              size="small"
            />
          </Box>

          {!po.line_items || po.line_items.length === 0 ? (
            <Typography color="textSecondary" sx={{ py: 3, textAlign: 'center' }}>
              No line items found for this PO
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell><strong>#</strong></TableCell>
                    <TableCell><strong>Item Code</strong></TableCell>
                    <TableCell><strong>Description</strong></TableCell>
                    <TableCell align="right"><strong>Quantity</strong></TableCell>
                    <TableCell><strong>Unit</strong></TableCell>
                    <TableCell align="right"><strong>Unit Price</strong></TableCell>
                    <TableCell align="right"><strong>Line Total</strong></TableCell>
                    <TableCell><strong>HS Code</strong></TableCell>
                    <TableCell><strong>Origin</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {po.line_items.map((item, index) => (
                    <TableRow key={item.id} hover>
                      <TableCell>{item.line_number || (index + 1)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {item.item_code || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 300 }}>
                          {item.description}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {parseFloat(item.quantity).toLocaleString()}
                      </TableCell>
                      <TableCell>{item.unit_of_measure || '-'}</TableCell>
                      <TableCell align="right">
                        {po.currency} {parseFloat(item.unit_price).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold">
                          {po.currency} {parseFloat(item.line_total).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.hs_code || '-'}</TableCell>
                      <TableCell>{item.country_of_origin || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Tabs for Linked Invoices and Certificates */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={currentTab}
            onChange={(e, newValue) => setCurrentTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label={`Linked Commercial Invoices (${po.linked_invoices?.length || 0})`} />
            <Tab label={`Import Licenses (${po.licenses?.length || 0})`} />
            <Tab label={`Documents (${documents.length})`} />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {/* Tab 0: Linked Commercial Invoices */}
            {currentTab === 0 && (
              <>
                {!po.linked_invoices || po.linked_invoices.length === 0 ? (
                  <Typography color="textSecondary" sx={{ py: 3, textAlign: 'center' }}>
                    No commercial invoices linked to this PO yet
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          <TableCell><strong>Invoice #</strong></TableCell>
                          <TableCell><strong>Date</strong></TableCell>
                          <TableCell><strong>Amount</strong></TableCell>
                          <TableCell><strong>Weight</strong></TableCell>
                          <TableCell><strong>Budget Variance</strong></TableCell>
                          <TableCell><strong>Status</strong></TableCell>
                          <TableCell><strong>License</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {po.linked_invoices.map((invoice) => {
                          const varianceStyle = getVarianceColor(invoice.variance_color);
                          return (
                            <TableRow
                              key={invoice.id}
                              hover
                              onClick={() => navigate(`/invoices/${invoice.id}`)}
                              sx={{ cursor: 'pointer' }}
                            >
                              <TableCell>
                                <Typography variant="body2" fontWeight="bold">{invoice.invoice_number}</Typography>
                              </TableCell>
                              <TableCell>
                                {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : '-'}
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {invoice.currency} {parseFloat(invoice.total_amount).toLocaleString()}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {invoice.actual_weight_kg ? (
                                  <Box
                                    sx={{
                                      display: 'inline-block',
                                      bgcolor: '#e8f5e9',
                                      color: '#2e7d32',
                                      px: 1.5,
                                      py: 0.5,
                                      borderRadius: 1,
                                      fontWeight: 'bold',
                                      border: '1px solid #81c784'
                                    }}
                                  >
                                    {invoice.actual_weight_kg} kg
                                  </Box>
                                ) : invoice.expected_weight_kg ? (
                                  <Box
                                    sx={{
                                      display: 'inline-block',
                                      bgcolor: '#e3f2fd',
                                      color: '#1976d2',
                                      px: 1.5,
                                      py: 0.5,
                                      borderRadius: 1,
                                      fontWeight: 'normal',
                                      border: '1px solid #90caf9'
                                    }}
                                  >
                                    {invoice.expected_weight_kg} kg
                                  </Box>
                                ) : '-'}
                              </TableCell>
                              <TableCell>
                                {invoice.budget_variance !== null && invoice.budget_variance !== undefined ? (
                                  <Chip
                                    label={`${parseFloat(invoice.budget_variance) >= 0 ? '+' : ''}${parseFloat(invoice.budget_variance).toFixed(2)}`}
                                    size="small"
                                    sx={{
                                      bgcolor: varianceStyle.bgcolor,
                                      color: varianceStyle.color,
                                      fontWeight: 'bold'
                                    }}
                                  />
                                ) : '-'}
                              </TableCell>
                              <TableCell>
                                <Chip label={invoice.status} size="small" />
                              </TableCell>
                              <TableCell>
                                {invoice.customs_declaration_number || '-'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            )}

            {/* Tab 1: Import Licenses */}
            {currentTab === 1 && (
              <>
                {/* Drag and Drop Zone - Only show when button is clicked */}
                {showLicenseUpload && (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">Upload License</Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setShowLicenseUpload(false);
                          setLicenseUploadError(null);
                          setLicenseUploadSuccess(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </Box>

                    {/* Drag and Drop Zone */}
                    <Box
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    sx={{
                      border: '2px dashed',
                      borderColor: isDragging ? 'primary.main' : licenseUploading ? 'grey.400' : 'grey.300',
                      borderRadius: 2,
                      p: 4,
                      textAlign: 'center',
                      bgcolor: isDragging ? 'action.hover' : licenseUploading ? 'grey.50' : 'background.paper',
                      cursor: licenseUploading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: licenseUploading ? 'grey.400' : 'primary.main',
                        bgcolor: licenseUploading ? 'grey.50' : 'action.hover',
                      }
                    }}
                  >
                    <input
                      accept="application/pdf"
                      style={{ display: 'none' }}
                      id="license-upload-input"
                      type="file"
                      onChange={handleLicenseUpload}
                      disabled={licenseUploading}
                    />
                    <label htmlFor="license-upload-input" style={{ cursor: licenseUploading ? 'not-allowed' : 'pointer', display: 'block' }}>
                      <Box sx={{ pointerEvents: licenseUploading ? 'none' : 'auto' }}>
                        {licenseUploading ? (
                          <CircularProgress size={48} sx={{ mb: 2 }} />
                        ) : (
                          <UploadIcon sx={{ fontSize: 48, color: isDragging ? 'primary.main' : 'action.active', mb: 2 }} />
                        )}
                        <Typography variant="h6" gutterBottom>
                          {licenseUploading ? 'Processing License...' : isDragging ? 'Drop license PDF here' : 'Drag & drop license PDF here'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                          {licenseUploading ? 'AI is extracting license data...' : 'or click to browse files'}
                        </Typography>
                        {!licenseUploading && (
                          <Button
                            variant="outlined"
                            startIcon={<UploadIcon />}
                            component="span"
                          >
                            Select PDF File
                          </Button>
                        )}
                      </Box>
                    </label>
                  </Box>

                  {licenseUploadSuccess && (
                    <Alert severity="success" sx={{ mb: 2 }} onClose={() => setLicenseUploadSuccess(null)}>
                      {licenseUploadSuccess}
                    </Alert>
                  )}

                  {licenseUploadError && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLicenseUploadError(null)}>
                      {licenseUploadError}
                    </Alert>
                  )}
                </Box>
                )}

                {/* License Expiry Warnings */}
                {po.licenses && po.licenses.length > 0 && (() => {
                  const expiredLicenses = po.licenses.filter(l => l.is_expired);
                  const expiringSoonLicenses = po.licenses.filter(l => l.is_expiring_soon && !l.is_expired);
                  const criticalLicenses = po.licenses.filter(l => l.days_until_expiry <= 15 && l.days_until_expiry > 0);

                  if (expiredLicenses.length > 0) {
                    return (
                      <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          CRITICAL: {expiredLicenses.length} License(s) EXPIRED
                        </Typography>
                        <Typography variant="body2">
                          Immediate action required. Contact bank for renewal or additional license.
                        </Typography>
                      </Alert>
                    );
                  } else if (criticalLicenses.length > 0) {
                    return (
                      <Alert severity="error" icon={<WarningIcon />} sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          CRITICAL: {criticalLicenses.length} License(s) expiring in 15 days or less
                        </Typography>
                        <Typography variant="body2">
                          Less than amendment processing time remaining. Start amendment process immediately.
                        </Typography>
                      </Alert>
                    );
                  } else if (expiringSoonLicenses.length > 0) {
                    return (
                      <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          WARNING: {expiringSoonLicenses.length} License(s) expiring within 30 days
                        </Typography>
                        <Typography variant="body2">
                          Time to start amendment process (15 days processing time required).
                        </Typography>
                      </Alert>
                    );
                  }
                  return null;
                })()}

                {!po.licenses || po.licenses.length === 0 ? (
                  <Typography color="textSecondary" sx={{ py: 3, textAlign: 'center' }}>
                    No import licenses linked to this PO yet. Upload a license PDF to get started.
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          <TableCell><strong>Declaration #</strong></TableCell>
                          <TableCell><strong>Validation #</strong></TableCell>
                          <TableCell><strong>Bank</strong></TableCell>
                          <TableCell><strong>Category</strong></TableCell>
                          <TableCell><strong>Amount</strong></TableCell>
                          <TableCell><strong>Budget Usage</strong></TableCell>
                          <TableCell><strong>Expiry Date</strong></TableCell>
                          <TableCell><strong>Status</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {po.licenses.map((license) => {
                          // Determine expiry status styling
                          const getExpiryChipColor = (status) => {
                            switch (status) {
                              case 'expired': return 'error';
                              case 'danger': return 'error';
                              case 'warning': return 'warning';
                              case 'success': return 'success';
                              default: return 'default';
                            }
                          };

                          const getExpiryIcon = (status) => {
                            switch (status) {
                              case 'expired': return <ErrorIcon />;
                              case 'danger': return <WarningIcon />;
                              case 'warning': return <WarningIcon />;
                              case 'success': return <CheckCircleIcon />;
                              default: return null;
                            }
                          };

                          return (
                            <TableRow
                              key={license.id}
                              hover
                              sx={{
                                bgcolor: license.is_expired ? '#ffebee' : license.is_expiring_soon ? '#fff3e0' : 'inherit'
                              }}
                            >
                              <TableCell>
                                <Typography variant="body2" fontWeight="bold">
                                  {license.declaration_number}
                                </Typography>
                              </TableCell>
                              <TableCell>{license.validation_number || '-'}</TableCell>
                              <TableCell>{license.bank_name || '-'}</TableCell>
                              <TableCell>
                                <Chip label={license.category || 'N/A'} size="small" color="primary" />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {license.currency} {parseFloat(license.total_amount).toLocaleString()}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2">
                                    {license.budget_usage_percentage?.toFixed(1)}%
                                  </Typography>
                                  {license.is_budget_exhausted && (
                                    <Chip label="Budget Low" size="small" color="warning" />
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {license.expiry_date ? new Date(license.expiry_date).toLocaleDateString() : '-'}
                                </Typography>
                                {license.days_until_expiry !== null && (
                                  <Typography variant="caption" color="textSecondary">
                                    ({license.days_until_expiry} days)
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  icon={getExpiryIcon(license.expiry_status_color)}
                                  label={license.expiry_status_message}
                                  size="small"
                                  color={getExpiryChipColor(license.expiry_status_color)}
                                  sx={{ fontWeight: license.is_expiring_soon || license.is_expired ? 'bold' : 'normal' }}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            )}

            {/* Tab 2: Documents */}
            {currentTab === 2 && (
              <>
                {/* Document Upload Form - Only show when button is clicked */}
                {showDocumentUpload && (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">Upload Document</Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setShowDocumentUpload(false);
                          setDocumentUploadError(null);
                          setDocumentUploadSuccess(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </Box>

                    {/* Drag and Drop Zone */}
                    <Box
                      onDragEnter={handleDocumentDragEnter}
                      onDragOver={handleDocumentDragOver}
                      onDragLeave={handleDocumentDragLeave}
                      onDrop={handleDocumentDrop}
                      sx={{
                        border: '2px dashed',
                        borderColor: isDocumentDragging ? 'primary.main' : documentUploading ? 'grey.400' : 'grey.300',
                        borderRadius: 2,
                        p: 4,
                        textAlign: 'center',
                        bgcolor: isDocumentDragging ? 'action.hover' : documentUploading ? 'grey.50' : 'background.paper',
                        cursor: documentUploading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: documentUploading ? 'grey.400' : 'primary.main',
                          bgcolor: documentUploading ? 'grey.50' : 'action.hover',
                        }
                      }}
                    >
                      <input
                        accept="*/*"
                        style={{ display: 'none' }}
                        id="document-upload-input"
                        type="file"
                        onChange={handleDocumentUpload}
                        disabled={documentUploading}
                      />
                      <label htmlFor="document-upload-input" style={{ cursor: documentUploading ? 'not-allowed' : 'pointer', display: 'block' }}>
                        <Box sx={{ pointerEvents: documentUploading ? 'none' : 'auto' }}>
                          {documentUploading ? (
                            <CircularProgress size={48} sx={{ mb: 2 }} />
                          ) : (
                            <UploadIcon sx={{ fontSize: 48, color: isDocumentDragging ? 'primary.main' : 'action.active', mb: 2 }} />
                          )}
                          <Typography variant="h6" gutterBottom>
                            {documentUploading ? 'Uploading Document...' : isDocumentDragging ? 'Drop file here' : 'Drag & drop document here'}
                          </Typography>
                          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                            {documentUploading ? 'Please wait...' : 'PDF, images, Excel, Word, etc.'}
                          </Typography>
                          {!documentUploading && (
                            <Button
                              variant="outlined"
                              startIcon={<UploadIcon />}
                              component="span"
                            >
                              Select File
                            </Button>
                          )}
                        </Box>
                      </label>
                    </Box>

                    {documentUploadSuccess && (
                      <Alert severity="success" sx={{ mb: 2 }} onClose={() => setDocumentUploadSuccess(null)}>
                        {documentUploadSuccess}
                      </Alert>
                    )}

                    {documentUploadError && (
                      <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDocumentUploadError(null)}>
                        {documentUploadError}
                      </Alert>
                    )}
                  </Box>
                )}

                {/* Documents List */}
                {!documents || documents.length === 0 ? (
                  <Typography color="textSecondary" sx={{ py: 3, textAlign: 'center' }}>
                    No documents uploaded yet. Upload documents to get started.
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          <TableCell><strong>Document Name</strong></TableCell>
                          <TableCell><strong>Type</strong></TableCell>
                          <TableCell><strong>Description</strong></TableCell>
                          <TableCell><strong>Uploaded</strong></TableCell>
                          <TableCell><strong>Actions</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {documents.map((doc) => (
                          <TableRow key={doc.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">
                                {doc.original_filename || doc.file_name || 'Unknown'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={doc.document_type ? doc.document_type.replace('_', ' ').toUpperCase() : 'Document'}
                                size="small"
                                color="primary"
                              />
                            </TableCell>
                            <TableCell>
                              {doc.document_subtype || '-'}
                            </TableCell>
                            <TableCell>
                              {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => window.open(`${API_BASE_URL}/documents/${doc.id}/view`, '_blank')}
                                >
                                  View
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => window.open(`${API_BASE_URL}/documents/${doc.id}/download`, '_blank')}
                                >
                                  Download
                                </Button>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            )}
          </Box>
        </Paper>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => !deleteLoading && setDeleteDialogOpen(false)}
        >
          <DialogTitle>Delete Purchase Order</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this Purchase Order? This action cannot be undone.
            </DialogContentText>
            {deleteError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {deleteError}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleDeletePO}
              color="error"
              variant="contained"
              disabled={deleteLoading}
            >
              {deleteLoading ? <CircularProgress size={24} /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};

export default PurchaseOrderDetail;
