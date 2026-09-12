import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('SOS')
export class SOSDTO {
  @Field(() => ID)
  id!: number;
}
