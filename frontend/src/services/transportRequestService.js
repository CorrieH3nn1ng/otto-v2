import api from './api';

export const transportRequestService = {
  // Get all transport requests
  getAll: async (status = null) => {
    const params = status ? { status } : {};
    const response = await api.get('/transport-requests', { params });
    return response.data;
  },

  // Get single transport request by ID
  getById: async (id) => {
    const response = await api.get(`/transport-requests/${id}`);
    return response.data;
  },

  // Create new transport request
  create: async (data) => {
    const response = await api.post('/transport-requests', data);
    return response.data;
  },

  // Update transport request
  update: async (id, data) => {
    const response = await api.put(`/transport-requests/${id}`, data);
    return response.data;
  },

  // Delete transport request
  delete: async (id) => {
    const response = await api.delete(`/transport-requests/${id}`);
    return response.data;
  },

  // Assign transporter and vehicle details (Transport Planner)
  assign: async (id, data) => {
    const response = await api.post(`/transport-requests/${id}/assign`, data);
    return response.data;
  },

  // Reject transport request (Transport Planner)
  reject: async (id, plannerNotes = null) => {
    const response = await api.post(`/transport-requests/${id}/reject`, {
      planner_notes: plannerNotes
    });
    return response.data;
  },

  // Attach invoices to transport request
  attachInvoices: async (id, invoiceIds) => {
    const response = await api.post(`/transport-requests/${id}/attach-invoices`, {
      invoice_ids: invoiceIds
    });
    return response.data;
  },

  // Detach invoices from transport request
  detachInvoices: async (id, invoiceIds) => {
    const response = await api.post(`/transport-requests/${id}/detach-invoices`, {
      invoice_ids: invoiceIds
    });
    return response.data;
  },

  // Get pending transport requests (for Transport Planner)
  getPending: async () => {
    return transportRequestService.getAll('pending');
  },

  // Get assigned transport requests
  getAssigned: async () => {
    return transportRequestService.getAll('assigned');
  },
};

export default transportRequestService;
