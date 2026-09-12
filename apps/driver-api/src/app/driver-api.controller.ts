import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { RestJwtAuthGuard } from './auth/rest-jwt-auth.guard';
import { RestOptionalJwtAuthGuard } from './auth/rest-optional-jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { DriverEntity } from '@ridy/database';
import { MediaEntity } from '@ridy/database';
import { Repository } from 'typeorm';
import { CryptoService } from '@ridy/database';
import { SharedDriverService } from '@ridy/database';
import { TransactionAction } from '@ridy/database';
import { DriverRechargeTransactionType } from '@ridy/database';
import { TransactionStatus } from '@ridy/database';
import { PaymentEntity } from '@ridy/database';
import { DriverToDriverDocumentEntity } from '@ridy/database';
import urlJoin from 'proper-url-join';
import { Request, Response } from 'express';
import { UploadImageInterceptor } from '@ridy/database';
import { version } from '../../../../package.json';

@Controller()
export class DriverAPIController {
  constructor(
    @InjectRepository(MediaEntity)
    private mediaRepository: Repository<MediaEntity>,
    @InjectRepository(DriverToDriverDocumentEntity)
    private driverDocumentRepository: Repository<DriverToDriverDocumentEntity>,
    @InjectRepository(DriverEntity)
    private driverRepository: Repository<DriverEntity>,
    @InjectRepository(PaymentEntity)
    private paymentRepository: Repository<PaymentEntity>,
    private cryptoService: CryptoService,
    private sharedDriverService: SharedDriverService,
  ) {}

  @Get()
  async defaultPath(@Res() res: Response) {
    res.send(`✅ Driver API microservice running.\nVersion:${version}`);
  }

  @Get('payment_result')
  async verifyPayment(@Req() req: Request, @Res() res: Response) {
    const token = req.query.token;
    const decrypted = await this.cryptoService.decrypt(token as string);
    if (decrypted.userType == 'driver') {
      if (decrypted.status == 'success') {
        await this.sharedDriverService.rechargeWallet({
          driverId: decrypted.userId,
          amount: decrypted.amount,
          currency: decrypted.currency,
          refrenceNumber: decrypted.transactionNumber,
          action: TransactionAction.Recharge,
          rechargeType: DriverRechargeTransactionType.InAppPayment,
          paymentGatewayId: decrypted.gatewayId,
          status: TransactionStatus.Done,
        });
        await this.paymentRepository.delete({
          transactionNumber: decrypted.transactionNumber,
        });
      }
    }
    res.redirect(
      `${process.env.DRIVER_APPLICATION_ID ?? 'default.driver.redirection'}://`,
    );
  }

  @Get('success_message')
  async successMessage(
    @Query() query: { id_order: string },
    @Body() body: { posted_data: string },
    @Res() res: Response,
  ) {
    res.send('Transaction successful. Close this page and go back to the app.');
  }

  @Post('upload_profile')
  @UseGuards(RestOptionalJwtAuthGuard)
  @UploadImageInterceptor('file')
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const fileUrl =
      file.path && file.path.startsWith('http')
        ? file.path
        : urlJoin(process.env.CDN_URL, file.filename);
    const insert = await this.mediaRepository.save({ address: fileUrl });
    const userId = (req as unknown as any).user?.id;
    if (userId) {
      await this.driverRepository.update(userId, {
        mediaId: insert.id,
      });
    }
    insert.id = insert.id.toString() as unknown as any;
    res.send({
      __typename: 'Media',
      id: insert.id,
      address: fileUrl,
    });
  }

  @Post('upload_document')
  @UseGuards(RestOptionalJwtAuthGuard)
  @UploadImageInterceptor('file')
  async uploadDocument(
    @UploadedFile()
    file: Express.Multer.File,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const fileUrl =
      file.path && file.path.startsWith('http')
        ? file.path
        : urlJoin(process.env.CDN_URL, file.filename);
    const userId = (req as unknown as any).user?.id ?? null;
    const insert = await this.mediaRepository.save({
      address: fileUrl,
      driverDocumentId: userId,
      uploadedByDriverId: userId,
    });
    insert.id = parseInt(insert.id.toString() as unknown as string);
    if (userId && req.body?.requestedDocumentId) {
      try {
        const doc = this.driverDocumentRepository.create();
        doc.driverId = userId;
        doc.driverDocumentId = parseInt(req.body.requestedDocumentId);
        await this.driverDocumentRepository.save(doc);
      } catch (err) {
        // non-blocking
      }
    }
    res.send({
      __typename: 'Media',
      id: insert.id.toString(),
      address: fileUrl,
    });
  }

  @Post('upload_media')
  @UseGuards(RestOptionalJwtAuthGuard)
  @UploadImageInterceptor('file')
  async uploadMedia(
    @UploadedFile()
    file: Express.Multer.File,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const fileUrl =
      file.path && file.path.startsWith('http')
        ? file.path
        : urlJoin(process.env.CDN_URL, file.filename);
    const userId = (req as unknown as any).user?.id ?? null;
    const insert = await this.mediaRepository.save({
      address: fileUrl,
      uploadedByDriverId: userId,
    });
    insert.id = insert.id.toString() as unknown as any;
    res.send({
      __typename: 'Media',
      id: insert.id,
      address: fileUrl,
    });
  }

  @Get('/debug-sentry')
  getError() {
    throw new Error('My first Sentry error!');
  }
}
