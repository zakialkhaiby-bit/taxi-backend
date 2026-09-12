import { Module } from '@nestjs/common';
import { SettingsResolver } from './settings.resolver';
import { OperatorModule } from '../operator/operator.module';

@Module({
  imports: [OperatorModule],
  providers: [SettingsResolver],
})
export class SettingsModule {}
