const express = require('express');
const rateLimit = require('express-rate-limit');
const validateRequest = require('../middleware/validateRequest');
const contactSchema = require('./contact.schema');
const { handleContact } = require('../controllers/contactController');

const router = express.Router();

// Additional limiter for the contact endpoint on top of global middleware defaults.
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { status: 'error', message: 'Przekroczono limit zapytań. Spróbuj ponownie później.' },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: 'loopback',
});

router.post('/', contactLimiter, validateRequest(contactSchema), handleContact);

module.exports = router;
