import api from './api';
import { saveToken, removeToken, saveUsername, removeUsername } from '../utils/storage';

export const register = async ({ firstName, lastName, email, phone, password, confirmPassword }) => {
  const res = await api.post('/auth/register', {
    first_name: firstName,
    last_name: lastName,
    email: email,
    phone: phone,
    password: password,
    confirm_password: confirmPassword
  });
  if (res.data.access_token) {
    await saveToken(res.data.access_token);
  }
  const displayName = res.data.username || `${firstName} ${lastName}`.trim() || email;
  if (displayName) {
    await saveUsername(displayName);
  }
  return res.data;
};

// Step 1: Verify credentials and send 2FA code via SMS (default) or Email
export const verifyPasswordAndSendCode = async (email, password, channel = 'sms') => {
  const res = await api.post('/auth/verify-password-and-send-code', {
    email: email,
    password: password,
    channel: channel
  });
  return res.data;
};

// Step 2: Confirm 6-digit code to complete login
export const verifyCode = async (email, code) => {
  const res = await api.post('/auth/verify-code', {
    email: email,
    code: code
  });
  if (res.data.access_token) {
    await saveToken(res.data.access_token);
  }
  if (res.data.username) {
    await saveUsername(res.data.username);
  }
  return res.data;
};

export const logout = async () => {
  await removeToken();
  await removeUsername();
};
