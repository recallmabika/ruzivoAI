import api from './api';
import { Platform } from 'react-native';

import { saveToken, getToken, removeToken } from '../utils/storage';

export const register = async (username, email, password) => {
  const res = await api.post('/auth/register', { username, email, password });
  await saveToken(res.data.access_token);
  return res.data;
};

export const login = async (username, password) => {
  const form = new URLSearchParams();
  form.append('username', username);
  form.append('password', password);
  const res = await api.post('/auth/login', form.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  await saveToken(res.data.access_token);
  return res.data;
};

export const logout = async () => {
  await removeToken();
};
