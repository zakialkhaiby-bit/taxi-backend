import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('Media')
export class MediaDTO {
  @Field(() => ID)
  id!: number;
  @Field(() => String)
  address!: string;
  @Field(() => String, { nullable: true })
  base64?: string;
}
