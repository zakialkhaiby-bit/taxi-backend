import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class TokenObject {
  @Field(() => String, { nullable: false })
  token: string;
}

@ObjectType('TokenObject2')
export class TokenObject2 {
  @Field(() => String, { nullable: false })
  refreshToken!: string;
  @Field(() => String, { nullable: false })
  accessToken!: string;
}
