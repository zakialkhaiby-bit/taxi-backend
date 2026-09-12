import { Inject, UseGuards } from '@nestjs/common';
import { Args, CONTEXT, Mutation, Resolver, Query, ID } from '@nestjs/graphql';
import { UserContext } from '../auth/authenticated-user';
import { FavoriteLocationDTO } from './dto/favorite-location.dto';
import { CreateRiderAddressInput } from './dto/create-favorite-location.input';
import { FavoriteLocationService } from './favorite-location.service';
import { GqlAuthGuard } from '../auth/access-token.guard';

@Resolver()
@UseGuards(GqlAuthGuard)
export class FavoriteLocationResolver {
  constructor(
    private readonly favoriteLocationService: FavoriteLocationService,
    @Inject(CONTEXT) private readonly context: UserContext,
  ) {}

  @Mutation(() => FavoriteLocationDTO)
  async createFavoriteLocation(
    @Args('input') input: CreateRiderAddressInput,
  ): Promise<FavoriteLocationDTO> {
    return this.favoriteLocationService.createFavoriteLocation(input);
  }

  @Query(() => [FavoriteLocationDTO])
  async favoriteLocations(): Promise<FavoriteLocationDTO[]> {
    return this.favoriteLocationService.getFavoriteLocations(
      this.context.req.user.id,
    );
  }

  @Mutation(() => Boolean)
  async deleteFavoriteLocation(
    @Args('id', {
      type: () => ID,
    })
    id: number,
  ): Promise<boolean> {
    return this.favoriteLocationService.deleteFavoriteLocation({
      id,
      riderId: this.context.req.user.id,
    });
  }

  @Mutation(() => FavoriteLocationDTO)
  async updateFavoriteLocation(
    @Args('id', {
      type: () => ID,
    })
    id: number,
    @Args('input') input: CreateRiderAddressInput,
  ): Promise<FavoriteLocationDTO> {
    return this.favoriteLocationService.updateFavoriteLocation(id, input);
  }
}
