import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Grid,
  Typography,
  Tabs,
  Tab,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  CallSplit as CallSplitIcon,
  AutoFixHigh as AutoFixHighIcon,
} from '@mui/icons-material';
import { agentService } from '../services/agentService';
import { invoiceService } from '../services/invoiceService';
import SplitPackageDialog from './SplitPackageDialog';
import ManualPackingListForm from './ManualPackingListForm';

const InvoiceDetailView = ({ invoice, mode = 'readonly', onSave }) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [showRaw, setShowRaw] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedInvoice, setEditedInvoice] = useState(invoice);
  const [agents, setAgents] = useState([]);

  // Helper function to get current user profile
  const getCurrentProfile = () => {
    return localStorage.getItem('test_profile') || 'key_account_manager';
  };

  // Helper function to check if current user can split packages
  const canSplitPackages = () => {
    const profile = getCurrentProfile();
    // Only admin and key_account_manager can split packages
    return profile === 'admin' || profile === 'key_account_manager';
  };

  // Update editedInvoice when invoice prop changes
  useEffect(() => {
    setEditedInvoice(invoice);
  }, [invoice]);

  // Fetch agents on mount
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const agentsData = await agentService.getAll();
        setAgents(agentsData || []);
      } catch (err) {
        console.error('Failed to load agents:', err);
      }
    };
    fetchAgents();
  }, []);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(editedInvoice);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedInvoice(invoice);
    setIsEditing(false);
  };

  const isEditable = isEditing;

  // Header field component with enhanced styling
  const HeaderField = ({ label, value, field, multiline = false }) => {
    if (isEditable) {
      return (
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label={label}
            value={editedInvoice[field] || ''}
            onChange={(e) => setEditedInvoice({ ...editedInvoice, [field]: e.target.value })}
            fullWidth
            size="small"
            multiline={multiline}
            rows={multiline ? 2 : 1}
          />
        </Grid>
      );
    }
    return (
      <Grid item xs={12} sm={6} md={4}>
        <Typography variant="caption" sx={{ color: '#666', fontWeight: 500, textTransform: 'uppercase', fontSize: '0.7rem' }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500, color: '#333' }}>
          {value || '-'}
        </Typography>
      </Grid>
    );
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Invoice Header Panel - Keep existing code */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, background: 'linear-gradient(to bottom, #ffffff 0%, #f5f5f5 100%)', borderRadius: 2, border: '1px solid #d0d0d0' }}>
        {/* ...existing header code... */}
      </Paper>

      {/* Tabs Section */}
      <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Tabs value={currentTab} onChange={handleTabChange} sx={{ bgcolor: '#f5f5f5', borderBottom: '2px solid #001f3f' }}>
          <Tab label="Line Items" />
          <Tab label="Packing Details" />
          <Tab label="Delivery Note" />
        </Tabs>

        {/* Tab Panels */}
        <Box sx={{ p: 3 }}>
          {currentTab === 0 && (
            <LineItemsTab
              items={editedInvoice.line_items || []}
              isEditable={isEditable}
              onChange={(items) => setEditedInvoice({ ...editedInvoice, line_items: items })}
            />
          )}
          {currentTab === 1 && (
            <PackingDetailsTab
              details={editedInvoice.packing_details || []}
              isEditable={isEditable}
              onChange={(details) => setEditedInvoice({ ...editedInvoice, packing_details: details })}
              invoice={editedInvoice}
              canSplitPackages={canSplitPackages()}
            />
          )}
          {currentTab === 2 && (
            <DeliveryNoteTab items={invoice.delivery_note_items || []} />
          )}
        </Box>
      </Paper>
    </Box>
  );
};

// Packing Details Tab Component WITH AUTO-GENERATION
const PackingDetailsTab = ({ details, isEditable, onChange, canSplitPackages, invoice }) => {
  const [fileNameErrors, setFileNameErrors] = useState({});
  const [fileNameStatus, setFileNameStatus] = useState({});
  const [validationTimers, setValidationTimers] = useState({});
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [selectedPackageIndex, setSelectedPackageIndex] = useState(null);
  const [packingListDialogOpen, setPackingListDialogOpen] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [autoGenComplete, setAutoGenComplete] = useState(false);

  // 🎯 AUTO-GENERATION LOGIC - Runs when packing details tab is viewed
  useEffect(() => {
    const checkAndAutoGenerate = async () => {
      // Only run if no packing details and not already complete
      if ((!details || details.length === 0) && !autoGenComplete && invoice?.id) {
        try {
          setAutoGenerating(true);
          console.log(`Checking if auto-generation is possible for invoice ${invoice.id}...`);

          // Step 1: Check if auto-generation is possible
          const checkResponse = await fetch(`http://localhost:5678/webhook/check-packaging-rules/${invoice.id}`);
          const checkData = await checkResponse.json();

          console.log('Check result:', checkData);

          // Step 2: If auto-generation is possible, generate
          if (checkData.action === 'auto_generate') {
            console.log('✅ Auto-generating packing list...');

            const genResponse = await fetch('http://localhost:5678/webhook/generate-packing-list', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ invoice_id: invoice.id })
            });

            const genData = await genResponse.json();

            if (genData.success) {
              console.log(`✅ Packing list auto-generated: ${genData.packages_created} packages`);

              // Step 3: Fetch the generated packing list
              const packingResponse = await fetch(`http://localhost:5678/webhook/packing-list/${invoice.id}`);
              const packingData = await packingResponse.json();

              if (packingData.packing_list?.packages) {
                onChange(packingData.packing_list.packages);
              }
            }
          } else if (checkData.action === 'display_existing') {
            console.log('📦 Fetching existing packing list...');
            // Fetch existing packing list
            const packingResponse = await fetch(`http://localhost:5678/webhook/packing-list/${invoice.id}`);
            const packingData = await packingResponse.json();

            if (packingData.packing_list?.packages) {
              onChange(packingData.packing_list.packages);
            }
          } else {
            console.log('⚠️ No packaging rules found - manual entry required');
          }

          setAutoGenComplete(true);
        } catch (error) {
          console.error('❌ Auto-generation failed:', error);
        } finally {
          setAutoGenerating(false);
        }
      }
    };

    checkAndAutoGenerate();
  }, [invoice?.id, details, autoGenComplete, onChange]);

  // ...rest of PackingDetailsTab component stays the same...

  if (autoGenerating) {
    return (
      <Box sx={{ textAlign: 'center', py: 6, bgcolor: '#fafafa', borderRadius: 1 }}>
        <CircularProgress size={48} sx={{ color: '#73e9c7', mb: 2 }} />
        <Typography variant="h6" color="textSecondary" gutterBottom>
          <AutoFixHighIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Auto-generating packing list...
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Checking packaging rules for this supplier...
        </Typography>
      </Box>
    );
  }

  // ... rest of the existing component code ...
};

export default InvoiceDetailView;
