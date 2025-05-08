// server/server.js
const http = require('http');
const app = require('./app');
const socketIO = require('socket.io');
const connectDB = require('./config/db');
const config = require('./config');
const logger = require('./utils/logger');
const socket = require('./socket'); // Use direct socket implementation instead of service

// Uncaught exception handler
process.on('uncaughtException', (err) => {
  logger.error(`UNCAUGHT EXCEPTION: ${err.message}`);
  logger.error(err.stack);
  process.exit(1);
});

// Create HTTP server
const server = http.createServer(app);

// Start the server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Initialize Socket.io directly without Redis
    socket.init(server);
    
    // Start server
    server.listen(config.PORT, () => {
      logger.info(`Server running in ${config.NODE_ENV} mode on port ${config.PORT}`);
    });
  } catch (error) {
    logger.error(`Server error: ${error.message}`);
    process.exit(1);
  }
};

// Start the server
startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`UNHANDLED REJECTION: ${err.message}`);
  logger.error(err.stack);
  
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});