import db from '../models/index.js';
const { Message, Conversation } = db;

export default (io) => {
  const chatNamespace = io.of('/chat');

  chatNamespace.on('connection', (socket) => {
    // Join conversation room
    socket.on('join:conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    // Leave conversation room
    socket.on('leave:conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Handle new message
    socket.on('message:send', async (data) => {
      try {
        const { conversationId, senderId, content } = data;

        // Save message to database
        const message = await Message.create({
          conversationId,
          senderId,
          content,
        });

        // Update conversation lastMessageAt
        await Conversation.update({ lastMessageAt: new Date() }, { where: { id: conversationId } });

        // Emit to all users in the conversation room
        chatNamespace.to(`conversation:${conversationId}`).emit('message:new', {
          id: message.id,
          conversationId,
          senderId,
          content,
          createdAt: message.createdAt,
        });
      } catch (error) {
        socket.emit('message:error', { error: error.message });
      }
    });

    // Typing indicator
    socket.on('typing:start', (conversationId) => {
      socket.to(`conversation:${conversationId}`).emit('typing:user', socket.id);
    });

    socket.on('typing:stop', (conversationId) => {
      socket.to(`conversation:${conversationId}`).emit('typing:stop', socket.id);
    });

    socket.on('disconnect', () => {});
  });
};
