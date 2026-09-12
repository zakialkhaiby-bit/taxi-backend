import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class PaginationInput {
  @Field(() => Int, { defaultValue: 10, nullable: true })
  first?: number;

  @Field(() => Int, { nullable: true })
  after?: number;
}
