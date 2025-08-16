'use server';
/**
 * @fileOverview A flow for splitting an Excel file by month and year.
 *
 * - splitExcelFile - A function that handles the Excel splitting process.
 * - SplitExcelInput - The input type for the splitExcelFile function.
 * - SplitExcelOutput - The return type for the splitExcelFile function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

const SplitExcelInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "An Excel file (.xlsx or .xls) as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  dateColumn: z.string().describe('The name of the column containing dates.'),
});
export type SplitExcelInput = z.infer<typeof SplitExcelInputSchema>;

const SplitExcelOutputSchema = z.object({
  zipDataUri: z.string().describe('The zipped archive of split Excel files as a data URI.'),
  fileCount: z.number().describe('The number of files created.'),
});
export type SplitExcelOutput = z.infer<typeof SplitExcelOutputSchema>;


const splitExcelFileFlow = ai.defineFlow(
  {
    name: 'splitExcelFileFlow',
    inputSchema: SplitExcelInputSchema,
    outputSchema: SplitExcelOutputSchema,
  },
  async ({ fileDataUri, dateColumn }) => {
    const base64Data = fileDataUri.split(';base64,').pop();
    if (!base64Data) {
      throw new Error('Invalid data URI');
    }
    const buffer = Buffer.from(base64Data, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<any>(worksheet);

    const groupedData: { [key: string]: any[] } = {};

    data.forEach(row => {
      const dateValue = row[dateColumn];
      if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
        const year = dateValue.getFullYear();
        const month = dateValue.getMonth() + 1;
        const key = `${year}-${String(month).padStart(2, '0')}`;
        
        if (!groupedData[key]) {
          groupedData[key] = [];
        }
        groupedData[key].push(row);
      }
    });

    const zip = new JSZip();
    let fileCount = 0;

    for (const key in groupedData) {
      const newSheet = XLSX.utils.json_to_sheet(groupedData[key]);
      const newWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Sheet1');
      const wbout = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
      const fileName = `correciones_SKU_${key}-01.xlsx`;
      zip.file(fileName, wbout);
      fileCount++;
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const zipDataUri = `data:application/zip;base64,${zipBuffer.toString('base64')}`;
    
    return { zipDataUri, fileCount };
  }
);

export async function splitExcelFile(input: SplitExcelInput): Promise<SplitExcelOutput> {
    return splitExcelFileFlow(input);
}
