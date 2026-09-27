import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Animated, KeyboardAvoidingView,
  Platform, Alert, Image, Modal, StatusBar, Dimensions, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import MessageBubble from '../components/MessageBubble';
import { useChat } from '../hooks/useChat';
import { getSystemKey, saveSystemKey } from '../utils/storage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 320);

const getGreeting = (name) => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return `Wamuka sei, ${name}`;
  if (h >= 12 && h < 17) return `Waswera sei, ${name}`;
  return `Manheru akanaka, ${name}`;
};

const TypingIndicator = ({ darkMode }) => {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    dots.forEach((dot, i) => {
      Animated.loop(Animated.sequence([
        Animated.delay(i * 150),
        Animated.timing(dot, { toValue: -6, duration: 280, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.delay(400),
      ])).start();
    });

    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.typingRow}>
      <Animated.View style={[styles.typingAvatar, { transform: [{ rotate: spin }] }]}>
        <Ionicons name="sparkles" size={13} color="#FFFFFF" />
      </Animated.View>
      <View style={[styles.typingBubble, { backgroundColor: darkMode ? '#262626' : '#F0EFE9' }]}>
        <Text style={[styles.typingText, { color: darkMode ? '#CCCCCC' : '#444444' }]}>
          Ruzivo ruri kuronga mhinduro
        </Text>
        <View style={styles.dotsRow}>
          {dots.map((dot, i) => (
            <Animated.View key={i} style={[styles.dot, { backgroundColor: '#2E7D32', transform: [{ translateY: dot }] }]} />
          ))}
        </View>
      </View>
    </View>
  );
};

const ChatScreen = ({ username = 'Recall', onLogout }) => {
  const [input, setInput] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [profilePic, setProfilePic] = useState(null);

  // Modals for Drawer links
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [filesModalOpen, setFilesModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [systemKey, setSystemKey] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const {
    messages,
    loading,
    sendMessage,
    uploadFile,
    conversations,
    currentChatId,
    startNewChat,
    loadChat,
    deleteChat,
    filesList,
    clearFiles
  } = useChat();

  const flatListRef = useRef(null);

  // Load saved system key
  useEffect(() => {
    (async () => {
      const key = await getSystemKey();
      if (key) setSystemKey(key);
    })();
  }, []);

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(drawerAnim, {
      toValue: -DRAWER_WIDTH,
      duration: 220,
      useNativeDriver: false,
    }).start(() => setDrawerOpen(false));
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    setFilePreview(null);
    await sendMessage(text);
  };

  const handleDocumentUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf',
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
               'text/plain'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        setFilePreview({ name: file.name, type: 'document' });
        await uploadFile(file.uri, file.name, file.mimeType);
      }
    } catch {
      const msg = 'Handikwanisi kuvhura faira.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Kukanganisa', msg);
    }
  };

  const handleImageUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        setFilePreview({ name: 'Mufananidzo', type: 'image' });
        await uploadFile(file.uri, 'image.jpg', 'image/jpeg');
      }
    } catch {
      const msg = 'Handikwanisi kuvhura mufananidzo.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Kukanganisa', msg);
    }
  };

  const handleProfilePic = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setProfilePic(result.assets[0].uri);
  };

  const handleSaveSettings = async () => {
    if (systemKey.trim()) {
      await saveSystemKey(systemKey.trim());
    }
    setSaveStatus('Zvirongwa zvakachengetedzwa!');
    setTimeout(() => {
      setSaveStatus('');
      setSettingsOpen(false);
    }, 1200);
  };

  const activeChat = conversations.find(c => c.id === currentChatId);

  const t = {
    bg: darkMode ? '#121212' : '#F9F8F5',
    card: darkMode ? '#1E1E1E' : '#FFFFFF',
    sidebar: darkMode ? '#181818' : '#FAF9F6',
    text: darkMode ? '#FFFFFF' : '#1A1A1A',
    sub: darkMode ? '#AAAAAA' : '#666666',
    border: darkMode ? '#2E2E2E' : '#E8E5DF',
    icon: darkMode ? '#CCCCCC' : '#444444',
    accent: '#2E7D32',
  };

  const navItems = [
    {
      icon: 'chatbubbles-outline',
      label: 'Nhaurirano',
      sub: activeChat ? activeChat.title : 'Hurukuro yemazuva ano',
      action: () => closeDrawer()
    },
    {
      icon: 'time-outline',
      label: 'Nhoroondo',
      sub: `${conversations.length} dzakachengetwa`,
      action: () => { closeDrawer(); setHistoryModalOpen(true); }
    },
    {
      icon: 'document-text-outline',
      label: 'Mafaira',
      sub: `${filesList.length} mafaira akaiswa`,
      action: () => { closeDrawer(); setFilesModalOpen(true); }
    },
    {
      icon: 'settings-outline',
      label: 'Zvigadziriso',
      sub: 'Kiyi yeSisitemu neChitarisiko',
      action: () => { closeDrawer(); setSettingsOpen(true); }
    },
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />

      {/* Top Mobile Header Bar */}
      <View style={[styles.topHeader, { backgroundColor: t.card, borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={openDrawer} style={styles.headerBtn}>
          <Ionicons name="menu-outline" size={24} color={t.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: t.text }]} numberOfLines={1}>
            {activeChat && activeChat.title !== 'Hurukuro Itsva' ? activeChat.title : 'Ruzivo AI'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: t.sub }]}>Mubatsiri weChiShona • MSU</Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity onPress={() => startNewChat()} style={styles.headerBtn} title="Tanga Itsva">
            <Ionicons name="create-outline" size={22} color={t.accent} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSettingsOpen(true)} style={styles.headerBtn}>
            <Ionicons name="settings-outline" size={20} color={t.icon} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Full-Width Chat Screen */}
      <View style={styles.chatContainer}>
        {messages.length === 0 ? (
          <View style={styles.greetingContainer}>
            <View style={[styles.bigLogo, { backgroundColor: t.accent }]}>
              <Text style={styles.bigLogoText}>R</Text>
            </View>
            <Text style={[styles.greetingText, { color: t.text }]}>{getGreeting(username)}</Text>
            <Text style={[styles.greetingSub, { color: t.sub }]}>
              Bvunza mubvunzo maererano nemutauro weChiShona, tsika, tsumo, kana zvidzidzo.
            </Text>

            <View style={styles.suggestionsContainer}>
              {[
                'Tsanangura tsumo inoti: Chara chimwe hachitswanyi inda',
                'Ndipe madimikira eChiShona anoreva kufara',
                'Ndezvipi zvikamu zvekutaura muChiShona?',
                'Tsanangura tsika yeKurova Guva'
              ].map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.suggestionPill, { backgroundColor: t.card, borderColor: t.border }]}
                  onPress={() => sendMessage(s)}
                >
                  <Ionicons name="sparkles-outline" size={14} color={t.accent} style={{ marginRight: 6 }} />
                  <Text style={[styles.suggestionText, { color: t.text }]} numberOfLines={2}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MessageBubble message={item} darkMode={darkMode} />}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            style={styles.messageList}
            contentContainerStyle={styles.messageListContent}
          />
        )}

        {loading && <TypingIndicator darkMode={darkMode} />}

        {filePreview && (
          <View style={[styles.filePreview, { backgroundColor: t.card, borderColor: t.border }]}>
            <Ionicons name={filePreview.type === 'image' ? 'image-outline' : 'document-outline'} size={16} color={t.accent} />
            <Text style={[{ flex: 1, fontSize: 13, color: t.text }]} numberOfLines={1}>{filePreview.name}</Text>
            <TouchableOpacity onPress={() => setFilePreview(null)}>
              <Ionicons name="close-circle" size={18} color={t.sub} />
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Full-Width Mobile Input Dock */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inputWrapper}>
          <View style={[styles.inputCard, { backgroundColor: t.card, borderColor: t.border }]}>
            <TextInput
              style={[styles.textInput, { color: t.text }]}
              placeholder="Bvunza mubvunzo muChiShona..."
              placeholderTextColor={t.sub}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
            />

            <View style={styles.inputActionsRow}>
              <View style={styles.attachmentButtons}>
                <TouchableOpacity onPress={handleDocumentUpload} style={styles.actionBtn}>
                  <Ionicons name="attach-outline" size={20} color={t.icon} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleImageUpload} style={styles.actionBtn}>
                  <Ionicons name="image-outline" size={20} color={t.icon} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionBtn} 
                  onPress={() => {
                    const msg = 'Kushandisa inzwi kuchavepo mune ramangwana (Voice feature coming in future update).';
                    if (Platform.OS === 'web') window.alert(msg);
                    else Alert.alert('Inzwi', msg);
                  }}
                >
                  <Ionicons name="mic-outline" size={20} color={t.icon} />
                </TouchableOpacity>
              </View>

              <View style={styles.sendArea}>
                <Text style={[styles.charCount, { color: t.sub }]}>{input.length}/500</Text>
                <TouchableOpacity
                  onPress={handleSend}
                  style={[styles.sendBtn, { backgroundColor: input.trim().length > 0 ? t.accent : '#CCCCCC' }]}
                  disabled={loading || input.trim().length === 0}
                >
                  <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <Text style={[styles.disclaimer, { color: t.sub }]}>
            Ruzivo AI • Dzidzo yeChiShona yakasimbiswa paMidlands State University
          </Text>
        </KeyboardAvoidingView>
      </View>

      {/* Slide-Over Drawer Overlay */}
      {drawerOpen && (
        <View style={StyleSheet.absoluteFill}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closeDrawer} />
          <Animated.View style={[styles.drawer, { width: DRAWER_WIDTH, transform: [{ translateX: drawerAnim }], backgroundColor: t.sidebar }]}>
            <View style={styles.drawerHeader}>
              <View style={styles.drawerBrand}>
                <View style={[styles.logoBadge, { backgroundColor: t.accent }]}>
                  <Text style={styles.logoBadgeText}>R</Text>
                </View>
                <View>
                  <Text style={[styles.drawerTitle, { color: t.text }]}>Ruzivo AI</Text>
                  <Text style={[styles.drawerSub, { color: t.sub }]}>ChiShona Core</Text>
                </View>
              </View>
              <TouchableOpacity onPress={closeDrawer} style={styles.drawerCloseBtn}>
                <Ionicons name="close" size={22} color={t.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.newChatBtn, { backgroundColor: t.accent }]} 
              onPress={() => {
                closeDrawer();
                startNewChat();
              }}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.newChatText}>Nhaurirano Itsva</Text>
            </TouchableOpacity>

            <View style={styles.drawerNavList}>
              {navItems.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.drawerNavItem}
                  onPress={item.action}
                >
                  <Ionicons name={item.icon} size={20} color={t.icon} style={{ width: 26 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.drawerNavLabel, { color: t.text }]}>{item.label}</Text>
                    <Text style={[styles.drawerNavSub, { color: t.sub }]}>{item.sub}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={t.sub} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.drawerFooter, { borderTopColor: t.border }]}>
              <TouchableOpacity style={styles.drawerNavItem} onPress={() => setDarkMode(!darkMode)}>
                <Ionicons name={darkMode ? 'sunny-outline' : 'moon-outline'} size={20} color={t.icon} style={{ width: 26 }} />
                <Text style={[styles.drawerNavLabel, { color: t.text }]}>{darkMode ? 'Ruvara: Chiedza' : 'Ruvara: Rima'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.profileRow} onPress={handleProfilePic}>
                {profilePic ? (
                  <Image source={{ uri: profilePic }} style={styles.profilePic} />
                ) : (
                  <View style={[styles.profilePicDefault, { backgroundColor: t.accent }]}>
                    <Text style={styles.profilePicLetter}>{username[0].toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.profileName, { color: t.text }]}>{username}</Text>
                  <Text style={[styles.profileSub, { color: t.sub }]}>Mudzidzi</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
                <Ionicons name="log-out-outline" size={18} color="#DC2626" />
                <Text style={styles.logoutText}>Buda (Log Out)</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}

      {/* History Modal */}
      <Modal visible={historyModalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: t.card }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="time-outline" size={22} color={t.accent} />
                <Text style={[styles.modalTitle, { color: t.text }]}>Nhoroondo dzeHurukuro</Text>
              </View>
              <TouchableOpacity onPress={() => setHistoryModalOpen(false)}>
                <Ionicons name="close" size={22} color={t.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360, marginVertical: 8 }}>
              {conversations.length === 0 ? (
                <Text style={{ textAlign: 'center', color: t.sub, paddingVertical: 20 }}>
                  Hapana hurukuro dzakachengetwa.
                </Text>
              ) : (
                conversations.map(c => (
                  <View key={c.id} style={[styles.historyCard, { backgroundColor: t.bg, borderColor: t.border }]}>
                    <TouchableOpacity
                      style={{ flex: 1 }}
                      onPress={() => {
                        loadChat(c.id);
                        setHistoryModalOpen(false);
                      }}
                    >
                      <Text style={[styles.historyCardTitle, { color: t.text }]} numberOfLines={1}>
                        {c.title || 'Hurukuro'}
                      </Text>
                      <Text style={[styles.historyCardSub, { color: t.sub }]}>
                        {(c.messages || []).length} mhinduro • {new Date(c.timestamp).toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteChat(c.id)}
                      style={{ padding: 6 }}
                      title="Dzima"
                    >
                      <Ionicons name="trash-outline" size={18} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: t.accent, marginTop: 10 }]}
              onPress={() => {
                setHistoryModalOpen(false);
                startNewChat();
              }}
            >
              <Text style={styles.modalSaveText}>+ Tanga Hurukuro Itsva</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Files Modal */}
      <Modal visible={filesModalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: t.card }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="document-text-outline" size={22} color={t.accent} />
                <Text style={[styles.modalTitle, { color: t.text }]}>Mafaira Akaiswa</Text>
              </View>
              <TouchableOpacity onPress={() => setFilesModalOpen(false)}>
                <Ionicons name="close" size={22} color={t.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300, marginVertical: 8 }}>
              {filesList.length === 0 ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <Ionicons name="cloud-upload-outline" size={36} color={t.sub} style={{ marginBottom: 8 }} />
                  <Text style={{ textAlign: 'center', color: t.sub }}>
                    Hapana gwaro kana mufananidzo wakaiswa panguva ino.
                  </Text>
                </View>
              ) : (
                filesList.map((f, i) => (
                  <View key={i} style={[styles.historyCard, { backgroundColor: t.bg, borderColor: t.border }]}>
                    <Ionicons name="document-outline" size={20} color={t.accent} style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.historyCardTitle, { color: t.text }]} numberOfLines={1}>{f.name}</Text>
                      <Text style={[styles.historyCardSub, { color: t.sub }]}>{new Date(f.uploadedAt).toLocaleTimeString()}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { flex: 1, backgroundColor: t.accent }]}
                onPress={() => {
                  setFilesModalOpen(false);
                  handleDocumentUpload();
                }}
              >
                <Text style={styles.modalSaveText}>+ Wedzera Gwaro</Text>
              </TouchableOpacity>
              {filesList.length > 0 && (
                <TouchableOpacity
                  style={[styles.modalSaveBtn, { backgroundColor: '#DC2626' }]}
                  onPress={clearFiles}
                >
                  <Text style={styles.modalSaveText}>Bvisa Zvose</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={settingsOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: t.card }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="settings-outline" size={22} color={t.accent} />
                <Text style={[styles.modalTitle, { color: t.text }]}>Zvirongwa zveSisitemu</Text>
              </View>
              <TouchableOpacity onPress={() => setSettingsOpen(false)}>
                <Ionicons name="close" size={22} color={t.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: t.text }]}>Kiyi yeSisitemu (System Key)</Text>
            <Text style={[styles.modalDesc, { color: t.sub }]}>
              Isa kiyi inobatanidza interface ino neInjini yeMutauro (Language Core Engine).
            </Text>
            <TextInput
              style={[styles.modalInput, { color: t.text, borderColor: t.border, backgroundColor: t.bg }]}
              placeholder="Isa kiyi yako pano..."
              placeholderTextColor={t.sub}
              value={systemKey}
              onChangeText={setSystemKey}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            {saveStatus ? (
              <Text style={{ color: '#16A34A', fontSize: 13, marginBottom: 10, fontWeight: '600', textAlign: 'center' }}>
                {saveStatus}
              </Text>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: t.accent }]}
                onPress={handleSaveSettings}
              >
                <Text style={styles.modalSaveText}>Chengetedza Kiyi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  topHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  headerBtn: { padding: 8, borderRadius: 8 },
  headerTitleContainer: { flex: 1, alignItems: 'center', marginHorizontal: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerSubtitle: { fontSize: 10.5 },
  headerRightActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chatContainer: { flex: 1, width: '100%' },
  messageList: { flex: 1, width: '100%' },
  messageListContent: { paddingHorizontal: 12, paddingVertical: 12 },
  greetingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  bigLogo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  bigLogoText: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold' },
  greetingText: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  greetingSub: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  suggestionsContainer: { width: '100%', gap: 10 },
  suggestionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  suggestionText: { fontSize: 13, flex: 1, lineHeight: 18 },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8 },
  typingAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#2E7D32', justifyContent: 'center', alignItems: 'center' },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  typingText: { fontSize: 12.5, fontWeight: '500' },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  inputWrapper: { paddingHorizontal: 12, paddingBottom: 10 },
  inputCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
  },
  textInput: {
    fontSize: 15,
    maxHeight: 100,
    minHeight: 38,
    paddingVertical: 4,
    outlineStyle: 'none',
  },
  inputActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  attachmentButtons: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionBtn: { padding: 6, borderRadius: 8 },
  sendArea: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  charCount: { fontSize: 11 },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disclaimer: { fontSize: 10.5, textAlign: 'center', marginTop: 6 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  drawerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBadge: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  logoBadgeText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  drawerTitle: { fontSize: 18, fontWeight: 'bold' },
  drawerSub: { fontSize: 11 },
  drawerCloseBtn: { padding: 6 },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 10,
    marginBottom: 20,
  },
  newChatText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  drawerNavList: { flex: 1, gap: 4 },
  drawerNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  drawerNavLabel: { fontSize: 14, fontWeight: '500' },
  drawerNavSub: { fontSize: 11 },
  drawerFooter: { borderTopWidth: 1, paddingTop: 14, gap: 10 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  profilePic: { width: 36, height: 36, borderRadius: 18 },
  profilePicDefault: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  profilePicLetter: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  profileName: { fontSize: 14, fontWeight: '600' },
  profileSub: { fontSize: 11 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6 },
  logoutText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalLabel: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  modalDesc: { fontSize: 12, lineHeight: 17, marginBottom: 12 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 16,
  },
  modalActions: { alignItems: 'flex-end' },
  modalSaveBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8, alignItems: 'center' },
  modalSaveText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  historyCardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  historyCardSub: { fontSize: 11 },
});

export default ChatScreen;
