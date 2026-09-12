import { Inject, Logger, UseGuards } from '@nestjs/common';
import { Args, CONTEXT, Query, Resolver } from '@nestjs/graphql';
import { OperatorDTO } from '../operator/dto/operator.dto';

import { AuthService } from './auth.service';
import type { UserContext } from './authenticated-admin';
import { TokenObject, TokenObject2 } from './dto/token.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { DevicePlatform, DeviceType } from '@ridy/database';

@Resolver()
export class AuthResolver {
  constructor(
    private authService: AuthService,
    @Inject(CONTEXT) private context: UserContext,
  ) {}

  //@UseGuards(LocalAdminAuthGuard)
  @Query(() => TokenObject)
  async login(
    @Args('userName', { type: () => String }) userName: string,
    @Args('password', { type: () => String }) password: string,
  ): Promise<TokenObject> {
    const token = await this.authService.loginAdmin({
      userName,
      password,
    });
    return { token };
  }

  @Query(() => TokenObject2)
  async login2(
    @Args('userName', { type: () => String }) userName: string,
    @Args('password', { type: () => String }) password: string,
    @Args('platform', {
      type: () => DevicePlatform,
      defaultValue: DevicePlatform.Web,
    })
    platform?: DevicePlatform,
    @Args('deviceType', {
      type: () => DeviceType,
      defaultValue: DeviceType.DESKTOP,
    })
    deviceType?: DeviceType,
  ): Promise<TokenObject2> {
    const token = await this.authService.loginAdmin2({
      userName,
      password,
      platform,
      deviceType,
    });
    return token;
  }

  @Query(() => TokenObject2)
  async refreshToken(
    @Args('refreshToken', { type: () => String }) refreshToken: string,
  ): Promise<TokenObject2> {
    const token = await this.authService.refreshToken(refreshToken);
    Logger.log(token, 'authResolver.accessToken');
    return {
      accessToken: token,
      refreshToken,
    };
  }

  @Query(() => OperatorDTO)
  @UseGuards(JwtAuthGuard)
  async me(): Promise<OperatorDTO> {
    return this.authService.getAdmin(this.context.req.user.id);
  }
}
