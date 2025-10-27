import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Select,
  InputLabel,
  FormControl,
  MenuItem,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  CloudUpload as CloudUploadIcon,
  FilterList as FilterListIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import PurchaseOrderUploadDialog from './PurchaseOrderUploadDialog';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const PurchaseOrderList = () => {
  const navigate = useNavigate();
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [usageFilter, setUsageFilter] = useState('all');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [orderBy, setOrderBy] = useState('invoice_number');
  const [order, setOrder] = useState('desc');

  useEffect(() => {
    fetchPOs();
  }, []);

  const fetchPOs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/purchase-orders`);
      setPOs(response.data.data || []);
    } catch (err) {
      console.error('Error fetching POs:', err);
      setError('Failed to load Purchase Orders');
    } finally {
      setLoading(false);
    }
  };

  const getUsageColor = (usageColor) => {
    switch (usageColor) {
      case 'success':
        return { bgcolor: '#e8f5e9', color: '#2e7d32', label: 'Good' };
      case 'warning':
        return { bgcolor: '#fff9c4', color: '#f57c00', label: 'Monitor' };
      case 'danger':
        return { bgcolor: '#ffebee', color: '#c62828', label: 'Critical' };
      default:
        return { bgcolor: '#f5f5f5', color: '#666', label: 'N/A' };
    }
  };

  // Sorting function
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const getComparatorValue = (po, property) => {
    switch (property) {
      case 'invoice_number':
        return po.invoice_number || '';
      case 'invoice_date':
        return po.invoice_date || '';
      case 'customer':
        return po.customer?.name || '';
      case 'customer_reference':
        return po.customer_reference || '';
      case 'end_user':
        return po.end_user || '';
      case 'po_budget_amount':
        return parseFloat(po.po_budget_amount) || 0;
      case 'usage_percentage':
        return po.usage_percentage || 0;
      default:
        return po[property] || '';
    }
  };

  const filteredAndSortedPOs = pos.filter(po => {
    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch = (
        po.invoice_number?.toLowerCase().includes(search) ||
        po.customer_reference?.toLowerCase().includes(search) ||
        po.end_user?.toLowerCase().includes(search) ||
        po.customer_account_code?.toLowerCase().includes(search) ||
        po.customer?.name?.toLowerCase().includes(search)
      );
      if (!matchesSearch) return false;
    }

    // Apply usage filter
    if (usageFilter !== 'all') {
      if (usageFilter === 'over_budget' && po.usage_percentage <= 100) return false;
      if (usageFilter === 'success' && po.usage_color !== 'success') return false;
      if (usageFilter === 'warning' && po.usage_color !== 'warning') return false;
      if (usageFilter === 'danger' && po.usage_color !== 'danger') return false;
    }

    return true;
  }).sort((a, b) => {
    const aValue = getComparatorValue(a, orderBy);
    const bValue = getComparatorValue(b, orderBy);

    if (aValue < bValue) {
      return order === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return order === 'asc' ? 1 : -1;
    }
    return 0;
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
      <Box sx={{ p: 3, overflow: 'auto', flex: 1 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Purchase Orders
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchPOs}
            variant="outlined"
          >
            Refresh
          </Button>
          <Button
            startIcon={<CloudUploadIcon />}
            variant="contained"
            onClick={() => setUploadDialogOpen(true)}
            sx={{ bgcolor: '#73e9c7', color: '#001f3f', '&:hover': { bgcolor: '#5fd4b3' } }}
          >
            Upload PO
          </Button>
        </Box>
      </Box>

      {/* Compact Filter Section */}
      <Paper sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search by PO number, reference, customer, end user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 350, bgcolor: 'white' }}
          />
          <FormControl size="small" sx={{ minWidth: 180, bgcolor: 'white' }}>
            <InputLabel>Usage Status</InputLabel>
            <Select
              value={usageFilter}
              onChange={(e) => setUsageFilter(e.target.value)}
              label="Usage Status"
              startAdornment={
                <InputAdornment position="start">
                  <FilterListIcon fontSize="small" />
                </InputAdornment>
              }
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="success">Healthy (Green)</MenuItem>
              <MenuItem value="warning">Monitor (Yellow)</MenuItem>
              <MenuItem value="danger">Critical (Red)</MenuItem>
              <MenuItem value="over_budget">Over Budget</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            Showing {filteredAndSortedPOs.length} of {pos.length} purchase orders
          </Typography>
        </Box>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* PO Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#001f3f' }}>
              <TableCell
                sx={{ color: 'white', fontWeight: 'bold', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleRequestSort('invoice_number')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  PO Number
                  {orderBy === 'invoice_number' && (
                    order === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell
                sx={{ color: 'white', fontWeight: 'bold', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleRequestSort('invoice_date')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Date
                  {orderBy === 'invoice_date' && (
                    order === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell
                sx={{ color: 'white', fontWeight: 'bold', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleRequestSort('customer')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Customer
                  {orderBy === 'customer' && (
                    order === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell
                sx={{ color: 'white', fontWeight: 'bold', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleRequestSort('customer_reference')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Reference
                  {orderBy === 'customer_reference' && (
                    order === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell
                sx={{ color: 'white', fontWeight: 'bold', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleRequestSort('end_user')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  End User
                  {orderBy === 'end_user' && (
                    order === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell
                sx={{ color: 'white', fontWeight: 'bold', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleRequestSort('po_budget_amount')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Budget
                  {orderBy === 'po_budget_amount' && (
                    order === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell
                sx={{ color: 'white', fontWeight: 'bold', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleRequestSort('usage_percentage')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Usage
                  {orderBy === 'usage_percentage' && (
                    order === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Invoices</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndSortedPOs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                  <Typography variant="h6" color="textSecondary">
                    {searchTerm ? 'No POs found matching your search' : 'No Purchase Orders yet'}
                  </Typography>
                  <Button
                    startIcon={<CloudUploadIcon />}
                    variant="contained"
                    onClick={() => setUploadDialogOpen(true)}
                    sx={{ mt: 2, bgcolor: '#73e9c7', color: '#001f3f' }}
                  >
                    Upload First PO
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedPOs.map((po) => {
                const usageStyle = getUsageColor(po.usage_color);
                const usagePercentage = po.usage_percentage || 0;

                return (
                  <TableRow key={po.id} hover>
                    <TableCell>
                      <Typography fontWeight="bold">{po.invoice_number}</Typography>
                    </TableCell>
                    <TableCell>
                      {po.invoice_date ? new Date(po.invoice_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{po.customer?.name || '-'}</Typography>
                      {po.customer_account_code && (
                        <Typography variant="caption" color="textSecondary">
                          {po.customer_account_code}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {po.customer_reference || '-'}
                      {po.rfq_number && (
                        <Typography variant="caption" display="block" color="textSecondary">
                          RFQ: {po.rfq_number}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{po.end_user || '-'}</TableCell>
                    <TableCell>
                      <Typography fontWeight="bold">
                        {po.currency} {parseFloat(po.po_budget_amount).toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Remaining: {po.currency} {parseFloat(po.remaining_budget).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${usagePercentage.toFixed(1)}%`}
                        size="small"
                        sx={{
                          bgcolor: usageStyle.bgcolor,
                          color: usageStyle.color,
                          fontWeight: 'bold',
                          minWidth: 80
                        }}
                      />
                      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                        {usageStyle.label}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {po.requires_intervention && (
                        <Chip label="⚠️ Review" size="small" color="warning" />
                      )}
                      {po.usage_percentage > 100 && (
                        <Chip label="Over Budget" size="small" color="error" />
                      )}
                      {po.usage_percentage === 0 && (
                        <Chip label="New" size="small" color="success" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {po.linked_invoices_count} invoices
                      </Typography>
                      {po.linked_licenses_count > 0 && (
                        <Typography variant="caption" color="textSecondary">
                          {po.linked_licenses_count} licenses
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/purchase-orders/${po.id}`)}
                          sx={{ color: '#001f3f' }}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Summary Stats */}
      {filteredAndSortedPOs.length > 0 && (
        <Box mt={3} display="flex" gap={3}>
          <Paper sx={{ p: 2, flex: 1, textAlign: 'center' }}>
            <Typography variant="h4" color="primary">{filteredAndSortedPOs.length}</Typography>
            <Typography variant="caption" color="textSecondary">Total POs</Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1, textAlign: 'center', bgcolor: '#e8f5e9' }}>
            <Typography variant="h4" color="success.main">
              {filteredAndSortedPOs.filter(po => po.usage_color === 'success').length}
            </Typography>
            <Typography variant="caption">Healthy</Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1, textAlign: 'center', bgcolor: '#fff9c4' }}>
            <Typography variant="h4" color="warning.main">
              {filteredAndSortedPOs.filter(po => po.usage_color === 'warning').length}
            </Typography>
            <Typography variant="caption">Monitor</Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1, textAlign: 'center', bgcolor: '#ffebee' }}>
            <Typography variant="h4" color="error.main">
              {filteredAndSortedPOs.filter(po => po.usage_color === 'danger').length}
            </Typography>
            <Typography variant="caption">Critical</Typography>
          </Paper>
        </Box>
      )}

      {/* Upload Dialog */}
      <PurchaseOrderUploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onSuccess={() => {
          fetchPOs(); // Refresh the list after successful upload
          setUploadDialogOpen(false);
        }}
      />
      </Box>
  );
};

export default PurchaseOrderList;
