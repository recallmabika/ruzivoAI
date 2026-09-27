import axios from 'axios';
import { Platform } from 'react-native';
import { getToken, getSystemKey } from '../utils/storage';

// Local IP of development machine on WiFi and server port
const DEV_HOST = '192.168.1.120';
const DEV_PORT = '8080';

const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    return `http://localhost:${DEV_PORT}`;
  }
  return `http://${DEV_HOST}:${DEV_PORT}`;
};

const BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
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
