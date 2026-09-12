import { Field, ID, InputType, Int, ObjectType } from '@nestjs/graphql';

@InputType()
export class ShopDocumentRetentionPolicyInput {
  @Field(() => String, { nullable: false })
    title: string;
  @Field(() => Int)
  deleteAfterDays: number;
  @Field(() => ID)
  shopDocumentId: number;
}
