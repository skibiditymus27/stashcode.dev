const timeout = (ms) => (req, res, next) => {
  // Set the timeout on the socket
  req.setTimeout(ms, () => {
    // If the request times out, close the connection
    if (!res.headersSent) {
      res.status(503).json({ status: 'error', message: 'Request timeout' });
    }
    // Give a small grace period for the response to be sent, then destroy
    setTimeout(() => req.destroy(), 100);
  });
  next();
};

module.exports = timeout;
