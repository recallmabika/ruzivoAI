import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from './src/hooks/useAuth';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import MainApp from './src/navigation/MainApp';

export default function App() {
  const { isAuthenticated, currentUser, loading, handleLogin, handleRegister, handleLogout } = useAuth();
  const [showRegister, setShowRegister] = React.useState(false);
  const [guestUser, setGuestUser] = React.useState(null);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  if (!isAuthenticated && !guestUser) {
    if (showRegister) {
      return (
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <RegisterScreen
            onRegister={handleRegister}
            onNavigateLogin={() => setShowRegister(false)}
            onGuestLogin={() => setGuestUser('Muenzi')}
          />
        </SafeAreaProvider>
      );
    }
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <LoginScreen
          onLogin={handleLogin}
          onNavigateRegister={() => setShowRegister(true)}
          onGuestLogin={() => setGuestUser('Muenzi')}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <MainApp
        username={guestUser || currentUser || 'Muenzi'}
        onLogout={() => {
          setGuestUser(null);
          handleLogout();
        }}
      />
    </SafeAreaProvider>
  );
}
