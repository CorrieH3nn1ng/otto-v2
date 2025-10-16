import api from './api';

export const invoiceService = {
  // Get all invoices
  getAll: async (params = {}) => {
    const response = await api.get('/invoices', { params });
    return response.data;
  },

  // Get single invoice
  getById: async (id) => {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  },

  // Create invoice manually
  create: async (data) => {
    const response = await api.post('/invoices', data);
    return response.data;
  },

  // Update invoice
  update: async (id, data) => {
    const response = await api.put(`/invoices/${id}`, data);
    return response.data;
  },

  // Delete invoice
  delete: async (id) => {
    const response = await api.delete(`/invoices/${id}`);
    return response.data;
  },

  // Get invoice documents
  getDocuments: async (id) => {
    const response = await api.get(`/invoices/${id}/documents`);
    return response.data;
  },

  // Validate invoice (check QC/BV requirements)
  validate: async (id) => {
    const response = await api.post(`/invoices/${id}/validate`);
    return response.data;
  },

  // Get dashboard statistics
  getStatistics: async () => {
    const response = await api.get('/invoices/statistics');
    return response.data;
  },

  // Request transport for invoice
  requestTransport: async (id) => {
    const response = await api.post(`/invoices/${id}/request-transport`);
    return response.data;
  },

  // Check document completeness
  checkDocuments: async (id) => {
    const response = await api.post(`/invoices/${id}/check-documents`);
    return response.data;
  },

  // Validate file name before saving
  validateFileName: async (fileName, packingDetailId = null) => {
    const response = await api.post('/invoices/validate-file-name', {
      file_name: fileName,
      packing_detail_id: packingDetailId,
    });
    return response.data;
  },

  // Get unique file names for AUTO TRANSPORT REQUEST
  getUniqueFileNames: async () => {
    const response = await api.get('/invoices/unique-file-names');
    return response.data;
  },
};

export default invoiceService;
