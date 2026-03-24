const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const pool = require('../db/pool');
const config = require('../config');
const logger = require('../utils/logger');

const router = express.Router();

// Simple admin credentials (in production, store hashed in DB)
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS_HASH =
  process.env.ADMIN_PASS_HASH ||
  '100000:static_salt_for_demo:abf516476f6004efbd8615801502afffe0efa25e20220591b8b64c0905ade39779895aac18576f0a2cef08b6929b946a24c81e2e1e487cacb87d2d562ededac2';



// Use cryptographically secure random bytes for JWT secret fallback
// WARNING: In production, always set JWT_SECRET environment variable!
// A random fallback means tokens are invalidated on server restart.
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

if (!process.env.JWT_SECRET) {
  logger.warn('JWT_SECRET not set! Using random secret - tokens will be invalidated on restart.');
}

if (!process.env.ADMIN_PASS_HASH && process.env.NODE_ENV === 'production') {
  logger.error('CRITICAL: ADMIN_PASS_HASH not set in production!');
}

// Specialized rate limiter for login to prevent brute-force
const loginLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 1000 : 15 * 60 * 1000, // 1 second for tests, 15m for prod
  max: 5, // Limit each IP to 5 login requests per window
  message: { status: 'error', message: 'Zbyt wiele prób logowania. Spróbuj powoli za 15 minut.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// CSV Injection protection: Escape characters that trigger formulas (=, +, -, @)
function sanitizeCsvCell(value) {
  if (typeof value !== 'string') return value;
  const formulaChars = ['=', '+', '-', '@'];
  if (formulaChars.some((char) => value.startsWith(char))) {
    return `'${value}`;
  }
  return value;
}


// Auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'Brak autoryzacji' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ status: 'error', message: 'Token wygasł lub jest nieprawidłowy' });
  }
}

// Login
router.post('/login', loginLimiter, async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ status: 'error', message: 'Użytkownik i hasło są wymagane' });
  }

  const [iterations, salt, hash] = ADMIN_PASS_HASH.split(':');

  crypto.pbkdf2(
    password,
    salt,
    parseInt(iterations, 10),
    64,
    'sha512',
    (err, derivedKey) => {
      if (err) return next(err);

      const isPasswordValid = derivedKey.toString('hex') === hash;

      if (username !== ADMIN_USER || !isPasswordValid) {
        logger.warn('Failed admin login attempt', { username, ip: req.ip });
        return res
          .status(401)
          .json({ status: 'error', message: 'Nieprawidłowe dane logowania' });
      }

      const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, {
        expiresIn: '8h',
      });
      logger.info('Admin logged in', { username, ip: req.ip });

      res.json({ status: 'ok', token });
    }
  );
});

// Get all requests with stats
router.get('/requests', authMiddleware, async (req, res, next) => {
  try {
    // Get all requests
    const requestsResult = await pool.query(`
      SELECT id, full_name, email, phone, city, message, ip_address, user_agent, created_at
      FROM contact_requests
      ORDER BY created_at DESC
      LIMIT 500
    `);

    // Get stats
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as week
      FROM contact_requests
    `);

    const stats = statsResult.rows[0];

    res.json({
      status: 'ok',
      stats: {
        total: parseInt(stats.total, 10),
        today: parseInt(stats.today, 10),
        week: parseInt(stats.week, 10),
      },
      requests: requestsResult.rows,
    });
  } catch (error) {
    logger.error('Failed to fetch admin requests', { error: error.message });
    next(error);
  }
});

// Export CSV
router.get('/requests/export', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT full_name, email, phone, city, message, ip_address, created_at
      FROM contact_requests
      ORDER BY created_at DESC
    `);

    const headers = [
      'Data',
      'Imię i nazwisko',
      'E-mail',
      'Telefon',
      'Miejscowość',
      'Wiadomość',
      'IP',
    ];
    const rows = result.rows.map((r) => [
      new Date(r.created_at).toLocaleString('pl-PL'),
      sanitizeCsvCell(r.full_name),
      sanitizeCsvCell(r.email),
      sanitizeCsvCell(r.phone),
      sanitizeCsvCell(r.city),
      sanitizeCsvCell(r.message.replace(/"/g, '""').replace(/\n/g, ' ')),
      sanitizeCsvCell(r.ip_address || ''),
    ]);

    const csv = [
      headers.join(';'),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(';')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=zapytania.csv');
    // Add BOM for Excel to recognize UTF-8
    res.send('\uFEFF' + csv);
  } catch (error) {
    logger.error('Failed to export CSV', { error: error.message });
    next(error);
  }
});

// Get single request detail
router.get('/requests/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM contact_requests WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Nie znaleziono' });
    }

    res.json({ status: 'ok', request: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Delete request
router.delete('/requests/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM contact_requests WHERE id = $1 RETURNING id', [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Nie znaleziono' });
    }

    logger.info('Admin deleted request', { id, admin: req.admin.username });
    res.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
