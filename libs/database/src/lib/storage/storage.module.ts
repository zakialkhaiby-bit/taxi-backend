// app.module.ts (or a dedicated StorageModule)
import { Module, Global } from '@nestjs/common';
import { STORAGE, StoragePort } from './storage.port';
import { LocalStorage } from './local.storage';
import { S3Storage } from './s3.storage';
import { ImgbbStorage } from './imgbb.storage';

const storageProvider = {
  provide: STORAGE,
  useFactory: (): StoragePort => {
    const driver = (process.env.STORAGE_DRIVER ?? 'imgbb').toLowerCase();
    if (driver === 's3') {
      return new S3Storage();
    }
    if (driver === 'local') {
      return new LocalStorage();
    }
    return new ImgbbStorage();
  },
};

@Global()
@Module({
  providers: [storageProvider],
  exports: [storageProvider],
})
export class StorageModule {}
