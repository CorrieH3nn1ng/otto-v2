import { useState, useEffect, useRef } from 'react';
import { Box, Typography, CircularProgress, Button, Dialog, DialogTitle, DialogContent, Autocomplete, TextField } from '@mui/material';
import { Add as AddIcon, LocalShipping as LocalShippingIcon } from '@mui/icons-material';
import Layout from '../components/Layout';
import SheetTabs from '../components/SheetTabs';
import StatCard from '../components/StatCard';
import InvoiceUpload from '../components/InvoiceUpload';
import InvoiceList from '../components/InvoiceList';
import TransportTabbedView from '../components/TransportTabbedView';
import ManifestList from '../components/ManifestList';
import PendingDocumentsList from '../components/PendingDocumentsList';
import PurchaseOrderList from '../components/PurchaseOrderList';
import invoiceService from '../services/invoiceService';
import { useSnackbar } from 'notistack';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export default function Dashboard() {
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('purchase_orders');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [loadConfDialogOpen, setLoadConfDialogOpen] = useState(false);
  const [uploadingLC, setUploadingLC] = useState(false);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const data = await invoiceService.getStatistics();
      setStats(data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (data) => {
    console.log('Upload success:', data);
    setUploadDialogOpen(false);
    loadStatistics();
  };

  const handleOpenLoadConfDialog = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      enqueueSnackbar('Please upload a PDF file', { variant: 'error' });
      return;
    }

    setLoadConfDialogOpen(true);

    try {
      setUploadingLC(true);
      enqueueSnackbar('Uploading and extracting invoice & load confirmation data...', { variant: 'info' });

      // Convert file to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // TODO: Update this endpoint to extract invoice number from PDF first
      // For now, user needs to implement invoice matching in backend
      // Upload to backend - we'll need to update backend to extract invoice number
      const response = await axios.post(`${API_BASE_URL}/upload/load-confirmation`, {
        pdf_base64: base64,
        // invoice_id will be determined by backend by extracting invoice number from PDF
      });

      if (response.data.success) {
        const invoiceNum = response.data.data?.invoice_number || 'Unknown';
        const loadConfId = response.data.data?.load_confirmation_id || 'Unknown';

        enqueueSnackbar(
          `Load confirmation created successfully! Invoice: ${invoiceNum}, LC ID: ${loadConfId}`,
          {
            variant: 'success',
            autoHideDuration: 5000
          }
        );
        setLoadConfDialogOpen(false);
        loadStatistics();
      } else {
        enqueueSnackbar('Failed to extract load confirmation', { variant: 'error' });
      }
    } catch (error) {
      console.error('Load confirmation upload error:', error);
      enqueueSnackbar(
        error.response?.data?.error || 'Failed to upload load confirmation',
        { variant: 'error' }
      );
    } finally {
      setUploadingLC(false);
      setLoadConfDialogOpen(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const tabs = [
    { label: '📋 Purchase Orders', value: 'purchase_orders' },
    { label: '⏳ Pending Review', value: 'pending' },
    { label: '📄 Active Invoices', value: 'invoices' },
    { label: '🚛 Load Confirmations', value: 'load_confirmations' },
    { label: '📦 Manifests', value: 'manifests' },
  ];

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Layout>
      <Box sx={{ flex: 1, p: 2.5, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="h5" sx={{ color: '#2d3748', fontWeight: 700 }}>
            Dashboard Overview
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <CircularProgress sx={{ color: '#38b2ac' }} />
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 2 }}>
              <StatCard number={stats?.total_invoices || 0} label="Total Invoices" icon="📋" />
              <StatCard number={stats?.draft || 0} label="Draft" icon="✏️" />
              <StatCard number={stats?.awaiting_qc || 0} label="Awaiting QC" icon="🔬" />
              <StatCard number={stats?.stage_ready_dispatch || 0} label="Ready for Dispatch" icon="📦" />
              <StatCard number={stats?.load_confirmations || 0} label="Load Confirmations" icon="🚛" />
              <StatCard number={stats?.manifests || 0} label="Manifests" icon="📜" />
              <StatCard number={stats?.stage_in_transit || 0} label="In Transit" icon="🚚" />
              <StatCard number={stats?.stage_delivered || 0} label="Delivered" icon="✅" />
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {activeTab === 'purchase_orders' && (
                <Box sx={{ height: '100%', overflow: 'hidden' }}>
                  <PurchaseOrderList />
                </Box>
              )}

              {activeTab === 'pending' && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 1.5, color: '#2d3748', fontWeight: 700 }}>
                    Pending Document Review
                  </Typography>
                  <PendingDocumentsList onAcknowledge={loadStatistics} />
                </Box>
              )}

              {activeTab === 'invoices' && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="h6" sx={{ color: '#2d3748', fontWeight: 700 }}>
                      Active Invoices
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setUploadDialogOpen(true)}
                        sx={{ backgroundColor: '#38b2ac', '&:hover': { backgroundColor: '#2c9a8f' } }}
                      >
                        Upload Invoice
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={uploadingLC ? <CircularProgress size={16} color="inherit" /> : <LocalShippingIcon />}
                        onClick={handleOpenLoadConfDialog}
                        disabled={uploadingLC}
                        sx={{
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          '&:hover': { backgroundColor: '#45a049' },
                          '&:disabled': { backgroundColor: '#ccc' }
                        }}
                      >
                        {uploadingLC ? 'Processing...' : 'Upload Load Confirmation'}
                      </Button>
                    </Box>
                  </Box>
                  <InvoiceList />
                </Box>
              )}

              {activeTab === 'load_confirmations' && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 1.5, color: '#2d3748', fontWeight: 700 }}>
                    Transport Management
                  </Typography>
                  <TransportTabbedView />
                </Box>
              )}

              {activeTab === 'manifests' && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 1.5, color: '#2d3748', fontWeight: 700 }}>
                    Manifests
                  </Typography>
                  <ManifestList />
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>

      <SheetTabs value={activeTab} onChange={handleTabChange} tabs={tabs} />

      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ backgroundColor: '#38b2ac', color: 'white' }}>Upload Invoice</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <InvoiceUpload onUploadSuccess={handleUploadSuccess} />
        </DialogContent>
      </Dialog>

      {/* Processing Dialog */}
      <Dialog open={loadConfDialogOpen} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ backgroundColor: '#4CAF50', color: 'white', textAlign: 'center' }}>
          Processing Load Confirmation
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={60} sx={{ color: '#4CAF50', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Extracting invoice and transport details...
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Using Gemini AI to read handwritten notes
          </Typography>
        </DialogContent>
      </Dialog>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </Layout>
  );
}
