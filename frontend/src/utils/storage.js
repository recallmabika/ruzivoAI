import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'ruzivo_auth_token';
const USERNAME_KEY = 'ruzivo_username';

export const saveToken = async (token) => {
  if (Platform.OS === 'web') return localStorage.setItem(TOKEN_KEY, token);
  return SecureStore.setItemAsync(TOKEN_KEY, token);
};

export const getToken = async () => {
  if (Platform.OS === 'web') return localStorage.getItem(TOKEN_KEY);
  return SecureStore.getItemAsync(TOKEN_KEY);
};

export const removeToken = async () => {
  if (Platform.OS === 'web') return localStorage.removeItem(TOKEN_KEY);
  return SecureStore.deleteItemAsync(TOKEN_KEY);
};

export const saveUsername = async (name) => {
  if (Platform.OS === 'web') return localStorage.setItem(USERNAME_KEY, name);
  return SecureStore.setItemAsync(USERNAME_KEY, name);
};

export const getUsername = async () => {
  if (Platform.OS === 'web') return localStorage.getItem(USERNAME_KEY);
  return SecureStore.getItemAsync(USERNAME_KEY);
};

export const removeUsername = async () => {
  if (Platform.OS === 'web') return localStorage.removeItem(USERNAME_KEY);
  return SecureStore.deleteItemAsync(USERNAME_KEY);
};

const SYSTEM_KEY = 'ruzivo_system_key';
const SERVER_URL_KEY = 'ruzivo_server_url';
const CHATS_KEY = 'ruzivo_mobile_chats';

export const saveCustomServerUrl = async (url) => {
  if (Platform.OS === 'web') return localStorage.setItem(SERVER_URL_KEY, url);
  return SecureStore.setItemAsync(SERVER_URL_KEY, url);
};

export const getCustomServerUrl = async () => {
  if (Platform.OS === 'web') return localStorage.getItem(SERVER_URL_KEY);
  return SecureStore.getItemAsync(SERVER_URL_KEY);
};

export const saveSystemKey = async (key) => {
  if (Platform.OS === 'web') return localStorage.setItem(SYSTEM_KEY, key);
  return SecureStore.setItemAsync(SYSTEM_KEY, key);
};

export const getSystemKey = async () => {
  if (Platform.OS === 'web') return localStorage.getItem(SYSTEM_KEY);
  return SecureStore.getItemAsync(SYSTEM_KEY);
};

export const saveStoredConversations = async (chats) => {
  const jsonStr = JSON.stringify(chats);
  if (Platform.OS === 'web') return localStorage.setItem(CHATS_KEY, jsonStr);
  return SecureStore.setItemAsync(CHATS_KEY, jsonStr);
};

export const getStoredConversations = async () => {
  let jsonStr = null;
  if (Platform.OS === 'web') jsonStr = localStorage.getItem(CHATS_KEY);
  else jsonStr = await SecureStore.getItemAsync(CHATS_KEY);
  if (!jsonStr) return [];
  try {
    return JSON.parse(jsonStr);
  } catch {
    return [];
  }
};
