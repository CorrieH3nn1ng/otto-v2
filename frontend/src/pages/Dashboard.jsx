import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Button, Dialog, DialogTitle, DialogContent } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import Layout from '../components/Layout';
import SheetTabs from '../components/SheetTabs';
import StatCard from '../components/StatCard';
import InvoiceUpload from '../components/InvoiceUpload';
import InvoiceList from '../components/InvoiceList';
import TransportTabbedView from '../components/TransportTabbedView';
import PendingDocumentsList from '../components/PendingDocumentsList';
import invoiceService from '../services/invoiceService';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('pending');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

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
    loadStatistics(); // Refresh stats
  };

  const tabs = [
    { label: '⏳ Pending Review', value: 'pending' },
    { label: '📋 Active Invoices', value: 'invoices' },
    { label: '🚛 Load Confirmations', value: 'load_confirmations' },
    { label: '📦 Manifests', value: 'manifests' },
  ];

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Layout>
      {/* Main Content - No scroll, fits screen */}
      <Box sx={{ flex: 1, p: 2.5, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography
            variant="h5"
            sx={{
              color: '#2d3748',
              fontWeight: 700,
            }}
          >
            Dashboard Overview
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setUploadDialogOpen(true)}
            sx={{
              backgroundColor: '#38b2ac',
              '&:hover': { backgroundColor: '#2c9a8f' },
            }}
          >
            Upload Invoice
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <CircularProgress sx={{ color: '#38b2ac' }} />
          </Box>
        ) : (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 2,
                mb: 2,
              }}
            >
              <StatCard
                number={stats?.total_invoices || 0}
                label="Total Invoices"
                icon="📋"
              />
              <StatCard
                number={stats?.pending_approval || 0}
                label="Pending Approval"
                icon="⏳"
              />
              <StatCard
                number={stats?.blocked_documents || 0}
                label="Awaiting Documents"
                icon="📄"
              />
              <StatCard
                number={stats?.blocked_transport || 0}
                label="Awaiting Transport"
                icon="🚛"
              />
            </Box>

            {/* Content Sections */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
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
                  <Typography variant="h6" sx={{ mb: 1.5, color: '#2d3748', fontWeight: 700 }}>
                    Active Invoices
                  </Typography>
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
                    Transport Management
                  </Typography>
                  <TransportTabbedView />
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>

      {/* Sheet Tabs at Bottom - Fixed */}
      <SheetTabs value={activeTab} onChange={handleTabChange} tabs={tabs} />

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: '#38b2ac', color: 'white' }}>
          Upload Invoice
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <InvoiceUpload onUploadSuccess={handleUploadSuccess} />
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
