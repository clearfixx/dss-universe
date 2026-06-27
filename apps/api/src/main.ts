import { NestFactory } from '@nestjs/core';
import { AppModule } from '@api/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 4000);
}

bootstrap().catch((error) => {
  console.error('Failed to start DSS Universe API');
  console.error(error);

  process.exit(1);
});

