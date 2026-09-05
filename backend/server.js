require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const connectDB = require('./src/config/database');

// Import routes
const complaintRoutes = require('./src/routes/complaintRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const whatsappController = require('./src/controllers/whatsappController');
const errorHandler = require('./src/middleware/errorHandler');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB with better error handling
console.log('🔄 Connecting to MongoDB...');
connectDB();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'NagarDrishti Backend',
    version: '1.0.0',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Import mongoose for health check
const mongoose = require('mongoose');

// WhatsApp Webhook (Twilio)
app.post('/api/webhook/whatsapp', whatsappController.handleWhatsAppWebhook);

// API Routes
app.use('/api', complaintRoutes);
app.use('/api', analyticsRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 NagarDrishti Backend running on port ${PORT}`);
  console.log(`📊 API URL: http://localhost:${PORT}/api`);
  console.log(`🔄 Health Check: http://localhost:${PORT}/health`);
  console.log(`📱 WhatsApp Webhook: http://localhost:${PORT}/api/webhook/whatsapp`);
});