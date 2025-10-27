import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Description as InvoiceIcon,
  Assignment as WorkflowIcon,
  Folder as DocumentsIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  HourglassEmpty as PendingIcon,
  CloudUpload as UploadIcon,
  CloudDownload as DownloadIcon,
  Visibility as ViewIcon,
  Assignment as AssignmentIcon,
  ArrowForward as ArrowForwardIcon,
  LocalShipping as TruckIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import InvoiceDetailView from './InvoiceDetailView';
import axios from 'axios';

const InvoiceTabbedView = ({ invoice, mode = 'readonly', onSave }) => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Main Tabs - Similar to old Otto */}
      <Paper elevation={0} sx={{ borderBottom: '3px solid #e0e0e0' }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          sx={{
            bgcolor: '#ffffff',
            '& .MuiTab-root': {
              fontWeight: 600,
              fontSize: '0.95rem',
              minHeight: 60,
              textTransform: 'none',
              color: '#666',
              '&.Mui-selected': {
                color: '#001f3f'
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#73e9c7',
              height: 4
            }
          }}
        >
          <Tab
            icon={<InvoiceIcon />}
            iconPosition="start"
            label="Invoices & Details"
          />
          <Tab
            icon={<WorkflowIcon />}
            iconPosition="start"
            label="Workflow & Requirements"
          />
          <Tab
            icon={<DocumentsIcon />}
            iconPosition="start"
            label="Documents"
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box sx={{ mt: 2 }}>
        {currentTab === 0 && (
          <InvoiceDetailView invoice={invoice} mode={mode} onSave={onSave} />
        )}
        {currentTab === 1 && (
          <WorkflowRequirementsTab invoice={invoice} onSave={onSave} />
        )}
        {currentTab === 2 && (
          <DocumentsTab invoice={invoice} />
        )}
      </Box>
    </Box>
  );
};

// Workflow & Requirements Tab Component
const WorkflowRequirementsTab = ({ invoice, onSave }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [qcStatus, setQcStatus] = useState(invoice.qc_status || 'pending');
  const [bvStatus, setBvStatus] = useState(invoice.bv_status || 'pending');
  const [qcNotes, setQcNotes] = useState('');
  const [bvNotes, setBvNotes] = useState('');
  const [qcScheduledDate, setQcScheduledDate] = useState('');
  const [bvScheduledDate, setBvScheduledDate] = useState('');
  const [updatingQc, setUpdatingQc] = useState(false);
  const [updatingBv, setUpdatingBv] = useState(false);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  // Ready for Transport state
  const [readyForTransport, setReadyForTransport] = useState(false);
  const [transportNotes, setTransportNotes] = useState('');
  const [updatingTransport, setUpdatingTransport] = useState(false);

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'passed', label: 'Passed' },
    { value: 'failed', label: 'Failed' },
    { value: 'in_order', label: 'In Order' },
    { value: 'blocked', label: 'Blocked' }
  ];

  // Load activities when component mounts
  useEffect(() => {
    fetchActivities();
  }, [invoice.id]);

  const fetchActivities = async () => {
    setLoadingActivities(true);
    try {
      const response = await axios.get(`http://localhost:8000/api/invoices/${invoice.id}/activities`);
      setActivities(response.data.data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleUpdateQC = async () => {
    setUpdatingQc(true);
    try {
      const response = await axios.post(`http://localhost:8000/api/invoices/${invoice.id}/update-qc-status`, {
        qc_status: qcStatus,
        notes: qcNotes,
        scheduled_date: qcScheduledDate || null
      });

      // Update local state instead of reloading
      invoice.qc_status = qcStatus;
      invoice.current_stage = response.data.current_stage || invoice.current_stage;

      if (qcStatus === 'passed') {
        invoice.has_qc_certificate = true;
      }

      // If BV was automatically initiated, update BV status in local state
      if (response.data.bv_status) {
        invoice.bv_status = response.data.bv_status;
        setBvStatus(response.data.bv_status);
      }

      enqueueSnackbar(response.data.message || 'QC status updated successfully', { variant: 'success' });
      setQcNotes('');
      setQcScheduledDate('');
      // Refresh activities after update
      fetchActivities();
    } catch (error) {
      console.error('Error:', error);
      enqueueSnackbar('Failed to update QC status: ' + (error.response?.data?.error || error.message), { variant: 'error' });
    } finally {
      setUpdatingQc(false);
    }
  };

  const handleUpdateBV = async () => {
    setUpdatingBv(true);
    try {
      const response = await axios.post(`http://localhost:8000/api/invoices/${invoice.id}/update-bv-status`, {
        bv_status: bvStatus,
        notes: bvNotes,
        scheduled_date: bvScheduledDate || null
      });

      // Update local state instead of reloading
      invoice.bv_status = bvStatus;
      if (bvStatus === 'passed') {
        invoice.has_bv_certificate = true;
      }

      enqueueSnackbar('BV status updated successfully', { variant: 'success' });
      setBvNotes('');
      setBvScheduledDate('');
      // Refresh activities after update
      fetchActivities();
    } catch (error) {
      console.error('Error:', error);
      enqueueSnackbar('Failed to update BV status: ' + (error.response?.data?.error || error.message), { variant: 'error' });
    } finally {
      setUpdatingBv(false);
    }
  };

  const handleMarkReadyForTransport = async () => {
    if (!readyForTransport) {
      enqueueSnackbar('Please confirm the invoice is ready for transport by checking the box', { variant: 'warning' });
      return;
    }

    setUpdatingTransport(true);
    try {
      const response = await axios.post(`http://localhost:8000/api/invoices/${invoice.id}/mark-ready-for-transport`, {
        confirmed: readyForTransport,
        notes: transportNotes
      });

      // Update local state
      invoice.status = response.data.invoice.status;
      invoice.ready_dispatch_at = response.data.invoice.ready_dispatch_at;
      invoice.current_stage = 'ready_dispatch';

      enqueueSnackbar('Invoice marked as ready for transport successfully!', { variant: 'success' });
      setTransportNotes('');
      setReadyForTransport(false);
      // Refresh activities after update
      fetchActivities();

      // Notify parent to refresh the invoice list
      if (onSave) {
        onSave(invoice);
      }
    } catch (error) {
      console.error('Error:', error);
      enqueueSnackbar('Failed to mark ready for transport: ' + (error.response?.data?.error || error.message), { variant: 'error' });
    } finally {
      setUpdatingTransport(false);
    }
  };

  const getStatusIcon = (condition) => {
    if (condition) return <CheckIcon sx={{ color: '#4caf50' }} />;
    return <CancelIcon sx={{ color: '#f44336' }} />;
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      draft: { label: 'Draft', color: 'default' },
      pending_transport: { label: 'Pending Transport', color: 'warning' },
      in_transit: { label: 'In Transit', color: 'info' },
      delivered: { label: 'Delivered', color: 'success' },
    };

    const config = statusConfig[status] || { label: status, color: 'default' };
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  return (
    <Box>
      {/* Workflow Steps - Old Otto Style */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#001f3f', display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentIcon /> Workflow Steps
        </Typography>

        {/* Current Stage Indicator */}
        <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: '#e6f9f5', borderLeft: '4px solid #73e9c7' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#001f3f' }}>
            Current Stage: {invoice.current_stage?.replace(/_/g, ' ').toUpperCase()}
          </Typography>
        </Paper>

        {/* BV Inspection Card - Show first if QC is passed */}
        {invoice.requires_bv && invoice.bv_status !== 'passed' && (
          <Paper elevation={2} sx={{ p: 3, mb: 2, borderLeft: '4px solid #8B5CF6' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AssignmentIcon sx={{ color: '#8B5CF6' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>BV Inspection</Typography>
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Bureau Veritas inspection required (invoice value exceeds $2,500)
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>BV Status</InputLabel>
              <Select
                value={bvStatus}
                label="BV Status"
                onChange={(e) => setBvStatus(e.target.value)}
              >
                {statusOptions.map((status) => (
                  <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Scheduled Date (Optional)"
              type="date"
              value={bvScheduledDate}
              onChange={(e) => setBvScheduledDate(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Notes (Optional)"
              multiline
              rows={2}
              value={bvNotes}
              onChange={(e) => setBvNotes(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              placeholder="Add notes about BV inspection..."
            />

            <Button
              variant="contained"
              onClick={handleUpdateBV}
              disabled={updatingBv}
              sx={{
                bgcolor: '#73e9c7',
                color: '#001f3f',
                fontWeight: 600,
                '&:hover': { bgcolor: '#5fd4b0' }
              }}
            >
              {updatingBv ? 'Updating...' : 'Update BV Status'}
            </Button>
          </Paper>
        )}

        {/* QC Inspection Card - Only show if not passed */}
        {invoice.requires_qc && invoice.qc_status !== 'passed' && (
          <Paper elevation={2} sx={{ p: 3, mb: 2, borderLeft: '4px solid #F59E0B' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AssignmentIcon sx={{ color: '#F59E0B' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>QC Inspection</Typography>
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Quality Control inspection required for this customer
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>QC Status</InputLabel>
              <Select
                value={qcStatus}
                label="QC Status"
                onChange={(e) => setQcStatus(e.target.value)}
              >
                {statusOptions.map((status) => (
                  <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Scheduled Date (Optional)"
              type="date"
              value={qcScheduledDate}
              onChange={(e) => setQcScheduledDate(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Notes (Optional)"
              multiline
              rows={2}
              value={qcNotes}
              onChange={(e) => setQcNotes(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              placeholder="Add notes about QC inspection..."
            />

            <Button
              variant="contained"
              onClick={handleUpdateQC}
              disabled={updatingQc}
              sx={{
                bgcolor: '#73e9c7',
                color: '#001f3f',
                fontWeight: 600,
                '&:hover': { bgcolor: '#5fd4b0' }
              }}
            >
              {updatingQc ? 'Updating...' : 'Update QC Status'}
            </Button>
          </Paper>
        )}

        {/* Ready for Transport Card - Show when QC/BV passed and not yet marked ready */}
        {!invoice.ready_dispatch_at &&
         (!invoice.requires_qc || invoice.qc_status === 'passed') &&
         (!invoice.requires_bv || invoice.bv_status === 'passed') && (
          <Paper elevation={2} sx={{ p: 3, mb: 2, borderLeft: '4px solid #14B8A6' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <TruckIcon sx={{ color: '#14B8A6' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Ready for Transport</Typography>
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              All inspection requirements have been completed. Mark this invoice as ready for transport to queue it for Load Confirmation and Manifest creation.
            </Typography>

            <FormControlLabel
              control={
                <Checkbox
                  checked={readyForTransport}
                  onChange={(e) => setReadyForTransport(e.target.checked)}
                  sx={{
                    color: '#14B8A6',
                    '&.Mui-checked': {
                      color: '#14B8A6',
                    },
                  }}
                />
              }
              label="I confirm this invoice is ready for transport"
              sx={{ mb: 2 }}
            />

            <TextField
              label="Notes (Optional)"
              multiline
              rows={3}
              value={transportNotes}
              onChange={(e) => setTransportNotes(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              placeholder="Add any notes about transport readiness..."
            />

            <Button
              variant="contained"
              startIcon={<TruckIcon />}
              onClick={handleMarkReadyForTransport}
              disabled={!readyForTransport || updatingTransport}
              sx={{
                bgcolor: '#14B8A6',
                color: 'white',
                fontWeight: 600,
                '&:hover': { bgcolor: '#0F9687' },
                '&:disabled': { bgcolor: '#cccccc' }
              }}
            >
              {updatingTransport ? 'Processing...' : 'Mark Ready for Transport'}
            </Button>
          </Paper>
        )}
      </Box>

      {/* Activity Log Section */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#001f3f', display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentIcon /> Activity Log
        </Typography>

        <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ p: 2, bgcolor: '#001f3f', color: 'white' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Invoice Activity History
            </Typography>
          </Box>

          {loadingActivities ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">Loading activities...</Typography>
            </Box>
          ) : activities.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">No activities recorded yet</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Date & Time</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Activity Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activities.map((activity) => (
                    <TableRow
                      key={activity.id}
                      sx={{
                        '&:nth-of-type(odd)': { bgcolor: '#e6f9f5' },
                        '&:hover': { bgcolor: '#d0f2ea' }
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(activity.created_at).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={activity.activity_type.replace(/_/g, ' ').toUpperCase()}
                          size="small"
                          color={
                            activity.activity_type === 'qc_update' ? 'warning' :
                            activity.activity_type === 'bv_update' ? 'secondary' :
                            activity.activity_type === 'document_upload' ? 'info' :
                            'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {activity.description}
                        </Typography>
                        {activity.metadata?.notes && (
                          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                            Notes: {activity.metadata.notes}
                          </Typography>
                        )}
                        {activity.metadata?.scheduled_date && (
                          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                            Scheduled: {new Date(activity.metadata.scheduled_date).toLocaleDateString()}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {activity.user_name || 'System'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

// Documents Tab Component
const DocumentsTab = ({ invoice }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [documentType, setDocumentType] = useState('invoice');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState(invoice.documents || []);

  const documentTypes = [
    { value: 'invoice', label: 'Invoice', required: true },
    { value: 'packing_list', label: 'Packing List', required: true },
    { value: 'bv_report', label: 'BV Report', required: true },
    { value: 'sad_500', label: 'SAD 500', required: true },
    { value: 'freight_statement', label: 'Freight Statement', required: false },
    { value: 'feri_certificate', label: 'FERI (Certification of Destination)', required: true },
    { value: 'insurance', label: 'Insurance', required: false },
    { value: 'manifest', label: 'Manifest', required: true },
    { value: 'quote', label: 'Quote PDF', required: false },
    { value: 'qc_certificate', label: 'QC Certificate', required: false },
  ];

  const handleFileSelect = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      enqueueSnackbar('Please select a file', { variant: 'warning' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('document_type', documentType);
      formData.append('invoice_id', invoice.id);

      const response = await axios.post(`http://localhost:8000/api/invoices/${invoice.id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Refresh documents list
      setDocuments([...documents, response.data.document]);
      setSelectedFile(null);
      enqueueSnackbar('Document uploaded successfully!', { variant: 'success' });
    } catch (error) {
      console.error('Upload error:', error);
      enqueueSnackbar('Failed to upload document: ' + (error.response?.data?.message || error.message), { variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleViewDownload = (doc) => {
    // Open document in new tab or trigger download
    window.open(`http://localhost:8000/api/documents/${doc.id}/view`, '_blank');
  };

  return (
    <Box>
      {/* Upload Section */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#001f3f' }}>
          Upload New Document
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Document Type</InputLabel>
            <Select
              value={documentType}
              label="Document Type"
              onChange={(e) => setDocumentType(e.target.value)}
            >
              {documentTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              Select PDF File
            </Typography>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              style={{ width: '100%' }}
            />
            {selectedFile && (
              <Typography variant="caption" sx={{ mt: 1, display: 'block', color: '#666' }}>
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </Typography>
            )}
          </Box>

          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            sx={{
              bgcolor: '#73e9c7',
              color: '#001f3f',
              fontWeight: 600,
              '&:hover': { bgcolor: '#5fd4b0' },
              alignSelf: 'flex-start'
            }}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </Box>
      </Paper>

      {/* Documents List */}
      <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Typography variant="h6" sx={{ p: 2, fontWeight: 600, color: '#001f3f', borderBottom: '2px solid #e0e0e0' }}>
          Documents ({documents.length})
        </Typography>

        {documents.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <DocumentsIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
            <Typography variant="body1" color="textSecondary">
              No documents attached
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Upload documents using the form above
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#001f3f' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Type</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Uploaded</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600, textAlign: 'right' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents.map((doc, index) => (
                  <TableRow
                    key={index}
                    sx={{
                      '&:nth-of-type(odd)': { bgcolor: '#e6f9f5' },
                      '&:hover': { bgcolor: '#d0f2ea' }
                    }}
                  >
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {doc.document_type}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Type: {doc.document_type} | Uploaded: {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="textSecondary">
                        {doc.created_at ? new Date(doc.created_at).toLocaleString() : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={() => handleViewDownload(doc)}
                        sx={{
                          bgcolor: '#2196f3',
                          '&:hover': { bgcolor: '#1976d2' }
                        }}
                      >
                        View/Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default InvoiceTabbedView;
