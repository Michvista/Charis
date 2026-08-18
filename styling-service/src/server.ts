import 'reflect-metadata';
import 'dotenv/config';
import { DolphFactory } from '@dolphjs/dolph';
import { getDataSource } from './infrastructure/database/typeorm/data-source';
import { OccasionComponent } from './presentation/http/components/occasion.component';
import { StylingComponent } from './presentation/http/components/styling.component';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function bootstrapDatabase() {
  const maxAttempts = 10;
  let delayMs = 5000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await getDataSource();
      console.log('PostgreSQL database connected via TypeORM');
      return;
    } catch (error) {
      console.error(
        `Styling-service database bootstrap failed (attempt ${attempt}/${maxAttempts}):`,
        (error as Error).message,
      );
      if (attempt < maxAttempts) {
        await sleep(delayMs);
        delayMs = Math.min(delayMs * 1.5, 30000);
      }
    }
  }

  console.warn('Max attempts reached. Retrying in background every 30s...');
  while (true) {
    try {
      await sleep(30000);
      await getDataSource();
      console.log('PostgreSQL database connected via TypeORM (background retry)');
      return;
    } catch (err) {
      console.error('Background retry failed:', (err as Error).message);
    }
  }
}

async function bootstrap() {
  const port = Number(process.env.PORT || 3300);
  const dolph = new DolphFactory([OccasionComponent, StylingComponent], port);
  dolph.start();
  void bootstrapDatabase();
}

bootstrap();
