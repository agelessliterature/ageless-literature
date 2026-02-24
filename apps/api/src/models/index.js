/**
 * Sequelize Models Index
 * Centralized model initialization and associations
 */

import { Sequelize } from 'sequelize';
import databaseConfig from '../config/database.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const basename = __filename.split('/').pop();

const env = process.env.NODE_ENV || 'development';
const config = databaseConfig[env];
const db = {};

// Initialize Sequelize
let sequelize;
if (config.use_env_variable && process.env[config.use_env_variable]) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    ...config,
    dialectOptions: {
      ssl:
        process.env.NODE_ENV === 'production'
          ? {
              require: true,
              rejectUnauthorized: false,
            }
          : false,
    },
  });
} else if (config.database && config.username) {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
} else {
  throw new Error(
    'Database configuration is missing. Please check your .env file and ensure DATABASE_URL is set.',
  );
}

// Only load models for tables that exist in database
const allowedModels = [
  'User.js',
  'Vendor.js',
  'Book.js',
  'BookMedia.cjs',
  'Product.js',
  'EmailTemplate.js',
  'MembershipPlan.js',
  'MembershipSubscription.js',
  'MembershipInvoice.js',
  'Order.js',
  'OrderItem.js',
  'Cart.js',
  'CartItem.js',
  'Wishlist.js',
  'WishlistItem.js',
  'Reservation.js',
  'Auction.js',
  'AuctionBid.js',
  'AuctionWin.js',
  'Conversation.js',
  'Message.js',
  'Notification.js',
  'Category.js',
  'Tag.js',
  'BookCategory.js',
  'BookTag.js',
  'ProductCategory.js',
  'Collection.js',
  'BookCollection.js',
  'VendorEarning.js',
  'VendorPayout.js',
  'VendorWithdrawal.js',
  'CollectorProfile.js',
  'GlossaryTerm.js',
  'CustomOffer.js',
  'RareBookRequest.cjs',
  'Coupon.js',
  'CouponRedemption.js',
  'PasswordResetToken.js',
];

// Load all model files using dynamic import (they use module.exports, which works with import)
const modelFiles = fs.readdirSync(__dirname).filter((file) => {
  return (
    file.indexOf('.') !== 0 &&
    file !== basename &&
    (file.slice(-3) === '.js' || file.slice(-4) === '.cjs') &&
    file.indexOf('.test.js') === -1 &&
    allowedModels.includes(file) // Only load allowed models
  );
});

// Load models asynchronously
const loadedModels = await Promise.all(
  modelFiles.map(async (file) => {
    const modelPath = `file://${join(__dirname, file)}`;
    const modelModule = await import(modelPath);
    // Models export via module.exports, which becomes .default in ES6 import
    const modelInitializer = modelModule.default;
    const model = modelInitializer(sequelize, Sequelize.DataTypes);
    return model;
  }),
);

// Add models to db object
loadedModels.forEach((model) => {
  db[model.name] = model;
});

// Run associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;
