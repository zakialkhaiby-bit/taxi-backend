import { Module } from '@nestjs/common';
import { ExportService } from './export.service';

@Module({
  imports: [],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
