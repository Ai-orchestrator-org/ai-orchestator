import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.ORCHESTRATOR_PORT ?? 3001;
  await app.listen(port);
  console.log(`Orchestrator Server running on port ${port}`);
}

bootstrap();