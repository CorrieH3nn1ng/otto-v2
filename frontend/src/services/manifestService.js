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

  // Attach specific packages to manifest
  attachPackages: async (id, packageIds) => {
    const response = await api.post(`/manifests/${id}/attach-packages`, {
      package_ids: packageIds
    });
    return response.data;
  },

  // Detach specific packages from manifest
  detachPackages: async (id, packageIds) => {
    const response = await api.post(`/manifests/${id}/detach-packages`, {
      package_ids: packageIds
    });
    return response.data;
  },

  // Get documents for a manifest
  getDocuments: async (id) => {
    const response = await api.get(`/manifests/${id}/documents`);
    return response.data;
  },

  // Upload document to manifest
  uploadDocument: async (id, file, documentType, documentSubtype = null) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    if (documentSubtype) {
      formData.append('document_subtype', documentSubtype);
    }

    const response = await api.post(`/manifests/${id}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete document from manifest
  deleteDocument: async (manifestId, documentId) => {
    const response = await api.delete(`/manifests/${manifestId}/documents/${documentId}`);
    return response.data;
  },

  // Download manifest document
  downloadDocument: async (manifestId, documentId) => {
    const response = await api.get(`/manifests/${manifestId}/documents/${documentId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default manifestService;
