import { Field, ID, InputType, GraphQLISODateTime } from '@nestjs/graphql';

@InputType()
export class ShopToShopDocumentInput {
  @Field(() => ID)
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
