import { Logger } from '@nestjs/common';
import {
  Args,
  ArgsType,
  Field,
  InputType,
  registerEnumType,
  Resolver,
} from '@nestjs/graphql';
import {
  Class,
  Filter,
  mergeQuery,
  QueryService,
} from '@ptc-org/nestjs-query-core';
import {
  HookInterceptor,
  HookTypes,
  AuthorizerInterceptor,
  HookArgs,
  AuthorizerFilter,
  OperationGroup,
  ArrayConnectionType,
} from '@ptc-org/nestjs-query-graphql';
import { getDTONames } from '@ptc-org/nestjs-query-graphql/src/common';
import {
  GraphQLResolveInfoResult,
  ResolverQuery,
  GraphQLResultInfo,
} from '@ptc-org/nestjs-query-graphql/src/decorators';
import {
  BaseServiceResolver,
  ResolverClass,
  ServiceResolver,
} from '@ptc-org/nestjs-query-graphql/src/resolvers/resolver.interface';
import {
  CursorQueryArgsTypeOpts,
  PagingStrategies,
  QueryArgsType,
  QueryArgsTypeOpts,
  QueryType,
  StaticQueryType,
} from '@ptc-org/nestjs-query-graphql/src/types/query';
import omit from 'lodash.omit';
import { writeFile } from 'fs/promises';
import { json2csv } from 'json-2-csv';
import { join } from 'path';
import pdfKit = require('pdfkit');
import { Writable } from 'stream';
// import * as pdfkit from 'pdfkit-table';
import { existsSync } from 'fs';

enum ExportFormat {
  CSV = 'csv',
  PDF = 'pdf',
}

registerEnumType(ExportFormat, {
  name: 'ExportFormat',
  description: 'The format for exporting data',
});

@InputType()
export class ExportFieldInput {
  @Field(() => String, {
    description: 'The field to export. Use dot notation for nested fields.',
  })
  field!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Optional label for the field in the export.',
  })
  label?: string;
}

export type ExportResolverFromOpts<
  DTO,
  Opts extends ExportResolverOpts<DTO>,
  QS extends QueryService<DTO, unknown, unknown>,
> = ExportResolver<DTO, QS>;

export type ExportResolverOpts<DTO> = {
  QueryArgs?: StaticQueryType<DTO, PagingStrategies>;
} & QueryArgsTypeOpts<DTO>;

export interface ExportResolver<
  DTO,
  QS extends QueryService<DTO, unknown, unknown>,
> extends ServiceResolver<DTO, QS> {
  export(
    query: QueryType<DTO, PagingStrategies>,
    format: ExportFormat,
    fields: ExportFieldInput[],
    authorizeFilter?: Filter<DTO>,
    resolveInfo?: GraphQLResolveInfoResult<DTO, DTO>,
  ): Promise<string>;
}

/**
 * Mixin to add export support to a resolver with dynamic export format.
 */
export const Exportable =
  <
    DTO,
    ExportOpts extends ExportResolverOpts<DTO>,
    QS extends QueryService<DTO, unknown, unknown>,
  >(
    DTOClass: Class<DTO>,
    opts: ExportOpts,
  ) =>
  <B extends Class<ServiceResolver<DTO, QS>>>(
    BaseClass: B,
  ): Class<ExportResolverFromOpts<DTO, ExportOpts, QS>> & B => {
    const { pluralBaseName } = getDTONames(DTOClass, null);
    const exportManyQueryName = 'export' + pluralBaseName;

    const {
      QueryArgs = QueryArgsType(DTOClass, {
        ...opts,
      }),
    } = opts;
    const { ConnectionType } = QueryArgs;

    const commonResolverOpts = omit(
      opts,
      'dtoName',
      'one',
      'many',
      'QueryArgs',
      'Connection',
      'withDeleted',
    );

    @ArgsType()
    class QA extends QueryArgs {}

    @Resolver(() => DTOClass, { isAbstract: true })
    class ExportResolverBase extends BaseClass {
      @ResolverQuery(
        () => String,
        {
          name: exportManyQueryName,
        },
        commonResolverOpts,
        {
          interceptors: [
            HookInterceptor(HookTypes.BEFORE_QUERY_MANY, DTOClass),
            AuthorizerInterceptor(DTOClass),
          ],
        },
        {},
      )
      async export(
        @HookArgs() query: QA,

        @Args('format', { type: () => ExportFormat })
        format: ExportFormat,

        @Args('fields', {
          type: () => [ExportFieldInput],
          nullable: false,
          description:
            'Fields to include in the export. You can assign labels to fields using the label property. Use dot notation for nested fields.',
        })
        fields: ExportFieldInput[],

        @AuthorizerFilter({
          operationGroup: OperationGroup.READ,
          many: true,
        })
        authorizeFilter?: Filter<DTO>,

        @GraphQLResultInfo(DTOClass)
        resolveInfo?: GraphQLResolveInfoResult<DTO, DTO>,
      ): Promise<string> {
        // Extract relations from fields that use dot notation (e.g., "user.name" => "user")
        const relations = Array.from(
          new Set(
            fields
              .map((f) => f.field)
              .filter((f) => f.includes('.'))
              .map((f) => f.split('.')[0]),
          ),
        );

        let json = await ConnectionType.createFromPromise(
          (q) =>
            this.service.query(q, {
              withDeleted: false,
              resolveInfo: resolveInfo?.info,
            }),
          mergeQuery(query, {
            filter: authorizeFilter,
            relations: resolveInfo?.relations,
          }),
          null,
        );
        json = json as ArrayConnectionType<DTO>;
        // flatten the nested objects if necessary with . separator
        // Flatten and filter fields, assign labels if provided

        const rows = json.map((item) => {
          const flattenedItem: Record<string, any> = {};

          // Flatten all fields (dot notation for nested)
          for (const key in item) {
            if (Object.prototype.hasOwnProperty.call(item, key)) {
              if (typeof item[key] === 'object' && item[key] !== null) {
                for (const subKey in item[key]) {
                  if (Object.prototype.hasOwnProperty.call(item[key], subKey)) {
                    flattenedItem[`${key}.${subKey}`] = item[key][subKey];
                  }
                }
              } else {
                flattenedItem[key] =
                  key === 'mobileNumber'
                    ? String(item[key]).replace(/.(?=.{4})/g, '*')
                    : item[key];
              }
            }
          }

          // Only keep requested fields, assign label if provided
          const filtered: Record<string, any> = {};
          for (const field of fields) {
            if (
              Object.prototype.hasOwnProperty.call(flattenedItem, field.field)
            ) {
              filtered[field.label || field.field] = flattenedItem[field.field];
            }
          }
          return filtered;
        });

        if (rows.length === 0) {
          throw new Error('No data available for export');
        }

        switch (format) {
          case ExportFormat.CSV:
            const csvUrl = await this.toCSV(rows, Object.keys(rows[0]));
            return csvUrl;
          case ExportFormat.PDF:
            const pdfUrl = await this.toPDF(
              rows,
              Object.keys(rows[0]),
              `Exported ${pluralBaseName}`,
            );
            return pdfUrl;
        }
      }

      // Converts an array of objects to a CSV file
      // Each object represents a row, and the keys of the objects represent the columns
      // The fields parameter specifies which keys to include in the CSV
      // Returns the path to the generated CSV file
      async toCSV<T>(rows: T[], fields: (keyof T)[]): Promise<string> {
        const json = rows.map((row) => {
          const filteredRow: Partial<T> = {};
          fields.forEach((field) => {
            filteredRow[field] = row[field];
          });
          return filteredRow;
        });
        const fileName = `${new Date().getTime().toString()}.csv`;
        const csv = await json2csv(json);
        await writeFile(join(process.cwd(), 'uploads', fileName), csv, 'utf8');
        return join(process.env.CDN_URL, `${fileName}`);
      }

      // Converts an array of objects to a PDF file
      // Each object represents a row, and the keys of the objects represent the columns
      // The fields parameter specifies which keys to include in the PDF
      // The title parameter specifies the title of the PDF
      // Returns the path to the generated PDF file
      async toPDF<T>(
        rows: T[],
        fields: (keyof T)[],
        title = 'Exported Data',
      ): Promise<string> {
        // 1. Create document
        const doc = new pdfKit({
          size: 'A4',
          margin: 40,
          info: { Title: title, Author: 'Your Company' },
        });

        const chunks: Buffer[] = [];
        const writable = new Writable({
          write(chunk, _encoding, callback) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            callback();
          },
        });

        doc.pipe(writable);

        // 3. Draw header (logo + title)
        const logoPath = join(process.cwd(), 'assets', 'logo.png');
        if (existsSync(logoPath)) {
          doc.image(logoPath, doc.page.margins.left, doc.page.margins.top, {
            height: 20,
          });
        }
        doc
          .fontSize(18)
          .fillColor('#333333')
          .text(title, { align: 'center', continued: false })
          .moveDown();

        // 4. Draw a horizontal line
        const pageWidth =
          doc.page.width - doc.page.margins.left - doc.page.margins.right;
        doc
          .strokeColor('#eeeeee')
          .lineWidth(1)
          .moveTo(doc.page.margins.left, doc.y)
          .lineTo(doc.page.margins.left + pageWidth, doc.y)
          .stroke()
          .moveDown();

        // 5. Build the table
        // Add header row first
        const header = fields as string[];
        const data = [header, ...rows.map((row) => fields.map((f) => row[f]))];

        doc.table({
          data,
          maxWidth: pageWidth,
          rowStyles: (rowindex: number) => ({
            backgroundColor:
              rowIdx === 0
                ? '#eaeaea' // header row style
                : rowIdx % 2 === 0
                  ? '#fafafa'
                  : undefined,
          }),
        });

        // 6. Footer with page numbers
        const range = doc.bufferedPageRange(); // { start: 0, count: n }
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          const bottom = doc.page.height - 30;
          doc
            .fontSize(8)
            .fillColor('#999999')
            .text(
              `Page ${i + 1} of ${range.count}`,
              doc.page.margins.left,
              bottom,
              { align: 'center', width: pageWidth },
            );
        }

        // 7. Finalize
        doc.end();

        // Wait for PDF to be generated
        await new Promise<void>((resolve, reject) => {
          writable.on('finish', resolve);
          writable.on('error', reject);
        });

        // Write buffer to a file in uploads folder
        const fileName = `${Date.now()}.pdf`;
        const filePath = join(process.cwd(), 'uploads', fileName);
        await writeFile(filePath, Buffer.concat(chunks));

        return join(process.env.CDN_URL, `${fileName}`);
      }
    }

    return ExportResolverBase as Class<
      ExportResolverFromOpts<DTO, ExportOpts, QS>
    > &
      B;
  };

export const ExportResolver = <
  DTO,
  ExportOpts extends ExportResolverOpts<DTO> = CursorQueryArgsTypeOpts<DTO>,
  QS extends QueryService<DTO, unknown, unknown> = QueryService<
    DTO,
    unknown,
    unknown
  >,
>(
  DTOClass: Class<DTO>,
  opts: ExportOpts = {} as ExportOpts,
): ResolverClass<DTO, QS, ExportResolverFromOpts<DTO, ExportOpts, QS>> =>
  Exportable(DTOClass, opts)(BaseServiceResolver);
