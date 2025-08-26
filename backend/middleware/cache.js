const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 });

const cacheMiddleware = (duration = 600) => {
  return (req, res, next) => {
    const key = req.originalUrl;
    const cachedResponse = cache.get(key);
    
    if (cachedResponse) {
      console.log(`Cache hit: ${key}`);
      return res.json(cachedResponse);
    }
    
    // Store original res.json
    const originalJson = res.json;
    
    res.json = function(data) {
      // Cache successful responses only
      if (data.success !== false) {
        cache.set(key, data, duration);
        console.log(`Cached: ${key}`);
      }
      originalJson.call(this, data);
    };
    
    next();
  };
};

module.exports = cacheMiddleware;