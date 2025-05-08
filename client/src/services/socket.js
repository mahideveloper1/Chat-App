import { io } from 'socket.io-client';

let socket;

// Initialize socket connection
export const initSocket = (token) => {
  if (socket) {
    socket.disconnect();
  }

  socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
    auth: {
      token
    },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Socket connected successfully');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  return socket;
};

// Get socket instance
export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem('token');
    if (token) {
      return initSocket(token);
    }
    throw new Error('No token available for socket connection');
  }
  return socket;
};

// Disconnect socket
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Join a chat room
export const joinChat = (chatId) => {
  if (socket) {
    socket.emit('join_chat', chatId);
  }
};

// Leave a chat room
export const leaveChat = (chatId) => {
  if (socket) {
    socket.emit('leave_chat', chatId);
  }
};

// Send message
export const sendMessage = (messageData) => {
  if (socket) {
    socket.emit('new_message', messageData);
  }
};

// Send typing indicator
export const sendTyping = (chatId) => {
  if (socket) {
    socket.emit('typing', chatId);
  }
};

// Send stop typing indicator
export const sendStopTyping = (chatId) => {
  if (socket) {
    socket.emit('stop_typing', chatId);
  }
};

// Mark message as delivered
export const markMessageAsDelivered = (messageId) => {
  if (socket) {
    socket.emit('message_delivered', messageId);
  }
};

// Mark message as read
export const markMessageAsRead = (messageId) => {
  if (socket) {
    socket.emit('message_read', messageId);
  }
};

// Add reaction to message
export const addReactionToMessage = (messageId, emoji) => {
  if (socket) {
    socket.emit('message_reaction', { messageId, emoji });
  }
};

// Update user status
export const updateUserStatus = (status) => {
  if (socket) {
    socket.emit('update_status', status);
  }
};

// Socket event listeners
export const onMessageReceived = (callback) => {
  if (socket) socket.on('message_received', callback);
};

export const onTyping = (callback) => {
  if (socket) socket.on('typing', callback);
};

export const onStopTyping = (callback) => {
  if (socket) socket.on('stop_typing', callback);
};

export const onChatUpdated = (callback) => {
  if (socket) socket.on('chat_updated', callback);
};

export const onUserStatusChanged = (callback) => {
  if (socket) socket.on('user_status_changed', callback);
};

export const onUserJoined = (callback) => {
  if (socket) socket.on('user_joined', callback);
};

export const onUserLeft = (callback) => {
  if (socket) socket.on('user_left', callback);
};

export const onMessageDeliveryUpdated = (callback) => {
  if (socket) socket.on('message_delivery_updated', callback);
};

export const onMessageReadUpdated = (callback) => {
  if (socket) socket.on('message_read_updated', callback);
};

export const onMessageReactionUpdated = (callback) => {
  if (socket) socket.on('message_reaction_updated', callback);
};

// Video call functions
export const initiateCall = (targetUserId, callerId, callerName, roomId, offerSignal) => {
  if (socket) {
    socket.emit('call_user', { targetUserId, callerId, callerName, roomId, offerSignal });
  }
};

export const acceptCall = (callerId, roomId, answerSignal) => {
  if (socket) {
    socket.emit('accept_call', { callerId, roomId, answerSignal });
  }
};

export const rejectCall = (callerId, roomId) => {
  if (socket) {
    socket.emit('reject_call', { callerId, roomId });
  }
};

export const endCall = (targetUserId, roomId) => {
  if (socket) {
    socket.emit('end_call', { targetUserId, roomId });
  }
};

export const onIncomingCall = (callback) => {
  if (socket) socket.on('incoming_call', callback);
};

export const onCallAccepted = (callback) => {
  if (socket) socket.on('call_accepted', callback);
};

export const onCallRejected = (callback) => {
  if (socket) socket.on('call_rejected', callback);
};

export const onCallEnded = (callback) => {
  if (socket) socket.on('call_ended', callback);
};

// Group call functions
export const joinGroupCall = (roomId, userId) => {
  if (socket) {
    socket.emit('join_group_call', { roomId, userId });
  }
};

export const sendPeerSignal = (roomId, signal, targetUserId) => {
  if (socket) {
    socket.emit('new_peer_signal', { roomId, signal, targetUserId });
  }
};

export const returnPeerSignal = (roomId, signal, targetUserId) => {
  if (socket) {
    socket.emit('return_peer_signal', { roomId, signal, targetUserId });
  }
};

export const leaveGroupCall = (roomId) => {
  if (socket) {
    socket.emit('leave_group_call', { roomId });
  }
};

export const onUserJoinedCall = (callback) => {
  if (socket) socket.on('user_joined_call', callback);
};

export const onUserLeftCall = (callback) => {
  if (socket) socket.on('user_left_call', callback);
};

export const onReceivePeerSignal = (callback) => {
  if (socket) socket.on('receive_peer_signal', callback);
};

export const onReceiveReturnedSignal = (callback) => {
  if (socket) socket.on('receive_returned_signal', callback);
};