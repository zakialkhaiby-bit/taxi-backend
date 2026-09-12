import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class ComplaintInput {
  @Field(() => ID)
  requestId!: number;
  @Field(() => String, { nullable: false })
  subject!: string;
  @Field(() => String, { nullable: true })
  content?: string;
  @Field(() => Boolean, { nullable: true })
  requestedByDriver?: boolean;
}
