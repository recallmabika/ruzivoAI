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

const RegisterScreen = ({ onRegister, onNavigateLogin, onGuestLogin }) => {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const errorTimerRef = useRef(null);

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

  const validateForm = () => {
    if (!username.trim()) {
      return 'Ndapota sarudza zita rako (Username).';
    }
    if (username.trim().length < 3) {
      return 'Zita rako rinofanira kuve nemabhii anodarika maviri (at least 3 characters).';
    }
    if (!email.trim() || !email.includes('@')) {
      return 'Ndapota isa email ine format chaiyo (Valid Email).';
    }
    if (!password.trim()) {
      return 'Ndapota sarudza pasiwedhi yakasimba.';
    }
    if (password.length < 6) {
      return 'Pasiwedhi inofanira kuve nemabhii kana manhamba 6 kana kudarika.';
    }
    if (password !== confirmPassword) {
      return 'Mapasiwedhi haasi kuenderana (Passwords do not match).';
    }
    return null;
  };

  const handleRegister = async () => {
    showError('');
    const validationError = validateForm();
    if (validationError) {
      showError(validationError);
      return;
    }

    setLoading(true);
    try {
      await onRegister(username.trim(), email.trim(), password.trim());
    } catch (e) {
      const err = e?.response?.data?.detail || 'Kunyoresa hakuna kubudirira. Edza zvakare kana kutarisa server.';
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
          <Text style={styles.subtitle}>Gadzira Akaunti Yenyu yeChiShona</Text>
        </View>

        {/* Card Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Kuvhura Akaunti (Sign Up)</Text>
          <Text style={styles.cardSub}>Nyoresa ruzivo rwako kuti unyorese hurukuro dzose zvakanaka</Text>

          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <Text style={styles.errorText}>{errorMsg}</Text>
              <TouchableOpacity onPress={() => showError('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={18} color="#DC2626" />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Username */}
          <Text style={styles.fieldLabel}>Zita rako (Username)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#666666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. recall"
              placeholderTextColor="#999999"
              value={username}
              onChangeText={(t) => { setUsername(t); showError(''); }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Email */}
          <Text style={styles.fieldLabel}>Email Yako</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#666666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. recall@gmail.com"
              placeholderTextColor="#999999"
              value={email}
              onChangeText={(t) => { setEmail(t); showError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <Text style={styles.fieldLabel}>Pasiwedhi (Password)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Mabhii 6 kana kudarika"
              placeholderTextColor="#999999"
              value={password}
              onChangeText={(t) => { setPassword(t); showError(''); }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666666" />
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <Text style={styles.fieldLabel}>Dzokorora Pasiwedhi (Confirm Password)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#666666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Isa pasiwedhi zvakare"
              placeholderTextColor="#999999"
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); showError(''); }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.primaryButtonText}>Nyoresa Akaunti</Text>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </View>
            )}
          </TouchableOpacity>

          {/* Toggle to Login */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Wakatonyoresa kare?</Text>
            <TouchableOpacity onPress={onNavigateLogin}>
              <Text style={styles.switchLink}>Pinda pano</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Guest fallback option */}
        {onGuestLogin && (
          <TouchableOpacity onPress={onGuestLogin} style={styles.guestButton}>
            <Ionicons name="sparkles-outline" size={18} color="#2E7D32" style={{ marginRight: 6 }} />
            <Text style={styles.guestText}>Enderera mberi seMuenzi (Continue as Guest)</Text>
          </TouchableOpacity>
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
    marginBottom: 20,
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
    marginBottom: 16,
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
    marginBottom: 14,
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
    marginTop: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#D8D4CC',
    borderRadius: 12,
    backgroundColor: '#FAF9F6',
    paddingHorizontal: 12,
    marginBottom: 8,
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
    marginTop: 18,
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
    marginTop: 20,
  },
});

export default RegisterScreen;
