import axios from 'axios';
import { Platform } from 'react-native';
import { getToken, getSystemKey, getCustomServerUrl } from '../utils/storage';

// Local IP of development machine on WiFi and server port
export const DEFAULT_HOST = '192.168.1.120';
export const DEFAULT_PORT = '8080';

export const getBaseUrl = async () => {
  const custom = await getCustomServerUrl();
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/+$/, '');
  }
  if (Platform.OS === 'web') {
    return `http://localhost:${DEFAULT_PORT}`;
  }
  return `http://${DEFAULT_HOST}:${DEFAULT_PORT}`;
};

const api = axios.create({
  baseURL: `http://${DEFAULT_HOST}:${DEFAULT_PORT}`,
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const dynamicBase = await getBaseUrl();
  config.baseURL = dynamicBase;
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const chatAPI = async (message, conversationId = null, context = null, customKey = null, conversationHistory = '') => {
  const key = customKey || await getSystemKey();
  const res = await api.post('/chat/', {
    message,
    conversation_id: conversationId,
    context,
    conversation_history: conversationHistory,
    api_key: key || ''
  });
  return res.data;
};

export const ttsAPI = async (text) => {
  const res = await api.post('/tts/synthesize', { text }, { responseType: 'arraybuffer' });
  return res.data;
};

export const asrAPI = async (audioUri) => {
  const form = new FormData();
  form.append('audio', { uri: audioUri, name: 'audio.wav', type: 'audio/wav' });
  const res = await api.post('/asr/transcribe', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const fileAPI = async (fileUri, fileName, mimeType) => {
  const form = new FormData();
  form.append('file', { uri: fileUri, name: fileName, type: mimeType });
  const res = await api.post('/files/extract', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export default api;
