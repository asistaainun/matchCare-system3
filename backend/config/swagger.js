const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MatchCare API',
      version: '1.0.0',
      description: 'Ontology-based Skincare Recommendation System API'
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      }
    ],
  },
  apis: ['./routes/*.js']
};

const specs = swaggerJsdoc(options);
module.exports = specs;