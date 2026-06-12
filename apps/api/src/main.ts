import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json } from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    // Raw body is required to verify payment webhook signatures.
    rawBody: true,
  });

  app.setGlobalPrefix('api/v1');
  app.use(json({ limit: '1mb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips unknown properties (mass-assignment protection)
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('Sanad API')
    .setDescription('Vehicle breakdown recovery & repair platform — UAE')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(Number(process.env.PORT ?? 3000));
}

void bootstrap();
