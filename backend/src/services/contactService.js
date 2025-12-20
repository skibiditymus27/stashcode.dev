const nodemailer = require('nodemailer');
const pool = require('../db/pool');
const config = require('../config');
const logger = require('../utils/logger');
const { escapeHtml } = require('../utils/sanitize');

async function saveContactRequest(payload, meta = {}) {
  const { name, email, phone, city, message } = payload;
  const { ipAddress, userAgent } = meta;

  const query = `
    INSERT INTO contact_requests (full_name, email, phone, city, message, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, created_at
  `;

  const params = [name, email, phone, city, message, ipAddress || null, userAgent || null];

  const result = await pool.query(query, params);
  return result.rows[0];
}

async function sendNotification(payload) {
  const { host, port, secure, user, password, from, to } = config.mail;

  if (!host || !user || !password || !to || !from) {
    logger.warn('Skipping email notification – SMTP not fully configured');
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port: port || 587,
    secure: Boolean(secure),
    auth: {
      user,
      pass: password,
    },
  });

  const mailOptions = {
    from,
    to,
    subject: 'Nowe zapytanie z formularza GPS INSTAL',
    text: `Nowe zapytanie:
Imię i nazwisko: ${payload.name}
E-mail: ${payload.email}
Telefon: ${payload.phone}
Miejscowość: ${payload.city}
Wiadomość: ${payload.message}
`,
    html: `
      <h2>Nowe zapytanie ze strony GPS INSTAL</h2>
      <ul>
        <li><strong>Imię i nazwisko:</strong> ${escapeHtml(payload.name)}</li>
        <li><strong>E-mail:</strong> ${escapeHtml(payload.email)}</li>
        <li><strong>Telefon:</strong> ${escapeHtml(payload.phone)}</li>
        <li><strong>Miejscowość:</strong> ${escapeHtml(payload.city)}</li>
      </ul>
      <p><strong>Wiadomość:</strong></p>
      <p>${escapeHtml(payload.message).replace(/\n/g, '<br>')}</p>
    `,
  };

  await transporter.sendMail(mailOptions);
  logger.info('Notification email sent');
}

module.exports = {
  saveContactRequest,
  sendNotification,
};
