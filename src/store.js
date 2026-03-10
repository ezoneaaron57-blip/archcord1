// src/store.js
import { create } from 'zustand'

export const useStore = create((set) => ({
  me: null,
  setMe: (me) => set({ me }),

  servers: [],
  setServers: (servers) => set({ servers }),

  activeServer: null,
  setActiveServer: (s) => set({ activeServer: s }),

  channels: [],
  setChannels: (channels) => set({ channels }),

  activeChannel: null,
  setActiveChannel: (c) => set({ activeChannel: c }),

  members: [],
  setMembers: (members) => set({ members }),

  onlineUsers: {},
  setOnlineUsers: (onlineUsers) => set({ onlineUsers }),

  unread: {},
  markUnread: (channelId) => set(state => ({
    unread: { ...state.unread, [channelId]: (state.unread[channelId] || 0) + 1 }
  })),
  clearUnread: (channelId) => set(state => ({
    unread: { ...state.unread, [channelId]: 0 }
  })),

  typingUsers: {},
  setTypingUsers: (channelId, users) => set(state => ({
    typingUsers: { ...state.typingUsers, [channelId]: users }
  })),

  dmUsers: [],
  setDmUsers: (dmUsers) => set({ dmUsers }),

  activeDm: null,
  setActiveDm: (dm) => set({ activeDm: dm }),
}))
