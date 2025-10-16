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
  Typography,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  LocalShipping as TruckIcon,
  Print as PrintIcon,
  Email as EmailIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { loadConfirmationService } from '../../services/loadConfirmationService';

export default function ActiveLoadsTab() {
  const [activeLoads, setActiveLoads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveLoads();
  }, []);

  const fetchActiveLoads = async () => {
    try {
      setLoading(true);
      const data = await loadConfirmationService.getActive();
      setActiveLoads(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching active loads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (load) => {
    // Navigate to load confirmation details
    window.open(`/load-confirmations/${load.id}`, '_blank');
  };

  const handlePrint = (load) => {
    // Open print view in new window
    window.open(`/load-confirmations/${load.id}/print`, '_blank');
  };

  const handleEmail = async (load) => {
    if (!load.transporter?.email && !confirm('No email address found for this transporter. Do you want to enter one manually?')) {
      return;
    }

    const email = load.transporter?.email || prompt('Enter transporter email address:');
    if (!email) return;

    try {
      const result = await loadConfirmationService.emailLoadConfirmation(load.id, email);
      alert(result.message || 'Email sent successfully!');
      fetchActiveLoads(); // Refresh to show updated status
    } catch (error) {
      console.error('Error sending email:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to send email';
      alert(`Error: ${errorMsg}`);
    }
  };

  if (loading) {
    return <Typography>Loading active loads...</Typography>;
  }

  if (activeLoads.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <TruckIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No active loads
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Assigned transports will appear here
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Active Loads ({activeLoads.length})
      </Typography>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f5f5f5' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>File Reference</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Confirmation Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Collection Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Transporter</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Vehicle</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Truck Reg</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Driver</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activeLoads.map((load) => (
              <TableRow key={load.id} hover>
                <TableCell>{load.file_reference}</TableCell>
                <TableCell>
                  {load.confirmation_date ? new Date(load.confirmation_date).toLocaleDateString() : 'N/A'}
                </TableCell>
                <TableCell>
                  {load.collection_date ? new Date(load.collection_date).toLocaleDateString() : 'N/A'}
                </TableCell>
                <TableCell>{load.transporter_name || 'N/A'}</TableCell>
                <TableCell>{load.vehicle_type || 'N/A'}</TableCell>
                <TableCell>{load.truck_registration || 'N/A'}</TableCell>
                <TableCell>{load.attention || 'N/A'}</TableCell>
                <TableCell>
                  <Chip
                    label="Confirmed"
                    size="small"
                    sx={{
                      bgcolor: '#4caf50',
                      color: 'white',
                      fontWeight: 600,
                    }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetails(load)}
                        sx={{ color: '#001f3f' }}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Print PDF">
                      <IconButton
                        size="small"
                        onClick={() => handlePrint(load)}
                        sx={{ color: '#38b2ac' }}
                      >
                        <PrintIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Email to Transporter">
                      <IconButton
                        size="small"
                        onClick={() => handleEmail(load)}
                        sx={{ color: '#38b2ac' }}
                      >
                        <EmailIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
