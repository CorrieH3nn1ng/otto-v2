import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Autocomplete,
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { loadConfirmationService } from '../services/loadConfirmationService';
import { agentService } from '../services/agentService';
import { vehicleTypes } from '../config/vehicleTypes';
import axios from 'axios';

export default function LoadConfirmationForm({ onSuccess, onCancel, initialData = null, invoice = null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transporters, setTransporters] = useState([]);
  const [agents, setAgents] = useState([]);
  const isEditMode = !!initialData;

  const [formData, setFormData] = useState({
    file_reference: '',
    confirmation_date: new Date().toISOString().split('T')[0],
    collection_date: '',
    transporter_id: '',
    transporter_name: '',
    attention: '',
    contact_details: '',
    vehicle_type: '',
    truck_registration: '',
    trailer_1_registration: '',
    trailer_2_registration: '',
    clearing_agent: '',
    entry_agent: [], // Changed to array for multi-select
    collection_address: '',
    collection_address_2: '',
    delivery_address: '',
    commodity_description: '',
    contact_for_nucleus_drc: '',
    straps: false,
    chains: false,
    tarpaulin: false,
    corner_plates: false,
    uprights: false,
    rubber_protection: false,
  });

  // Load transporters and agents
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch transporters
        const transportersResponse = await axios.get('http://localhost:8000/api/transporters');
        setTransporters(transportersResponse.data || []);

        // Fetch agents
        const agentsData = await agentService.getAll();
        setAgents(agentsData || []);
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };
    fetchData();
  }, []);

  // Pre-populate agent fields from invoice when creating a new load confirmation
  useEffect(() => {
    if (invoice && !initialData) {
      // Parse entry_agent - could be string with / or , separators, or array
      let entryAgents = [];
      if (invoice.entry_agent) {
        if (Array.isArray(invoice.entry_agent)) {
          entryAgents = invoice.entry_agent;
        } else if (typeof invoice.entry_agent === 'string') {
          // Split by / or , and trim whitespace
          entryAgents = invoice.entry_agent.split(/[/,]/).map(a => a.trim()).filter(a => a);
        }
      }

      setFormData(prev => ({
        ...prev,
        clearing_agent: invoice.exit_agent || prev.clearing_agent,
        entry_agent: entryAgents.length > 0 ? entryAgents : prev.entry_agent,
      }));
    }
  }, [invoice, initialData]);

  // Populate form data when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      // Parse entry_agent - could be string with / or , separators, or array
      let entryAgents = [];
      if (initialData.entry_agent) {
        if (Array.isArray(initialData.entry_agent)) {
          entryAgents = initialData.entry_agent;
        } else if (typeof initialData.entry_agent === 'string') {
          // Split by / or , and trim whitespace
          entryAgents = initialData.entry_agent.split(/[/,]/).map(a => a.trim()).filter(a => a);
        }
      }

      setFormData({
        file_reference: initialData.file_reference || '',
        confirmation_date: initialData.confirmation_date ? initialData.confirmation_date.split('T')[0] : new Date().toISOString().split('T')[0],
        collection_date: initialData.collection_date ? initialData.collection_date.split('T')[0] : '',
        transporter_id: initialData.transporter_id || '',
        transporter_name: initialData.transporter_name || '',
        attention: initialData.attention || '',
        contact_details: initialData.contact_details || '',
        vehicle_type: initialData.vehicle_type || '',
        truck_registration: initialData.truck_registration || '',
        trailer_1_registration: initialData.trailer_1_registration || '',
        trailer_2_registration: initialData.trailer_2_registration || '',
        clearing_agent: initialData.clearing_agent || '',
        entry_agent: entryAgents,
        collection_address: initialData.collection_address || '',
        collection_address_2: initialData.collection_address_2 || '',
        delivery_address: initialData.delivery_address || '',
        commodity_description: initialData.commodity_description || '',
        contact_for_nucleus_drc: initialData.contact_for_nucleus_drc || '',
        straps: initialData.straps || false,
        chains: initialData.chains || false,
        tarpaulin: initialData.tarpaulin || false,
        corner_plates: initialData.corner_plates || false,
        uprights: initialData.uprights || false,
        rubber_protection: initialData.rubber_protection || false,
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTransporterChange = (e) => {
    const transporterId = e.target.value;
    const selectedTransporter = transporters.find(t => t.id === parseInt(transporterId));
    setFormData(prev => ({
      ...prev,
      transporter_id: transporterId,
      transporter_name: selectedTransporter ? selectedTransporter.company_name : ''
    }));
  };

  const handleFileReferenceChange = (e) => {
    const cleanValue = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    setFormData(prev => ({ ...prev, file_reference: cleanValue }));
  };

  const handleCheckboxClick = (field) => {
    setFormData(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Convert entry_agent array to comma-separated string for backend
      const submitData = {
        ...formData,
        entry_agent: Array.isArray(formData.entry_agent)
          ? formData.entry_agent.join(', ')
          : formData.entry_agent
      };

      const response = isEditMode
        ? await loadConfirmationService.update(initialData.id, submitData)
        : await loadConfirmationService.create(submitData);
      if (onSuccess) {
        onSuccess(response);
      }
    } catch (err) {
      const action = isEditMode ? 'update' : 'create';
      setError(err.response?.data?.message || err.message || `Failed to ${action} load confirmation`);
    } finally {
      setLoading(false);
    }
  };

  // Shared styles matching old OTTO
  const sectionHeaderStyle = {
    backgroundColor: '#001f3f',
    color: 'white',
    p: 1.5,
    fontWeight: 600,
    fontSize: '0.875rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const tableCellHeaderStyle = {
    backgroundColor: '#001f3f',
    color: 'white',
    p: 1,
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    border: '1px solid #cbd5e1',
  };

  const tableCellStyle = {
    p: 1,
    border: '1px solid #cbd5e1',
  };

  const inputStyle = {
    '& .MuiOutlinedInput-root': {
      backgroundColor: 'white',
      fontSize: '0.875rem',
    },
    '& .MuiInputLabel-root': {
      fontSize: '0.875rem',
    },
  };

  return (
    <Box sx={{ maxHeight: '80vh', overflow: 'auto' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Paper elevation={3} sx={{ border: '2px solid #000', overflow: 'hidden' }}>
          {/* Main Title */}
          <Box sx={{ backgroundColor: '#001f3f', color: 'white', p: 2, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, letterSpacing: '1px' }}>
              VEHICLE BOOKING CONFIRMATION FORM
            </Typography>
          </Box>

          {/* File Reference & Date */}
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell sx={tableCellHeaderStyle}>FILE REF #:</TableCell>
                <TableCell sx={tableCellStyle}>
                  <TextField
                    fullWidth
                    required
                    name="file_reference"
                    value={formData.file_reference}
                    onChange={handleFileReferenceChange}
                    placeholder="S00######"
                    size="small"
                    sx={inputStyle}
                  />
                </TableCell>
                <TableCell sx={tableCellHeaderStyle}>DATE:</TableCell>
                <TableCell sx={tableCellStyle}>
                  <TextField
                    fullWidth
                    required
                    type="date"
                    name="confirmation_date"
                    value={formData.confirmation_date}
                    onChange={handleChange}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={inputStyle}
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* Transporter Information */}
          <Box sx={sectionHeaderStyle}>TRANSPORTER</Box>
          <Table size="small">
            <TableBody>
              {/* Header Row */}
              <TableRow>
                <TableCell sx={{ ...tableCellHeaderStyle, width: '20%' }}>TRANSPORTER</TableCell>
                <TableCell sx={{ ...tableCellHeaderStyle, width: '20%' }}>ATTENTION</TableCell>
                <TableCell sx={{ ...tableCellHeaderStyle, width: '20%' }}>CONTACT DETAILS</TableCell>
                <TableCell sx={{ ...tableCellHeaderStyle, width: '20%' }}>COLLECTION DATE</TableCell>
                <TableCell sx={{ ...tableCellHeaderStyle, width: '20%' }}>VEHICLE TYPE</TableCell>
              </TableRow>
              {/* Input Row */}
              <TableRow>
                <TableCell sx={tableCellStyle}>
                  <FormControl fullWidth required size="small" sx={inputStyle}>
                    <InputLabel>Transporter</InputLabel>
                    <Select
                      name="transporter_id"
                      value={formData.transporter_id}
                      label="Transporter"
                      onChange={handleTransporterChange}
                    >
                      <MenuItem value="">
                        <em>Select Transporter</em>
                      </MenuItem>
                      {transporters.map((t) => (
                        <MenuItem key={t.id} value={t.id}>
                          {t.company_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell sx={tableCellStyle}>
                  <TextField
                    fullWidth
                    name="attention"
                    value={formData.attention}
                    onChange={handleChange}
                    size="small"
                    sx={inputStyle}
                  />
                </TableCell>
                <TableCell sx={tableCellStyle}>
                  <TextField
                    fullWidth
                    name="contact_details"
                    value={formData.contact_details}
                    onChange={handleChange}
                    size="small"
                    sx={inputStyle}
                  />
                </TableCell>
                <TableCell sx={tableCellStyle}>
                  <TextField
                    fullWidth
                    required
                    type="date"
                    name="collection_date"
                    value={formData.collection_date}
                    onChange={handleChange}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={inputStyle}
                  />
                </TableCell>
                <TableCell sx={tableCellStyle}>
                  <FormControl fullWidth size="small" sx={inputStyle}>
                    <InputLabel>Vehicle Type</InputLabel>
                    <Select
                      name="vehicle_type"
                      value={formData.vehicle_type}
                      label="Vehicle Type"
                      onChange={handleChange}
                    >
                      <MenuItem value="">
                        <em>Select Type</em>
                      </MenuItem>
                      {vehicleTypes.map((vehicle) => (
                        <MenuItem key={vehicle.value} value={vehicle.value}>
                          {vehicle.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* Vehicle Registrations */}
          <Table size="small">
            <TableBody>
              {/* Header Row */}
              <TableRow>
                <TableCell sx={{ ...tableCellHeaderStyle, width: '20%' }}>EXIT AGENT</TableCell>
                <TableCell sx={{ ...tableCellHeaderStyle, width: '20%' }}>TRUCK REGISTRATION</TableCell>
                <TableCell sx={{ ...tableCellHeaderStyle, width: '20%' }}>TRAILER 1</TableCell>
                <TableCell sx={{ ...tableCellHeaderStyle, width: '20%' }}>TRAILER 2</TableCell>
                <TableCell sx={{ ...tableCellHeaderStyle, width: '20%' }}>ENTRY AGENT</TableCell>
              </TableRow>
              {/* Input Row */}
              <TableRow>
                <TableCell sx={tableCellStyle}>
                  <Autocomplete
                    freeSolo
                    options={agents.map((agent) => agent.name)}
                    value={formData.clearing_agent || ''}
                    onChange={(event, newValue) => {
                      setFormData(prev => ({ ...prev, clearing_agent: newValue || '' }));
                    }}
                    onInputChange={(event, newInputValue) => {
                      setFormData(prev => ({ ...prev, clearing_agent: newInputValue || '' }));
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Exit Agent"
                        size="small"
                        sx={inputStyle}
                        placeholder="Select or type agent name"
                      />
                    )}
                    size="small"
                  />
                </TableCell>
                <TableCell sx={tableCellStyle}>
                  <TextField
                    fullWidth
                    name="truck_registration"
                    value={formData.truck_registration}
                    onChange={handleChange}
                    size="small"
                    sx={inputStyle}
                  />
                </TableCell>
                <TableCell sx={tableCellStyle}>
                  <TextField
                    fullWidth
                    name="trailer_1_registration"
                    value={formData.trailer_1_registration}
                    onChange={handleChange}
                    size="small"
                    sx={inputStyle}
                  />
                </TableCell>
                <TableCell sx={tableCellStyle}>
                  <TextField
                    fullWidth
                    name="trailer_2_registration"
                    value={formData.trailer_2_registration}
                    onChange={handleChange}
                    size="small"
                    sx={inputStyle}
                  />
                </TableCell>
                <TableCell sx={tableCellStyle}>
                  <Autocomplete
                    multiple
                    freeSolo
                    options={agents.map((agent) => agent.name)}
                    value={formData.entry_agent || []}
                    onChange={(event, newValue) => {
                      setFormData(prev => ({ ...prev, entry_agent: newValue }));
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Entry Agent"
                        size="small"
                        sx={inputStyle}
                        placeholder="Select or type multiple agents"
                      />
                    )}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* Addresses */}
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell sx={tableCellHeaderStyle}>COLLECTION ADDRESS:</TableCell>
                <TableCell sx={tableCellHeaderStyle}>COLLECTION ADDRESS 2:</TableCell>
                <TableCell sx={tableCellHeaderStyle}>DELIVERY ADDRESS:</TableCell>
                <TableCell sx={tableCellHeaderStyle} rowSpan={2}>SPECIAL INSTRUCTIONS:</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={tableCellStyle}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    name="collection_address"
                    value={formData.collection_address}
                    onChange={handleChange}
                    size="small"
                    sx={inputStyle}
                  />
                </TableCell>
                <TableCell sx={tableCellStyle}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    name="collection_address_2"
                    value={formData.collection_address_2}
                    onChange={handleChange}
                    size="small"
                    sx={inputStyle}
                  />
                </TableCell>
                <TableCell sx={tableCellStyle}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    name="delivery_address"
                    value={formData.delivery_address}
                    onChange={handleChange}
                    size="small"
                    sx={inputStyle}
                  />
                </TableCell>
                <TableCell sx={tableCellStyle}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {['straps', 'chains', 'tarpaulin', 'corner_plates', 'uprights', 'rubber_protection'].map((field) => (
                      <Box
                        key={field}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: '#f0f0f0' },
                        }}
                        onClick={() => handleCheckboxClick(field)}
                      >
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            border: '2px solid #38b2ac',
                            borderRadius: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: formData[field] ? '#38b2ac' : 'white',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}
                        >
                          {formData[field] && 'X'}
                        </Box>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem', textTransform: 'capitalize' }}>
                          {field.replace('_', ' ')}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* Commodity */}
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell sx={tableCellHeaderStyle}>Commodity</TableCell>
                <TableCell sx={tableCellHeaderStyle}>NUCLEUS CONTACTS</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={tableCellStyle}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    name="commodity_description"
                    value={formData.commodity_description}
                    onChange={handleChange}
                    size="small"
                    sx={inputStyle}
                  />
                </TableCell>
                <TableCell sx={tableCellStyle}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    name="contact_for_nucleus_drc"
                    value={formData.contact_for_nucleus_drc}
                    onChange={handleChange}
                    size="small"
                    sx={inputStyle}
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* Footer */}
          <Box sx={{ backgroundColor: '#001f3f', color: 'white', p: 1.5, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
              ORIGINAL POD TO BE DELIVERED WITH TRANSPORT INVOICE
            </Typography>
          </Box>
        </Paper>

        {/* Action Buttons */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 2,
          mt: 3,
          pb: 2,
        }}>
          {onCancel && (
            <Button
              variant="outlined"
              onClick={onCancel}
              disabled={loading}
              startIcon={<CloseIcon />}
              sx={{
                borderColor: '#cbd5e1',
                color: '#64748b',
                textTransform: 'none',
                fontWeight: 500,
                '&:hover': {
                  borderColor: '#94a3b8',
                  backgroundColor: '#f8fafc',
                },
              }}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            sx={{
              backgroundColor: '#38b2ac',
              textTransform: 'none',
              fontWeight: 500,
              px: 3,
              '&:hover': {
                backgroundColor: '#2c9a8f',
              },
            }}
          >
            {loading
              ? (isEditMode ? 'Updating...' : 'Creating...')
              : (isEditMode ? 'Update Load Confirmation' : 'Create Load Confirmation')}
          </Button>
        </Box>
      </form>
    </Box>
  );
}
