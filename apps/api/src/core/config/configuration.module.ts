import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { configs } from '@api/core/config';
import { validationSchema } from '@api/core/config/validation.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
      validationSchema,
      envFilePath: ['.env.local', '.env'],
      expandVariables: true,
    }),
  ],
})
export class ConfigurationModule {}


