import { useState } from 'react';
import {
  Fab,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
} from '@mui/material';
import {
  AccountCircle as ProfileIcon,
  PersonOutline as KeyAccountIcon,
  LocalShipping as TransportPlannerIcon,
  Warehouse as WarehouseIcon,
  AdminPanelSettings as AdminIcon,
  SwapHoriz as SwitchIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const profiles = [
  {
    role: 'admin',
    label: 'Admin',
    icon: AdminIcon,
    color: '#e91e63',
    route: '/',
  },
  {
    role: 'key_account_manager',
    label: 'Key Account Manager',
    icon: KeyAccountIcon,
    color: '#38b2ac',
    route: '/',
  },
  {
    role: 'transport_planner',
    label: 'Transport Planner',
    icon: TransportPlannerIcon,
    color: '#ff9800',
    route: '/transport-planner',
  },
  {
    role: 'warehouse_manager',
    label: 'Warehouse Manager',
    icon: WarehouseIcon,
    color: '#2196f3',
    route: '/',
  },
];

export default function ProfileSwitcher() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentProfile, setCurrentProfile] = useState('key_account_manager');
  const navigate = useNavigate();

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSwitchProfile = (profile) => {
    setCurrentProfile(profile.role);
    localStorage.setItem('test_profile', profile.role);
    handleClose();
    navigate(profile.route);
    // Optionally reload to apply profile changes
    window.location.href = profile.route;
  };

  const getCurrentProfileData = () => {
    return profiles.find(p => p.role === currentProfile) || profiles[1];
  };

  const currentProfileData = getCurrentProfileData();
  const CurrentIcon = currentProfileData.icon;

  return (
    <>
      <Fab
        color="primary"
        aria-label="switch profile"
        onClick={handleOpen}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          bgcolor: currentProfileData.color,
          '&:hover': {
            bgcolor: currentProfileData.color,
            opacity: 0.9,
          },
          zIndex: 1000,
        }}
      >
        <CurrentIcon />
      </Fab>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            minWidth: 250,
            maxWidth: 300,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5, bgcolor: '#f5f5f5' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            TEST MODE - SWITCH PROFILE
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
            Current: {currentProfileData.label}
          </Typography>
        </Box>

        <Divider />

        {profiles.map((profile) => {
          const Icon = profile.icon;
          const isActive = profile.role === currentProfile;

          return (
            <MenuItem
              key={profile.role}
              onClick={() => handleSwitchProfile(profile)}
              selected={isActive}
              sx={{
                py: 1.5,
                bgcolor: isActive ? `${profile.color}15` : 'transparent',
                '&:hover': {
                  bgcolor: `${profile.color}25`,
                },
              }}
            >
              <ListItemIcon>
                <Icon sx={{ color: profile.color }} />
              </ListItemIcon>
              <ListItemText
                primary={profile.label}
                secondary={profile.role.replace(/_/g, ' ').toUpperCase()}
                secondaryTypographyProps={{
                  variant: 'caption',
                  sx: { textTransform: 'uppercase', fontSize: '0.65rem' },
                }}
              />
              {isActive && (
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: profile.color,
                    ml: 1,
                  }}
                />
              )}
            </MenuItem>
          );
        })}

        <Divider />

        <Box sx={{ px: 2, py: 1, bgcolor: '#f5f5f5' }}>
          <Typography variant="caption" color="text.secondary">
            💡 This is for testing only and will be removed in production
          </Typography>
        </Box>
      </Menu>
    </>
  );
}
