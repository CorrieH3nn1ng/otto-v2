import { useState } from 'react';
import { Box, Paper, Tabs, Tab } from '@mui/material';
import { LocalShipping as TruckIcon, Assignment as ManifestIcon } from '@mui/icons-material';
import LoadConfirmationList from './LoadConfirmationList';
import ManifestList from './ManifestList';

export default function TransportTabbedView() {
  const [currentTab, setCurrentTab] = useState(0);

  return (
    <Box sx={{ width: '100%' }}>
      <Paper elevation={0} sx={{ borderBottom: '3px solid #e0e0e0', mb: 2 }}>
        <Tabs
          value={currentTab}
          onChange={(e, newValue) => setCurrentTab(newValue)}
          sx={{
            bgcolor: '#ffffff',
            '& .MuiTab-root': {
              fontWeight: 600,
              fontSize: '0.95rem',
              minHeight: 60,
              textTransform: 'none',
              color: '#666',
              '&.Mui-selected': {
                color: '#001f3f'
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#38b2ac',
              height: 4
            }
          }}
        >
          <Tab icon={<TruckIcon />} iconPosition="start" label="Load Confirmations" />
          <Tab icon={<ManifestIcon />} iconPosition="start" label="Manifests" />
        </Tabs>
      </Paper>

      <Box sx={{ mt: 2 }}>
        {currentTab === 0 && <LoadConfirmationList />}
        {currentTab === 1 && <ManifestList />}
      </Box>
    </Box>
  );
}
