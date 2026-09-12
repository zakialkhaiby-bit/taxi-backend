import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Point } from '@ridy/database';
import { DriverLocationUpdateDTO } from './driver-location-update.dto';
import { ClusteredLocationDTO } from './clustered-location.dto';

@ObjectType('IdentifiedLocation')
export class IdentifiedLocationDTO {
  @Field(() => Point, { nullable: false })
  location: Point;
  @Field(() => ID, { nullable: false })
  id: number;
}

@ObjectType('BoundedLocations')
export class BoundedLocationsDTO {
  @Field(() => [ClusteredLocationDTO], { nullable: false })
  clusters!: ClusteredLocationDTO[];
  @Field(() => [DriverLocationUpdateDTO], { nullable: false })
  singles!: DriverLocationUpdateDTO[];
  @Field(() => [String], { nullable: false })
  h3IndexesInView: string[];
  @Field(() => Int, { nullable: false })
  h3Resolution!: number;
  @Field(() => Int, { nullable: false })
  totalCount!: number;
}
