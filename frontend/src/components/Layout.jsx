import { Box, AppBar, Toolbar, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const GradientAppBar = styled(AppBar)(({ theme }) => ({
  background: 'linear-gradient(315deg, #73e9c7 0%, #38b2ac 100%)',
}));

const LogoContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '20px',
});

const Logo = styled(Typography)({
  fontSize: '32px',
  fontWeight: 800,
  letterSpacing: '-1px',
  color: 'white',
});

const Tagline = styled(Typography)({
  fontSize: '14px',
  opacity: 0.95,
  fontStyle: 'italic',
  color: 'white',
  marginLeft: '8px',
});

const POCBadge = styled(Box)({
  background: 'rgba(255,255,255,0.25)',
  padding: '8px 16px',
  borderRadius: '25px',
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '1px',
  color: 'white',
});

export default function Layout({ children }) {
  return (
    <Box sx={{
      height: '100vh',
      width: '100%',
      background: 'linear-gradient(135deg, #73e9c7 0%, #38b2ac 100%)',
      m: 0,
      p: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <GradientAppBar position="static" elevation={0}>
        <Toolbar sx={{ py: 1.5, px: 3 }}>
          <LogoContainer sx={{ flex: 1 }}>
            <Logo variant="h1">
              🚛 OTTO
            </Logo>
            <Tagline variant="subtitle1">
              Logistics on Autopilot
            </Tagline>
          </LogoContainer>
          <POCBadge>
            PRODUCTION V2
          </POCBadge>
        </Toolbar>
      </GradientAppBar>

      <Box sx={{ p: 2, flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Box
          sx={{
            width: '100%',
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
