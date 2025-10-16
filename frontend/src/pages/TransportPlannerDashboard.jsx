import { useState } from 'react';
import { Box, Paper, Tabs, Tab, Typography } from '@mui/material';
import {
  PendingActions as PendingIcon,
  LocalShipping as ActiveIcon,
  CheckCircle as CompletedIcon,
  Business as TransportersIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import PendingRequestsTab from '../components/TransportPlanner/PendingRequestsTab';
import ActiveLoadsTab from '../components/TransportPlanner/ActiveLoadsTab';
import CompletedLoadsTab from '../components/TransportPlanner/CompletedLoadsTab';
import TransportersTab from '../components/TransportPlanner/TransportersTab';

export default function TransportPlannerDashboard() {
  const [currentTab, setCurrentTab] = useState(0);

  return (
    <Layout>
      <Box sx={{ flex: 1, p: 2.5, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#2d3748', mb: 0.5 }}>
            🚛 Transport Planner Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage transport requests, assign vehicles, and coordinate deliveries
          </Typography>
        </Box>

        <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ borderBottom: '3px solid #e0e0e0' }}>
            <Tabs
              value={currentTab}
              onChange={(e, newValue) => setCurrentTab(newValue)}
              sx={{
                bgcolor: '#ffffff',
                '& .MuiTab-root': {
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  minHeight: 64,
                  textTransform: 'none',
                  color: '#666',
                  '&.Mui-selected': {
                    color: '#001f3f',
                  },
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#38b2ac',
                  height: 4,
                },
              }}
            >
              <Tab icon={<PendingIcon />} iconPosition="start" label="Pending Requests" />
              <Tab icon={<ActiveIcon />} iconPosition="start" label="Active Loads" />
              <Tab icon={<CompletedIcon />} iconPosition="start" label="Completed" />
              <Tab icon={<TransportersIcon />} iconPosition="start" label="Transporters" />
            </Tabs>
          </Box>

          <Box sx={{ p: 3, flex: 1, overflow: 'auto' }}>
            {currentTab === 0 && <PendingRequestsTab />}
            {currentTab === 1 && <ActiveLoadsTab />}
            {currentTab === 2 && <CompletedLoadsTab />}
            {currentTab === 3 && <TransportersTab />}
          </Box>
        </Paper>
      </Box>
    </Layout>
  );
}
