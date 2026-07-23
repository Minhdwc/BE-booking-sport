import { ConsoleLogger, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { GlobalResponseInterceptor } from '@/common/interceptors/globalResponse';

const QUIET_STARTUP_CONTEXTS = new Set([
  'NestFactory',
  'InstanceLoader',
  'RoutesResolver',
  'RouterExplorer',
  'WebSocketsController',
  'NestApplication',
]);

class AppLogger extends ConsoleLogger {
  log(message: unknown, context?: string) {
    if (context && QUIET_STARTUP_CONTEXTS.has(context)) return;
    super.log(message, context);
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: new AppLogger(),
  });

  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3002/'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Total-Count'],
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new GlobalResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port);
  logger.log(`Server is running on http://localhost:${port}/api/v1`);
}

bootstrap();
