import { create } from 'zustand';
import { Message } from '@types/index';

interface ChatStore {
  messages: Record<string, Message[]>;
  isTyping: boolean;
  currentProjectId: string | null;

  setMessages: (projectId: string, messages: Message[]) => void;
  addMessage: (projectId: string, message: Message) => void;
  updateMessage: (projectId: string, messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (projectId: string, messageId: string) => void;
  clearMessages: (projectId: string) => void;
  setIsTyping: (isTyping: boolean) => void;
  setCurrentProjectId: (projectId: string | null) => void;
  getProjectMessages: (projectId: string) => Message[];
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: {},
  isTyping: false,
  currentProjectId: null,

  setMessages: (projectId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [projectId]: messages },
    })),

  addMessage: (projectId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [projectId]: [...(state.messages[projectId] || []), message],
      },
    })),

  updateMessage: (projectId, messageId, updates) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [projectId]: (state.messages[projectId] || []).map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        ),
      },
    })),

  deleteMessage: (projectId, messageId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [projectId]: (state.messages[projectId] || []).filter(
          (msg) => msg.id !== messageId
        ),
      },
    })),

  clearMessages: (projectId) =>
    set((state) => ({
      messages: { ...state.messages, [projectId]: [] },
    })),

  setIsTyping: (isTyping) => set({ isTyping }),

  setCurrentProjectId: (projectId) => set({ currentProjectId: projectId }),

  getProjectMessages: (projectId) => get().messages[projectId] || [],
}));
