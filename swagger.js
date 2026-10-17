const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'NagarDrishti Backend API',
    description: 'Complete API documentation for the NagarDrishti Civic Infrastructure Platform.',
    version: '1.0.0',
  },
  host: 'localhost:5000',
  schemes: ['http'],
  securityDefinitions: {
    Bearer: {
      type: 'apiKey',
      name: 'Authorization',
      in: 'header',
      description: 'Enter your JWT token as: Bearer <token>',
    },
  },
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./server.js']; // It will scan server.js and all imported routes

// Generate the swagger-output.json file
swaggerAutogen(outputFile, endpointsFiles, doc);