import { ID, ObjectType, Field } from '@nestjs/graphql';
import { FilterableField, Relation } from '@ptc-org/nestjs-query-graphql';
import { ServiceDTO } from '../../core/dtos/service.dto';

@ObjectType()
@Relation('service', () => ServiceDTO)
export class DriverServicesServiceDTO {
  @FilterableField(() => ID)
  driverId!: number;
  @FilterableField(() => ID)
  serviceId!: number;
  @Field(() => Boolean, { nullable: false })
  driverEnabled!: boolean;
}
