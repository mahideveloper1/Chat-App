import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { chatService, messageService, userService } from '../services/api';
import { useAuth } from './AuthContext';
import {
  getSocket,
  joinChat,
  leaveChat,
  onChatUpdated,
  onMessageReceived,
  onTyping,
  onStopTyping,
  onUserStatusChanged,
  onMessageDeliveryUpdated,
  onMessageReadUpdated,
  onMessageReactionUpdated,
  sendTyping,
  sendStopTyping,
  sendMessage,
  markMessageAsRead,
  markMessageAsDelivered,
  addReactionToMessage
} from '../services/socket';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [unreadMessages, setUnreadMessages] = useState({});
  const [onlineUsers, setOnlineUsers] = useState({});
  const [searchResults, setSearchResults] = useState([]);
  const [messagesPagination, setMessagesPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 1
  });

  // Load chats when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchChats();
      setupSocketListeners();
    }
  }, [isAuthenticated]);

  // Clean up socket listeners when component unmounts
  useEffect(() => {
    return () => {
      if (selectedChat) {
        leaveChat(selectedChat._id);
      }
    };
  }, [selectedChat]);

  // Set up socket listeners
  const setupSocketListeners = useCallback(() => {
    try {
      const socket = getSocket();

      // Listen for new messages
      onMessageReceived((message) => {
        if (selectedChat && selectedChat._id === message.chat._id) {
          // Add message to current chat
          setMessages((prevMessages) => [...prevMessages, message]);
          
          // Mark as delivered
          markMessageAsDelivered(message._id);
          
          // If from someone else, mark as read
          if (message.sender._id !== user._id) {
            markMessageAsRead(message._id);
          }
        } else {
          // Update unread messages count for other chats
          setUnreadMessages((prev) => ({
            ...prev,
            [message.chat._id]: (prev[message.chat._id] || 0) + 1
          }));
        }
      });

      // Listen for chat updates
      onChatUpdated((updatedChat) => {
        setChats((prevChats) => {
          const chatIndex = prevChats.findIndex((c) => c._id === updatedChat._id);
          
          if (chatIndex !== -1) {
            // Update existing chat
            const newChats = [...prevChats];
            newChats[chatIndex] = updatedChat;
            
            // Sort chats with latest message first
            return newChats.sort((a, b) => {
              const aDate = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(a.updatedAt);
              const bDate = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(b.updatedAt);
              return bDate - aDate;
            });
          } else {
            // Add new chat
            return [updatedChat, ...prevChats];
          }
        });
        
        // Update selected chat if it's the one being updated
        if (selectedChat && selectedChat._id === updatedChat._id) {
          setSelectedChat(updatedChat);
        }
      });

      // Listen for typing indicators
      onTyping(({ chatId, userId }) => {
        if (userId !== user._id) {
          setTypingUsers((prev) => ({
            ...prev,
            [chatId]: [...(prev[chatId] || []), userId]
          }));
        }
      });

      onStopTyping(({ chatId, userId }) => {
        if (userId !== user._id) {
          setTypingUsers((prev) => ({
            ...prev,
            [chatId]: (prev[chatId] || []).filter((id) => id !== userId)
          }));
        }
      });

      // Listen for user status changes
      onUserStatusChanged(({ userId, status }) => {
        setOnlineUsers((prev) => ({ ...prev, [userId]: status }));
        
        // Update user status in chats
        setChats((prevChats) => {
          return prevChats.map((chat) => {
            const updatedUsers = chat.users.map((chatUser) => {
              if (chatUser._id === userId) {
                return { ...chatUser, status };
              }
              return chatUser;
            });
            
            return { ...chat, users: updatedUsers };
          });
        });
      });

      // Listen for message status updates
      onMessageDeliveryUpdated(({ messageId, deliveredTo }) => {
        setMessages((prevMessages) => {
          return prevMessages.map((msg) => {
            if (msg._id === messageId) {
              return { ...msg, deliveredTo };
            }
            return msg;
          });
        });
      });

      onMessageReadUpdated(({ messageId, readBy }) => {
        setMessages((prevMessages) => {
          return prevMessages.map((msg) => {
            if (msg._id === messageId) {
              return { ...msg, readBy };
            }
            return msg;
          });
        });
      });

      onMessageReactionUpdated(({ messageId, reactions }) => {
        setMessages((prevMessages) => {
          return prevMessages.map((msg) => {
            if (msg._id === messageId) {
              return { ...msg, reactions };
            }
            return msg;
          });
        });
      });
    } catch (error) {
      console.error('Error setting up socket listeners:', error);
    }
  }, [selectedChat, user]);

  // Fetch all chats
  const fetchChats = async () => {
    setChatLoading(true);
    setError(null);
    
    try {
      const { data } = await chatService.getAllChats();
      
      // Initialize online status for all users in chats
      const usersOnlineStatus = {};
      
      data.forEach((chat) => {
        chat.users.forEach((chatUser) => {
          usersOnlineStatus[chatUser._id] = chatUser.status || 'offline';
        });
      });
      
      setOnlineUsers(usersOnlineStatus);
      
      // Sort chats with latest message first
      const sortedChats = data.sort((a, b) => {
        const aDate = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(a.updatedAt);
        const bDate = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(b.updatedAt);
        return bDate - aDate;
      });
      
      setChats(sortedChats);
    } catch (error) {
      console.error('Fetch chats error:', error);
      setError('Failed to load chats');
    } finally {
      setChatLoading(false);
    }
  };

  // Fetch messages for selected chat
  const fetchMessages = async (chatId, page = 1) => {
    if (!chatId) return;
    
    setMessagesLoading(true);
    setError(null);
    
    try {
      const { data } = await messageService.getChatMessages(chatId, page);
      
      if (page === 1) {
        // First page - replace messages
        setMessages(data.messages);
      } else {
        // Pagination - prepend older messages
        setMessages((prevMessages) => [...data.messages, ...prevMessages]);
      }
      
      // Update pagination info
      setMessagesPagination(data.pagination);
      
      // Reset unread count for this chat
      setUnreadMessages((prev) => ({ ...prev, [chatId]: 0 }));
      
      return data;
    } catch (error) {
      console.error('Fetch messages error:', error);
      setError('Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  };

  // Select a chat and load its messages
  const selectChat = async (chat) => {
    if (selectedChat && selectedChat._id === chat._id) return;
    
    if (selectedChat) {
      // Leave previous chat
      leaveChat(selectedChat._id);
    }
    
    setSelectedChat(chat);
    
    // Join new chat
    joinChat(chat._id);
    
    // Reset typing users for this chat
    setTypingUsers((prev) => ({ ...prev, [chat._id]: [] }));
    
    // Fetch messages
    await fetchMessages(chat._id);
  };

  // Create or access a one-to-one chat
  const accessChat = async (userId) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data } = await chatService.createDirectChat(userId);
      
      // Check if chat already exists in state
      const chatExists = chats.some((c) => c._id === data._id);
      
      if (!chatExists) {
        setChats((prevChats) => [data, ...prevChats]);
      }
      
      await selectChat(data);
      return data;
    } catch (error) {
      console.error('Access chat error:', error);
      setError('Failed to access chat');
    } finally {
      setLoading(false);
    }
  };

  // Create a group chat
  const createGroupChat = async (chatData) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data } = await chatService.createGroupChat(chatData);
      
      setChats((prevChats) => [data, ...prevChats]);
      await selectChat(data);
      
      return data;
    } catch (error) {
      console.error('Create group chat error:', error);
      setError('Failed to create group chat');
    } finally {
      setLoading(false);
    }
  };

  // Update a group chat
  const updateGroupChat = async (chatId, chatData) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data } = await chatService.updateGroupChat(chatId, chatData);
      
      // Update chats state
      setChats((prevChats) => {
        return prevChats.map((chat) => {
          if (chat._id === chatId) {
            return data;
          }
          return chat;
        });
      });
      
      // Update selected chat if it's the one being updated
      if (selectedChat && selectedChat._id === chatId) {
        setSelectedChat(data);
      }
      
      return data;
    } catch (error) {
      console.error('Update group chat error:', error);
      setError('Failed to update group chat');
    } finally {
      setLoading(false);
    }
  };

  // Add user to group chat
  const addUserToGroup = async (chatId, userId) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data } = await chatService.addUserToGroup(chatId, userId);
      
      // Update chats state
      setChats((prevChats) => {
        return prevChats.map((chat) => {
          if (chat._id === chatId) {
            return data;
          }
          return chat;
        });
      });
      
      // Update selected chat if it's the one being updated
      if (selectedChat && selectedChat._id === chatId) {
        setSelectedChat(data);
      }
      
      return data;
    } catch (error) {
      console.error('Add user to group error:', error);
      setError('Failed to add user to group');
    } finally {
      setLoading(false);
    }
  };

  // Remove user from group chat
  const removeUserFromGroup = async (chatId, userId) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data } = await chatService.removeUserFromGroup(chatId, userId);
      
      // If the chat was deleted (no users left)
      if (data.message && data.message.includes('deleted')) {
        // Remove chat from state
        setChats((prevChats) => prevChats.filter((chat) => chat._id !== chatId));
        
        // Unselect chat if it's the one being deleted
        if (selectedChat && selectedChat._id === chatId) {
          setSelectedChat(null);
        }
        
        return data;
      }
      
      // Update chats state
      setChats((prevChats) => {
        return prevChats.map((chat) => {
          if (chat._id === chatId) {
            return data;
          }
          return chat;
        });
      });
      
      // Update selected chat if it's the one being updated
      if (selectedChat && selectedChat._id === chatId) {
        setSelectedChat(data);
      }
      
      // If current user is removed, unselect the chat
      if (userId === user._id && selectedChat && selectedChat._id === chatId) {
        setSelectedChat(null);
      }
      
      return data;
    } catch (error) {
      console.error('Remove user from group error:', error);
      setError('Failed to remove user from group');
    } finally {
      setLoading(false);
    }
  };

  // Send a message
  const sendNewMessage = async (content, chatId) => {
    try {
      const { data } = await messageService.sendMessage({
        content,
        chatId
      });
      
      // Also send via socket for real-time updates
      sendMessage({
        content,
        chatId
      });
      
      return data;
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  };

  // Handle message typing
  const handleTyping = (chatId) => {
    sendTyping(chatId);
  };

  // Handle stop typing
  const handleStopTyping = (chatId) => {
    sendStopTyping(chatId);
  };

  // Search users
  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      const { data } = await userService.getAllUsers(query);
      setSearchResults(data);
      return data;
    } catch (error) {
      console.error('Search users error:', error);
    }
  };

  // Context value
  const value = {
    chats,
    selectedChat,
    messages,
    loading,
    chatLoading,
    messagesLoading,
    error,
    typingUsers,
    unreadMessages,
    onlineUsers,
    searchResults,
    messagesPagination,
    fetchChats,
    fetchMessages,
    selectChat,
    accessChat,
    createGroupChat,
    updateGroupChat,
    addUserToGroup,
    removeUserFromGroup,
    sendMessage: sendNewMessage,
    handleTyping,
    handleStopTyping,
    searchUsers
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// Custom hook to use the chat context
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;