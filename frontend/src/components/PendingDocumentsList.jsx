import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Description as DocIcon,
} from '@mui/icons-material';
import { pendingDocumentService } from '../services/pendingDocumentService';
import InvoiceDetailView from './InvoiceDetailView';
import { prepareInvoiceFromClassifiedDocs } from '../utils/invoiceFieldMapper';

export default function PendingDocumentsList({ onAcknowledge }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadPending = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await pendingDocumentService.getAll();
      setPending(data.data || []);
    } catch (err) {
      setError('Failed to load pending documents: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleAcknowledge = async (doc) => {
    try {
      setProcessing(true);
      setError(null);
      await pendingDocumentService.acknowledge(doc.id);
      if (onAcknowledge) onAcknowledge();
      loadPending(); // Refresh list
    } catch (err) {
      setError('Failed to acknowledge document: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectDialogOpen || !rejectReason.trim()) return;

    try {
      setProcessing(true);
      setError(null);
      await pendingDocumentService.reject(rejectDialogOpen.id, rejectReason);
      setRejectDialogOpen(null);
      setRejectReason('');
      loadPending(); // Refresh list
    } catch (err) {
      setError('Failed to reject document: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Helper function to prepare invoice data for InvoiceDetailView
  // Uses the flexible field mapper to handle different invoice template formats
  const prepareInvoiceData = prepareInvoiceFromClassifiedDocs;

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

  if (pending.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No pending documents to review
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Upload new documents to see them here for review
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#001f3f' }}>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Invoice #</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Supplier</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Customer</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Amount</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Documents</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Date</TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pending.map((doc) => {
              const classifiedDocs = typeof doc.classified_documents === 'string'
                ? JSON.parse(doc.classified_documents)
                : (doc.classified_documents || []);
              const docTypes = classifiedDocs.map(d => d.document_type).join(', ');

              return (
                <TableRow
                  key={doc.id}
                  hover
                  sx={{
                    '&:nth-of-type(odd)': { bgcolor: '#e6f9f5' },
                    '&:hover': { bgcolor: '#d0f2ea !important' }
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#001f3f' }}>
                      {doc.invoice_number}
                    </Typography>
                  </TableCell>
                  <TableCell>{doc.supplier_name}</TableCell>
                  <TableCell>{doc.customer_name}</TableCell>
                  <TableCell>
                    {doc.currency} {parseFloat(doc.total_amount).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {classifiedDocs.map((d, idx) => (
                        <Chip
                          key={idx}
                          label={d.document_type}
                          size="small"
                          icon={<DocIcon />}
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {new Date(doc.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{
                        mr: 1,
                        borderColor: '#001f3f',
                        color: '#001f3f',
                        '&:hover': {
                          borderColor: '#001f3f',
                          bgcolor: '#e6f9f5'
                        }
                      }}
                      onClick={() => setSelectedDoc(doc)}
                    >
                      Review
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<CheckIcon />}
                      onClick={() => handleAcknowledge(doc)}
                      disabled={processing}
                      sx={{
                        bgcolor: '#73e9c7',
                        color: '#001f3f',
                        '&:hover': {
                          bgcolor: '#5fd4b3'
                        }
                      }}
                    >
                      Acknowledge
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={() => setRejectDialogOpen(doc)}
                      disabled={processing}
                      sx={{ ml: 1 }}
                    >
                      Reject
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Review Dialog */}
      <Dialog
        open={Boolean(selectedDoc)}
        onClose={() => setSelectedDoc(null)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#001f3f', color: 'white', fontWeight: 600 }}>
          Review Extracted Data - {selectedDoc?.invoice_number}
        </DialogTitle>
        <DialogContent>
          {selectedDoc && (
            <Box sx={{ mt: 2 }}>
              <InvoiceDetailView
                invoice={prepareInvoiceData(selectedDoc)}
                mode="readonly"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '2px solid #001f3f' }}>
          <Button
            onClick={() => setSelectedDoc(null)}
            sx={{
              borderColor: '#001f3f',
              color: '#001f3f',
              '&:hover': {
                borderColor: '#001f3f',
                bgcolor: '#e6f9f5'
              }
            }}
          >
            Close
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckIcon />}
            onClick={() => {
              handleAcknowledge(selectedDoc);
              setSelectedDoc(null);
            }}
            disabled={processing}
            sx={{
              bgcolor: '#73e9c7',
              color: '#001f3f',
              '&:hover': {
                bgcolor: '#5fd4b3'
              }
            }}
          >
            Acknowledge
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            onClick={() => {
              setRejectDialogOpen(selectedDoc);
              setSelectedDoc(null);
            }}
            disabled={processing}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={Boolean(rejectDialogOpen)}
        onClose={() => setRejectDialogOpen(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#001f3f', color: 'white', fontWeight: 600 }}>
          Reject Document
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Rejection Reason"
            fullWidth
            multiline
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: '#001f3f',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#73e9c7',
                },
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#001f3f',
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '2px solid #001f3f' }}>
          <Button
            onClick={() => setRejectDialogOpen(null)}
            sx={{
              borderColor: '#001f3f',
              color: '#001f3f',
              '&:hover': {
                borderColor: '#001f3f',
                bgcolor: '#e6f9f5'
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReject}
            variant="contained"
            disabled={!rejectReason.trim() || processing}
            sx={{
              bgcolor: '#dc3545',
              color: 'white',
              '&:hover': {
                bgcolor: '#bb2d3b'
              }
            }}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
