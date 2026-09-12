import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller()
export class RiderApiSetupNotFoundController {
  @Get('/')
  main(@Res() res: Response) {
    return '🚧 This API is not set up yet. Please check back later.';
  }

  @Get('/restart')
  restart(@Res() res: Response) {
    res.send('✅ Restarting...');
    process.exit(1);
  }
}
