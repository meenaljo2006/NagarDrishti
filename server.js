require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const connectDB = require('./src/config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Import routes
const webhookRoutes = require('./src/routes/webhookRoutes');
const complaintRoutes = require('./src/routes/complaintRoutes');

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'NagarDrishti Backend',
  });
});

// Root
app.get('/', (req, res) => {
  res.json({ message: 'NagarDrishti API', tagline: 'See. Verify. Resolve.' });
});

// Routes
app.use('/api/webhook', webhookRoutes);
app.use('/api', complaintRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Start server + ngrok
app.listen(PORT, async () => {
  console.log(`NagarDrishti Backend running on port ${PORT}`);
  console.log(`API: http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);

  // Start ngrok tunnel
  try {
    const ngrok = require('@ngrok/ngrok');
    const listener = await ngrok.forward({
      addr: PORT,
      authtoken_from_env: true,
    });
    console.log(`\nPUBLIC WEBHOOK URL: ${listener.url()}/api/webhook/whatsapp\n`);
    console.log('Copy this URL to Twilio Sandbox settings');
  } catch (error) {
    console.error('ngrok error:', error.message);
    console.log('Server still running locally, but no public URL');
  }
});