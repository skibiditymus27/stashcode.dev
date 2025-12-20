function validateRequest(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.errors.map((error) => error.message);
      return res.status(400).json({ status: 'error', message: messages.join(', ') });
    }

    req.validatedBody = result.data;
    return next();
  };
}

module.exports = validateRequest;
