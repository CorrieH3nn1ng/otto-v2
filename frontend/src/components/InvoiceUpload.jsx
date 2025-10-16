import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';

export default function InvoiceUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState('invoice');
  const [customerCode, setCustomerCode] = useState('KAMOA');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const documentTypes = [
    { value: 'invoice', label: 'Invoice' },
    { value: 'packing_list', label: 'Packing List' },
    { value: 'qc_certificate', label: 'QC Certificate' },
    { value: 'bv_certificate', label: 'BV Certificate' },
    { value: 'msds', label: 'MSDS' },
    { value: 'delivery_note', label: 'Delivery Note' },
  ];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Please upload a PDF file');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Please upload a PDF file');
      }
    }
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const base64 = await convertToBase64(file);

      const response = await fetch('http://localhost:8000/api/upload/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdf_base64: base64,
          document_type: documentType,
          customer_code: customerCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Invoice ${data.invoice_number} uploaded successfully!`);
        setFile(null);
        if (onUploadSuccess) {
          onUploadSuccess(data);
        }
      } else {
        setError(data.message || 'Upload failed');
      }
    } catch (err) {
      setError('Upload failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        sx={{
          p: 4,
          textAlign: 'center',
          border: dragActive ? '2px dashed #38b2ac' : '2px dashed #e2e8f0',
          backgroundColor: dragActive ? '#f0fdfa' : '#ffffff',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
        }}
      >
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="file-upload"
        />

        <label htmlFor="file-upload">
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <UploadIcon sx={{ fontSize: 60, color: dragActive ? '#38b2ac' : '#cbd5e0' }} />
            <Typography variant="h6" color={dragActive ? 'primary' : 'text.secondary'}>
              {dragActive ? 'Drop PDF here' : 'Drag & drop PDF or click to browse'}
            </Typography>
            {file && (
              <Typography variant="body2" sx={{ color: '#38b2ac', fontWeight: 600 }}>
                Selected: {file.name}
              </Typography>
            )}
          </Box>
        </label>
      </Paper>

      <Box sx={{ mt: 3, display: 'flex', gap: 2, alignItems: 'flex-end' }}>
        <FormControl sx={{ flex: 1 }}>
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

        <FormControl sx={{ flex: 1 }}>
          <InputLabel>Customer Code</InputLabel>
          <Select
            value={customerCode}
            label="Customer Code"
            onChange={(e) => setCustomerCode(e.target.value)}
          >
            <MenuItem value="KAMOA">KAMOA</MenuItem>
            <MenuItem value="DEFAULT">Default</MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!file || loading}
          sx={{
            px: 4,
            py: 1.5,
            backgroundColor: '#38b2ac',
            '&:hover': { backgroundColor: '#2c9a8f' },
          }}
        >
          {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Upload Invoice'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {success}
        </Alert>
      )}
    </Box>
  );
}
