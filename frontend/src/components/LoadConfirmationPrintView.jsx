import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from '@mui/material';

export default function LoadConfirmationPrintView({ loadConfirmation }) {
  if (!loadConfirmation) return null;

  const sectionHeaderStyle = {
    backgroundColor: '#001f3f',
    color: 'white',
    p: 1.5,
    fontWeight: 600,
    fontSize: '0.875rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const tableCellHeaderStyle = {
    backgroundColor: '#001f3f',
    color: 'white',
    p: 1,
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    border: '1px solid #cbd5e1',
  };

  const tableCellStyle = {
    p: 1,
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8f8f8',
  };

  return (
    <Box id="pdf-content" sx={{ width: '100%', margin: 0, backgroundColor: 'white' }}>
      <Paper elevation={0} sx={{ border: '1px solid #000', overflow: 'hidden', margin: 0 }}>
        {/* Main Title */}
        <Box sx={{ backgroundColor: '#001f3f', color: 'white', p: 2, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, letterSpacing: '1px' }}>
            VEHICLE BOOKING CONFIRMATION FORM
          </Typography>
        </Box>

        {/* File Reference & Date */}
        <Table size="small">
          <TableBody>
            <TableRow>
              <TableCell sx={tableCellHeaderStyle}>FILE REF #:</TableCell>
              <TableCell sx={tableCellStyle}>
                {loadConfirmation.file_reference || 'N/A'}
              </TableCell>
              <TableCell sx={tableCellHeaderStyle}>DATE:</TableCell>
              <TableCell sx={tableCellStyle}>
                {loadConfirmation.confirmation_date
                  ? new Date(loadConfirmation.confirmation_date).toLocaleDateString()
                  : 'N/A'}
              </TableCell>
              <TableCell sx={tableCellHeaderStyle}>STATUS:</TableCell>
              <TableCell sx={tableCellStyle}>
                <Box component="span" sx={{
                  display: 'inline-block',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  backgroundColor: '#e0e0e0',
                  fontSize: '0.75rem',
                  textTransform: 'capitalize'
                }}>
                  {loadConfirmation.status || 'draft'}
                </Box>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* Transporter Information */}
        <Box sx={sectionHeaderStyle}>TRANSPORTER</Box>
        <Table size="small">
          <TableBody>
            {/* Header Row */}
            <TableRow>
              <TableCell sx={{ ...tableCellHeaderStyle, width: '20%' }}>TRANSPORTER</TableCell>
              <TableCell sx={{ ...tableCellHeaderStyle, width: '20%' }}>ATTENTION</TableCell>
              <TableCell sx={{ ...tableCellHeaderStyle, width: '20%' }}>CONTACT DETAILS</TableCell>
              <TableCell sx={{ ...tableCellHeaderStyle, width: '20%' }}>COLLECTION DATE</TableCell>
              <TableCell sx={{ ...tableCellHeaderStyle, width: '20%' }}>VEHICLE TYPE</TableCell>
            </TableRow>
            {/* Data Row */}
            <TableRow>
              <TableCell sx={tableCellStyle}>
                {loadConfirmation.transporter?.company_name || loadConfirmation.transporter_name || 'N/A'}
              </TableCell>
              <TableCell sx={tableCellStyle}>
                {loadConfirmation.attention || 'N/A'}
              </TableCell>
              <TableCell sx={tableCellStyle}>
                {loadConfirmation.contact_details || 'N/A'}
              </TableCell>
              <TableCell sx={tableCellStyle}>
                {loadConfirmation.collection_date
                  ? new Date(loadConfirmation.collection_date).toLocaleDateString()
                  : 'N/A'}
              </TableCell>
              <TableCell sx={tableCellStyle}>
                {loadConfirmation.vehicle_type || 'N/A'}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* Vehicle Registrations */}
        <Table size="small">
          <TableBody>
            {/* Header Row */}
            <TableRow>
              <TableCell sx={{ ...tableCellHeaderStyle, width: '20%' }}>EXIT AGENT</TableCell>
              <TableCell sx={{ ...tableCellHeaderStyle, width: '20%' }}>TRUCK REGISTRATION</TableCell>
              <TableCell sx={{ ...tableCellHeaderStyle, width: '20%' }}>TRAILER 1</TableCell>
              <TableCell sx={{ ...tableCellHeaderStyle, width: '20%' }}>TRAILER 2</TableCell>
              <TableCell sx={{ ...tableCellHeaderStyle, width: '20%' }}>ENTRY AGENT</TableCell>
            </TableRow>
            {/* Data Row */}
            <TableRow>
              <TableCell sx={tableCellStyle}>
                {loadConfirmation.clearing_agent || 'N/A'}
              </TableCell>
              <TableCell sx={tableCellStyle}>
                {loadConfirmation.truck_registration || 'N/A'}
              </TableCell>
              <TableCell sx={tableCellStyle}>
                {loadConfirmation.trailer_1_registration || 'N/A'}
              </TableCell>
              <TableCell sx={tableCellStyle}>
                {loadConfirmation.trailer_2_registration || 'N/A'}
              </TableCell>
              <TableCell sx={tableCellStyle}>
                {loadConfirmation.entry_agent || 'N/A'}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* Addresses */}
        <Table size="small">
          <TableBody>
            <TableRow>
              <TableCell sx={tableCellHeaderStyle}>COLLECTION ADDRESS</TableCell>
              <TableCell sx={tableCellHeaderStyle}>COLLECTION ADDRESS 2</TableCell>
              <TableCell sx={tableCellHeaderStyle}>DELIVERY ADDRESS</TableCell>
              <TableCell sx={tableCellHeaderStyle}>SPECIAL INSTRUCTIONS</TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ ...tableCellStyle, verticalAlign: 'top' }}>
                {loadConfirmation.collection_address || 'N/A'}
              </TableCell>
              <TableCell sx={{ ...tableCellStyle, verticalAlign: 'top' }}>
                {loadConfirmation.collection_address_2 || 'N/A'}
              </TableCell>
              <TableCell sx={{ ...tableCellStyle, verticalAlign: 'top' }}>
                {loadConfirmation.delivery_address || 'N/A'}
              </TableCell>
              <TableCell sx={{ ...tableCellStyle, verticalAlign: 'top' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {loadConfirmation.straps && (
                    <Typography variant="body2">✓ Straps</Typography>
                  )}
                  {loadConfirmation.chains && (
                    <Typography variant="body2">✓ Chains</Typography>
                  )}
                  {loadConfirmation.tarpaulin && (
                    <Typography variant="body2">✓ Tarpaulin</Typography>
                  )}
                  {loadConfirmation.corner_plates && (
                    <Typography variant="body2">✓ Corner Plates</Typography>
                  )}
                  {loadConfirmation.uprights && (
                    <Typography variant="body2">✓ Uprights</Typography>
                  )}
                  {loadConfirmation.rubber_protection && (
                    <Typography variant="body2">✓ Rubber Protection</Typography>
                  )}
                  {!loadConfirmation.straps && !loadConfirmation.chains && !loadConfirmation.tarpaulin &&
                   !loadConfirmation.corner_plates && !loadConfirmation.uprights &&
                   !loadConfirmation.rubber_protection && (
                    <Typography variant="body2" color="text.secondary">None</Typography>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* Commodity */}
        <Table size="small">
          <TableBody>
            <TableRow>
              <TableCell sx={tableCellHeaderStyle}>COMMODITY</TableCell>
              <TableCell sx={tableCellHeaderStyle}>CONTACT FOR NUCLEUS IN DRC</TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ ...tableCellStyle, verticalAlign: 'top' }}>
                {loadConfirmation.commodity_description || 'N/A'}
              </TableCell>
              <TableCell sx={{ ...tableCellStyle, verticalAlign: 'top' }}>
                {loadConfirmation.contact_for_nucleus_drc || 'N/A'}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* Footer */}
        <Box sx={{ backgroundColor: '#001f3f', color: 'white', p: 1.5, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
            ORIGINAL POD TO BE DELIVERED WITH TRANSPORT INVOICE
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
