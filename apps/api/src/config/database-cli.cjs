/**
 * Database Configuration for Sequelize CLI
 * CommonJS version for migration support
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../../.env') });

module.exports = {
  development: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
        ? { require: true, rejectUnauthorized: false }
        : false,
    },
  },
  test: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false,
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};
