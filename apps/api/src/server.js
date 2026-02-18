/**
 * Main Server Entry Point
 * Express API server for Ageless Literature
 * Handles Sequelize models and custom API routes
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import cron from 'node-cron';
import adminRoutes from './routes/adminRoutes.js';
import apiRoutes from './routes/index.js';
import stripeRoutes from './routes/stripeRoutes.js';
import paypalRoutes from './routes/paypalRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import { seedDatabase } from './config/seed.js';
import { initializeSocket } from './sockets/index.js';
import { updateAuctionStatuses } from './services/auctionStatusService.js';
import { initializeIndexes } from './utils/meilisearch.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// Load environment variables from root
dotenv.config({ path: path.resolve(dirname, '../../../.env') });

const app = express();
const PORT = process.env.API_PORT || 3001;

// CORS configuration - Allow frontend to access API
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  next();
});

// Sequelize API Routes - Transactional layer
// These handle books, carts, orders, auctions, etc.
app.use('/api', apiRoutes);

// Search Routes
app.use('/api/search', searchRoutes);

// Admin API Routes
app.use('/api/admin', adminRoutes);

// Stripe Connect Routes
app.use('/api/stripe', stripeRoutes);

// PayPal Payout Routes
app.use('/api/paypal', paypalRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Ageless Literature API',
  });
});

// Global error handling middleware
app.use((err, req, res, _next) => {
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  });
});

// Initialize server
const start = async () => {
  try {
    // Seed database with default data in local/dev
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      await seedDatabase();
    }

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize Socket.IO and attach to app for access in controllers
    const io = initializeSocket(httpServer);
    app.set('io', io);

    // Initialize Meilisearch indexes with filterable attributes
    try {
      await initializeIndexes();
      console.log('[Meilisearch] Indexes initialized with filterable attributes');
    } catch (error) {
      console.error(
        '[Meilisearch] Index initialization failed (search may be degraded):',
        error.message,
      );
    }

    // Schedule auction status updates (runs every minute)
    cron.schedule('* * * * *', async () => {
      try {
        await updateAuctionStatuses();
      } catch (error) {
        console.error('[Cron] Error updating auction statuses:', error);
      }
    });
    console.log('[Cron] Auction status updater scheduled (every minute)');

    // Run initial status update
    try {
      await updateAuctionStatuses();
      console.log('[Auction Status] Initial status update completed');
    } catch (error) {
      console.error('[Auction Status] Initial update failed:', error);
    }

    // Start server
    httpServer.listen(PORT, () => {
      console.log(`API Server running on port ${PORT}`);
      console.log(`Socket.IO server initialized`);
    });

    // Graceful shutdown
    const gracefulShutdown = () => {
      httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    process.exit(1);
  }
};

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  start();
}

// Export app for testing
export default app;
