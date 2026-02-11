import db from '../models/index.js';
import { Op } from 'sequelize';

const { Conversation, Message, User } = db;

export const getConversations = async (req, res) => {
  try {
    const { userId } = req.user;
    const conversations = await Conversation.findAll({
      where: {
        [Op.or]: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: [
        { model: User, as: 'user1' },
        { model: User, as: 'user2' },
      ],
      order: [['lastMessageAt', 'DESC']],
    });
    res.json({ success: true, data: conversations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createConversation = async (req, res) => {
  try {
    const { userId } = req.user;
    const { otherUserId } = req.body;

    let conversation = await Conversation.findOne({
      where: {
        [Op.or]: [
          { user1Id: userId, user2Id: otherUserId },
          { user1Id: otherUserId, user2Id: userId },
        ],
      },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        user1Id: userId,
        user2Id: otherUserId,
      });
    }

    res.json({ success: true, data: conversation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await Message.findAll({
      where: { conversationId },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'email', 'firstName', 'lastName'] },
      ],
      order: [['createdAt', 'ASC']],
    });
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { userId } = req.user;
    const { conversationId } = req.params;
    const { content } = req.body;

    const message = await Message.create({
      conversationId,
      senderId: userId,
      content,
    });

    await Conversation.update({ lastMessageAt: new Date() }, { where: { id: conversationId } });

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
