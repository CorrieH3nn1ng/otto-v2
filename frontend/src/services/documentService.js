import api from './api';

export const documentService = {
  // Upload and process document (calls n8n workflow via Laravel)
  upload: async (file, invoiceId = null) => {
    const formData = new FormData();
    formData.append('document', file);
    if (invoiceId) {
      formData.append('invoice_id', invoiceId);
    }

    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get document details
  getById: async (id) => {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  },

  // Download document
  download: async (id) => {
    const response = await api.get(`/documents/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Delete document
  delete: async (id) => {
    const response = await api.delete(`/documents/${id}`);
    return response.data;
  },
};

export default documentService;
