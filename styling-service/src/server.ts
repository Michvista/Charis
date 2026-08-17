import 'reflect-metadata';
import 'dotenv/config';
import dns from 'node:dns';
import { DolphFactory } from '@dolphjs/dolph';
import { AppDataSource, ensureStylingSchema } from './infrastructure/database/typeorm/data-source';
import { OccasionComponent } from './presentation/http/components/occasion.component';
import { StylingComponent } from './presentation/http/components/styling.component';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function bootstrapDatabase() {
  const maxAttempts = 10;
  let delayMs = 3000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      if (!AppDataSource.isInitialized) {
        await ensureStylingSchema();
        await AppDataSource.initialize();
      }

      console.log('PostgreSQL database connected via TypeORM');
      return;
    } catch (error) {
      console.error(
        `Styling-service database bootstrap failed (attempt ${attempt}/${maxAttempts}):`,
        error,
      );

      if (attempt < maxAttempts) {
        await sleep(delayMs);
        delayMs = Math.min(delayMs * 2, 30000);
      }
    }
  }

  console.warn(
    'Styling-service is starting without a live database connection. The app will keep retrying in the background.',
  );

  while (!AppDataSource.isInitialized) {
    try {
      await ensureStylingSchema();
      await AppDataSource.initialize();
      console.log('PostgreSQL database connected via TypeORM');
      return;
    } catch (error) {
      console.error('Styling-service database retry failed:', error);
      await sleep(30000);
    }
  }
}

bootstrap();

async function bootstrap() {
  const dolph = new DolphFactory([OccasionComponent, StylingComponent]);
  dolph.start();
  void bootstrapDatabase();
}
