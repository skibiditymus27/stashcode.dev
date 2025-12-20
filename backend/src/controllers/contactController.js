const { saveContactRequest, sendNotification } = require('../services/contactService');
const logger = require('../utils/logger');

async function handleContact(req, res, next) {
  try {
    const data = req.validatedBody;
    const meta = {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    };

    const stored = await saveContactRequest(data, meta);

    sendNotification(data).catch((error) =>
      logger.error('Failed to send notification email', {
        error: error.message,
        requestId: stored.id,
        email: data.email,
      })
    );

    return res.status(201).json({
      status: 'ok',
      data: {
        id: stored.id,
        createdAt: stored.created_at,
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  handleContact,
};
