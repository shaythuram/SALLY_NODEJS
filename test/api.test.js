const request = require('supertest');
const app = require('../src/server');

describe('Sales Coaching API', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('environment');
    });
  });

  describe('Quick Answer Generation', () => {
    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/generate-quick-answer')
        .send({})
        .expect(422);
      
      expect(response.body).toHaveProperty('message', 'The given data was invalid.');
      expect(response.body.errors).toHaveProperty('conversation');
    });

    it('should validate conversation length', async () => {
      const longConversation = 'a'.repeat(10001);
      const response = await request(app)
        .post('/api/generate-quick-answer')
        .send({ conversation: longConversation })
        .expect(422);
      
      expect(response.body.errors).toHaveProperty('conversation');
    });

    it('should validate context values', async () => {
      const response = await request(app)
        .post('/api/generate-quick-answer')
        .send({ 
          conversation: 'test conversation',
          context: 'invalid_context'
        })
        .expect(422);
      
      expect(response.body.errors).toHaveProperty('context');
    });
  });

  describe('DISCO Analysis', () => {
    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/api/analyze-disco')
        .send({})
        .expect(422);
      
      expect(response.body).toHaveProperty('message', 'The given data was invalid.');
      expect(response.body.errors).toHaveProperty('conversation');
    });

    it('should validate template_id as integer', async () => {
      const response = await request(app)
        .post('/api/api/analyze-disco')
        .send({ 
          conversation: 'test conversation',
          template_id: 'not_a_number'
        })
        .expect(422);
      
      expect(response.body.errors).toHaveProperty('template_id');
    });
  });

  describe('Ephemeral Key Generation', () => {
    it('should validate voice values', async () => {
      const response = await request(app)
        .post('/api/realtime/ephemeral-key')
        .send({ voice: 'invalid_voice' })
        .expect(422);
      
      expect(response.body.errors).toHaveProperty('voice');
    });

    it('should accept valid voice values', async () => {
      const response = await request(app)
        .post('/api/realtime/ephemeral-key')
        .send({ voice: 'alloy' })
        .expect(422); // Will fail without OpenAI API key, but validation should pass
      
      // Should not have validation errors
      expect(response.body).not.toHaveProperty('errors');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404);
      
      expect(response.body).toHaveProperty('message', 'Resource not found');
    });
  });
}); 