const levels = ['debug', 'info', 'warn', 'error'];

const format = (level, message, meta) => {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };
  return JSON.stringify(payload);
};

const logger = {};

levels.forEach((level) => {
  logger[level] = (message, meta = {}) => {
    const output = format(level, message, meta);
    /* eslint-disable no-console */
    if (level === 'error') {
      console.error(output);
    } else if (level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
    /* eslint-enable no-console */
  };
});

module.exports = logger;
