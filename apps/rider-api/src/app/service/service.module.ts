import { Module } from '@nestjs/common';
import { ServiceEntity, ServiceService } from '@ridy/database';
import { UploadModule } from '../upload/upload.module';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [UploadModule, TypeOrmModule.forFeature([ServiceEntity])],
  providers: [ServiceService],
  exports: [ServiceService],
})
export class ServiceModule {}
