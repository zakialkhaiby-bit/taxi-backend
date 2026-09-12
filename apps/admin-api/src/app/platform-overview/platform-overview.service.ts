import { Injectable, Logger } from '@nestjs/common';
import { PlatformKPI } from './dtos/platform-kpi.dto';
import { KPIPeriod } from './inputs/platform-kpi.input';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxiOrderEntity } from '@ridy/database';
import { ShopOrderEntity } from '@ridy/database';
import { ParkOrderEntity } from '@ridy/database';
import { AppType } from '@ridy/database';
import { OrderVolumeTimeSeries } from './dtos/order-volume-time-series.dto';

@Injectable()
export class PlatformOverviewService {
  constructor(
    @InjectRepository(TaxiOrderEntity)
    private taxiOrderRepository: Repository<TaxiOrderEntity>,
    @InjectRepository(ShopOrderEntity)
    private shopOrderRepository: Repository<ShopOrderEntity>,
    @InjectRepository(ParkOrderEntity)
    private parkOrderRepository: Repository<ParkOrderEntity>,
  ) {}

  private getDateRange(period: KPIPeriod): {
    start: Date;
    end: Date;
    bucketSize: 'day' | 'week' | 'month';
  } {
    const now = new Date();
    let days: number;
    let bucketSize: 'day' | 'week' | 'month' = 'day';
    switch (period) {
      case KPIPeriod.Last7Days:
        days = 6;
        break;
      case KPIPeriod.Last30Days:
        days = 29;
        break;
      case KPIPeriod.Last90Days:
        days = 89;
        bucketSize = 'week';
        break;
      case KPIPeriod.Last365Days:
        days = 364;
        bucketSize = 'week';
        break;
      case KPIPeriod.AllTime:
        return { start: new Date(0), end: now, bucketSize: 'month' };
      default:
        throw new Error('Invalid KPI period');
    }
    return {
      start: new Date(now.getTime() - days * 86400000),
      end: now,
      bucketSize,
    };
  }

  async getOrderVolumeTimeSeries(
    period: KPIPeriod,
  ): Promise<OrderVolumeTimeSeries[]> {
    const { start, end, bucketSize } = this.getDateRange(period);
    const apps = Object.values(AppType);

    const results = await Promise.all(
      apps.map(async (app) => {
        const rawData = await this.getOrderCountsGroupedByBucket(
          app,
          start,
          end,
          bucketSize,
        );
        return { app, buckets: rawData };
      }),
    );
    return results;
  }
  async getOrderCountsGroupedByBucket(
    app: AppType,
    startDate: Date,
    endDate: Date,
    bucketSize: 'day' | 'week' | 'month',
  ): Promise<{ date: string; orderCount: number }[]> {
    let rawResult: { date: string; orderCount: string }[];

    switch (app) {
      case AppType.Taxi: {
        const groupBy =
          bucketSize === 'day'
            ? "DATE_FORMAT(`requestTimestamp`, '%Y-%m-%d')"
            : bucketSize === 'week'
              ? "DATE_FORMAT(DATE_SUB(`requestTimestamp`, INTERVAL WEEKDAY(`requestTimestamp`) DAY), '%Y-%m-%d')"
              : "DATE_FORMAT(DATE_FORMAT(`requestTimestamp`, '%Y-%m-01'), '%Y-%m-%d')";
        rawResult = await this.taxiOrderRepository
          .createQueryBuilder('order')
          .select(`${groupBy}`, 'date')
          .addSelect('COUNT(*)', 'orderCount')
          .where('order.requestTimestamp BETWEEN :start AND :end', {
            start: startDate,
            end: endDate,
          })
          .groupBy('date')
          .orderBy('date', 'ASC')
          .getRawMany();
        break;
      }
      case AppType.Shop: {
        const groupBy =
          bucketSize === 'day'
            ? `DATE_FORMAT("createdAt", '%Y-%m-%d')`
            : bucketSize === 'week'
              ? "DATE_FORMAT(DATE_SUB(`createdAt`, INTERVAL WEEKDAY(`createdAt`) DAY), '%Y-%m-%d')"
              : "DATE_FORMAT(DATE_FORMAT(`createdAt`, '%Y-%m-01'), '%Y-%m-%d')";
        rawResult = await this.shopOrderRepository
          .createQueryBuilder('order')
          .select(`${groupBy}`, 'date')
          .addSelect('COUNT(*)', 'orderCount')
          .where('order.createdAt BETWEEN :start AND :end', {
            start: startDate,
            end: endDate,
          })
          .groupBy('date')
          .orderBy('date', 'ASC')
          .getRawMany();
        break;
      }
      case AppType.Parking: {
        const groupBy =
          bucketSize === 'day'
            ? `DATE_FORMAT("createdAt", '%Y-%m-%d')`
            : bucketSize === 'week'
              ? "DATE_FORMAT(DATE_SUB(`createdAt`, INTERVAL WEEKDAY(`createdAt`) DAY), '%Y-%m-%d')"
              : "DATE_FORMAT(DATE_FORMAT(`createdAt`, '%Y-%m-01'), '%Y-%m-%d')";
        rawResult = await this.parkOrderRepository
          .createQueryBuilder('order')
          .select(`${groupBy}`, 'date')
          .addSelect('COUNT(*)', 'orderCount')
          .where('order.createdAt BETWEEN :start AND :end', {
            start: startDate,
            end: endDate,
          })
          .groupBy('date')
          .orderBy('date', 'ASC')
          .getRawMany();
        break;
      }
      default:
        throw new Error(`Unsupported app type: ${app}`);
    }

    return rawResult.map((row) => ({
      date: row.date,
      orderCount: Number(row.orderCount),
    }));
  }

  private getLastDateRange(period: KPIPeriod): { start: Date; end: Date } {
    const now = new Date();
    let days: number;
    switch (period) {
      case KPIPeriod.Last7Days:
        days = 7;
        break;
      case KPIPeriod.Last30Days:
        days = 30;
        break;
      case KPIPeriod.Last90Days:
        days = 90;
        break;
      case KPIPeriod.Last365Days:
        days = 365;
        break;
      case KPIPeriod.AllTime:
        return { start: new Date(0), end: new Date(0) };
      default:
        throw new Error('Invalid KPI period');
    }
    const range = {
      start: new Date(now.getTime() - days * 2 * 86400000),
      end: new Date(now.getTime() - days * 86400000),
    };
    Logger.log(
      range,
      `PlatformOverviewService.getLastDateRange(${period}).range`,
    );
    return range;
  }

  private async getCount(
    repo: Repository<any>,
    alias: string,
    currency: string,
    range: { start: Date; end: Date },
  ) {
    return repo
      .createQueryBuilder(alias)
      .where(
        alias == 'taxiOrder'
          ? `${alias}.requestTimestamp >= :start`
          : `${alias}.createdAt >= :start`,
        { start: range.start },
      )
      .andWhere(
        alias == 'taxiOrder'
          ? `${alias}.requestTimestamp <= :end`
          : `${alias}.createdAt <= :end`,
        { end: range.end },
      )
      .andWhere(`${alias}.currency = :currency`, { currency })
      .getCount();
  }

  private async getSum(
    repo: Repository<any>,
    alias: string,
    field: string,
    currency: string,
    range: { start: Date; end: Date },
  ) {
    const result = await repo
      .createQueryBuilder(alias)
      .select(`SUM(${alias}.${field})`, 'total')
      .where(
        alias == 'taxiOrder'
          ? `${alias}.requestTimestamp >= :start`
          : `${alias}.createdAt >= :start`,
        { start: range.start },
      )
      .andWhere(
        alias == 'taxiOrder'
          ? `${alias}.requestTimestamp <= :end`
          : `${alias}.createdAt <= :end`,
        { end: range.end },
      )
      .andWhere(`${alias}.currency = :currency`, { currency })
      .getRawOne();
    return Number(result.total) || 0;
  }

  private async getActiveUsers(
    repo: Repository<any>,
    alias: 'taxiOrder' | 'shopOrder' | 'parkOrder',
    currency: string,
    range: { start: Date; end: Date },
  ) {
    let userField = 'customerId';
    switch (alias) {
      case 'taxiOrder':
        userField = 'riderId';
        break;
      case 'shopOrder':
        userField = 'customerId';
        break;
      case 'parkOrder':
        userField = 'carOwnerId';
        break;
    }
    const result = await repo
      .createQueryBuilder(alias)
      .select(`COUNT(DISTINCT ${alias}.${userField})`, 'count')
      .where(
        alias == 'taxiOrder'
          ? `${alias}.requestTimestamp >= :start`
          : `${alias}.createdAt >= :start`,
        { start: range.start },
      )
      .andWhere(
        alias == 'taxiOrder'
          ? `${alias}.requestTimestamp <= :end`
          : `${alias}.createdAt <= :end`,
        { end: range.end },
      )
      .andWhere(`${alias}.currency = :currency`, { currency })
      .getRawOne();
    return Number(result.count) || 0;
  }

  async platformKPI({ period, currency }): Promise<PlatformKPI> {
    const range = this.getDateRange(period);
    const lastRange = this.getLastDateRange(period);

    const data = await Promise.all([
      this.getCount(this.taxiOrderRepository, 'taxiOrder', currency, range),
      this.getCount(this.shopOrderRepository, 'shopOrder', currency, range),
      this.getCount(this.parkOrderRepository, 'parkOrder', currency, range),

      this.getCount(this.taxiOrderRepository, 'taxiOrder', currency, lastRange),
      this.getCount(this.shopOrderRepository, 'shopOrder', currency, lastRange),
      this.getCount(this.parkOrderRepository, 'parkOrder', currency, lastRange),

      this.getSum(
        this.taxiOrderRepository,
        'taxiOrder',
        'costAfterCoupon',
        currency,
        range,
      ),
      this.getSum(
        this.shopOrderRepository,
        'shopOrder',
        'total',
        currency,
        range,
      ),
      this.getSum(
        this.parkOrderRepository,
        'parkOrder',
        'price',
        currency,
        range,
      ),
      this.getSum(
        this.taxiOrderRepository,
        'taxiOrder',
        'costAfterCoupon',
        currency,
        lastRange,
      ),
      this.getSum(
        this.shopOrderRepository,
        'shopOrder',
        'total',
        currency,
        lastRange,
      ),
      this.getSum(
        this.parkOrderRepository,
        'parkOrder',
        'price',
        currency,
        lastRange,
      ),

      this.getActiveUsers(
        this.taxiOrderRepository,
        'taxiOrder',
        currency,
        range,
      ),
      this.getActiveUsers(
        this.shopOrderRepository,
        'shopOrder',
        currency,
        range,
      ),
      this.getActiveUsers(
        this.parkOrderRepository,
        'parkOrder',
        currency,
        range,
      ),

      this.getActiveUsers(
        this.taxiOrderRepository,
        'taxiOrder',
        currency,
        lastRange,
      ),
      this.getActiveUsers(
        this.shopOrderRepository,
        'shopOrder',
        currency,
        lastRange,
      ),
      this.getActiveUsers(
        this.parkOrderRepository,
        'parkOrder',
        currency,
        lastRange,
      ),
    ]);

    const [
      taxiOrders,
      shopOrders,
      parkOrders,
      lastTaxiOrders,
      lastShopOrders,
      lastParkOrders,
      taxiRevenue,
      shopRevenue,
      parkRevenue,
      lastTaxiRevenue,
      lastShopRevenue,
      lastParkRevenue,
      taxiUsers,
      shopUsers,
      parkUsers,
      lastTaxiUsers,
      lastShopUsers,
      lastParkUsers,
    ] = data;

    const totalOrders = taxiOrders + shopOrders + parkOrders;
    const lastTotalOrders = lastTaxiOrders + lastShopOrders + lastParkOrders;
    const totalRevenue = taxiRevenue + shopRevenue + parkRevenue;
    const lastTotalRevenue =
      lastTaxiRevenue + lastShopRevenue + lastParkRevenue;
    const totalUsers = taxiUsers + shopUsers + parkUsers;
    const lastTotalUsers = lastTaxiUsers + lastShopUsers + lastParkUsers;

    const toItem = (
      name: string,
      unit: string,
      total: number,
      last: number,
      breakdown: { app: AppType; value: number }[],
    ): any => ({
      name,
      unit,
      total,
      change: last ? ((total - last) / last) * 100 : 0,
      breakdown: breakdown.map((b) => ({
        app: b.app,
        value: b.value,
        percentage: total ? (b.value / total) * 100 : 0,
      })),
    });

    return {
      totalOrders: toItem(
        'Total Orders',
        'orders',
        totalOrders,
        lastTotalOrders,
        [
          { app: AppType.Taxi, value: taxiOrders },
          { app: AppType.Shop, value: shopOrders },
          { app: AppType.Parking, value: parkOrders },
        ],
      ),
      totalRevenue: toItem(
        'Total Revenue',
        currency,
        totalRevenue,
        lastTotalRevenue,
        [
          { app: AppType.Taxi, value: taxiRevenue },
          { app: AppType.Shop, value: shopRevenue },
          { app: AppType.Parking, value: parkRevenue },
        ],
      ),
      activeCustomers: toItem(
        'Active Customers',
        'users',
        totalUsers,
        lastTotalUsers,
        [
          { app: AppType.Taxi, value: taxiUsers },
          { app: AppType.Shop, value: shopUsers },
          { app: AppType.Parking, value: parkUsers },
        ],
      ),
    };
  }
}
