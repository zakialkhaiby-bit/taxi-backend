import { Field, ID, ObjectType, GraphQLISODateTime } from '@nestjs/graphql';
import {
  FilterableField,
  IDField,
  Relation,
} from '@ptc-org/nestjs-query-graphql';
import { ShopDocumentDTO } from './shop-document.dto';
import { ShopDocumentRetentionPolicyDTO } from './shop-document-retention-policy.dto';
import { MediaDTO } from '../../../../upload/media.dto';
import { ShopDTO } from '../../../dto/shop.dto';

@ObjectType('ShopToShopDocument')
@Relation('shop', () => ShopDTO)
@Relation('shopDocument', () => ShopDocumentDTO)
@Relation('media', () => MediaDTO)
@Relation('retentionPolicy', () => ShopDocumentRetentionPolicyDTO, {
  nullable: true,
})
export class ShopToShopDocumentDTO {
  @IDField(() => ID)
  id: number;

  @FilterableField(() => ID)
  shopId: number;

  @Field(() => ID)
  shopDocumentId: number;

  @Field(() => ID)
  mediaId: number;

  @Field(() => ID)
  retentionPolicyId?: number;

  @Field(() => GraphQLISODateTime, { nullable: true })
  expiresAt?: Date;
}
