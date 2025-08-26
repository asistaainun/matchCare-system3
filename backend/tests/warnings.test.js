const request = require('supertest');
// Jangan import app yang akan start server, tapi gunakan existing server
const BASE_URL = 'http://localhost:5000';

describe('Warning System', () => {
  describe('GET /api/warnings/test', () => {
    test('should return success with interaction count', async () => {
      const response = await request(BASE_URL)
        .get('/api/warnings/test')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Warning system is working!');
      expect(response.body.interactionCount).toBeDefined();
    });
  });

  describe('GET /api/warnings/test-conflict', () => {
    test('should detect known conflicts', async () => {
      const response = await request(BASE_URL)
        .get('/api/warnings/test-conflict')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.conflictCount).toBeGreaterThan(0);
      expect(response.body.results).toBeDefined();
    });
  });

  describe('GET /api/warnings/education/basic-skincare', () => {
    test('should return skincare education content', async () => {
      const response = await request(BASE_URL)
        .get('/api/warnings/education/basic-skincare')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.skincare_routine_order).toHaveLength(7);
      expect(response.body.data.skin_types).toHaveLength(5);
    });
  });

  describe('POST /api/warnings/routine', () => {
    test('should analyze routine compatibility', async () => {
      const response = await request(BASE_URL)
        .post('/api/warnings/routine')
        .send({ productIds: [85, 86] })
        .timeout(10000) // Increase timeout to 10 seconds
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.analyzedProducts).toHaveLength(2);
      expect(response.body.warningCount).toBeDefined();
    }, 10000); // Jest timeout

    test('should return error for insufficient products', async () => {
      const response = await request(BASE_URL)
        .post('/api/warnings/routine')
        .send({ productIds: [85] })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('At least 2 products required');
    });
  });
});