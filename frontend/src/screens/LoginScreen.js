import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';

const LoginScreen = ({ onLogin, onNavigateRegister, onGuestLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Tidzidzise', 'Nyora zita rako nepasiwadhi.');
      return;
    }
    setLoading(true);
    try {
      await onLogin(username.trim(), password.trim());
    } catch (e) {
      Alert.alert('Kukanganisa', e?.response?.data?.detail || 'Zita kana pasiwadhi haina kururama.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ruzivo</Text>
      <Text style={styles.subtitle}>Pinda muAI yeShona</Text>
      <TextInput style={styles.input} placeholder="Zita rako" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
      <TextInput style={styles.input} placeholder="Pasiwadhi" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Pinda</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={onNavigateRegister}>
        <Text style={styles.link}>Hausina account? Nyoresa pano</Text>
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
  button: { backgroundColor: '#2E7D32', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  link: { color: '#2E7D32', textAlign: 'center', fontSize: 14 },
  guestButton: { marginTop: 24, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#C8E6C9', backgroundColor: '#F1F8E9', alignItems: 'center' },
  guestText: { color: '#2E7D32', fontSize: 14, fontWeight: '600' },
});

export default LoginScreen;
