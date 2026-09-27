import { useState, useCallback, useEffect } from 'react';
import { chatAPI, asrAPI, fileAPI } from '../services/api';
import { getStoredConversations, saveStoredConversations } from '../utils/storage';

export const useChat = () => {
  const [conversations, setConversations] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fileContext, setFileContext] = useState(null);
  const [filesList, setFilesList] = useState([]);

  // Load saved conversations on mount
  useEffect(() => {
    (async () => {
      const stored = await getStoredConversations();
      if (stored && stored.length > 0) {
        setConversations(stored);
        setCurrentChatId(stored[0].id);
        setMessages(stored[0].messages || []);
      } else {
        const initialId = Date.now().toString();
        const initialChat = { id: initialId, title: 'Hurukuro Itsva', messages: [], timestamp: new Date().toISOString() };
        setConversations([initialChat]);
        setCurrentChatId(initialId);
        setMessages([]);
      }
    })();
  }, []);

  // Sync active messages into current conversation & persistent storage
  const syncAndSave = useCallback((newMsgs, chatId) => {
    setConversations(prev => {
      const idToUpdate = chatId || currentChatId;
      const updated = prev.map(c => {
        if (c.id === idToUpdate) {
          let title = c.title;
          if (title === 'Hurukuro Itsva' && newMsgs.length > 0) {
            const firstUser = newMsgs.find(m => m.role === 'user');
            if (firstUser) {
              title = firstUser.content.slice(0, 24) + (firstUser.content.length > 24 ? '...' : '');
            }
          }
          return { ...c, title, messages: newMsgs, timestamp: new Date().toISOString() };
        }
        return c;
      });
      saveStoredConversations(updated);
      return updated;
    });
  }, [currentChatId]);

  const addMessage = useCallback((role, content) => {
    const msg = { id: Date.now().toString(), role, content, timestamp: new Date().toISOString() };
    setMessages(prev => {
      const next = [...prev, msg];
      syncAndSave(next, currentChatId);
      return next;
    });
    return msg;
  }, [currentChatId, syncAndSave]);

  const sendMessage = useCallback(async (text) => {
    const userMsg = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date().toISOString() };
    let updatedMsgs = [];
    setMessages(prev => {
      updatedMsgs = [...prev, userMsg];
      syncAndSave(updatedMsgs, currentChatId);
      return updatedMsgs;
    });

    setLoading(true);
    try {
      const historySnippet = messages.slice(-4).map(m => (m.role === 'user' ? 'Mushandisi: ' : 'Ruzivo: ') + m.content).join('\n');
      const res = await chatAPI(text, currentChatId, fileContext, null, historySnippet);
      const botReply = res.response || 'Handina mhinduro panguva ino.';
      const botMsg = { id: (Date.now() + 1).toString(), role: 'assistant', content: botReply, timestamp: new Date().toISOString() };
      setMessages(prev => {
        const next = [...prev, botMsg];
        syncAndSave(next, currentChatId);
        return next;
      });
    } catch (e) {
      console.log('Chat API Error:', e.message, e.response?.data || e);
      const errMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: e.response?.data?.response || e.response?.data?.detail || 'Pane dambudziko rekubatana neCore server. Tarisa kana server yakabatidzwa.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => {
        const next = [...prev, errMsg];
        syncAndSave(next, currentChatId);
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, [fileContext, currentChatId, syncAndSave]);

  const startNewChat = useCallback(() => {
    const newId = Date.now().toString();
    const newChat = {
      id: newId,
      title: 'Hurukuro Itsva',
      messages: [],
      timestamp: new Date().toISOString()
    };
    setConversations(prev => {
      const next = [newChat, ...prev];
      saveStoredConversations(next);
      return next;
    });
    setCurrentChatId(newId);
    setMessages([]);
    setFileContext(null);
  }, []);

  const loadChat = useCallback((id) => {
    const chat = conversations.find(c => c.id === id);
    if (chat) {
      setCurrentChatId(id);
      setMessages(chat.messages || []);
    }
  }, [conversations]);

  const deleteChat = useCallback((id) => {
    setConversations(prev => {
      const next = prev.filter(c => c.id !== id);
      saveStoredConversations(next);
      if (currentChatId === id) {
        if (next.length > 0) {
          setCurrentChatId(next[0].id);
          setMessages(next[0].messages || []);
        } else {
          startNewChat();
        }
      }
      return next;
    });
  }, [currentChatId, startNewChat]);

  const uploadFile = useCallback(async (uri, name, type) => {
    setLoading(true);
    try {
      const { text } = await fileAPI(uri, name, type);
      setFileContext(text);
      setFilesList(prev => [...prev, { uri, name, type, uploadedAt: new Date().toISOString() }]);
      addMessage('assistant', `Gwaro rakachengetwa (${name}). Inguva yako kubvunza maererano nezviri mairi.`);
    } catch (e) {
      addMessage('assistant', 'Handikwanisi kuvhura faira. Ndapota edza zvakare.');
    } finally {
      setLoading(false);
    }
  }, [addMessage]);

  const clearFiles = useCallback(() => {
    setFileContext(null);
    setFilesList([]);
  }, []);

  return {
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
    clearFiles,
  };
};
