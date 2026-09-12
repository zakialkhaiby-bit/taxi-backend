import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class CreateShopCategoryInput {
  @Field(() => String, { nullable: false })
  name: string;
  @Field(() => String, { nullable: true })
  description?: string;
  @Field(() => ID, { nullable: false })
  imageId: number;
  @Field(() => ID, { nullable: true, defaultValue: 0 })
  displayPriority?: number;
}
