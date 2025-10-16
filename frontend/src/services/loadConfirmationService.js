import api from './api';

export const loadConfirmationService = {
  // Get all load confirmations
  getAll: async () => {
    const response = await api.get('/load-confirmations');
    return response.data;
  },

  // Get single load confirmation by ID
  getById: async (id) => {
    const response = await api.get(`/load-confirmations/${id}`);
    return response.data;
  },

  // Create new load confirmation
  create: async (data) => {
    const response = await api.post('/load-confirmations', data);
    return response.data;
  },

  // Update load confirmation
  update: async (id, data) => {
    const response = await api.put(`/load-confirmations/${id}`, data);
    return response.data;
  },

  // Delete load confirmation
  delete: async (id) => {
    const response = await api.delete(`/load-confirmations/${id}`);
    return response.data;
  },

  // Attach invoices to load confirmation
  attachInvoices: async (id, invoiceIds) => {
    const response = await api.post(`/load-confirmations/${id}/attach-invoices`, {
      invoice_ids: invoiceIds
    });
    return response.data;
  },

  // Detach invoices from load confirmation
  detachInvoices: async (id, invoiceIds) => {
    const response = await api.post(`/load-confirmations/${id}/detach-invoices`, {
      invoice_ids: invoiceIds
    });
    return response.data;
  },

  // Request transport for a load confirmation
  requestTransport: async (id) => {
    const response = await api.post(`/load-confirmations/${id}/request-transport`);
    return response.data;
  },

  // Email load confirmation to transporter
  emailLoadConfirmation: async (id, recipientEmail = null, ccEmails = null) => {
    const response = await api.post(`/load-confirmations/${id}/email`, {
      recipient_email: recipientEmail,
      cc_emails: ccEmails
    });
    return response.data;
  },

  // Assign transporter and vehicle details (Transport Planner)
  assign: async (id, data) => {
    const response = await api.post(`/load-confirmations/${id}/assign`, data);
    return response.data;
  },

  // Get pending load confirmations (status = draft)
  getPending: async () => {
    const response = await api.get('/load-confirmations', { params: { status: 'draft' } });
    return response.data;
  },

  // Get active loads (status = transport_confirmed)
  getActive: async () => {
    const response = await api.get('/load-confirmations', { params: { status: 'transport_confirmed' } });
    return response.data;
  },

  // Get completed loads
  getCompleted: async () => {
    const response = await api.get('/load-confirmations', { params: { status: 'ready_for_manifest,in_manifest' } });
    return response.data;
  },
};

export default loadConfirmationService;
