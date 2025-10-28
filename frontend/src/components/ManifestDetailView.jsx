import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Button,
  Tabs,
  Tab,
  Checkbox,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  InputAdornment,
} from '@mui/material';
import {
  Assignment as ManifestIcon,
  LocalShipping as TruckIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Description as InvoiceIcon,
  PictureAsPdf as PdfIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { manifestService } from '../services/manifestService';
import { invoiceService } from '../services/invoiceService';
import { useSnackbar } from 'notistack';

export default function ManifestDetailView({ manifest: initialManifest, manifestId, onUpdate }) {
  const { enqueueSnackbar } = useSnackbar();
  const [manifest, setManifest] = useState(initialManifest);
  const [loading, setLoading] = useState(!initialManifest && !!manifestId);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [availableInvoices, setAvailableInvoices] = useState([]);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [addInvoiceDialogOpen, setAddInvoiceDialogOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState('');
  const [documentSubtype, setDocumentSubtype] = useState('');
  const [uploading, setUploading] = useState(false);
  const [invoiceFilter, setInvoiceFilter] = useState('');
  const [removeInvoiceDialogOpen, setRemoveInvoiceDialogOpen] = useState(false);
  const [invoiceToRemove, setInvoiceToRemove] = useState(null);
  const [deleteDocumentDialogOpen, setDeleteDocumentDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [packageSelectionDialogOpen, setPackageSelectionDialogOpen] = useState(false);
  const [selectedInvoiceForPackages, setSelectedInvoiceForPackages] = useState(null);
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [viewManifestPackagesDialogOpen, setViewManifestPackagesDialogOpen] = useState(false);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState(null);
  const [packagesToRemove, setPackagesToRemove] = useState([]);

  useEffect(() => {
    if (!initialManifest && manifestId) {
      loadManifest();
    }
    if (initialManifest) {
      setManifest(initialManifest);
    }
  }, [manifestId, initialManifest]);

  const loadManifest = async () => {
    try {
      setLoading(true);
      const id = manifestId || manifest?.id;
      if (!id) {
        throw new Error('No manifest ID available');
      }
      const data = await manifestService.getById(id);
      setManifest(data);
    } catch (err) {
      setError('Failed to load manifest: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableInvoices = async () => {
    try {
      const response = await invoiceService.getAll();
      const allInvoices = response.data || response;
      console.log('All invoices loaded:', allInvoices.length);

      // Filter to only show:
      // 1. Actual invoices (not POs)
      // 2. Invoices not already on this manifest
      // 3. Invoices that don't have load confirmations or manifests (ready for transport)
      const manifestInvoiceIds = (manifest?.invoices || []).map(inv => inv.id);
      const available = allInvoices.filter(inv => {
        // Only commercial invoices
        if (inv.invoice_type !== 'commercial_invoice') return false;

        // Not already on this manifest
        if (manifestInvoiceIds.includes(inv.id)) return false;

        // Don't have load confirmations or manifests (ready for transport)
        const hasLoadConfirmations = inv.load_confirmations && inv.load_confirmations.length > 0;
        const hasManifests = inv.manifests && inv.manifests.length > 0;
        if (hasLoadConfirmations || hasManifests) return false;

        return true;
      });

      console.log('Available invoices after filtering:', available.length);
      console.log('Available invoice numbers:', available.map(inv => inv.invoice_number));
      setAvailableInvoices(available);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    }
  };

  useEffect(() => {
    if (addInvoiceDialogOpen) {
      loadAvailableInvoices();
      setInvoiceFilter(''); // Reset filter when dialog opens
    }
  }, [addInvoiceDialogOpen]);

  // Load documents when DOCUMENTS tab is active
  useEffect(() => {
    if (activeTab === 2 && manifest?.id) {
      loadDocuments();
    }
  }, [activeTab, manifest?.id]);

  const loadDocuments = async () => {
    try {
      const docs = await manifestService.getDocuments(manifest.id);
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleAddInvoices = async () => {
    try {
      await manifestService.attachInvoices(manifest.id, selectedInvoices);
      await loadManifest();
      setAddInvoiceDialogOpen(false);
      setSelectedInvoices([]);
      if (onUpdate) onUpdate();
    } catch (err) {
      setError('Failed to add invoices: ' + err.message);
    }
  };

  const handleRemoveInvoice = (invoice) => {
    setInvoiceToRemove(invoice);
    setRemoveInvoiceDialogOpen(true);
  };

  const confirmRemoveInvoice = async () => {
    if (!invoiceToRemove) return;

    try {
      await manifestService.detachInvoices(manifest.id, [invoiceToRemove.id]);
      await loadManifest();
      setRemoveInvoiceDialogOpen(false);
      setInvoiceToRemove(null);
      enqueueSnackbar(`Invoice ${invoiceToRemove.invoice_number} removed from manifest`, { variant: 'success' });
      if (onUpdate) onUpdate();
    } catch (err) {
      enqueueSnackbar('Failed to remove invoice: ' + err.message, { variant: 'error' });
      setError('Failed to remove invoice: ' + err.message);
    }
  };

  const handleInvoiceSelection = (invoiceId) => {
    console.log('Invoice selection clicked:', invoiceId);
    setSelectedInvoices(prev => {
      console.log('Previous selection:', prev);
      const isAlreadySelected = prev.includes(invoiceId);
      console.log('Is already selected?', isAlreadySelected);
      const newSelection = isAlreadySelected
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId];
      console.log('New selection:', newSelection);
      return newSelection;
    });
  };

  const handleOpenPackageSelection = (invoice, e) => {
    e.stopPropagation();
    setSelectedInvoiceForPackages(invoice);
    setSelectedPackages([]);
    setPackageSelectionDialogOpen(true);
  };

  const handlePackageSelection = (packageId) => {
    setSelectedPackages(prev => {
      if (prev.includes(packageId)) {
        return prev.filter(id => id !== packageId);
      } else {
        return [...prev, packageId];
      }
    });
  };

  const handleAddSelectedPackages = async () => {
    if (!selectedInvoiceForPackages || selectedPackages.length === 0) return;

    try {
      // Call package-level attachment API
      await manifestService.attachPackages(manifest.id, selectedPackages);
      await loadManifest();
      setPackageSelectionDialogOpen(false);
      setSelectedInvoiceForPackages(null);
      setSelectedPackages([]);
      enqueueSnackbar(`${selectedPackages.length} package(s) added to manifest`, { variant: 'success' });
      if (onUpdate) onUpdate();
    } catch (err) {
      enqueueSnackbar('Failed to add packages: ' + err.message, { variant: 'error' });
      setError('Failed to add packages: ' + err.message);
    }
  };

  const handleViewManifestPackages = (invoice, e) => {
    if (e) e.stopPropagation();
    setSelectedInvoiceForView(invoice);
    setPackagesToRemove([]);
    setViewManifestPackagesDialogOpen(true);
  };

  const handlePackageRemovalSelection = (packageId) => {
    setPackagesToRemove(prev => {
      if (prev.includes(packageId)) {
        return prev.filter(id => id !== packageId);
      } else {
        return [...prev, packageId];
      }
    });
  };

  const handleRemoveSelectedPackages = async () => {
    if (!selectedInvoiceForView || packagesToRemove.length === 0) return;

    try {
      await manifestService.detachPackages(manifest.id, packagesToRemove);
      await loadManifest();
      setViewManifestPackagesDialogOpen(false);
      setSelectedInvoiceForView(null);
      setPackagesToRemove([]);
      enqueueSnackbar(`${packagesToRemove.length} package(s) removed from manifest`, { variant: 'success' });
      if (onUpdate) onUpdate();
    } catch (err) {
      enqueueSnackbar('Failed to remove packages: ' + err.message, { variant: 'error' });
      setError('Failed to remove packages: ' + err.message);
    }
  };

  const handleDownloadPdf = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    window.open(`${apiUrl}/manifests/${manifest.id}/download-pdf`, '_blank');
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUploadDocument = async () => {
    if (!selectedFile || !documentType) {
      alert('Please select a file and document type');
      return;
    }

    try {
      setUploading(true);
      await manifestService.uploadDocument(
        manifest.id,
        selectedFile,
        documentType,
        documentSubtype || null
      );
      await loadDocuments();
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setDocumentType('');
      setDocumentSubtype('');
    } catch (err) {
      setError('Failed to upload document: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = (document) => {
    setDocumentToDelete(document);
    setDeleteDocumentDialogOpen(true);
  };

  const confirmDeleteDocument = async () => {
    if (!documentToDelete) return;

    try {
      await manifestService.deleteDocument(manifest.id, documentToDelete.id);
      await loadDocuments();
      setDeleteDocumentDialogOpen(false);
      setDocumentToDelete(null);
      enqueueSnackbar('Document deleted successfully', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Failed to delete document: ' + err.message, { variant: 'error' });
      setError('Failed to delete document: ' + err.message);
    }
  };

  const handleDownloadDocument = async (documentId, filename) => {
    try {
      const blob = await manifestService.downloadDocument(manifest.id, documentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download document: ' + err.message);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!manifest) {
    return <Alert severity="warning">No manifest data available</Alert>;
  }

  const loadConfirmation = manifest.load_confirmation || {};
  const invoices = manifest.invoices || [];

  // Calculate totals
  const calculateTotals = () => {
    let totalPieces = 0;
    let totalWeight = 0;
    let totalCBM = 0;
    let totalValue = 0;
    let currency = 'USD';

    invoices.forEach(invoice => {
      // Only count packages assigned to THIS manifest
      const allPackingDetails = invoice.packing_details || [];
      const packingDetails = allPackingDetails.filter(pkg => pkg.file_name === manifest?.manifest_number);

      packingDetails.forEach(pkg => {
        const quantity = parseInt(pkg.quantity) || 1;
        totalPieces += quantity;
        totalWeight += (parseFloat(pkg.gross_weight_kg) || 0) * quantity;
        totalCBM += (parseFloat(pkg.cbm) || 0) * quantity;
      });

      // Calculate proportional value based on packages on this manifest
      if (allPackingDetails.length > 0 && packingDetails.length > 0) {
        const totalInvoiceQuantity = allPackingDetails.reduce((sum, pkg) => sum + (parseInt(pkg.quantity) || 1), 0);
        const manifestQuantity = packingDetails.reduce((sum, pkg) => sum + (parseInt(pkg.quantity) || 1), 0);
        const proportion = manifestQuantity / totalInvoiceQuantity;
        totalValue += parseFloat(invoice.total_amount || 0) * proportion;
      }

      if (invoice.currency) currency = invoice.currency;
    });

    return { pieces: totalPieces, weight: totalWeight.toFixed(2), cbm: totalCBM.toFixed(2), value: totalValue.toFixed(2), currency };
  };

  const totals = calculateTotals();
  const firstInvoice = invoices[0] || {};
  const supplier = firstInvoice.supplier || {};
  const customer = firstInvoice.customer || {};
  const invoiceNumbers = invoices.map(inv => inv.invoice_number).filter(Boolean).join(' / ');
  const poNumbers = invoices.map(inv => inv.purchase_order).filter(Boolean).join(' / ');

  return (
    <Box sx={{ p: 2 }}>
      {/* Header Section */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, bgcolor: '#001f3f', color: 'white', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ManifestIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {manifest.manifest_number}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Road Freight Manifest
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<PdfIcon />}
            onClick={handleDownloadPdf}
            sx={{ bgcolor: '#73e9c7', color: '#001f3f', fontWeight: 600, '&:hover': { bgcolor: '#5dd4b0' } }}
          >
            Download PDF
          </Button>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>Export Date:</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {manifest.export_date ? new Date(manifest.export_date).toLocaleDateString() : 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>Status:</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {manifest.status?.replace(/_/g, ' ').toUpperCase()}
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>Customs Status:</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {manifest.customs_status?.toUpperCase()}
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>FERI Date:</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {manifest.feri_application_date ? new Date(manifest.feri_application_date).toLocaleDateString() : 'Not Submitted'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="PREVIEW" />
          <Tab label="INVOICES" />
          <Tab label="DOCUMENTS" />
        </Tabs>

        {/* TAB 1: PREVIEW */}
        {activeTab === 0 && (
          <Box sx={{ p: 3 }}>
            {/* PDF-Style Preview */}
            <Box sx={{ bgcolor: '#f5f5f5', p: 3, borderRadius: 1, border: '2px solid #001f3f' }}>
              {/* Header Bar */}
              <Box sx={{ bgcolor: '#3d2d6b', color: 'white', p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                  Road Freight Manifest: {manifest.manifest_number}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {new Date(manifest.export_date).toLocaleDateString()}
                </Typography>
              </Box>

              {/* Transport & Clearing Table */}
              <TableContainer sx={{ mb: 2 }}>
                <Table size="small" sx={{ border: '1px solid #000' }}>
                  <TableBody>
                    <TableRow sx={{ bgcolor: 'black' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 700, border: '1px solid white', textTransform: 'uppercase' }}>TRANSPORTER</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700, border: '1px solid white', textTransform: 'uppercase' }}>CLEARING AGENT</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700, border: '1px solid white', textTransform: 'uppercase' }}>DESTINATION CLEARING AGENT</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700, border: '1px solid white', textTransform: 'uppercase' }}>PLACE OF OFFLOADING</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ border: '1px solid #000', fontWeight: 600, textTransform: 'uppercase' }}>{loadConfirmation.transporter_name || 'N/A'}</TableCell>
                      <TableCell sx={{ border: '1px solid #000', fontWeight: 600, textTransform: 'uppercase' }}>{loadConfirmation.clearing_agent || 'N/A'}</TableCell>
                      <TableCell sx={{ border: '1px solid #000', fontWeight: 600, textTransform: 'uppercase' }}>{loadConfirmation.entry_agent || 'N/A'}</TableCell>
                      <TableCell sx={{ border: '1px solid #000', fontWeight: 600, textTransform: 'uppercase' }}>{manifest.border_post || 'N/A'}</TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'black' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 700, border: '1px solid white', textTransform: 'uppercase' }}>MODE</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700, border: '1px solid white', textTransform: 'uppercase' }}>TRUCK TYPE</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700, border: '1px solid white', textTransform: 'uppercase' }}>BORDER</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700, border: '1px solid white', textTransform: 'uppercase' }}>REGISTRATION DETAILS</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ border: '1px solid #000', fontWeight: 600, textTransform: 'uppercase' }}>ROAD</TableCell>
                      <TableCell sx={{ border: '1px solid #000', fontWeight: 600, textTransform: 'uppercase' }}>{loadConfirmation.vehicle_type || 'N/A'}</TableCell>
                      <TableCell sx={{ border: '1px solid #000', fontWeight: 600, textTransform: 'uppercase' }}>{manifest.customs_office || 'N/A'}</TableCell>
                      <TableCell sx={{ border: '1px solid #000', fontWeight: 600, textTransform: 'uppercase' }}>
                        HORSE: {loadConfirmation.truck_registration || 'N/A'} | TRAILER: {loadConfirmation.trailer_1_registration || 'N/A'}
                        {loadConfirmation.trailer_2_registration && ` | TRAILER 2: ${loadConfirmation.trailer_2_registration}`}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Shipment Details Header */}
              <Typography variant="h6" sx={{ bgcolor: '#001f3f', color: 'white', p: 1, mb: 1, fontWeight: 700, textTransform: 'uppercase' }}>
                SHIPMENT DETAILS
              </Typography>

              {/* Shipment Details Table */}
              <TableContainer sx={{ mb: 2 }}>
                <Table size="small" sx={{ border: '1px solid #000' }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f0f0f0' }}>
                      <TableCell sx={{ border: '1px solid #000', fontWeight: 700, width: '18%' }}></TableCell>
                      <TableCell sx={{ border: '1px solid #000', fontWeight: 700, width: '20%' }}>CONSIGNOR</TableCell>
                      <TableCell sx={{ border: '1px solid #000', fontWeight: 700, width: '20%' }}>CONSIGNEE</TableCell>
                      <TableCell sx={{ border: '1px solid #000', fontWeight: 700, width: '20%' }}>GOODS DESCRIPTION</TableCell>
                      <TableCell sx={{ border: '1px solid #000', fontWeight: 700, width: '22%' }}>DRC AGENT</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ border: '1px solid #000', verticalAlign: 'top' }}>
                        <Box>
                          <Typography variant="caption">Pieces:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{totals.pieces}</Typography>
                        </Box>
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption">Weight:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{totals.weight}</Typography>
                        </Box>
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption">CBM:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{totals.cbm}</Typography>
                        </Box>
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption">Contract #:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{manifest.contract_number || ''}</Typography>
                        </Box>
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption">Area and phase #:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{manifest.area_and_phase || ''}</Typography>
                        </Box>
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption">Project code:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{manifest.project_code || ''}</Typography>
                        </Box>
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption">PO #:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{firstInvoice?.purchase_order || ''}</Typography>
                        </Box>
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption">Invoice #:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{firstInvoice?.invoice_number || ''}</Typography>
                        </Box>
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption">COD #:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{manifest.cod_number || ''}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ border: '1px solid #000', verticalAlign: 'top', textTransform: 'uppercase' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{supplier.name || 'N/A'}</Typography>
                        <Typography variant="caption">{supplier.address || ''}</Typography>
                      </TableCell>
                      <TableCell sx={{ border: '1px solid #000', verticalAlign: 'top', textTransform: 'uppercase' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{customer.name || 'N/A'}</Typography>
                        <Typography variant="caption" sx={{ whiteSpace: 'pre-line' }}>{firstInvoice?.delivery_address || ''}</Typography>
                      </TableCell>
                      <TableCell sx={{ border: '1px solid #000', verticalAlign: 'top', textAlign: 'center', textTransform: 'uppercase' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{loadConfirmation.commodity_description || 'BREAKERS'}</Typography>
                      </TableCell>
                      <TableCell sx={{ border: '1px solid #000', verticalAlign: 'top', textAlign: 'center', textTransform: 'uppercase' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{loadConfirmation.entry_agent || 'AGL'}</Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Driver Instructions */}
              {(manifest.driver_instruction_1 || manifest.driver_instruction_2) && (
                <Grid container spacing={2}>
                  {manifest.driver_instruction_1 && (
                    <Grid item xs={6}>
                      <Box sx={{ border: '2px solid #000', p: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>DRIVER INSTRUCTION 1:</Typography>
                        <Typography variant="body2">{manifest.driver_instruction_1}</Typography>
                      </Box>
                    </Grid>
                  )}
                  {manifest.driver_instruction_2 && (
                    <Grid item xs={6}>
                      <Box sx={{ border: '2px solid #000', p: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>DRIVER INSTRUCTION 2:</Typography>
                        <Typography variant="body2">{manifest.driver_instruction_2}</Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              )}
            </Box>
          </Box>
        )}

        {/* TAB 2: INVOICES */}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Invoices on Manifest ({invoices.length})
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddInvoiceDialogOpen(true)}
                sx={{ bgcolor: '#38b2ac', '&:hover': { bgcolor: '#2c9a8f' } }}
              >
                Add Invoices
              </Button>
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
              <Table>
                <TableHead sx={{ bgcolor: '#001f3f' }}>
                  <TableRow>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Invoice #</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>PO #</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Customer</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Supplier</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Packages</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Weight (kg)</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>CBM</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Value</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map((invoice) => {
                    // Only count packages assigned to THIS manifest
                    const allPkgs = invoice.packing_details || [];
                    const pkgs = allPkgs.filter(p => p.file_name === manifest?.manifest_number);

                    const packages = pkgs.reduce((sum, p) => sum + (parseInt(p.quantity) || 1), 0);
                    const weight = pkgs.reduce((sum, p) => {
                      const quantity = parseInt(p.quantity) || 1;
                      const pkgWeight = parseFloat(p.gross_weight_kg) || 0;
                      return sum + (quantity * pkgWeight);
                    }, 0);
                    const cbm = pkgs.reduce((sum, p) => {
                      const quantity = parseInt(p.quantity) || 1;
                      const pkgCbm = parseFloat(p.cbm) || 0;
                      return sum + (quantity * pkgCbm);
                    }, 0);

                    return (
                      <TableRow key={invoice.id} hover>
                        <TableCell>{invoice.invoice_number}</TableCell>
                        <TableCell>{invoice.purchase_order || '-'}</TableCell>
                        <TableCell>{invoice.customer?.name || 'N/A'}</TableCell>
                        <TableCell>{invoice.supplier?.name || 'N/A'}</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="text"
                            sx={{
                              minWidth: 'auto',
                              textDecoration: 'underline',
                              color: '#38b2ac',
                              '&:hover': {
                                textDecoration: 'underline',
                                bgcolor: 'rgba(56, 178, 172, 0.1)'
                              }
                            }}
                            onClick={(e) => handleViewManifestPackages(invoice, e)}
                          >
                            {packages}
                          </Button>
                        </TableCell>
                        <TableCell>{weight.toFixed(2)}</TableCell>
                        <TableCell>{cbm.toFixed(2)}</TableCell>
                        <TableCell>{invoice.currency} {parseFloat(invoice.total_amount || 0).toFixed(2)}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" color="error" onClick={() => handleRemoveInvoice(invoice)}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* TAB 3: DOCUMENTS */}
        {activeTab === 2 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Manifest Documents
              </Typography>
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={() => setUploadDialogOpen(true)}
                sx={{ bgcolor: '#38b2ac', '&:hover': { bgcolor: '#2c9a8f' } }}
              >
                Upload Document
              </Button>
            </Box>

            <Alert severity="info" sx={{ mb: 2 }}>
              Upload all required documents for the FERI process. Minimum required documents will be marked.
            </Alert>

            <List>
              {documents.length === 0 ? (
                <Alert severity="warning">No documents uploaded yet. Please upload required documents for FERI processing.</Alert>
              ) : (
                documents.map((doc) => (
                  <ListItem key={doc.id} sx={{ border: '1px solid #e0e0e0', mb: 1, borderRadius: 1 }}>
                    <ListItemText
                      primary={doc.original_filename}
                      secondary={`Type: ${doc.document_type.replace(/_/g, ' ').toUpperCase()} | Size: ${(doc.file_size_bytes / 1024).toFixed(2)} KB | Uploaded: ${new Date(doc.created_at).toLocaleString()}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        sx={{ mr: 1 }}
                        onClick={() => handleDownloadDocument(doc.id, doc.original_filename)}
                        title="Download"
                      >
                        <ViewIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        color="error"
                        onClick={() => handleDeleteDocument(doc)}
                        title="Delete"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))
              )}
            </List>
          </Box>
        )}
      </Paper>

      {/* Add Invoices Dialog */}
      <Dialog open={addInvoiceDialogOpen} onClose={() => setAddInvoiceDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ bgcolor: '#001f3f', color: 'white' }}>Add Invoices to Manifest</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            fullWidth
            placeholder="Filter by invoice number..."
            value={invoiceFilter}
            onChange={(e) => setInvoiceFilter(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                <TableRow>
                  <TableCell padding="checkbox"></TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Invoice #</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>PO #</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Supplier</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Qty</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {availableInvoices
                  .filter(invoice =>
                    invoice.invoice_number.toLowerCase().includes(invoiceFilter.toLowerCase())
                  )
                  .map((invoice) => (
                    <TableRow key={invoice.id} hover sx={{ cursor: 'pointer' }}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedInvoices.includes(invoice.id)}
                          onChange={() => handleInvoiceSelection(invoice.id)}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ color: '#73e9c7', '&.Mui-checked': { color: '#73e9c7' } }}
                        />
                      </TableCell>
                      <TableCell>{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.purchase_order || '-'}</TableCell>
                      <TableCell>{invoice.customer?.name || 'N/A'}</TableCell>
                      <TableCell>{invoice.supplier?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="text"
                          sx={{
                            minWidth: 'auto',
                            textDecoration: 'underline',
                            color: '#38b2ac',
                            '&:hover': {
                              textDecoration: 'underline',
                              bgcolor: 'rgba(56, 178, 172, 0.1)'
                            }
                          }}
                          onClick={(e) => handleOpenPackageSelection(invoice, e)}
                        >
                          {invoice.packing_details?.reduce((sum, pd) => sum + (parseFloat(pd.quantity) || 0), 0) || 0}
                        </Button>
                      </TableCell>
                      <TableCell>{invoice.currency} {parseFloat(invoice.total_amount || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddInvoiceDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddInvoices}
            disabled={selectedInvoices.length === 0}
            sx={{ bgcolor: '#38b2ac', '&:hover': { bgcolor: '#2c9a8f' } }}
          >
            Add {selectedInvoices.length} Invoice(s)
          </Button>
        </DialogActions>
      </Dialog>

      {/* Package Selection Dialog */}
      <Dialog open={packageSelectionDialogOpen} onClose={() => setPackageSelectionDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#001f3f', color: 'white' }}>
          Select Packages from Invoice {selectedInvoiceForPackages?.invoice_number}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Select individual packages to add to this manifest. You can split packages across multiple manifests.
          </Alert>

          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                <TableRow>
                  <TableCell padding="checkbox"></TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Package #</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Qty</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Weight (kg)</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>CBM</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Current Manifest</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedInvoiceForPackages?.packing_details?.map((pkg) => (
                  <TableRow key={pkg.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedPackages.includes(pkg.id)}
                        onChange={() => handlePackageSelection(pkg.id)}
                        sx={{ color: '#73e9c7', '&.Mui-checked': { color: '#73e9c7' } }}
                      />
                    </TableCell>
                    <TableCell>{pkg.package_number}</TableCell>
                    <TableCell>{pkg.quantity || 1}</TableCell>
                    <TableCell>{parseFloat(pkg.gross_weight_kg || 0).toFixed(2)}</TableCell>
                    <TableCell>{parseFloat(pkg.cbm || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      {pkg.file_name ? (
                        <Chip
                          label={pkg.file_name}
                          size="small"
                          color={pkg.file_name === manifest?.manifest_number ? "success" : "warning"}
                        />
                      ) : (
                        <Chip label="Not assigned" size="small" variant="outlined" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPackageSelectionDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddSelectedPackages}
            disabled={selectedPackages.length === 0}
            sx={{ bgcolor: '#38b2ac', '&:hover': { bgcolor: '#2c9a8f' } }}
          >
            Add {selectedPackages.length} Package(s)
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Manifest Packages Dialog (for removal) */}
      <Dialog open={viewManifestPackagesDialogOpen} onClose={() => setViewManifestPackagesDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#d32f2f', color: 'white' }}>
          Manage Packages from Invoice {selectedInvoiceForView?.invoice_number}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Select packages to remove from this manifest. Removing all packages will also remove the invoice from the manifest.
          </Alert>

          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                <TableRow>
                  <TableCell padding="checkbox"></TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Package #</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Qty</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Weight (kg)</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>CBM</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedInvoiceForView?.packing_details
                  ?.filter(pkg => pkg.file_name === manifest?.manifest_number)
                  .map((pkg) => (
                    <TableRow key={pkg.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={packagesToRemove.includes(pkg.id)}
                          onChange={() => handlePackageRemovalSelection(pkg.id)}
                          sx={{ color: '#d32f2f', '&.Mui-checked': { color: '#d32f2f' } }}
                        />
                      </TableCell>
                      <TableCell>{pkg.package_number}</TableCell>
                      <TableCell>{pkg.quantity || 1}</TableCell>
                      <TableCell>{parseFloat(pkg.gross_weight_kg || 0).toFixed(2)}</TableCell>
                      <TableCell>{parseFloat(pkg.cbm || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewManifestPackagesDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRemoveSelectedPackages}
            disabled={packagesToRemove.length === 0}
          >
            Remove {packagesToRemove.length} Package(s)
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Document Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#001f3f', color: 'white' }}>Upload Document</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Upload documents required for FERI processing. Accepted formats: PDF, JPG, PNG (Max 20MB)
          </Alert>

          <TextField
            fullWidth
            select
            label="Document Type *"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            sx={{ mb: 2 }}
            SelectProps={{ native: true }}
          >
            <option value="">Select document type</option>
            <option value="feri_certificate">FERI Certificate</option>
            <option value="customs_declaration">Customs Declaration</option>
            <option value="bill_of_lading">Bill of Lading</option>
            <option value="coc">Certificate of Conformity (COC)</option>
            <option value="export_permit">Export Permit</option>
            <option value="other">Other</option>
          </TextField>

          <TextField
            fullWidth
            label="Document Subtype (Optional)"
            value={documentSubtype}
            onChange={(e) => setDocumentSubtype(e.target.value)}
            placeholder="e.g., Revised, Preliminary, Final"
            sx={{ mb: 2 }}
          />

          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              component="label"
              fullWidth
              startIcon={<UploadIcon />}
            >
              {selectedFile ? selectedFile.name : 'Choose File *'}
              <input
                type="file"
                hidden
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
              />
            </Button>
          </Box>

          {selectedFile && (
            <Alert severity="success" sx={{ mb: 2 }}>
              File selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)} disabled={uploading}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUploadDocument}
            disabled={!selectedFile || !documentType || uploading}
            sx={{ bgcolor: '#38b2ac', '&:hover': { bgcolor: '#2c9a8f' } }}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Invoice Confirmation Dialog */}
      <Dialog open={removeInvoiceDialogOpen} onClose={() => setRemoveInvoiceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#d32f2f', color: 'white' }}>Remove Invoice from Manifest</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will remove the invoice from the manifest and clear the file_name from its packing details.
          </Alert>
          {invoiceToRemove && (
            <Typography>
              Are you sure you want to remove invoice <strong>{invoiceToRemove.invoice_number}</strong> from this manifest?
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveInvoiceDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmRemoveInvoice}
          >
            Remove Invoice
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Document Confirmation Dialog */}
      <Dialog open={deleteDocumentDialogOpen} onClose={() => setDeleteDocumentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#d32f2f', color: 'white' }}>Delete Document</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone!
          </Alert>
          {documentToDelete && (
            <Typography>
              Are you sure you want to delete <strong>{documentToDelete.original_filename}</strong>?
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDocumentDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDeleteDocument}
          >
            Delete Document
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
