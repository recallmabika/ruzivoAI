import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';

const RegisterScreen = ({ onRegister, onNavigateLogin, onGuestLogin }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');
    if (!username.trim() || !email.trim() || !password.trim()) {
      const msg = 'Zadza mabhokisi ese.';
      setError(msg);
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Tidzidzise', msg);
      return;
    }
    setLoading(true);
    try {
      await onRegister(username.trim(), email.trim(), password.trim());
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Kunyoresa hakubudiriri. Edza zvakare.';
      setError(msg);
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Kukanganisa', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ruzivo</Text>
      <Text style={styles.subtitle}>Gadzira account yako</Text>
      <TextInput style={styles.input} placeholder="Zita rako" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
      <TextInput style={styles.input} placeholder="Pasiwadhi" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Nyoresa</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={onNavigateLogin}>
        <Text style={styles.link}>Une account? Pinda pano</Text>
      </TouchableOpacity>
      {onGuestLogin && (
        <TouchableOpacity onPress={onGuestLogin} style={styles.guestButton}>
          <Text style={styles.guestText}>Enderera mberi seMuenzi (Continue as Guest) &rarr;</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 40, fontWeight: 'bold', color: '#2E7D32', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 32 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 16 },
  errorText: { color: '#c62828', fontSize: 14, textAlign: 'center', marginBottom: 12 },
  button: { backgroundColor: '#2E7D32', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  link: { color: '#2E7D32', textAlign: 'center', fontSize: 14 },
  guestButton: { marginTop: 24, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#C8E6C9', backgroundColor: '#F1F8E9', alignItems: 'center' },
  guestText: { color: '#2E7D32', fontSize: 14, fontWeight: '600' },
});

export default RegisterScreen;
