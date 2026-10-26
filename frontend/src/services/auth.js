import api from './api';
import { Platform } from 'react-native';

import { saveToken, getToken, removeToken, saveUsername, removeUsername } from '../utils/storage';

export const register = async (username, email, password) => {
  const res = await api.post('/auth/register', { username, email, password });
  if (res.data.access_token) {
    await saveToken(res.data.access_token);
  }
  if (res.data.username || username) {
    await saveUsername(res.data.username || username);
  }
  return res.data;
};

export const login = async (username, password) => {
  const form = new URLSearchParams();
  form.append('username', username);
  form.append('password', password);
  const res = await api.post('/auth/login', form.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  if (res.data.access_token) {
    await saveToken(res.data.access_token);
  }
  if (res.data.username || username) {
    await saveUsername(res.data.username || username);
  }
  return res.data;
};

export const logout = async () => {
  await removeToken();
  await removeUsername();
};
