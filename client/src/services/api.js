import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized - redirect to login
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth Services
export const authService = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
};

// User Services
export const userService = {
  getAllUsers: (search = '') => api.get(`/users${search ? `?search=${search}` : ''}`),
  updateStatus: (status) => api.put('/users/status', { status }),
};

// Chat Services
export const chatService = {
  getAllChats: () => api.get('/chats'),
  getChatById: (chatId) => api.get(`/chats/${chatId}`),
  createDirectChat: (userId) => api.post('/chats/direct', { userId }),
  createGroupChat: (chatData) => api.post('/chats/group', chatData),
  updateGroupChat: (chatId, chatData) => api.put(`/chats/group/${chatId}`, chatData),
  addUserToGroup: (chatId, userId) => api.put(`/chats/group/${chatId}/add`, { userId }),
  removeUserFromGroup: (chatId, userId) => api.put(`/chats/group/${chatId}/remove`, { userId }),
};

// Message Services
export const messageService = {
  getChatMessages: (chatId, page = 1, limit = 50) => 
    api.get(`/messages/${chatId}?page=${page}&limit=${limit}`),
  sendMessage: (messageData) => api.post('/messages', messageData),
  deleteMessage: (messageId) => api.delete(`/messages/${messageId}`),
  editMessage: (messageId, content) => api.put(`/messages/${messageId}`, { content }),
  addReaction: (messageId, emoji) => api.post(`/messages/${messageId}/react`, { emoji }),
  markAsRead: (messageId) => api.put(`/messages/${messageId}/read`),
  markAsDelivered: (messageId) => api.put(`/messages/${messageId}/deliver`),
};

export default api;