import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().default(3001),
  WEB_ORIGINS: Joi.string().default('http://localhost:3000'),

  DATABASE_URL: Joi.string().required(),

  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  MEDIA_SIGNING_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(32).required(),
    otherwise: Joi.string()
      .min(32)
      .default('development-media-signing-secret-change-me'),
  }),

  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  OUTBOX_DISPATCH_INTERVAL_MS: Joi.number().integer().min(0).default(1000),
  MEDIA_RETENTION_DAYS: Joi.number().integer().min(1).default(30),
  MEDIA_CLEANUP_INTERVAL_MS: Joi.number()
    .integer()
    .min(0)
    .default(60 * 60 * 1000),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
    .default('info'),

  OPENAI_API_KEY: Joi.string().allow('').optional(),

  MAIL_HOST: Joi.string().allow('').optional(),
  MAIL_PORT: Joi.number().optional(),
  MAIL_USER: Joi.string().allow('').optional(),
  MAIL_PASSWORD: Joi.string().allow('').optional(),
});
