import 'reflect-metadata';
import dotenv from 'dotenv';
import { DolphFactory } from '@dolphjs/dolph';
import { AppDataSource } from './infrastructure/database/typeorm/data-source';
import { OccasionComponent } from './presentation/http/components/occasion.component';
import { StylingComponent } from './presentation/http/components/styling.component';

dotenv.config();

async function bootstrap() {
  try {
    await AppDataSource.initialize();
    console.log('PostgreSQL database connected via TypeORM');

    const dolph = new DolphFactory([OccasionComponent, StylingComponent]);
    dolph.start();
  } catch (error) {
    console.error('Failed to boot styling-service:', error);
    process.exit(1);
  }
}

bootstrap();