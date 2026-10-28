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
import { verifyPasswordAndSendCode, verifyCode } from '../services/auth';

const SQL_XSS_REGEX = /(<\s*html\b|<\s*script\b[^>]*>|<\s*/\s*script\s*>|<\s*script\b|<\s*(iframe|object|embed|svg|img|style|link|body|meta|base|form|input)\b|javascript\s*:|vbscript\s*:|data\s*:\s*text/html|on(error|load|mouseover|click|focus|blur|change|submit|keydown|keyup|keypress)\s*=|document\.(cookie|location|write)|eval\s*\(|alert\s*\(|prompt\s*\(|confirm\s*\(|\bUNION\s+(ALL\s+)?SELECT\b|\bSELECT\s+.+\s+FROM\b|\bINSERT\s+INTO\b|\bUPDATE\s+.+\s+SET\b|\bDELETE\b.+\bFROM\b|\bDELETE\s+FROM\b|\bDROP\s+(TABLE|DATABASE|VIEW|COLUMN)\b|\bALTER\s+TABLE\b|\bEXEC(\s+XP_)?\b|\bWHERE\s+.+=\s*.+|\bOR\s+[\x27\x22]?\w+[\x27\x22]?\s*=\s*[\x27\x22]?\w+|\bAND\s+[\x27\x22]?\w+[\x27\x22]?\s*=\s*[\x27\x22]?\w+|--|/\*|\*/|;\s*SHUTDOWN|;\s*DROP)/i;

const LoginScreen = ({ onLoginSuccess, onNavigateRegister, onGuestLogin }) => {
  const insets = useSafeAreaInsets();
  
  // Step state: 'credentials' -> 'code'
  const [step, setStep] = useState('credentials');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [channel, setChannel] = useState('sms'); // 'sms' (default) or 'email'
  const [code, setCode] = useState('');
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [destinationDisplay, setDestinationDisplay] = useState('');
  
  // Server config
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

  // Real-time Email check
  const handleEmailChange = (text) => {
    setEmail(text);
    if (SQL_XSS_REGEX.test(text)) {
      showError('Zvinonyorwa zvine njodzi yekupaza sisitimu (SQL / XSS injection blocked).');
    } else {
      if (errorMsg.includes('injection blocked')) showError('');
    }
  };

  // Real-time Code check: numeric only, max 6
  const handleCodeChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    setCode(cleaned);
    setErrorMsg('');
  };

  // Step 1: Submit Credentials
  const handleCredentialsSubmit = async () => {
    showError('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      showError('Ndapota nyorai email yenyu.');
      return;
    }
    if (SQL_XSS_REGEX.test(trimmedEmail)) {
      showError('Zvinonyorwa zvine njodzi yekupaza sisitimu (SQL / XSS injection blocked).');
      return;
    }
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      showError('Kero yeEmail haisi pachokwadi (e.g. zita@chikoro.ac.zw).');
      return;
    }
    if (!password) {
      showError('Ndapota nyorai pasiwedhi yenyu.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyPasswordAndSendCode(trimmedEmail, password, channel);
      // Clear password immediately on success for security
      setPassword('');
      const dest = channel === 'sms' ? (res.phone || 'foni yako') : (res.email || trimmedEmail);
      setDestinationDisplay(dest);
      setStep('code');
    } catch (e) {
      // Clear password on error
      setPassword('');
      const err = e?.response?.data?.detail || 'Pasiwedhi kana email haina kururama. Edzai zvakare.';
      showError(err);
      if (Platform.OS === 'web') window.alert(err);
      else Alert.alert('Kukanganisa', err);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm 6-Digit Code
  const handleCodeSubmit = async () => {
    showError('');
    if (code.length < 4) {
      showError('Ndapota nyorai kodhi yakakwana ye 6-digits.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyCode(email.trim(), code);
      if (onLoginSuccess) {
        onLoginSuccess(res.username || email.trim());
      }
    } catch (e) {
      const err = e?.response?.data?.detail || 'Kodhi yamaisa haina kururama kana kuti yapera nguva.';
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
          {step === 'credentials' ? (
            <>
              <Text style={styles.cardTitle}>Pinda muRuzivo (Sign In)</Text>
              <Text style={styles.cardSub}>Nyorai email pamwe ne pasiwedhi yenyu:</Text>

              {errorMsg ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              {/* Email field */}
              <Text style={styles.fieldLabel}>Email</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#666666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. zita@chikoro.ac.zw"
                  placeholderTextColor="#999999"
                  value={email}
                  onChangeText={handleEmailChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
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
                  contextMenuHidden={true} // Blocks copy, paste, select-all
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666666" />
                </TouchableOpacity>
              </View>

              {/* Dual 2FA Channel Picker: SMS (Phone default) or Email */}
              <Text style={styles.fieldLabel}>Nzira yekutambira kodhi (2FA Channel):</Text>
              <View style={styles.channelRow}>
                <TouchableOpacity
                  style={[styles.channelPill, channel === 'sms' && styles.channelPillActive]}
                  onPress={() => setChannel('sms')}
                >
                  <Ionicons name="chatbox-ellipses-outline" size={16} color={channel === 'sms' ? '#2E7D32' : '#666666'} />
                  <Text style={[styles.channelText, channel === 'sms' && styles.channelTextActive]}>SMS (Phone)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.channelPill, channel === 'email' && styles.channelPillActive]}
                  onPress={() => setChannel('email')}
                >
                  <Ionicons name="mail-outline" size={16} color={channel === 'email' ? '#2E7D32' : '#666666'} />
                  <Text style={[styles.channelText, channel === 'email' && styles.channelTextActive]}>Email</Text>
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleCredentialsSubmit}
                disabled={loading}
              >
                {loading ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={[styles.primaryButtonText, { marginLeft: 8 }]}>Kuongorora pasiwedhi...</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryButtonText}>Pinda muAkaundi</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* STEP 2: 6-Digit Code */}
              <Text style={styles.cardTitle}>
                {channel === 'sms' ? 'Tarisa foni yako (SMS)' : 'Tarisa email yako'}
              </Text>
              <Text style={styles.cardSub}>
                Takutumira kodhi ye 6-digits pa <Text style={{ fontWeight: 'bold' }}>{destinationDisplay}</Text>.
              </Text>

              {errorMsg ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              <Text style={styles.fieldLabel}>Kodhi ye 6-Digits</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="key-outline" size={20} color="#666666" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="000000"
                  placeholderTextColor="#999999"
                  value={code}
                  onChangeText={handleCodeChange}
                  keyboardType="numeric"
                  maxLength={6}
                  autoFocus={true}
                />
              </View>

              {/* Submit Code Button */}
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleCodeSubmit}
                disabled={loading}
              >
                {loading ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={[styles.primaryButtonText, { marginLeft: 8 }]}>Kupinda...</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryButtonText}>Simbisa Kodhi</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backLink}
                onPress={() => { setStep('credentials'); setCode(''); setErrorMsg(''); }}
              >
                <Text style={styles.backLinkText}>Dzokera pakupinda</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Toggle Register */}
          <View style={styles.registerToggleRow}>
            <Text style={styles.registerToggleText}>Hausati wava neakaundi?</Text>
            <TouchableOpacity onPress={onNavigateRegister}>
              <Text style={styles.registerToggleLink}> Gadzira Akaundi</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Server Config Toggle */}
        <TouchableOpacity
          style={styles.serverToggle}
          onPress={() => setShowServerInput(!showServerInput)}
        >
          <Ionicons name="settings-outline" size={15} color="#888888" />
          <Text style={styles.serverToggleText}>
            {showServerInput ? 'Viga server settings' : 'Server settings'}
          </Text>
        </TouchableOpacity>

        {showServerInput && (
          <View style={styles.serverCard}>
            <Text style={styles.serverLabel}>Custom Backend URL:</Text>
            <TextInput
              style={styles.serverInput}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://192.168.1.X:8080"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {serverSavedMsg ? (
              <Text style={styles.serverSuccessMsg}>{serverSavedMsg}</Text>
            ) : null}
            <TouchableOpacity style={styles.serverSaveBtn} onPress={handleSaveServer}>
              <Text style={styles.serverSaveBtnText}>Chengetedza Server</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F8',
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 64,
    height: 64,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#141413',
  },
  subtitle: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#141413',
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
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 6,
    marginTop: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 9999,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 10,
    backgroundColor: '#FAFAFA',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#141413',
    height: '100%',
  },
  codeInput: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 6,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  eyeBtn: {
    padding: 6,
  },
  channelRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  channelPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  channelPillActive: {
    borderColor: '#2E7D32',
    backgroundColor: 'rgba(46, 125, 50, 0.08)',
  },
  channelText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  channelTextActive: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#2E7D32',
    height: 48,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '600',
  },
  backLink: {
    alignItems: 'center',
    marginTop: 14,
  },
  backLinkText: {
    color: '#666666',
    fontSize: 13,
  },
  registerToggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },
  registerToggleText: {
    fontSize: 13,
    color: '#666666',
  },
  registerToggleLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
  },
  serverToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  serverToggleText: {
    fontSize: 12,
    color: '#888888',
  },
  serverCard: {
    marginTop: 10,
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serverLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 6,
  },
  serverInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    fontSize: 13,
    marginBottom: 8,
  },
  serverSuccessMsg: {
    color: '#16A34A',
    fontSize: 11,
    marginBottom: 6,
  },
  serverSaveBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  serverSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default LoginScreen;
