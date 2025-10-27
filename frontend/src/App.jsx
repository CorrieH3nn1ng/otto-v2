import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import Dashboard from './pages/Dashboard';
import TransportRequestList from './pages/TransportRequestList';
import TransportPlannerDashboard from './pages/TransportPlannerDashboard';
import Manifests from './pages/Manifests';
import ProfileSwitcher from './components/ProfileSwitcher';
import PurchaseOrderList from './components/PurchaseOrderList';
import PurchaseOrderDetail from './components/PurchaseOrderDetail';

// Create Material-UI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#38b2ac',
      light: '#73e9c7',
      dark: '#2c7a7b',
    },
    secondary: {
      main: '#73e9c7',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        autoHideDuration={3000}
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <Router>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transport-requests" element={<TransportRequestList />} />
            <Route path="/transport-planner" element={<TransportPlannerDashboard />} />
            <Route path="/manifests" element={<Manifests />} />
            <Route path="/purchase-orders" element={<PurchaseOrderList />} />
            <Route path="/purchase-orders/:id" element={<PurchaseOrderDetail />} />
            {/* Add more routes as we build them */}
          </Routes>
          {/* Profile Switcher for testing - bottom right floating button */}
          <ProfileSwitcher />
        </Router>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
