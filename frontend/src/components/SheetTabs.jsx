import { Box, Tab, Tabs } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledTabs = styled(Tabs)(({ theme }) => ({
  background: '#e8e8e8',
  borderTop: '1px solid #ccc',
  minHeight: '48px',
  '& .MuiTabs-indicator': {
    display: 'none',
  },
}));

const StyledTab = styled(Tab)(({ theme }) => ({
  padding: '10px 24px',
  background: '#38b2ac',
  border: '1px solid #2c7a7b',
  borderBottom: 'none',
  borderRadius: '4px 4px 0 0',
  color: 'white',
  fontSize: '13px',
  fontWeight: 600,
  minHeight: '48px',
  marginRight: '2px',
  transition: 'all 0.2s',
  textTransform: 'none',
  '&:hover': {
    background: '#4db8a8',
  },
  '&.Mui-selected': {
    background: '#73e9c7',
    border: '1px solid #5fd4b3',
    borderBottom: '1px solid #73e9c7',
    color: '#1a202c',
    zIndex: 1,
  },
}));

export default function SheetTabs({ value, onChange, tabs }) {
  return (
    <StyledTabs value={value} onChange={onChange}>
      {tabs.map((tab, index) => (
        <StyledTab key={index} label={tab.label} value={tab.value} />
      ))}
    </StyledTabs>
  );
}
