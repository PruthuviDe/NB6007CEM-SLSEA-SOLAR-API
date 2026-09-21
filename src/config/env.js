const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/slsea_solar_dev',
  jwtSecret: process.env.JWT_SECRET || 'fallback_dev_secret_key_minimum_32_chars_long',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  baseUrl: process.env.BASE_URL || 'http://localhost:5000'
};

module.exports = config;
