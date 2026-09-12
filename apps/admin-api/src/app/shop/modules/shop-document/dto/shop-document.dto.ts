import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { IDField, UnPagedRelation } from '@ptc-org/nestjs-query-graphql';
import { ShopDocumentRetentionPolicyDTO } from './shop-document-retention-policy.dto';

@ObjectType('ShopDocument')
@UnPagedRelation('retentionPolicies', () => ShopDocumentRetentionPolicyDTO)
export class ShopDocumentDTO {
  @IDField(() => ID)
  id: number;
  @Field(() => String, { nullable: false })
  title: string;
  @Field(() => Boolean, { nullable: false })
  isEnabled: boolean;
  @Field(() => Boolean, { nullable: false })
  isRequired: boolean;
  @Field(() => Boolean, { nullable: false })
  hasExpiryDate: boolean;
  @Field(() => Int)
  notificationDaysBeforeExpiry: number;
}
