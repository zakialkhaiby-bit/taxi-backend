import { Filter } from '@ptc-org/nestjs-query-core';
import {
  CustomAuthorizer,
  AuthorizationContext,
} from '@ptc-org/nestjs-query-graphql';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ShopPermission } from '@ridy/database';
import { OperatorEntity } from '@ridy/database';
import { DataSource } from 'typeorm';
import { UserContext } from '../../auth/authenticated-admin';

@Injectable()
export class ShopAuthorizer implements CustomAuthorizer<any> {
  constructor(private datasource: DataSource) {}
  async authorize(
    context: UserContext,
    authorizerContext: AuthorizationContext,
  ): Promise<Filter<any>> {
    const operator = await this.datasource
      .getRepository(OperatorEntity)
      .findOne({
        where: { id: context.req.user.id },
        relations: {
          role: true,
        },
      });
    if (
      authorizerContext.readonly &&
      !operator.role.shopPermissions.includes(ShopPermission.SHOP_VIEW)
    ) {
      throw new UnauthorizedException();
    }
    if (
      !authorizerContext.readonly &&
      !operator.role.shopPermissions.includes(ShopPermission.SHOP_EDIT)
    ) {
      if (
        authorizerContext.operationGroup === 'create' ||
        authorizerContext.operationGroup === 'update' ||
        authorizerContext.operationGroup === 'delete'
      ) {
        throw new UnauthorizedException();
      }
    }
    return undefined;
  }
}
