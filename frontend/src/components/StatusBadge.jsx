import { Chip } from '@mui/material';

const statusConfig = {
  // Invoice statuses
  draft: { color: '#fff3cd', textColor: '#856404', label: 'Draft' },
  pending_approval: { color: '#cce5ff', textColor: '#004085', label: 'Pending Approval' },
  approved: { color: '#d4edda', textColor: '#155724', label: 'Approved' },
  in_transit: { color: '#d1ecf1', textColor: '#0c5460', label: 'In Transit' },
  delivered: { color: '#d4edda', textColor: '#155724', label: 'Delivered' },
  archived: { color: '#e2e3e5', textColor: '#383d41', label: 'Archived' },

  // Load Confirmation statuses
  pending_transport: { color: '#fff3cd', textColor: '#856404', label: 'Pending Transport' },
  transport_confirmed: { color: '#d4edda', textColor: '#155724', label: 'Transport Confirmed' },
  ready_for_manifest: { color: '#cce5ff', textColor: '#004085', label: 'Ready for Manifest' },
  in_manifest: { color: '#d1ecf1', textColor: '#0c5460', label: 'In Manifest' },

  // Manifest statuses
  pending_feri: { color: '#fff3cd', textColor: '#856404', label: 'Pending FERI' },
  feri_approved: { color: '#d4edda', textColor: '#155724', label: 'FERI Approved' },
  completed: { color: '#d4edda', textColor: '#155724', label: 'Completed' },

  // Validation statuses
  not_required: { color: '#e2e3e5', textColor: '#383d41', label: 'Not Required' },
  pending: { color: '#fff3cd', textColor: '#856404', label: 'Pending' },
  rejected: { color: '#f8d7da', textColor: '#721c24', label: 'Rejected' },

  // Default
  default: { color: '#e2e3e5', textColor: '#383d41', label: 'Unknown' },
};

export default function StatusBadge({ status, label }) {
  const config = statusConfig[status] || statusConfig.default;
  const displayLabel = label || config.label;

  return (
    <Chip
      label={displayLabel}
      size="small"
      sx={{
        backgroundColor: config.color,
        color: config.textColor,
        fontWeight: 600,
        fontSize: '11px',
        letterSpacing: '0.3px',
        height: '24px',
      }}
    />
  );
}
