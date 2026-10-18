const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'NagarDrishti Backend API',
    description: 'Complete API documentation for the NagarDrishti Civic Infrastructure Platform.',
    version: '1.0.0',
  },
  host: 'localhost:5000',
  schemes: ['http'],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      }
    }
  }
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./server.js'];

swaggerAutogen(outputFile, endpointsFiles, doc);