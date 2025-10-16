import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Dashboard from './pages/Dashboard';
import TransportRequestList from './pages/TransportRequestList';
import TransportPlannerDashboard from './pages/TransportPlannerDashboard';
import ProfileSwitcher from './components/ProfileSwitcher';

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
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transport-requests" element={<TransportRequestList />} />
          <Route path="/transport-planner" element={<TransportPlannerDashboard />} />
          {/* Add more routes as we build them */}
        </Routes>
        {/* Profile Switcher for testing - bottom right floating button */}
        <ProfileSwitcher />
      </Router>
    </ThemeProvider>
  );
}

export default App;
