import { Module } from '@nestjs/common';
import {
  NestjsQueryGraphQLModule,
  PagingStrategies,
} from '@ptc-org/nestjs-query-graphql';
import { NestjsQueryTypeOrmModule } from '@ptc-org/nestjs-query-typeorm';
import { ShopDocumentEntity } from '@ridy/database';
import { ShopDocumentRetentionPolicyEntity } from '@ridy/database';
import { ShopDocumentDTO } from './dto/shop-document.dto';
import { ShopDocumentRetentionPolicyDTO } from './dto/shop-document-retention-policy.dto';
import { ShopDocumentInput } from './dto/shop-document.input';
import { ShopDocumentRetentionPolicyInput } from './dto/shop-document-retention-policy.input';
import { ShopToShopDocumentEntity } from '@ridy/database';
import { ShopToShopDocumentDTO } from './dto/shop-to-shop-document.dto';
import { ShopToShopDocumentInput } from './dto/shop-to-shop-document.input';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';

@Module({
  imports: [
    NestjsQueryGraphQLModule.forFeature({
      imports: [
        NestjsQueryTypeOrmModule.forFeature([
          ShopDocumentEntity,
          ShopToShopDocumentEntity,
          ShopDocumentRetentionPolicyEntity,
        ]),
      ],
      resolvers: [
        {
          DTOClass: ShopDocumentDTO,
          EntityClass: ShopDocumentEntity,
          CreateDTOClass: ShopDocumentInput,
          UpdateDTOClass: ShopDocumentInput,
          pagingStrategy: PagingStrategies.NONE,
          read: { one: { disabled: true } },
          guards: [JwtAuthGuard],
        },
        {
          DTOClass: ShopDocumentRetentionPolicyDTO,
          EntityClass: ShopDocumentRetentionPolicyEntity,
          CreateDTOClass: ShopDocumentRetentionPolicyInput,
          UpdateDTOClass: ShopDocumentRetentionPolicyInput,
          read: { one: { disabled: true } },
          guards: [JwtAuthGuard],
        },
        {
          EntityClass: ShopToShopDocumentEntity,
          DTOClass: ShopToShopDocumentDTO,
          CreateDTOClass: ShopToShopDocumentInput,
          UpdateDTOClass: ShopToShopDocumentInput,
          guards: [JwtAuthGuard],
          read: { one: { disabled: true } },
          delete: { many: { disabled: true } },
          update: { many: { disabled: true } },
          create: { many: { disabled: true } },
        },
      ],
    }),
  ],
})
export class ShopDocumentModule {}
