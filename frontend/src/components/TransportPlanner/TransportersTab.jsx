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
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Business as TransporterIcon,
} from '@mui/icons-material';

export default function TransportersTab() {
  const [transporters, setTransporters] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
  });

  useEffect(() => {
    fetchTransporters();
  }, []);

  const fetchTransporters = async () => {
    try {
      // TODO: Create API endpoint for transporters
      // For now, use dummy data
      setTransporters([
        {
          id: 1,
          name: 'ABC Transport',
          contact_person: 'John Doe',
          phone: '083 123 4567',
          email: 'john@abctransport.co.za',
          address: '123 Main St, Johannesburg',
        },
        {
          id: 2,
          name: 'XYZ Logistics',
          contact_person: 'Jane Smith',
          phone: '082 987 6543',
          email: 'jane@xyzlogistics.co.za',
          address: '456 Industrial Rd, Pretoria',
        },
      ]);
    } catch (error) {
      console.error('Error fetching transporters:', error);
    }
  };

  const handleAddNew = () => {
    setEditMode(false);
    setFormData({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
    });
    setDialogOpen(true);
  };

  const handleEdit = (transporter) => {
    setEditMode(true);
    setFormData(transporter);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      // TODO: Create API endpoint to save transporter
      alert('Transporter saved successfully!');
      setDialogOpen(false);
      fetchTransporters();
    } catch (error) {
      console.error('Error saving transporter:', error);
      alert('Failed to save transporter');
    }
  };

  if (transporters.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <TransporterIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          No transporters registered
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
          sx={{
            bgcolor: '#38b2ac',
            '&:hover': { bgcolor: '#2c9a8f' },
          }}
        >
          Add Transporter
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Registered Transporters ({transporters.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
          sx={{
            bgcolor: '#38b2ac',
            '&:hover': { bgcolor: '#2c9a8f' },
          }}
        >
          Add Transporter
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f5f5f5' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Company Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Contact Person</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Address</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transporters.map((transporter) => (
              <TableRow key={transporter.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{transporter.name}</TableCell>
                <TableCell>{transporter.contact_person}</TableCell>
                <TableCell>{transporter.phone}</TableCell>
                <TableCell>{transporter.email}</TableCell>
                <TableCell>{transporter.address}</TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleEdit(transporter)}
                    sx={{ color: '#38b2ac' }}
                  >
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#001f3f', color: 'white', fontWeight: 600 }}>
          {editMode ? 'Edit Transporter' : 'Add New Transporter'}
        </DialogTitle>
        <DialogContent sx={{ pt: '32px' }}>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField
                label="Company Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Contact Person"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '2px solid #001f3f' }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: '#001f3f' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.name || !formData.contact_person || !formData.phone}
            sx={{
              bgcolor: '#38b2ac',
              '&:hover': { bgcolor: '#2c9a8f' },
            }}
          >
            {editMode ? 'Update' : 'Add'} Transporter
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
