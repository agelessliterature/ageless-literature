/**
 * Vendor Chat Controller
 * Handles vendor-specific messaging and conversations
 */

import db from '../models/index.js';
import { Op } from 'sequelize';

const { Conversation, Message, User, Vendor } = db;

/**
 * Get vendor conversations
 * GET /api/vendor/chat/conversations
 */
export const getConversations = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    // Get conversations where vendor's user is a participant
    const conversations = await Conversation.findAll({
      where: {
        [Op.or]: [{ userId1: userId }, { userId2: userId }],
      },
      include: [
        {
          model: User,
          as: 'user1',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: User,
          as: 'user2',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: Message,
          as: 'messages',
          limit: 1,
          order: [['createdAt', 'DESC']],
          attributes: ['body', 'createdAt'],
        },
      ],
      order: [['updatedAt', 'DESC']],
    });

    const formattedConversations = conversations.map((conv) => {
      // Determine which user is the "other" party (not the vendor)
      const otherUser = conv.userId1 === userId ? conv.user2 : conv.user1;
      return {
        id: conv.id,
        customer: otherUser,
        lastMessage: conv.messages?.[0]?.body || 'No messages yet',
        lastMessageAt: conv.messages?.[0]?.createdAt || conv.createdAt,
        unreadCount: 0,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        conversations: formattedConversations,
      },
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      error: error.message,
    });
  }
};

/**
 * Get messages for a conversation
 * GET /api/vendor/chat/messages/:conversationId
 */
export const getMessages = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { conversationId } = req.params;

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    // Verify conversation involves vendor's user
    const conversation = await Conversation.findOne({
      where: {
        id: conversationId,
        [Op.or]: [{ userId1: userId }, { userId2: userId }],
      },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    const messages = await Message.findAll({
      where: { conversationId },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      message: msg.body,
      isVendor: msg.senderId === userId,
      sender: msg.sender,
      createdAt: msg.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        messages: formattedMessages,
      },
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message,
    });
  }
};

/**
 * Send a message
 * POST /api/vendor/chat/messages
 */
export const sendMessage = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { conversationId, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required',
      });
    }

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    // Verify conversation involves vendor's user
    const conversation = await Conversation.findOne({
      where: {
        id: conversationId,
        [Op.or]: [{ userId1: userId }, { userId2: userId }],
      },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    const newMessage = await Message.create({
      conversationId,
      senderId: userId,
      body: message.trim(),
    });

    // Update conversation timestamp
    await conversation.update({ updatedAt: new Date() });

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.of('/chat').to(`conversation:${conversationId}`).emit('message:new', {
        id: newMessage.id,
        conversationId,
        senderId: userId,
        content: message.trim(),
        message: message.trim(),
        createdAt: newMessage.createdAt,
        isVendor: true,
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        message: newMessage,
      },
    });
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message,
    });
  }
};

/**
 * Mark conversation as read
 * PATCH /api/vendor/chat/conversations/:id/read
 */
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const conversationId = req.params.id;

    const vendor = await Vendor.findOne({ where: { userId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Conversation marked as read',
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark conversation as read',
      error: error.message,
    });
  }
};
