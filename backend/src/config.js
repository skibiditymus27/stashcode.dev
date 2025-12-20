const { z } = require('zod');
require('dotenv').config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  ALLOW_ORIGINS: z.string().optional(),
  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().default(15),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  PGHOST: z.string().default('postgres'),
  PGPORT: z.coerce.number().default(5432),
  PGDATABASE: z.string().default('gpsinstal'),
  PGUSER: z.string().default('gpsinstal'),
  PGPASSWORD: z.string().default('gpsinstal'),
  PGSSL: z.enum(['true', 'false']).optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z.enum(['true', 'false']).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  MAIL_TO: z.string().optional(),
});

const env = envSchema.parse(process.env);

const parseList = (value = '') =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const config = {
  env: env.NODE_ENV,
  port: env.PORT,
  allowOrigins: parseList(env.ALLOW_ORIGINS),
  rateLimitWindowMinutes: env.RATE_LIMIT_WINDOW_MINUTES,
  rateLimitMax: env.RATE_LIMIT_MAX,
  database: {
    host: env.PGHOST,
    port: env.PGPORT,
    database: env.PGDATABASE,
    user: env.PGUSER,
    password: env.PGPASSWORD,
    ssl: env.PGSSL === 'true',
  },
  mail: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE === 'true',
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    from: env.MAIL_FROM,
    to: env.MAIL_TO,
  },
};

module.exports = config;
