import { Box, Container, Typography } from '@mui/material';
import ManifestList from '../components/ManifestList';

export default function Manifests() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#001f3f' }}>
          Manifests
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          View and manage all manifests
        </Typography>
      </Box>
      <ManifestList />
    </Container>
  );
}
