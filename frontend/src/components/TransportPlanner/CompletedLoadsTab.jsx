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
} from '@mui/material';
import { CheckCircle as CompletedIcon } from '@mui/icons-material';
import { loadConfirmationService } from '../../services/loadConfirmationService';

export default function CompletedLoadsTab() {
  const [completedLoads, setCompletedLoads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompletedLoads();
  }, []);

  const fetchCompletedLoads = async () => {
    try {
      setLoading(true);
      const data = await loadConfirmationService.getCompleted();
      setCompletedLoads(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching completed loads:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Typography>Loading completed loads...</Typography>;
  }

  if (completedLoads.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <CompletedIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No completed loads
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Completed transports will appear here
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Completed Loads ({completedLoads.length})
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
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {completedLoads.map((load) => (
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
                <TableCell>
                  <Chip
                    label={load.status === 'in_manifest' ? 'In Manifest' : 'Ready for Manifest'}
                    size="small"
                    icon={<CompletedIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      bgcolor: load.status === 'in_manifest' ? '#2196f3' : '#4caf50',
                      color: 'white',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
