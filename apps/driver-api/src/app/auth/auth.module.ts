import { DynamicModule, Module, Provider } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { DriverModule } from '../driver/driver.module';
import { OrderModule } from '../order/order.module';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import {
  CarColorEntity,
  CarModelEntity,
  DriverEntity,
  DriverServicesServiceEntity,
  DriverToDriverDocumentEntity,
  MediaEntity,
  ServiceEntity,
  SharedOrderModule,
  SMSModule,
} from '@ridy/database';
import { RedisHelpersModule } from '@ridy/database';
import { getConfig } from 'license-verify';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriverDocumentEntity } from '@ridy/database';

@Module({})
export class AuthModule {
  static async register(): Promise<DynamicModule> {
    const modules = [
      TypeOrmModule.forFeature([
        DriverEntity,
        DriverToDriverDocumentEntity,
        DriverDocumentEntity,
        CarModelEntity,
        CarColorEntity,
        ServiceEntity,
        DriverServicesServiceEntity,
        MediaEntity,
      ]),
      DriverModule,
      OrderModule,
      PassportModule,
      SharedOrderModule,
      SMSModule,
      RedisHelpersModule,
      JwtModule.register({
        secret: 'secret_driver',
      }),
    ];
    let providers: Provider[] = [];
    const _config = await getConfig(process.env.NODE_ENV ?? 'production');
    if (_config != null) {
      providers = [AuthService, JwtStrategy, AuthResolver];
    }
    return {
      module: AuthModule,
      imports: modules,
      providers: providers,
    };
  }
}
