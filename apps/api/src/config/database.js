/**
 * Database Configuration
 * Sequelize connection settings for different environments
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from workspace root
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export default {
  development: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false, // Set to console.log to see SQL queries in development
    pool: {
      max: 10,
      min: 2,
      acquire: 60000,
      idle: 10000,
      evict: 1000,
    },
  },
  test: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 1,
      acquire: 30000,
      idle: 10000,
    },
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 30,
      min: 10,
      acquire: 60000,
      idle: 10000,
      evict: 1000,
    },
    dialectOptions: process.env.DB_SSL === 'true' ? {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    } : {},
  },
};
