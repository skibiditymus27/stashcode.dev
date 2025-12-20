const express = require('express');
const morgan = require('morgan');
const config = require('./config');
const { securityMiddleware, corsMiddleware } = require('./middleware/security');
const errorHandler = require('./middleware/errorHandler');
const { requestIdMiddleware } = require('./middleware/requestId');
const contactRouter = require('./routes/contact');
const healthRouter = require('./routes/health');
const adminRouter = require('./routes/admin');

const app = express();

app.set('trust proxy', 'loopback');

app.use(requestIdMiddleware);
securityMiddleware.forEach((mw) => app.use(mw));
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

app.use('/api/health', healthRouter);
app.use('/api/contact', contactRouter);
app.use('/api/admin', adminRouter);

app.use('/api/*', corsMiddleware, (req, res) => {
  res.status(404).json({ status: 'error', message: 'Nie znaleziono zasobu.' });
});

app.use(errorHandler);

module.exports = app;
