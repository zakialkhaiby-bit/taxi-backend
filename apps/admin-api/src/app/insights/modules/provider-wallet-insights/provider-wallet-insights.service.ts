import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProviderTransactionEntity } from '@ridy/database';
import { Repository } from 'typeorm';
import { InsightsHelperService } from '../../core/services/insights-helper.service';
import { FinancialTimeline } from '../../core/dto/financial-timeline.dto';
import { ChartFilterInput } from '../../core/dto/chart-filter.input';
import { RevenueExpensePair } from './dto/revenue-expense-pair.dto';
import { ProviderExpenseBreakdownRecord } from './dto/provider-expense-breakdown-record.dto';

@Injectable()
export class ProviderWalletInsightsService {
  constructor(
    @InjectRepository(ProviderTransactionEntity)
    private providerTransactionEntity: Repository<ProviderTransactionEntity>,
    private insightsHelperService: InsightsHelperService,
  ) {}

  async getProviderWalletBalanceHistory(
    currency: string,
    input: ChartFilterInput,
  ): Promise<FinancialTimeline[]> {
    const tableName = 'transaction';
    const dateFieldName = 'transactionTime';
    const selectField = this.insightsHelperService.selectField(
      tableName,
      dateFieldName,
      input,
    );
    Logger.log(`selectField: ${selectField}`, 'ProviderWalletInsightsService');
    let query = this.providerTransactionEntity
      .createQueryBuilder('transaction')
      .select('currency', 'currency')
      .addSelect('SUM(transaction.amount)', 'amount')
      .addSelect(selectField, 'dateString')
      .addSelect(`ANY_VALUE(${tableName}.${dateFieldName})`, 'anyDate')
      .where(`${tableName}.${dateFieldName} >= :startDate`, {
        startDate: input.startDate,
      })
      .andWhere(`${tableName}.${dateFieldName} <= :endDate`, {
        endDate: input.endDate,
      })
      .andWhere('transaction.currency = :currency', { currency })
      .groupBy(selectField)
      .addGroupBy('currency');
    Logger.log(
      `Query for provider wallet balance history: ${query.getQuery()}`,
      'ProviderWalletInsightsService',
    );
    return query.getRawMany();
  }

  async getProviderRevenueExpenseHistory(
    currency: string,
    input: ChartFilterInput,
  ): Promise<RevenueExpensePair[]> {
    return [];
  }

  async getProviderExpenseBreakdownHistory(
    currency: string,
    input: ChartFilterInput,
  ): Promise<ProviderExpenseBreakdownRecord[]> {
    return [];
  }
}
