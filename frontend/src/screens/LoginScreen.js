import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCustomServerUrl, saveCustomServerUrl } from '../utils/storage';
import { DEFAULT_HOST, DEFAULT_PORT } from '../services/api';

const LoginScreen = ({ onLogin, onNavigateRegister, onGuestLogin }) => {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [serverUrl, setServerUrl] = useState(`http://${DEFAULT_HOST}:${DEFAULT_PORT}`);
  const [showServerInput, setShowServerInput] = useState(false);
  const [serverSavedMsg, setServerSavedMsg] = useState('');
  const errorTimerRef = useRef(null);

  useEffect(() => {
    (async () => {
      const custom = await getCustomServerUrl();
      if (custom && custom.trim()) {
        setServerUrl(custom.trim());
      }
    })();
  }, []);

  const handleSaveServer = async () => {
    if (serverUrl.trim()) {
      await saveCustomServerUrl(serverUrl.trim());
      setServerSavedMsg('Server URL yachengetedzwa!');
      setTimeout(() => setServerSavedMsg(''), 3000);
    }
  };

  const showError = (msg) => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setErrorMsg(msg);
    if (msg) {
      errorTimerRef.current = setTimeout(() => {
        setErrorMsg('');
      }, 5000);
    }
  };

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  const handleLogin = async () => {
    showError('');
    if (!username.trim() || !password.trim()) {
      showError('Ndapota isa email/zita ne pasiwedhi yako');
      return;
    }
    setLoading(true);
    try {
      await onLogin(username.trim(), password.trim());
    } catch (e) {
      const err = e?.response?.data?.detail || 'Zita kana pasiwedhi hazvina kururama. Tarisa kana server yakabatidzwa.';
      showError(err);
      if (Platform.OS === 'web') window.alert(err);
      else Alert.alert('Kukanganisa', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>Ruzivo AI</Text>
          <Text style={styles.subtitle}>Mubatsiri weMutauro weChiShona</Text>
        </View>

        {/* Card Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pinda muAkaunti (Log In)</Text>
          <Text style={styles.cardSub}>Nyora zita rako nepasiwedhi kuti utange hurukuro</Text>

          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <Text style={styles.errorText}>{errorMsg}</Text>
              <TouchableOpacity onPress={() => showError('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={18} color="#DC2626" />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Username / Email field */}
          <Text style={styles.fieldLabel}>Zita rako kana Email</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#666666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. recall kana recall@gmail.com"
              placeholderTextColor="#999999"
              value={username}
              onChangeText={(t) => { setUsername(t); showError(''); }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password field */}
          <Text style={styles.fieldLabel}>Pasiwedhi (Password)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#999999"
              value={password}
              onChangeText={(t) => { setPassword(t); setErrorMsg(''); }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666666" />
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.primaryButtonText}>Pinda muAkaunti</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </View>
            )}
          </TouchableOpacity>

          {/* Toggle to Register */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Hausati wava neakaunti?</Text>
            <TouchableOpacity onPress={onNavigateRegister}>
              <Text style={styles.switchLink}>Nyoresa pano</Text>
            </TouchableOpacity>
          </View>
        {/* Server IP Setup for Mobile / iOS devices */}
        <TouchableOpacity
          onPress={() => setShowServerInput(!showServerInput)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 12 }}
        >
          <Ionicons name="hardware-chip-outline" size={14} color="#78716C" style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 12, color: '#78716C', fontWeight: '500' }}>
            {showServerInput ? 'Viga Zvirongwa zveServer' : 'Chinja Server Address / IP'}
          </Text>
        </TouchableOpacity>

        {showServerInput && (
          <View style={{ backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E8E5DF' }}>
            <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#444444', marginBottom: 4 }}>Server URL (WiFi IP yePC):</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                style={{ flex: 1, backgroundColor: '#F7F6F2', borderWidth: 1, borderColor: '#E0DDD5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: '#1B1B1B' }}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="http://192.168.137.28:8080"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={handleSaveServer}
                style={{ backgroundColor: '#2E7D32', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>Chengeta</Text>
              </TouchableOpacity>
            </View>
            {serverSavedMsg ? (
              <Text style={{ fontSize: 11, color: '#16A34A', marginTop: 6, fontWeight: '500' }}>{serverSavedMsg}</Text>
            ) : null}
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footerNote}>
          Ruzivo AI • Dzidzo neKuchengetedza ChiShona
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F6F2',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 68,
    height: 68,
    marginBottom: 12,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1B1B1B',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#555555',
    marginTop: 4,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E8E5DF',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1B1B1B',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 18,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '500',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 6,
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#D8D4CC',
    borderRadius: 12,
    backgroundColor: '#FAF9F6',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: '#1B1B1B',
  },
  eyeBtn: {
    padding: 6,
  },
  primaryButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 6,
  },
  switchText: {
    fontSize: 13.5,
    color: '#666666',
  },
  switchLink: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#2E7D32',
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    backgroundColor: '#FFFFFF',
  },
  guestText: {
    color: '#2E7D32',
    fontSize: 13.5,
    fontWeight: '600',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 11.5,
    color: '#888888',
    marginTop: 24,
  },
});

export default LoginScreen;
