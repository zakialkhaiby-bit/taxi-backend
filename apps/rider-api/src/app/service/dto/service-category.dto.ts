import { ID, ObjectType, Field } from '@nestjs/graphql';
import { ServiceDTO } from './service.dto';

@ObjectType('ServiceCategory')
export class ServiceCategoryDTO {
  @Field(() => ID)
  id!: number;
  @Field(() => String, { nullable: false })
  name!: string;
  @Field(() => [ServiceDTO], { nullable: false })
  services!: ServiceDTO[];
}
