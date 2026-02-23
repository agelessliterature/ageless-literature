/**
 * Customer Chat Controller
 * Handles customer-side messaging with vendors
 */

import db from '../models/index.js';

const { Conversation, Message, User, Vendor } = db;

// Get or create conversation with vendor
export const getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { vendorId } = req.body;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required',
      });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      where: {
        buyerId: userId,
        vendorId: vendorId,
      },
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'businessName', 'shopUrl'],
        },
      ],
    });

    // Create new conversation if it doesn't exist
    if (!conversation) {
      conversation = await Conversation.create({
        buyerId: userId,
        vendorId: vendorId,
      });

      // Reload with vendor info
      conversation = await Conversation.findByPk(conversation.id, {
        include: [
          {
            model: Vendor,
            as: 'vendor',
            attributes: ['id', 'businessName', 'shopUrl'],
          },
        ],
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        conversation: {
          id: conversation.id,
          vendorId: conversation.vendorId,
          vendor: conversation.vendor,
        },
      },
    });
  } catch (error) {
    console.error('Get or create conversation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get or create conversation',
      error: error.message,
    });
  }
};

/**
 * Get messages for a conversation
 * GET /api/customer/chat/messages/:conversationId
 */
export const getMessages = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { conversationId } = req.params;

    // Verify conversation belongs to customer
    const conversation = await Conversation.findOne({
      where: {
        id: conversationId,
        buyerId: userId,
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
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      message: msg.message,
      isCustomer: msg.senderId === userId,
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
 * POST /api/customer/chat/messages
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

    // Verify conversation belongs to customer
    const conversation = await Conversation.findOne({
      where: {
        id: conversationId,
        buyerId: userId,
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
      message: message.trim(),
    });

    // Update conversation timestamp
    await conversation.update({
      updatedAt: new Date(),
      lastMessageAt: new Date(),
    });

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
        isCustomer: true,
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
