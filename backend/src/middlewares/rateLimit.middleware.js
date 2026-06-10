const rateLimitStore = new Map();

const cleanExpired = () => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.windowStart + data.windowMs) {
      rateLimitStore.delete(key);
    }
  }
};

setInterval(cleanExpired, 60000);

const createRateLimiter = (options) => {
  const { windowMs = 60000, maxRequests = 100, keyPrefix = 'default' } = options;

  return (req, res, next) => {
    const userId = req.usuario?.id || req.ip;
    const key = `${keyPrefix}:${userId}`;
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || now > record.windowStart + windowMs) {
      record = { count: 0, windowStart: now };
    }

    record.count++;
    rateLimitStore.set(key, record);

    if (record.count > maxRequests) {
      const remainingTime = Math.ceil((record.windowStart + windowMs - now) / 1000);
      return res.status(429).json({
        error: `Demasiadas solicitudes. Intenta en ${remainingTime} segundos.`,
        retryAfter: remainingTime
      });
    }

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));

    next();
  };
};

const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 200,
  keyPrefix: 'api'
});

const searchLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  keyPrefix: 'search'
});

module.exports = { apiLimiter, searchLimiter, createRateLimiter };