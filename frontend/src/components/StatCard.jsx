import { Card, CardContent, Typography, Box } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  transition: 'transform 0.3s, box-shadow 0.3s',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 16px rgba(115,233,199,0.3)',
  },
}));

export default function StatCard({ number, label, icon }) {
  return (
    <StyledCard elevation={0}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        {icon && (
          <Box sx={{ fontSize: '32px' }}>
            {icon}
          </Box>
        )}
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h4"
            sx={{
              fontSize: '24px',
              fontWeight: 900,
              color: '#2d3748',
              lineHeight: 1,
            }}
          >
            {number}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontSize: '11px',
              color: '#4a5568',
              mt: 0.5,
            }}
          >
            {label}
          </Typography>
        </Box>
      </CardContent>
    </StyledCard>
  );
}
