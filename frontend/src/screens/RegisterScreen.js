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
import { register } from '../services/auth';

const SQL_XSS_REGEX = /(<\s*script\b[^>]*>|<\s*\/script\s*>|<\s*script|<\s*(iframe|object|embed|svg|img|style|link|body|meta|base|form|input)\b|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|on(error|load|mouseover|click|focus|blur|change|submit|keydown|keyup|keypress)\s*=|document\.(cookie|location|write)|eval\s*\(|alert\s*\(|prompt\s*\(|confirm\s*\(|\bUNION\s+(ALL\s+)?SELECT\b|\bSELECT\s+.+\s+FROM\b|\bINSERT\s+INTO\b|\bUPDATE\s+.+\s+SET\b|\bDELETE\s+FROM\b|\bDROP\s+(TABLE|DATABASE|VIEW|COLUMN)\b|\bALTER\s+TABLE\b|\bEXEC(\s+XP_)?\b|\bOR\s+['"]?\w+['"]?\s*=\s*['"]?\w+|\bAND\s+['"]?\w+['"]?\s*=\s*['"]?\w+|--|\/\*|\*\/|;\s*SHUTDOWN|;\s*DROP)/i;

const RegisterScreen = ({ onRegisterSuccess, onNavigateLogin, onGuestLogin }) => {
  const insets = useSafeAreaInsets();
  
  // Step-by-step required fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI states
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

  // Real-time pure name validation
  const handleNameChange = (text, setter, label) => {
    setter(text);
    if (/[0-9]/.test(text)) {
      showError(`${label} harifaniri kuve nenhamba (No numbers in name).`);
    } else if (/[^a-zA-Z\s'-]/.test(text)) {
      showError(`${label} harifaniri kuve nezviratidzo zvakasiyana (No symbols in name).`);
    } else if (SQL_XSS_REGEX.test(text)) {
      showError('Zvinonyorwa zvine njodzi yekupaza sisitimu (SQL / XSS injection blocked).');
    } else {
      if (errorMsg.includes(label) || errorMsg.includes('injection blocked')) showError('');
    }
  };

  // Real-time phone sanitization: only digits and leading +
  const handlePhoneChange = (text) => {
    let cleaned = text.replace(/[^0-9+\s\-()]/g, '');
    if (cleaned.indexOf('+') > 0) {
      cleaned = cleaned[0] + cleaned.slice(1).replace(/\+/g, '');
    }
    setPhone(cleaned);
    if (text !== cleaned) {
      showError('Nhamba yefoni inongobvumidza manhamba chete (Numbers and + only).');
    } else {
      if (errorMsg.includes('Nhamba yefoni')) showError('');
    }
  };

  // Password complexity check
  const evaluateComplexity = (pwd) => {
    const val = pwd || '';
    const lenMet = val.length >= 8 && val.length <= 24;
    const upperMet = /[A-Z]/.test(val);
    const lowerMet = /[a-z]/.test(val);
    const numMet = /[0-9]/.test(val);
    const specialMet = /[^a-zA-Z0-9]/.test(val);
    return { isValid: lenMet && upperMet && lowerMet && numMet && specialMet, lenMet, upperMet, lowerMet, numMet, specialMet };
  };

  const handleRegister = async () => {
    showError('');
    if (!firstName.trim() || !lastName.trim()) {
      showError('Ndapota zadzai First name pamwe ne Last name.');
      return;
    }
    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      showError('Kero yeEmail haisi pachokwadi (e.g. zita@chikoro.ac.zw).');
      return;
    }
    if (SQL_XSS_REGEX.test(email) || SQL_XSS_REGEX.test(firstName) || SQL_XSS_REGEX.test(lastName)) {
      showError('Zvinonyorwa zvine njodzi yekupaza sisitimu (SQL / XSS injection blocked).');
      return;
    }
    const pwdRes = evaluateComplexity(password);
    if (!pwdRes.isValid) {
      showError('Pasiwedhi inofanira kuve pakati pe 8 ne 24 mavara, iine vara guru, vara diki, nhamba, nechiratidzo (!@#$).');
      return;
    }
    if (password !== confirmPassword) {
      showError('Mapasiwedhi haasi kuenderana (Passwords do not match).');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: password,
        confirmPassword: confirmPassword
      });
      if (onRegisterSuccess) {
        onRegisterSuccess(res.username || `${firstName} ${lastName}`.trim());
      }
    } catch (e) {
      const err = e?.response?.data?.detail || 'Kunyoresa hakuna kubudirira. Edza zvakare kana kutarisa server.';
      showError(err);
      if (Platform.OS === 'web') window.alert(err);
      else Alert.alert('Kukanganisa', err);
    } finally {
      setLoading(false);
    }
  };

  const pwdReqs = evaluateComplexity(password);

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
          <Text style={styles.cardTitle}>Gadzira Akaundi (Sign Up)</Text>
          <Text style={styles.cardSub}>Zadzai tsanangudzo dzenyu pazasi:</Text>

          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* First Name & Last Name */}
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>First Name</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Zita"
                  placeholderTextColor="#999999"
                  value={firstName}
                  onChangeText={(t) => handleNameChange(t, setFirstName, 'First name')}
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Last Name</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Mutupo"
                  placeholderTextColor="#999999"
                  value={lastName}
                  onChangeText={(t) => handleNameChange(t, setLastName, 'Last name')}
                  autoCorrect={false}
                />
              </View>
            </View>
          </View>

          {/* Email */}
          <Text style={styles.fieldLabel}>Email</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#666666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. zita@chikoro.ac.zw"
              placeholderTextColor="#999999"
              value={email}
              onChangeText={(t) => { setEmail(t); setErrorMsg(''); }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
          </View>

          {/* Phone (Optional) */}
          <Text style={styles.fieldLabel}>Phone (Optional, e.g. +263771234567)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color="#666666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="+263771234567"
              placeholderTextColor="#999999"
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
            />
          </View>

          {/* Password */}
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
              contextMenuHidden={true}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666666" />
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <Text style={styles.fieldLabel}>Dzokorora Pasiwedhi (Confirm Password)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#999999"
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setErrorMsg(''); }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              contextMenuHidden={true}
            />
          </View>

          {/* Password checklist */}
          <View style={styles.pwdBox}>
            <Text style={[styles.pwdItem, pwdReqs.lenMet ? styles.pwdItemMet : styles.pwdItemUnmet]}>
              {pwdReqs.lenMet ? '✓' : '•'} Mavara ari pakati pe 8 ne 24
            </Text>
            <Text style={[styles.pwdItem, pwdReqs.upperMet ? styles.pwdItemMet : styles.pwdItemUnmet]}>
              {pwdReqs.upperMet ? '✓' : '•'} Vara guru (A-Z)
            </Text>
            <Text style={[styles.pwdItem, pwdReqs.lowerMet ? styles.pwdItemMet : styles.pwdItemUnmet]}>
              {pwdReqs.lowerMet ? '✓' : '•'} Vara diki (a-z)
            </Text>
            <Text style={[styles.pwdItem, pwdReqs.numMet ? styles.pwdItemMet : styles.pwdItemUnmet]}>
              {pwdReqs.numMet ? '✓' : '•'} Nhamba (0-9)
            </Text>
            <Text style={[styles.pwdItem, pwdReqs.specialMet ? styles.pwdItemMet : styles.pwdItemUnmet]}>
              {pwdReqs.specialMet ? '✓' : '•'} Chiratidzo (!@#$%^&*)
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={[styles.primaryButtonText, { marginLeft: 8 }]}>Kugadzira akaundi...</Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>Gadzira Akaundi</Text>
            )}
          </TouchableOpacity>

          {/* Toggle Login */}
          <View style={styles.registerToggleRow}>
            <Text style={styles.registerToggleText}>Wakatonyoresa kare?</Text>
            <TouchableOpacity onPress={onNavigateLogin}>
              <Text style={styles.registerToggleLink}> Pinda</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  col: {
    flex: 1,
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
  eyeBtn: {
    padding: 6,
  },
  pwdBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
    gap: 4,
  },
  pwdItem: {
    fontSize: 11.5,
  },
  pwdItemMet: {
    color: '#16A34A',
    fontWeight: '600',
  },
  pwdItemUnmet: {
    color: '#64748B',
  },
  primaryButton: {
    backgroundColor: '#2E7D32',
    height: 48,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
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
});

export default RegisterScreen;
