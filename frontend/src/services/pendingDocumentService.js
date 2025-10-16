import api from './api';

export const pendingDocumentService = {
  // Get all pending documents
  getAll: async () => {
    const response = await api.get('/pending-documents');
    return response.data;
  },

  // Get single pending document
  getById: async (id) => {
    const response = await api.get(`/pending-documents/${id}`);
    return response.data;
  },

  // Acknowledge pending document (creates invoice)
  acknowledge: async (id) => {
    const response = await api.post(`/pending-documents/${id}/acknowledge`);
    return response.data;
  },

  // Reject pending document
  reject: async (id, reason) => {
    const response = await api.post(`/pending-documents/${id}/reject`, { reason });
    return response.data;
  },
};

export default pendingDocumentService;
