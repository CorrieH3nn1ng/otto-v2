import api from './api';

export const transporterService = {
  // Get all transporters
  getAll: async () => {
    const response = await api.get('/transporters');
    return response.data;
  },

  // Get single transporter by ID
  getById: async (id) => {
    const response = await api.get(`/transporters/${id}`);
    return response.data;
  },

  // Create new transporter
  create: async (data) => {
    const response = await api.post('/transporters', data);
    return response.data;
  },

  // Update transporter
  update: async (id, data) => {
    const response = await api.put(`/transporters/${id}`, data);
    return response.data;
  },

  // Delete transporter
  delete: async (id) => {
    const response = await api.delete(`/transporters/${id}`);
    return response.data;
  },
};

export default transporterService;
