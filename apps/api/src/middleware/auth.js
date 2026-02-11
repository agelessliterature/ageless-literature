import jwt from 'jsonwebtoken';
import db from '../models/index.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ success: false, error: 'Access token required' });
    }

    // Verify JWT token - Use JWT_SECRET (backend tokens are signed with JWT_SECRET)
    const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    const decoded = jwt.verify(token, jwtSecret);

    // Fetch user from Sequelize User model
    const userId = decoded.userId;
    const user = await db.User.findByPk(userId, {
      attributes: { exclude: ['passwordHash', 'hash'] },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid or inactive user' });
    }

    // Check if user account is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: `Account is ${user.status}. Please contact support.`,
      });
    }

    req.user = { id: user.id, userId: user.id, role: user.role };
    next();
  } catch (error) {
    return res.status(403).json({ success: false, error: 'Invalid token' });
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    next();
  };
};
