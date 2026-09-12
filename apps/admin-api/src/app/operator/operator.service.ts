import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AppType,
  DevicePlatform,
  DeviceType,
  OperatorPermission,
  OperatorRoleEntity,
  ParkingPermission,
  ShopPermission,
  TaxiPermission,
} from '@ridy/database';
import { OperatorEntity } from '@ridy/database';
import { ForbiddenError } from '@nestjs/apollo';
import { DeleteResult, Repository } from 'typeorm';
import { OperatorSessionEntity } from '@ridy/database';
import { UpdateProfileInput } from './input/update-profile.input';
import { ConfigService } from 'license-verify';

@Injectable()
export class OperatorService {
  constructor(
    @InjectRepository(OperatorEntity)
    public repo: Repository<OperatorEntity>,
    private configService: ConfigService,
    @InjectRepository(OperatorRoleEntity)
    public roleRepo: Repository<OperatorRoleEntity>,
    @InjectRepository(OperatorSessionEntity)
    public sessionRepo: Repository<OperatorSessionEntity>,
  ) {}

  async validateCredentials(
    userName: string,
    password: string,
  ): Promise<OperatorEntity | null> {
    return this.repo.findOneBy({ userName, password });
  }

  async createSession(
    operatorId: number,
    platform: DevicePlatform,
    deviceType: DeviceType,
    refreshToken: string,
  ): Promise<OperatorSessionEntity> {
    const session = this.sessionRepo.create();
    session.operatorId = operatorId;
    session.sessionInfo = {
      createdAt: new Date(),
      appType: AppType.Taxi,
      devicePlatform: platform,
      deviceType: deviceType,
      token: refreshToken,
    };
    return this.sessionRepo.save(session);
  }

  terminateSession(id: string): Promise<DeleteResult> {
    return this.sessionRepo.delete(id);
  }

  async getById(id: number): Promise<OperatorEntity | null> {
    return this.repo.findOneBy({ id });
  }

  async getAll(): Promise<OperatorEntity[]> {
    return this.repo.find();
  }

  async createAdminOperatorIfNotExists(): Promise<OperatorEntity | null> {
    const operators = await this.getAll();
    if (operators.length > 0) {
      return null;
    }
    let role = this.roleRepo.create();
    const config = await this.configService.getConfig();
    role.allowedApps = [
      config.taxi != null ? AppType.Taxi : null,
      config.shop != null ? AppType.Shop : null,
      config.parking != null ? AppType.Parking : null,
    ].filter((app) => app !== null);
    role.permissions = Object.values(OperatorPermission);
    if (config.taxi != null) {
      role.taxiPermissions = Object.values(TaxiPermission);
    }
    if (config.shop != null) {
      role.shopPermissions = Object.values(ShopPermission);
    }
    if (config.parking != null) {
      role.parkingPermissions = Object.values(ParkingPermission);
    }
    role.title = 'admin';
    role = await this.roleRepo.save(role);

    const operator = this.repo.create({
      userName: 'admin',
      password: 'admin',

      roleId: role.id,
    });
    return this.repo.save(operator);
  }

  async hasPermission(
    id: number,
    permission: OperatorPermission,
  ): Promise<OperatorEntity> {
    const operator = await this.repo.findOneOrFail({
      where: { id },
      relations: { role: true },
    });
    const hasPermission = operator.role.permissions.includes(permission);
    if (!hasPermission) throw new ForbiddenError('PERMISSION_NOT_GRANTED');
    return operator;
  }

  async hasPermissionBoolean(
    id: number,
    permission: OperatorPermission,
  ): Promise<boolean> {
    const operator = await this.repo.findOneOrFail({
      where: { id },
      relations: { role: true },
    });
    return operator.role.permissions.includes(permission);
  }

  async updateProfile(input: {
    id: number;
    update: UpdateProfileInput;
  }): Promise<OperatorEntity> {
    const user = await this.getById(input.id);
    if (!user) throw new ForbiddenError('USER_NOT_FOUND');
    // check if the new username is already taken
    if (input.update.userName) {
      const userWithSameUserName = await this.repo.findOneBy({
        userName: input.update.userName,
      });
      if (userWithSameUserName && userWithSameUserName.id !== user.id) {
        throw new ForbiddenError('USERNAME_ALREADY_TAKEN');
      }
    }
    await this.repo.update(user.id, input.update);
    return this.getById(user.id);
  }

  async currentUserSessions(staffId: number): Promise<OperatorSessionEntity[]> {
    return this.sessionRepo.find({
      where: {
        operatorId: staffId,
      },
    });
  }
}
