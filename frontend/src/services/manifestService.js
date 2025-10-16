import api from './api';

export const manifestService = {
  // Get all manifests
  getAll: async () => {
    const response = await api.get('/manifests');
    return response.data;
  },

  // Get single manifest by ID
  getById: async (id) => {
    const response = await api.get(`/manifests/${id}`);
    return response.data;
  },

  // Create new manifest
  create: async (data) => {
    const response = await api.post('/manifests', data);
    return response.data;
  },

  // Update manifest
  update: async (id, data) => {
    const response = await api.put(`/manifests/${id}`, data);
    return response.data;
  },

  // Delete manifest
  delete: async (id) => {
    const response = await api.delete(`/manifests/${id}`);
    return response.data;
  },

  // Submit FERI for manifest
  submitFeri: async (id) => {
    const response = await api.post(`/manifests/${id}/submit-feri`);
    return response.data;
  },

  // Approve FERI for manifest
  approveFeri: async (id) => {
    const response = await api.post(`/manifests/${id}/approve-feri`);
    return response.data;
  },

  // Mark manifest as delivered
  markDelivered: async (id) => {
    const response = await api.post(`/manifests/${id}/mark-delivered`);
    return response.data;
  },

  // Attach invoices to manifest
  attachInvoices: async (id, invoiceIds) => {
    const response = await api.post(`/manifests/${id}/attach-invoices`, {
      invoice_ids: invoiceIds
    });
    return response.data;
  },

  // Detach invoices from manifest
  detachInvoices: async (id, invoiceIds) => {
    const response = await api.post(`/manifests/${id}/detach-invoices`, {
      invoice_ids: invoiceIds
    });
    return response.data;
  },
};

export default manifestService;
