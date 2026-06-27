import appConfig from './namespaces/app.config';
import databaseConfig from './namespaces/database.config';
import jwtConfig from './namespaces/jwt.config';
import mailConfig from './namespaces/mail.config';
import openaiConfig from './namespaces/openai.config';
import redisConfig from './namespaces/redis.config';

export const configs = [
  appConfig,
  databaseConfig,
  jwtConfig,
  mailConfig,
  openaiConfig,
  redisConfig,
];

export {
  appConfig,
  databaseConfig,
  jwtConfig,
  mailConfig,
  openaiConfig,
  redisConfig,
};

export * from './configuration.module';
export * from './configuration.module';
export * from './validation.schema';


