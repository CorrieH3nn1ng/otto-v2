import React, { useState, useEffect, useRef } from 'react';
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
  Upload as UploadIcon,
  LocalShipping as LocalShippingIcon,
} from '@mui/icons-material';
import { agentService } from '../services/agentService';
import { invoiceService } from '../services/invoiceService';
import SplitPackageDialog from './SplitPackageDialog';
import ManualPackingListForm from './ManualPackingListForm';
import { useSnackbar } from 'notistack';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const InvoiceDetailView = ({ invoice, mode = 'readonly', onSave }) => {
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [showRaw, setShowRaw] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedInvoice, setEditedInvoice] = useState(invoice);
  const [agents, setAgents] = useState([]);
  const [packingListAutoGenCompleted, setPackingListAutoGenCompleted] = useState(false);
  const [uploadingLC, setUploadingLC] = useState(false);

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

  const handleUploadLoadConfirmation = () => {
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

    try {
      setUploadingLC(true);
      enqueueSnackbar('Uploading and extracting load confirmation data...', { variant: 'info' });

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

      // Upload to backend
      const response = await axios.post(`${API_BASE_URL}/upload/load-confirmation`, {
        pdf_base64: base64,
        invoice_id: invoice.id,
      });

      if (response.data.success) {
        enqueueSnackbar('Load confirmation extracted successfully!', { variant: 'success' });
        // Refresh the invoice data if needed
        if (onSave) {
          // Optionally refresh the invoice
        }
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
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
      {/* Invoice Header Panel */}
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
            Invoice Details
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!isEditing && (
              <Button
                startIcon={<EditIcon />}
                onClick={() => setIsEditing(true)}
                variant="contained"
                size="small"
                sx={{ bgcolor: '#73e9c7', color: '#001f3f', '&:hover': { bgcolor: '#5fd4b3' } }}
              >
                Edit
              </Button>
            )}
            {isEditing && (
              <>
                <Button
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  variant="contained"
                  size="small"
                  sx={{ bgcolor: '#73e9c7', color: '#001f3f', '&:hover': { bgcolor: '#5fd4b3' } }}
                >
                  Save
                </Button>
                <Button
                  startIcon={<CancelIcon />}
                  onClick={handleCancel}
                  variant="outlined"
                  size="small"
                  sx={{ borderColor: '#001f3f', color: '#001f3f' }}
                >
                  Cancel
                </Button>
              </>
            )}
            <Button
              variant="outlined"
              onClick={() => setShowRaw(!showRaw)}
              size="small"
              sx={{ borderColor: '#999', color: '#666' }}
            >
              RAW
            </Button>
          </Box>
        </Box>

        {/* Two columns: Primary Information and Shipping & Terms */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Box sx={{ flex: 1, p: 2, bgcolor: '#e6f9f5', borderRadius: 1, border: '1px solid #73e9c7' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#001f3f', mb: 2 }}>
              Primary Information
            </Typography>
            <Grid container spacing={2}>
              <HeaderField label="Invoice Number" value={invoice.invoice_number} field="invoice_number" />
              <HeaderField label="Invoice Date" value={invoice.invoice_date} field="invoice_date" />
              <HeaderField label="Supplier" value={invoice.supplier_id} field="supplier_id" />
              <HeaderField label="Customer" value={invoice.customer_id} field="customer_id" />
              <HeaderField label="Total Amount" value={invoice.total_amount} field="total_amount" />
              <HeaderField label="Currency" value={invoice.currency} field="currency" />
            </Grid>
          </Box>

          <Box sx={{ flex: 1, p: 2, bgcolor: '#e6f9f5', borderRadius: 1, border: '1px solid #73e9c7' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#001f3f', mb: 2 }}>
              Shipping & Terms
            </Typography>
            <Grid container spacing={2}>
              <HeaderField label="Incoterms" value={invoice.incoterms} field="incoterms" />
              <HeaderField label="PO Number" value={invoice.po_number} field="po_number" />
              <HeaderField label="Payment Terms" value={invoice.payment_terms} field="payment_terms" />
              <HeaderField label="Delivery Method" value={invoice.delivery_method} field="delivery_method" />
              <HeaderField label="HS Code" value={invoice.hs_code} field="hs_code" />
              <HeaderField label="Country of Origin" value={invoice.country_of_origin} field="country_of_origin" />
            </Grid>
          </Box>
        </Box>

        {/* Addresses & Contact Details - Main Panel */}
        <Box sx={{ p: 2, bgcolor: '#e6f9f5', borderRadius: 1, border: '1px solid #73e9c7' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#001f3f', mb: 2 }}>
            Addresses & Contact Details
          </Typography>

          {/* Three sub-panels - each 33.33% width */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            {/* Supplier/Collection Address */}
            <Box sx={{ flex: 1, p: 2, bgcolor: '#ffffff', borderRadius: 1, border: '1px solid #d0d0d0' }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#001f3f', mb: 1, display: 'block' }}>
                Supplier/Collection Address
              </Typography>
              {isEditable ? (
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  size="small"
                  value={
                    typeof editedInvoice.supplier_address === 'object'
                      ? Object.values(editedInvoice.supplier_address).filter(Boolean).join(', ')
                      : (editedInvoice.supplier_address || '')
                  }
                  onChange={(e) => setEditedInvoice({ ...editedInvoice, supplier_address: e.target.value })}
                  placeholder="Enter supplier address"
                />
              ) : (
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.85rem',
                    color: '#001f3f',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    whiteSpace: 'normal',
                    lineHeight: 1.6
                  }}
                >
                  {(invoice.supplier_address && typeof invoice.supplier_address === 'object')
                    ? Object.values(invoice.supplier_address).filter(Boolean).join(', ')
                    : (invoice.supplier_address || '-')
                  }
                </Typography>
              )}
            </Box>

            {/* Delivery Address */}
            <Box sx={{ flex: 1, p: 2, bgcolor: '#ffffff', borderRadius: 1, border: '1px solid #d0d0d0' }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#001f3f', mb: 1, display: 'block' }}>
                Delivery Address
              </Typography>
              {isEditable ? (
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  size="small"
                  value={
                    typeof editedInvoice.delivery_address === 'object'
                      ? Object.values(editedInvoice.delivery_address).filter(Boolean).join(', ')
                      : (editedInvoice.delivery_address || '')
                  }
                  onChange={(e) => setEditedInvoice({ ...editedInvoice, delivery_address: e.target.value })}
                  placeholder="Enter delivery address"
                />
              ) : (
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.85rem',
                    color: '#001f3f',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    whiteSpace: 'normal',
                    lineHeight: 1.6
                  }}
                >
                  {(invoice.delivery_address && typeof invoice.delivery_address === 'object')
                    ? Object.values(invoice.delivery_address).filter(Boolean).join(', ')
                    : (invoice.delivery_address || '-')
                  }
                </Typography>
              )}
            </Box>

            {/* Contact Details */}
            <Box sx={{ flex: 1, p: 2, bgcolor: '#ffffff', borderRadius: 1, border: '1px solid #d0d0d0' }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#001f3f', mb: 1, display: 'block' }}>
                Contact Details
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#666', fontWeight: 500, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                    Contact
                  </Typography>
                  {isEditable ? (
                    <TextField
                      fullWidth
                      size="small"
                      value={
                        editedInvoice.supplier_contact && typeof editedInvoice.supplier_contact === 'object'
                          ? Object.values(editedInvoice.supplier_contact).filter(Boolean).join(', ')
                          : (editedInvoice.supplier_contact || '')
                      }
                      onChange={(e) => setEditedInvoice({ ...editedInvoice, supplier_contact: e.target.value })}
                      placeholder="Enter supplier contact"
                    />
                  ) : (
                    <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 500, color: '#333', wordWrap: 'break-word' }}>
                      {(invoice.supplier_contact && typeof invoice.supplier_contact === 'object')
                        ? Object.values(invoice.supplier_contact).filter(Boolean).join(', ')
                        : (invoice.supplier_contact || '-')
                      }
                    </Typography>
                  )}
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#666', fontWeight: 500, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                    Email
                  </Typography>
                  {isEditable ? (
                    <TextField
                      fullWidth
                      size="small"
                      type="email"
                      value={editedInvoice.supplier_email || ''}
                      onChange={(e) => setEditedInvoice({ ...editedInvoice, supplier_email: e.target.value })}
                      placeholder="Enter supplier email"
                    />
                  ) : (
                    <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 500, color: '#333', wordWrap: 'break-word' }}>
                      {invoice.supplier_email || '-'}
                    </Typography>
                  )}
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#666', fontWeight: 500, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                    Exporter Code
                  </Typography>
                  {isEditable ? (
                    <TextField
                      fullWidth
                      size="small"
                      value={editedInvoice.exporter_code || ''}
                      onChange={(e) => setEditedInvoice({ ...editedInvoice, exporter_code: e.target.value })}
                      placeholder="Enter exporter code"
                    />
                  ) : (
                    <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 500, color: '#333', wordWrap: 'break-word' }}>
                      {invoice.exporter_code || '-'}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Clearing Agents Panel */}
        <Box sx={{ p: 2, bgcolor: '#e6f9f5', borderRadius: 1, border: '1px solid #73e9c7', mt: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#001f3f', mb: 2 }}>
            Clearing Agents
          </Typography>

          {/* Two comboboxes side-by-side */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            {/* Exit Agent */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: '#666', fontWeight: 500, textTransform: 'uppercase', fontSize: '0.7rem', display: 'block', mb: 1 }}>
                Exit Agent
              </Typography>
              {isEditable ? (
                <Autocomplete
                  freeSolo
                  options={agents.map((agent) => agent.name)}
                  value={editedInvoice.exit_agent || ''}
                  onChange={(event, newValue) => {
                    setEditedInvoice({ ...editedInvoice, exit_agent: newValue || '' });
                  }}
                  onInputChange={(event, newInputValue) => {
                    setEditedInvoice({ ...editedInvoice, exit_agent: newInputValue || '' });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      placeholder="Select or type exit agent"
                      sx={{ bgcolor: 'white' }}
                    />
                  )}
                  size="small"
                />
              ) : (
                <Typography variant="body2" sx={{ fontSize: '0.9rem', fontWeight: 500, color: '#333', p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #d0d0d0' }}>
                  {invoice.exit_agent || '-'}
                </Typography>
              )}
            </Box>

            {/* Entry Agent */}
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#666', fontWeight: 500, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Entry Agent
                </Typography>
                {invoice.parent_invoice_id && invoice.parent?.entry_agent && invoice.entry_agent === invoice.parent.entry_agent && (
                  <Chip
                    label="Inherited from PO"
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.65rem',
                      bgcolor: '#e3f2fd',
                      color: '#1976d2',
                      '& .MuiChip-label': { px: 1 }
                    }}
                  />
                )}
              </Box>
              {isEditable ? (
                <Autocomplete
                  multiple
                  freeSolo
                  options={agents.map((agent) => agent.name)}
                  value={
                    (() => {
                      const entryAgent = editedInvoice.entry_agent;
                      if (Array.isArray(entryAgent)) {
                        return entryAgent;
                      } else if (typeof entryAgent === 'string' && entryAgent) {
                        return entryAgent.split(/[/,]/).map(a => a.trim()).filter(a => a);
                      }
                      return [];
                    })()
                  }
                  onChange={(event, newValue) => {
                    // Store as comma-separated string for backend
                    setEditedInvoice({ ...editedInvoice, entry_agent: Array.isArray(newValue) ? newValue.join(', ') : newValue });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      placeholder="Select or type multiple agents"
                      sx={{ bgcolor: 'white' }}
                    />
                  )}
                  size="small"
                />
              ) : (
                <Typography variant="body2" sx={{ fontSize: '0.9rem', fontWeight: 500, color: '#333', p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #d0d0d0' }}>
                  {invoice.entry_agent || '-'}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        {/* Packing Totals Panel */}
        <Box sx={{ p: 2, bgcolor: '#e6f9f5', borderRadius: 1, border: '1px solid #73e9c7', mt: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#001f3f', mb: 2 }}>
            Packing Totals
          </Typography>

          <Box sx={{ display: 'flex', gap: 3 }}>
            {/* Total Qty */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: '#666', fontWeight: 500, textTransform: 'uppercase', fontSize: '0.7rem', display: 'block', mb: 1 }}>
                Total Qty
              </Typography>
              <Typography variant="body1" sx={{ fontSize: '1.1rem', fontWeight: 600, color: '#001f3f', p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #73e9c7' }}>
                {(editedInvoice.packing_details || []).reduce((sum, detail) => sum + (parseFloat(detail.quantity) || 0), 0).toFixed(0)}
              </Typography>
            </Box>

            {/* Total CBM */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: '#666', fontWeight: 500, textTransform: 'uppercase', fontSize: '0.7rem', display: 'block', mb: 1 }}>
                Total CBM
              </Typography>
              <Typography variant="body1" sx={{ fontSize: '1.1rem', fontWeight: 600, color: '#001f3f', p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #73e9c7' }}>
                {(editedInvoice.packing_details || []).reduce((sum, detail) => {
                  const qty = parseFloat(detail.quantity) || 0;
                  const cbm = parseFloat(detail.cbm) || 0;
                  return sum + (qty * cbm);
                }, 0).toFixed(3)}
              </Typography>
            </Box>

            {/* Total Gross Weight */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: '#666', fontWeight: 500, textTransform: 'uppercase', fontSize: '0.7rem', display: 'block', mb: 1 }}>
                Total Gross (kg)
              </Typography>
              <Typography variant="body1" sx={{ fontSize: '1.1rem', fontWeight: 600, color: '#001f3f', p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #73e9c7' }}>
                {(editedInvoice.packing_details || []).reduce((sum, detail) => {
                  const qty = parseFloat(detail.quantity) || 0;
                  const gross = parseFloat(detail.gross_weight_kg) || 0;
                  return sum + (qty * gross);
                }, 0).toFixed(2)}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* RAW JSON Accordion */}
      {showRaw && (
        <Accordion sx={{ mb: 2, border: '1px solid #e0e0e0' }} elevation={2}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#f5f5f5' }}>
            <Typography sx={{ fontWeight: 600 }}>Raw JSON Data</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ bgcolor: '#fafafa' }}>
            <pre style={{ overflow: 'auto', maxHeight: '400px', fontSize: '0.85rem' }}>
              {JSON.stringify(invoice, null, 2)}
            </pre>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Tabs Section */}
      <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          sx={{
            bgcolor: '#f5f5f5',
            borderBottom: '2px solid #001f3f',
            '& .MuiTab-root': {
              fontWeight: 600,
              fontSize: '0.95rem',
              color: '#001f3f'
            },
            '& .Mui-selected': {
              color: '#001f3f'
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#73e9c7',
              height: 3
            }
          }}
        >
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
              autoGenCompleted={packingListAutoGenCompleted}
              setAutoGenCompleted={setPackingListAutoGenCompleted}
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

// Line Items Tab Component
const LineItemsTab = ({ items, isEditable, onChange }) => {
  const handleAddItem = () => {
    const newItem = {
      line_number: items.length + 1,
      item_code: '',
      description: '',
      quantity: 0,
      unit_of_measure: '',
      unit_price: 0,
      line_total: 0,
      hs_code: '',
      country_of_origin: '',
      is_kit_item: false,
    };
    onChange([...items, newItem]);
  };

  const handleDeleteItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const handleUpdateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-calculate line total
    if (field === 'quantity' || field === 'unit_price') {
      const qty = field === 'quantity' ? parseFloat(value) : parseFloat(newItems[index].quantity);
      const price = field === 'unit_price' ? parseFloat(value) : parseFloat(newItems[index].unit_price);
      newItems[index].line_total = (qty * price).toFixed(2);
    }

    onChange(newItems);
  };

  if (!items || items.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6, bgcolor: '#fafafa', borderRadius: 1 }}>
        <Typography variant="h6" color="textSecondary" gutterBottom>
          No line items
        </Typography>
        {isEditable && (
          <Button
            startIcon={<AddIcon />}
            onClick={handleAddItem}
            variant="contained"
            sx={{ mt: 2, bgcolor: '#73e9c7', color: '#001f3f', '&:hover': { bgcolor: '#5fd4b3' } }}
          >
            Add Line Item
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box>
      {isEditable && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            startIcon={<AddIcon />}
            onClick={handleAddItem}
            variant="contained"
            sx={{ bgcolor: '#73e9c7', color: '#001f3f', '&:hover': { bgcolor: '#5fd4b3' } }}
          >
            Add Line Item
          </Button>
        </Box>
      )}
      <TableContainer sx={{ border: '1px solid #e0e0e0', borderRadius: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#001f3f' }}>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Line #</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Item Code</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Description</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Quantity</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>UOM</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Unit Price</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Line Total</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>HS Code</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Country</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Is Kit</TableCell>
              {isEditable && <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, index) => (
              <TableRow
                key={index}
                sx={{
                  '&:nth-of-type(odd)': { bgcolor: '#e6f9f5' },
                  '&:hover': { bgcolor: '#d0f2ea' }
                }}
              >
                <TableCell sx={{ fontWeight: 500 }}>{item.line_number}</TableCell>
                <TableCell>
                  {isEditable ? (
                    <TextField
                      value={item.item_code || ''}
                      onChange={(e) => handleUpdateItem(index, 'item_code', e.target.value)}
                      size="small"
                      fullWidth
                    />
                  ) : (
                    item.item_code || '-'
                  )}
                </TableCell>
                <TableCell>
                  {isEditable ? (
                    <TextField
                      value={item.description || ''}
                      onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                      size="small"
                      fullWidth
                      multiline
                    />
                  ) : (
                    item.description || '-'
                  )}
                </TableCell>
                <TableCell>
                  {isEditable ? (
                    <TextField
                      type="number"
                      value={item.quantity || 0}
                      onChange={(e) => handleUpdateItem(index, 'quantity', e.target.value)}
                      size="small"
                      sx={{ width: 100 }}
                    />
                  ) : (
                    item.quantity
                  )}
                </TableCell>
                <TableCell>
                  {isEditable ? (
                    <TextField
                      value={item.unit_of_measure || ''}
                      onChange={(e) => handleUpdateItem(index, 'unit_of_measure', e.target.value)}
                      size="small"
                      sx={{ width: 80 }}
                    />
                  ) : (
                    item.unit_of_measure || '-'
                  )}
                </TableCell>
                <TableCell>
                  {isEditable ? (
                    <TextField
                      type="number"
                      value={item.unit_price || 0}
                      onChange={(e) => handleUpdateItem(index, 'unit_price', e.target.value)}
                      size="small"
                      sx={{ width: 100 }}
                    />
                  ) : (
                    item.unit_price
                  )}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{item.line_total}</TableCell>
                <TableCell>
                  {isEditable ? (
                    <TextField
                      value={item.hs_code || ''}
                      onChange={(e) => handleUpdateItem(index, 'hs_code', e.target.value)}
                      size="small"
                      sx={{ width: 120 }}
                    />
                  ) : (
                    item.hs_code || '-'
                  )}
                </TableCell>
                <TableCell>
                  {isEditable ? (
                    <TextField
                      value={item.country_of_origin || ''}
                      onChange={(e) => handleUpdateItem(index, 'country_of_origin', e.target.value)}
                      size="small"
                      sx={{ width: 120 }}
                    />
                  ) : (
                    item.country_of_origin || '-'
                  )}
                </TableCell>
                <TableCell>{item.is_kit_item ? 'Yes' : 'No'}</TableCell>
                {isEditable && (
                  <TableCell>
                    <IconButton size="small" onClick={() => handleDeleteItem(index)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

// Packing Details Tab Component
const PackingDetailsTab = ({ details, isEditable, onChange, canSplitPackages, invoice, autoGenCompleted, setAutoGenCompleted }) => {
  const [fileNameErrors, setFileNameErrors] = useState({});
  const [fileNameStatus, setFileNameStatus] = useState({}); // Store validation status
  const [validationTimers, setValidationTimers] = useState({});
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [selectedPackageIndex, setSelectedPackageIndex] = useState(null);
  const [packingListDialogOpen, setPackingListDialogOpen] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);

  // Ref-based lock to prevent race condition from React StrictMode double-execution
  const generationInProgress = useRef(false);

  // Auto-generation logic - Runs when packing details tab is viewed
  useEffect(() => {
    const checkAndAutoGenerate = async () => {
      // Check if generation is already in progress (prevents race condition)
      if (generationInProgress.current) {
        console.log('⏭️ Skipping: Generation already in progress');
        return;
      }

      // Only run if no packing details and not already complete
      if ((!details || details.length === 0) && !autoGenCompleted && invoice?.id) {
        try {
          // Acquire lock
          generationInProgress.current = true;
          setAutoGenerating(true);
          console.log(`Checking if auto-generation is possible for invoice ${invoice.id}...`);

          // Step 1: Check if auto-generation is possible
          const checkResponse = await fetch(`http://127.0.0.1:8000/api/invoices/${invoice.id}/check-packaging-rules`);
          const checkData = await checkResponse.json();

          console.log('Check result:', checkData);

          // Step 2: If auto-generation is possible, generate
          if (checkData.action === 'auto_generate') {
            console.log('✅ Auto-generating packing list...');

            const genResponse = await fetch(`http://127.0.0.1:8000/api/invoices/${invoice.id}/generate-packing-list`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ invoice_id: invoice.id })
            });

            const genData = await genResponse.json();

            if (genData.success) {
              console.log(`✅ Packing list auto-generated: ${genData.packages_created} packages`);

              // Step 3: Fetch the generated packing list
              const packingResponse = await fetch(`http://127.0.0.1:8000/api/invoices/${invoice.id}/packing-list`);
              const packingData = await packingResponse.json();

              if (packingData.packing_list?.packages) {
                onChange(packingData.packing_list.packages);
              }
            }
          } else if (checkData.action === 'display_existing') {
            console.log('📦 Fetching existing packing list...');
            // Fetch existing packing list
            const packingResponse = await fetch(`http://127.0.0.1:8000/api/invoices/${invoice.id}/packing-list`);
            const packingData = await packingResponse.json();

            if (packingData.packing_list?.packages) {
              onChange(packingData.packing_list.packages);
            }
          } else {
            console.log('⚠️ No packaging rules found - manual entry required');
          }

          setAutoGenCompleted(true);
        } catch (error) {
          console.error('❌ Auto-generation failed:', error);
        } finally {
          // Release lock
          generationInProgress.current = false;
          setAutoGenerating(false);
        }
      }
    };

    checkAndAutoGenerate();
  }, [invoice?.id, details, autoGenCompleted, onChange, setAutoGenCompleted]);

  const handleAddDetail = () => {
    const newDetail = {
      package_number: details.length + 1,
      quantity: 1,
      package_type: '',
      length_cm: 0,
      width_cm: 0,
      height_cm: 0,
      cbm: 0,
      gross_weight_kg: 0,
      net_weight_kg: 0,
      volumetric_weight_kg: 0,
      contents_description: '',
      file_name: '',
    };
    onChange([...details, newDetail]);
  };

  const handleDeleteDetail = (index) => {
    const newDetails = details.filter((_, i) => i !== index);
    onChange(newDetails);
  };

  const validateFileName = async (fileName, packingDetailId) => {
    if (!fileName || fileName.trim() === '') {
      return { valid: true, status: 'available' };
    }

    try {
      const response = await invoiceService.validateFileName(fileName, packingDetailId);
      return response;
    } catch (error) {
      console.error('Error validating file name:', error);
      return { valid: false, message: 'Error validating file name', status: 'error' };
    }
  };

  // Get row color based on file name status
  const getRowColor = (detail, index) => {
    const error = fileNameErrors[index];
    const status = fileNameStatus[index];
    const fileName = detail.file_name;

    if (!fileName || fileName.trim() === '') {
      // 🟢 Green = File Name empty (ready for transport request)
      return '#e8f5e9'; // light green
    }

    // Check status from validation
    if (status === 'locked') {
      // ⚫ Grey = Already on manifest/in transit (locked)
      return '#e0e0e0'; // grey
    }

    if (status === 'confirmed') {
      // 🔵 Blue = Transport request issued (exists in Load Confirmation)
      return '#e3f2fd'; // light blue
    }

    if (status === 'duplicate') {
      // Red = Duplicate error
      return '#ffebee'; // light red
    }

    if (status === 'available' && fileName) {
      // 🟡 Yellow = File name filled but no transport request issued yet (planning)
      return '#fff9c4'; // light yellow
    }

    // Default to light yellow for planning state
    return '#fff9c4';
  };

  const handleUpdateDetail = (index, field, value) => {
    const newDetails = [...details];
    newDetails[index] = { ...newDetails[index], [field]: value };

    // Auto-calculate CBM if dimensions change
    if (field === 'length_cm' || field === 'width_cm' || field === 'height_cm') {
      const l = field === 'length_cm' ? parseFloat(value) : parseFloat(newDetails[index].length_cm);
      const w = field === 'width_cm' ? parseFloat(value) : parseFloat(newDetails[index].width_cm);
      const h = field === 'height_cm' ? parseFloat(value) : parseFloat(newDetails[index].height_cm);
      newDetails[index].cbm = ((l * w * h) / 1000000).toFixed(6);

      // Calculate volumetric weight (CBM * 167 for air freight)
      newDetails[index].volumetric_weight_kg = (parseFloat(newDetails[index].cbm) * 167).toFixed(3);
    }

    // Validate file name with debouncing
    if (field === 'file_name') {
      // Clear previous timer for this index
      if (validationTimers[index]) {
        clearTimeout(validationTimers[index]);
      }

      // Clear existing error while typing
      setFileNameErrors(prev => ({ ...prev, [index]: null }));

      // Set new timer for validation
      const timer = setTimeout(async () => {
        const validation = await validateFileName(value, newDetails[index].id);

        // Store status for color coding
        setFileNameStatus(prev => ({
          ...prev,
          [index]: validation.status
        }));

        if (!validation.valid || validation.is_locked) {
          setFileNameErrors(prev => ({
            ...prev,
            [index]: {
              message: validation.message,
              status: validation.status,
              isLocked: validation.is_locked
            }
          }));
        } else {
          setFileNameErrors(prev => ({ ...prev, [index]: null }));
        }
      }, 500); // 500ms debounce

      setValidationTimers(prev => ({ ...prev, [index]: timer }));
    }

    onChange(newDetails);
  };

  const handleSplitPackage = (splitData) => {
    if (selectedPackageIndex === null) return;

    const originalPackage = details[selectedPackageIndex];

    // Calculate remaining values for original package
    const remainingPackage = {
      ...originalPackage,
      gross_weight_kg: (parseFloat(originalPackage.gross_weight_kg) - parseFloat(splitData.gross_weight_kg)).toFixed(2),
      net_weight_kg: (parseFloat(originalPackage.net_weight_kg) - parseFloat(splitData.net_weight_kg)).toFixed(2),
      length_cm: originalPackage.length_cm,
      width_cm: originalPackage.width_cm,
      height_cm: originalPackage.height_cm,
      cbm: originalPackage.cbm,
      volumetric_weight_kg: originalPackage.volumetric_weight_kg,
      file_name: originalPackage.file_name,
    };

    // Create new split package
    const newPackage = {
      package_number: details.length + 1,
      quantity: 1,
      package_type: originalPackage.package_type,
      gross_weight_kg: parseFloat(splitData.gross_weight_kg),
      net_weight_kg: parseFloat(splitData.net_weight_kg),
      length_cm: parseFloat(splitData.length_cm),
      width_cm: parseFloat(splitData.width_cm),
      height_cm: parseFloat(splitData.height_cm),
      cbm: splitData.cbm,
      volumetric_weight_kg: splitData.volumetric_weight_kg,
      contents_description: splitData.contents_description,
      file_name: '',
    };

    // Create new array with updated packages
    const newDetails = [...details];
    newDetails[selectedPackageIndex] = remainingPackage;
    newDetails.push(newPackage);

    // Renumber all packages sequentially
    const renumberedDetails = newDetails.map((pkg, idx) => ({
      ...pkg,
      package_number: idx + 1
    }));

    onChange(renumberedDetails);
    setSplitDialogOpen(false);
    setSelectedPackageIndex(null);
  };

  const handleOpenSplitDialog = (index) => {
    if (!canSplitPackages) {
      alert('You do not have permission to split packages. Only Admin and Key Account Manager roles can split.');
      return;
    }
    setSelectedPackageIndex(index);
    setSplitDialogOpen(true);
  };

  // Show loading indicator during auto-generation
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

  if (!details || details.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6, bgcolor: '#fafafa', borderRadius: 1 }}>
        <Typography variant="h6" color="textSecondary" gutterBottom>
          No packing details
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
          <Button
            startIcon={<AddIcon />}
            onClick={() => setPackingListDialogOpen(true)}
            variant="outlined"
            sx={{ color: '#001f3f', borderColor: '#001f3f', '&:hover': { borderColor: '#73e9c7', bgcolor: '#f0fffe' } }}
          >
            Create Packing List
          </Button>
          {isEditable && (
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddDetail}
              variant="contained"
              sx={{ bgcolor: '#73e9c7', color: '#001f3f', '&:hover': { bgcolor: '#5fd4b3' } }}
            >
              Add Package
            </Button>
          )}
        </Box>

        {/* Manual Packing List Dialog */}
        <ManualPackingListForm
          open={packingListDialogOpen}
          onClose={() => setPackingListDialogOpen(false)}
          invoice={invoice}
          onSaved={(data) => {
            // Refresh invoice data by updating packing details
            onChange(data.packing_details || []);
            setPackingListDialogOpen(false);
          }}
        />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          startIcon={<AddIcon />}
          onClick={() => setPackingListDialogOpen(true)}
          variant="outlined"
          sx={{ color: '#001f3f', borderColor: '#001f3f', '&:hover': { borderColor: '#73e9c7', bgcolor: '#f0fffe' } }}
        >
          Create Packing List
        </Button>
        {isEditable && (
          <Button
            startIcon={<AddIcon />}
            onClick={handleAddDetail}
            variant="contained"
            sx={{ bgcolor: '#73e9c7', color: '#001f3f', '&:hover': { bgcolor: '#5fd4b3' } }}
          >
            Add Package
          </Button>
        )}
      </Box>
      <TableContainer sx={{ border: '1px solid #e0e0e0', borderRadius: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#001f3f' }}>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Pkg #</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Qty</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Type</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>L (cm)</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>W (cm)</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>H (cm)</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>CBM</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Gross (kg)</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Net (kg)</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Vol. (kg)</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Contents</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>File Name</TableCell>
              {isEditable && <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {details.map((detail, index) => (
              <TableRow
                key={index}
                sx={{
                  bgcolor: getRowColor(detail, index),
                  '&:hover': {
                    bgcolor: getRowColor(detail, index),
                    filter: 'brightness(0.95)'
                  }
                }}
              >
                <TableCell sx={{ fontWeight: 500 }}>{detail.package_number}</TableCell>
                <TableCell>
                  {isEditable ? (
                    <TextField
                      type="number"
                      value={detail.quantity || 1}
                      onChange={(e) => handleUpdateDetail(index, 'quantity', e.target.value)}
                      size="small"
                      sx={{ width: 60 }}
                    />
                  ) : (
                    detail.quantity || 1
                  )}
                </TableCell>
                <TableCell>
                  {isEditable ? (
                    <TextField
                      value={detail.package_type || ''}
                      onChange={(e) => handleUpdateDetail(index, 'package_type', e.target.value)}
                      size="small"
                      sx={{ width: 100 }}
                    />
                  ) : (
                    detail.package_type || '-'
                  )}
                </TableCell>
                <TableCell>
                  {isEditable ? (
                    <TextField
                      type="number"
                      value={detail.length_cm || 0}
                      onChange={(e) => handleUpdateDetail(index, 'length_cm', e.target.value)}
                      size="small"
                      sx={{ width: 80 }}
                    />
                  ) : (
                    detail.length_cm
                  )}
                </TableCell>
                <TableCell>
                  {isEditable ? (
                    <TextField
                      type="number"
                      value={detail.width_cm || 0}
                      onChange={(e) => handleUpdateDetail(index, 'width_cm', e.target.value)}
                      size="small"
                      sx={{ width: 80 }}
                    />
                  ) : (
                    detail.width_cm
                  )}
                </TableCell>
                <TableCell>
                  {isEditable ? (
                    <TextField
                      type="number"
                      value={detail.height_cm || 0}
                      onChange={(e) => handleUpdateDetail(index, 'height_cm', e.target.value)}
                      size="small"
                      sx={{ width: 80 }}
                    />
                  ) : (
                    detail.height_cm
                  )}
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#001f3f' }}>{detail.cbm}</TableCell>
                <TableCell>
                  {isEditable ? (
                    <TextField
                      type="number"
                      value={detail.gross_weight_kg || 0}
                      onChange={(e) => handleUpdateDetail(index, 'gross_weight_kg', e.target.value)}
                      size="small"
                      sx={{ width: 80 }}
                    />
                  ) : (
                    detail.gross_weight_kg
                  )}
                </TableCell>
                <TableCell>
                  {isEditable ? (
                    <TextField
                      type="number"
                      value={detail.net_weight_kg || 0}
                      onChange={(e) => handleUpdateDetail(index, 'net_weight_kg', e.target.value)}
                      size="small"
                      sx={{ width: 80 }}
                    />
                  ) : (
                    detail.net_weight_kg
                  )}
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#001f3f' }}>{detail.volumetric_weight_kg}</TableCell>
                <TableCell>
                  {isEditable ? (
                    <TextField
                      value={detail.contents_description || ''}
                      onChange={(e) => handleUpdateDetail(index, 'contents_description', e.target.value)}
                      size="small"
                      fullWidth
                      multiline
                    />
                  ) : (
                    detail.contents_description || '-'
                  )}
                </TableCell>
                <TableCell>
                  {isEditable ? (
                    <TextField
                      value={detail.file_name || ''}
                      onChange={(e) => handleUpdateDetail(index, 'file_name', e.target.value)}
                      size="small"
                      sx={{ width: 150 }}
                      placeholder="Enter file name"
                      error={!!fileNameErrors[index]}
                      helperText={fileNameErrors[index]?.message || ''}
                      FormHelperTextProps={{
                        sx: {
                          color: fileNameErrors[index]?.isLocked ? 'error.main' : 'warning.main',
                          fontSize: '0.7rem',
                          position: 'absolute',
                          top: '100%',
                          whiteSpace: 'nowrap'
                        }
                      }}
                    />
                  ) : (
                    detail.file_name || '-'
                  )}
                </TableCell>
                {isEditable && (
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {canSplitPackages && (
                        <IconButton
                          size="small"
                          onClick={() => handleOpenSplitDialog(index)}
                          sx={{ color: '#001f3f' }}
                          title="Split Package"
                        >
                          <CallSplitIcon />
                        </IconButton>
                      )}
                      <IconButton size="small" onClick={() => handleDeleteDetail(index)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Split Package Dialog */}
      <SplitPackageDialog
        open={splitDialogOpen}
        onClose={() => {
          setSplitDialogOpen(false);
          setSelectedPackageIndex(null);
        }}
        originalPackage={selectedPackageIndex !== null ? details[selectedPackageIndex] : null}
        onSplit={handleSplitPackage}
      />

      {/* Manual Packing List Dialog */}
      <ManualPackingListForm
        open={packingListDialogOpen}
        onClose={() => setPackingListDialogOpen(false)}
        invoice={invoice}
        onSaved={(data) => {
          // Refresh invoice data by updating packing details
          onChange(data.packing_details || []);
          setPackingListDialogOpen(false);
        }}
      />
    </Box>
  );
};

// Delivery Note Tab Component (Read-only)
const DeliveryNoteTab = ({ items }) => {
  if (!items || items.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6, bgcolor: '#fafafa', borderRadius: 1 }}>
        <Typography variant="h6" color="textSecondary">
          No delivery note items available
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer sx={{ border: '1px solid #e0e0e0', borderRadius: 1 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: '#001f3f' }}>
            <TableCell sx={{ color: 'white', fontWeight: 600 }}>Line #</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 600 }}>Item Code</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 600 }}>Description</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 600 }}>Qty Shipped</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 600 }}>UOM</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 600 }}>Serial #</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 600 }}>Batch #</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item, index) => (
            <TableRow
              key={index}
              sx={{
                '&:nth-of-type(odd)': { bgcolor: '#e6f9f5' },
                '&:hover': { bgcolor: '#d0f2ea' }
              }}
            >
              <TableCell sx={{ fontWeight: 500 }}>{item.line_number}</TableCell>
              <TableCell>{item.item_code || '-'}</TableCell>
              <TableCell>{item.description || '-'}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{item.quantity_shipped}</TableCell>
              <TableCell>{item.unit_of_measure || '-'}</TableCell>
              <TableCell>{item.serial_number || '-'}</TableCell>
              <TableCell>{item.batch_number || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default InvoiceDetailView;
