import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';
import { ForbiddenError } from '@nestjs/apollo';

@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
  override getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context).getContext();
    //const { req, connection } = ctx.getContext();
    return ctx.req ? ctx.req : { user: ctx };
  }

  override canActivate(context: ExecutionContext) {
    if (context.getArgs()[2].id != null) {
      return true;
    }
    /*const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();*/
    //const req = this.getRequest(context);
    return super.canActivate(context);
  }

  // canActivate(context: ExecutionContext) {
  //   const ctx = GqlExecutionContext.create(context);
  //   const { req } = ctx.getContext();

  //   return super.canActivate(
  //     new ExecutionContextHost([req]),
  //   );
  // }

  override handleRequest(err: any, user: any) {
    if (err || !user) {
      Logger.error('GqlAuthGuard', err);
      throw err || new ForbiddenError('GqlAuthGuard');
    }
    return user;
  }
}

@Injectable()
export class GqlOptionalAuthGuard extends AuthGuard('jwt') {
  override getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context).getContext();
    return ctx.req ? ctx.req : { user: ctx };
  }

  override handleRequest(err: any, user: any) {
    return user || null;
  }
}
