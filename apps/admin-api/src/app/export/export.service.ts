import { Injectable } from '@nestjs/common';
import { writeFile } from 'fs/promises';
import { json2csv } from 'json-2-csv';
import { join } from 'path';
import * as PDFDocument from 'pdfkit';
import { Writable } from 'stream';

@Injectable()
export class ExportService {
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
    return `uploads/${fileName}`;
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
    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    const chunks: Buffer[] = [];
    const writable = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        callback();
      },
    });

    doc.pipe(writable);

    // Title
    doc.fontSize(16).text(title, { align: 'center' }).moveDown();

    // Table header
    doc
      .fontSize(10)
      .fillColor('black')
      .text(fields.map((f) => String(f)).join(' | '), { underline: true });

    doc.moveDown(0.5);

    // Table rows
    rows.forEach((row) => {
      const line = fields.map((field) => String(row[field] ?? '')).join(' | ');
      doc.text(line);
    });

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

    return `uploads/${fileName}`;
  }
}
