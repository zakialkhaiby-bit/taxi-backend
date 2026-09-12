import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DevicePlatform, DeviceType, OperatorEntity } from '@ridy/database';
import { ForbiddenError } from '@nestjs/apollo';
import { OperatorService } from '../operator/operator.service';
import { TokenObject2 } from './dto/token.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private adminService: OperatorService,
  ) {}

  async getAdmin(id: number): Promise<OperatorEntity> {
    return this.adminService.getById(id);
  }

  async loginAdmin(args: {
    userName: string;
    password: string;
  }): Promise<string> {
    let admin = await this.adminService.validateCredentials(
      args.userName,
      args.password,
    );
    if (admin == null) {
      admin = await this.adminService.createAdminOperatorIfNotExists();
      if (admin == null) {
        throw new ForbiddenError('Invalid Credentials');
      }
    }
    return this.jwtService.sign({ id: admin.id });
  }

  async loginAdmin2(args: {
    userName: string;
    password: string;
    platform: DevicePlatform;
    deviceType: DeviceType;
  }): Promise<TokenObject2> {
    let admin = await this.adminService.validateCredentials(
      args.userName,
      args.password,
    );
    if (admin == null) {
      admin = await this.adminService.createAdminOperatorIfNotExists();
      if (admin == null) {
        throw new ForbiddenError('Invalid Credentials');
      }
    }
    const refreshToken = this.jwtService.sign({ id: admin.id });
    await this.adminService.createSession(
      admin.id,
      args.platform,
      args.deviceType,
      refreshToken,
    );
    let accessToken = this.jwtService.sign(
      { id: admin.id },
      { expiresIn: '99d' },
    );
    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(refreshToken: string): Promise<string> {
    let refreshTokenDecoded = this.jwtService.decode(refreshToken, {});
    Logger.log(refreshTokenDecoded, 'authService.refreshTokenDecoded');
    refreshTokenDecoded = refreshTokenDecoded as { id: number };
    let accessToken = this.jwtService.sign(
      { id: refreshTokenDecoded.id },
      { expiresIn: '15m' },
    );
    return accessToken;
  }
}
