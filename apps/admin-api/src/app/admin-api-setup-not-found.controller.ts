import { Controller, Get, Post, Res, UploadedFile } from '@nestjs/common';
import { Response } from 'express';
import urlJoin from 'proper-url-join';
import { UploadImageInterceptor } from '@ridy/database';

@Controller()
export class AdminApiSetupNotFoundController {
  @Get('/')
  main(@Res() res: Response) {
    return '🚧 This API is not set up yet. Please check back later.';
  }

  @Get('/restart')
  restart(@Res() res: Response) {
    res.send('✅ Restarting...');
    process.exit(1);
  }

  @Post('upload')
  @UploadImageInterceptor('file')
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    const fileUrl =
      file.path && file.path.startsWith('http')
        ? file.path
        : urlJoin(process.env.CDN_URL, file.filename);
    res.send({
      id: '0',
      address: fileUrl,
    });
  }
}
