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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  CloudUpload as CloudUploadIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
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
  const [isDragOver, setIsDragOver] = useState(false);

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
      // Load documents from manifest
      const manifestDocs = await manifestService.getDocuments(manifest.id);

      // Load documents from all invoices on this manifest
      const invoices = manifest.invoices || [];
      const allInvoiceDocs = [];

      for (const invoice of invoices) {
        if (invoice.documents && invoice.documents.length > 0) {
          invoice.documents.forEach(doc => {
            allInvoiceDocs.push({
              ...doc,
              source: 'invoice',
              invoice_number: invoice.invoice_number,
              invoice_id: invoice.id
            });
          });
        }
      }

      // Combine manifest and invoice documents
      const allDocs = [
        ...manifestDocs.map(doc => ({ ...doc, source: 'manifest' })),
        ...allInvoiceDocs
      ];

      setDocuments(allDocs);
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

  const handleDownloadPdf = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

      // Open PDF in new tab for viewing
      window.open(`${apiUrl}/manifests/${manifest.id}/download-pdf`, '_blank');

      // Also fetch the PDF and upload it to documents
      const response = await fetch(`${apiUrl}/manifests/${manifest.id}/download-pdf`);
      const blob = await response.blob();

      // Create a File object from the blob
      const filename = `Manifest_${manifest.manifest_number}.pdf`;
      const file = new File([blob], filename, { type: 'application/pdf' });

      // Upload the manifest PDF as a document
      await manifestService.uploadDocument(
        manifest.id,
        file,
        'manifest',
        null
      );

      // Reload documents to show the newly uploaded manifest
      await loadDocuments();

      enqueueSnackbar('Manifest PDF downloaded and uploaded to documents', { variant: 'success' });
    } catch (err) {
      console.error('Failed to download/upload manifest PDF:', err);
      enqueueSnackbar('Manifest opened, but failed to auto-upload: ' + err.message, { variant: 'warning' });
    }
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
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

  const handleDownloadDocument = async (doc) => {
    try {
      let blob;
      if (doc.source === 'manifest') {
        blob = await manifestService.downloadDocument(manifest.id, doc.id);
      } else if (doc.source === 'invoice') {
        // Download invoice document using invoice API
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
        const response = await fetch(`${apiUrl}/invoices/${doc.invoice_id}/documents/${doc.id}/download`, {
          method: 'GET',
        });
        blob = await response.blob();
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.original_filename;
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
            {/* Upload Section */}
            <Paper elevation={2} sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
              {/* Teal Header */}
              <Box sx={{ bgcolor: '#73e9c7', p: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#001f3f' }}>
                  Upload Document
                </Typography>
              </Box>

              {/* Drag & Drop Zone */}
              <Box
                sx={{
                  p: 4,
                  textAlign: 'center',
                  bgcolor: isDragOver ? '#e0f7fa' : '#f5f5f5',
                  borderBottom: '1px solid #e0e0e0',
                  border: isDragOver ? '2px dashed #73e9c7' : '2px dashed transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: '#ebebeb'
                  }
                }}
                onClick={() => document.getElementById('document-file-input').click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <CloudUploadIcon sx={{ fontSize: 80, color: '#b0bec5', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#666', mb: 1 }}>
                  Drag & drop PDF or click to browse
                </Typography>
                {selectedFile && (
                  <Typography variant="body2" sx={{ color: '#73e9c7', fontWeight: 600, mt: 2 }}>
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </Typography>
                )}
                <input
                  id="document-file-input"
                  type="file"
                  accept="application/pdf,image/jpeg,image/jpg,image/png"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </Box>

              {/* Bottom Section with Dropdowns and Upload Button */}
              <Box sx={{ p: 3, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <FormControl sx={{ flex: 1 }}>
                  <InputLabel>Document Type</InputLabel>
                  <Select
                    value={documentType}
                    label="Document Type"
                    onChange={(e) => setDocumentType(e.target.value)}
                  >
                    <MenuItem value="manifest">Manifest PDF *</MenuItem>
                    <MenuItem value="freight_statement">Freight Statement</MenuItem>
                    <MenuItem value="insurance">Insurance *</MenuItem>
                    <MenuItem value="validated_feri">Validated FERI (Certification of Destination)</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                  <Typography variant="caption" sx={{ mt: 0.5, color: '#666', display: 'block' }}>
                    * Required for FERI submission
                  </Typography>
                </FormControl>

                {documentType === 'other' && (
                  <TextField
                    sx={{ flex: 1 }}
                    label="Document Subtype"
                    value={documentSubtype}
                    onChange={(e) => setDocumentSubtype(e.target.value)}
                    placeholder="Specify document type"
                  />
                )}

                <Button
                  variant="contained"
                  onClick={handleUploadDocument}
                  disabled={!selectedFile || uploading}
                  sx={{
                    bgcolor: '#d0d0d0',
                    color: '#666',
                    fontWeight: 600,
                    px: 4,
                    py: 1.5,
                    '&:hover': { bgcolor: '#73e9c7', color: '#001f3f' },
                    '&:disabled': { bgcolor: '#e0e0e0', color: '#999' }
                  }}
                >
                  {uploading ? 'UPLOADING...' : 'UPLOAD DOCUMENT'}
                </Button>
              </Box>
            </Paper>

            {/* Required Documents Checklist */}
            <Paper elevation={2} sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ bgcolor: '#001f3f', p: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
                  Required Documents for FERI Submission
                </Typography>
              </Box>
              <Box sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  {(() => {
                    // Check if customer is KAMOA (they arrange their own insurance)
                    const isKamoaCustomer = manifest?.invoices?.some(invoice =>
                      invoice.customer?.name?.toUpperCase().includes('KAMOA')
                    );

                    const requiredDocs = [
                      { type: 'manifest', label: 'Manifest PDF', required: true },
                      { type: 'insurance', label: 'Insurance', required: !isKamoaCustomer, note: isKamoaCustomer ? '(KAMOA - Not Required)' : '(Required)' },
                      { type: 'freight_statement', label: 'Freight Statement', required: false },
                    ];

                    return requiredDocs.map((req) => {
                      const hasDocument = documents.some(doc => doc.document_type === req.type);
                      return (
                        <Grid item xs={12} sm={6} md={4} key={req.type}>
                          <Box
                            sx={{
                              p: 2,
                              borderRadius: 1,
                              bgcolor: hasDocument ? '#e8f5e9' : (req.required ? '#fff3e0' : '#f5f5f5'),
                              border: `2px solid ${hasDocument ? '#4caf50' : (req.required ? '#ff9800' : '#bdbdbd')}`,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}
                          >
                            {hasDocument ? (
                              <Chip
                                icon={<FileIcon />}
                                label="✓"
                                size="small"
                                sx={{
                                  bgcolor: '#4caf50',
                                  color: 'white',
                                  fontWeight: 700,
                                  fontSize: '16px'
                                }}
                              />
                            ) : (
                              <Chip
                                label={req.required ? '!' : ''}
                                size="small"
                                sx={{
                                  bgcolor: req.required ? '#ff9800' : '#bdbdbd',
                                  color: 'white',
                                  fontWeight: 700,
                                  fontSize: '16px'
                                }}
                              />
                            )}
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {req.label}
                              </Typography>
                              {req.required && (
                                <Typography variant="caption" sx={{ color: '#d32f2f' }}>
                                  Required *
                                </Typography>
                              )}
                              {req.note && (
                                <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>
                                  {req.note}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </Grid>
                      );
                    });
                  })()}
                </Grid>
              </Box>
            </Paper>

            {/* Documents Section */}
            <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Typography variant="h6" sx={{ p: 2, fontWeight: 600, color: '#001f3f', borderBottom: '2px solid #e0e0e0' }}>
                Documents ({documents.length})
              </Typography>

              {documents.length === 0 ? (
                <Box sx={{ p: 6, textAlign: 'center' }}>
                  <FileIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
                  <Typography variant="body1" color="textSecondary">
                    No documents attached
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Upload documents using the form above
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                {documents.map((doc) => {
                  const getFileIcon = () => {
                    if (doc.original_filename.toLowerCase().endsWith('.pdf')) {
                      return <PdfIcon sx={{ fontSize: 48, color: '#d32f2f' }} />;
                    } else if (doc.original_filename.match(/\.(jpg|jpeg|png|gif)$/i)) {
                      return <ImageIcon sx={{ fontSize: 48, color: '#1976d2' }} />;
                    }
                    return <FileIcon sx={{ fontSize: 48, color: '#757575' }} />;
                  };

                  return (
                    <Grid item xs={12} sm={6} md={4} key={`${doc.source}-${doc.id}`}>
                      <Paper
                        elevation={2}
                        sx={{
                          p: 2,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'all 0.2s',
                          '&:hover': {
                            elevation: 4,
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.12)'
                          }
                        }}
                      >
                        {/* File Icon and Source Badge */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box sx={{
                            bgcolor: doc.source === 'invoice' ? '#e3f2fd' : '#e8f5e9',
                            borderRadius: 2,
                            p: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {getFileIcon()}
                          </Box>
                          {doc.source === 'invoice' ? (
                            <Chip
                              icon={<InvoiceIcon />}
                              label={doc.invoice_number}
                              size="small"
                              color="primary"
                              sx={{ fontWeight: 600 }}
                            />
                          ) : (
                            <Chip
                              icon={<ManifestIcon />}
                              label="Manifest"
                              size="small"
                              color="success"
                              sx={{ fontWeight: 600 }}
                            />
                          )}
                        </Box>

                        {/* Filename */}
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 600,
                            mb: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={doc.original_filename}
                        >
                          {doc.original_filename}
                        </Typography>

                        {/* Document Type */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Chip
                            label={doc.document_type.replace(/_/g, ' ').toUpperCase()}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        </Box>

                        {/* File Details */}
                        <Box sx={{ flex: 1, mb: 2 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            Size: {(doc.file_size_bytes / 1024).toFixed(2)} KB
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {new Date(doc.created_at).toLocaleDateString()} {new Date(doc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Box>

                        {/* Actions */}
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            fullWidth
                            variant="contained"
                            startIcon={<DownloadIcon />}
                            onClick={() => handleDownloadDocument(doc)}
                            sx={{
                              bgcolor: '#1976d2',
                              '&:hover': { bgcolor: '#1565c0' }
                            }}
                          >
                            Download
                          </Button>
                          {doc.source === 'manifest' && (
                            <IconButton
                              color="error"
                              onClick={() => handleDeleteDocument(doc)}
                              sx={{
                                border: '1px solid',
                                borderColor: 'error.main',
                                '&:hover': { bgcolor: 'error.light' }
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
                </Grid>
              </Box>
            )}
            </Paper>
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
