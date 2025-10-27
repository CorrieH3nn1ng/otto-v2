import { useState } from 'react';
import { Box, AppBar, Toolbar, Typography, Tooltip, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate, useLocation } from 'react-router-dom';
import OttoChatbot from './OttoChatbot';

const GradientAppBar = styled(AppBar)(({ theme }) => ({
  background: 'linear-gradient(315deg, #73e9c7 0%, #38b2ac 100%)',
}));

const LogoContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '20px',
  cursor: 'pointer',
  transition: 'transform 0.2s',
  '&:hover': {
    transform: 'scale(1.05)',
  },
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
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navButtons = [
    { label: 'Dashboard', path: '/', icon: '📊' },
    { label: 'Purchase Orders', path: '/purchase-orders', icon: '📋' },
  ];

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
          <Tooltip title="Click to chat with OTTO AI Assistant" arrow>
            <LogoContainer sx={{ flex: 1 }} onClick={() => setChatbotOpen(true)}>
              <img
                src="/nucleusmlsmall_1.gif"
                alt="Nucleus Mining Logistics"
                style={{ height: '50px', marginRight: '15px' }}
              />
              <Logo variant="h1">
                🚛 OTTO
              </Logo>
              <Tagline variant="subtitle1">
                Logistics on Autopilot
              </Tagline>
            </LogoContainer>
          </Tooltip>

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', gap: 2, mr: 3 }}>
            {navButtons.map((btn) => (
              <Button
                key={btn.path}
                onClick={() => navigate(btn.path)}
                sx={{
                  color: 'white',
                  fontWeight: location.pathname === btn.path ? 700 : 500,
                  textTransform: 'none',
                  fontSize: '14px',
                  borderBottom: location.pathname === btn.path ? '3px solid white' : '3px solid transparent',
                  borderRadius: 0,
                  px: 2,
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.15)',
                    borderBottom: '3px solid white',
                  }
                }}
              >
                {btn.icon} {btn.label}
              </Button>
            ))}
          </Box>

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

      {/* OTTO Chatbot Modal */}
      <OttoChatbot open={chatbotOpen} onClose={() => setChatbotOpen(false)} />
    </Box>
  );
}
