/**
 * CSV Batch Import Script
 * 
 * Imports question batches from CSV files into MongoDB.
 * 
 * Usage:
 *   ts-node scripts/import-csv-batch.ts [batch-file.csv]
 * 
 * If no file is specified, imports all CSV files in data/question-batches/
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import mongoose from 'mongoose';
import { Question, IQuestion } from '../packages/db-backend/src/models/Question.model';
import { connectDatabase, disconnectDatabase } from '../packages/db-backend/src/config/database';

interface CSVRow {
  _id: string;
  subject: string;
  difficulty: string;
  difficultyScore: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  graph: string;
  tags: string;
  'metadata.generatedBy': string;
  'metadata.generatedAt': string;
  'metadata.timesUsed': string;
  'metadata.averageAccuracy': string;
  'metadata.averageTimeSpent': string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Parse CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current);
  return result;
}

/**
 * Read and parse CSV file
 */
async function readCSVFile(filePath: string): Promise<CSVRow[]> {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const rows: CSVRow[] = [];
  let headers: string[] = [];
  let isFirstLine = true;

  for await (const line of rl) {
    if (isFirstLine) {
      headers = parseCSVLine(line);
      isFirstLine = false;
      continue;
    }

    const values = parseCSVLine(line);
    if (values.length !== headers.length) {
      console.warn(`⚠️  Skipping row with ${values.length} columns (expected ${headers.length}):`, line.substring(0, 100));
      continue;
    }

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    rows.push(row as CSVRow);
  }

  return rows;
}

/**
 * Transform CSV row to database document
 */
function transformCSVRowToQuestion(row: CSVRow): Partial<IQuestion> {
  // Parse graph if present
  let graph: any = undefined;
  if (row.graph && row.graph.trim()) {
    try {
      graph = JSON.parse(row.graph);
    } catch (e) {
      console.warn(`⚠️  Failed to parse graph for ${row._id}:`, e);
    }
  }

  // Parse tags from pipe-separated string
  const tags = row.tags
    ? row.tags.split('|').map(t => t.trim()).filter(t => t.length > 0)
    : [];

  // Parse dates
  const createdAt = row.createdAt ? new Date(row.createdAt) : new Date();
  const updatedAt = row.updatedAt ? new Date(row.updatedAt) : new Date();
  const generatedAt = row['metadata.generatedAt'] 
    ? new Date(row['metadata.generatedAt']) 
    : new Date();

  // Build nested content object
  const content: any = {
    questionText: row.questionText,
    options: [row.optionA, row.optionB, row.optionC, row.optionD].filter(opt => opt),
    correctAnswer: row.correctAnswer,
    explanation: row.explanation,
  };

  if (graph) {
    content.graph = graph;
  }

  // Build nested metadata object
  const metadata = {
    generatedBy: (row['metadata.generatedBy'] || 'manual') as 'ai' | 'manual',
    generatedAt,
    timesUsed: parseInt(row['metadata.timesUsed'] || '0', 10),
    averageAccuracy: parseFloat(row['metadata.averageAccuracy'] || '0'),
    averageTimeSpent: parseFloat(row['metadata.averageTimeSpent'] || '0'),
  };

  // Build question document
  const question: Partial<IQuestion> = {
    _id: new mongoose.Types.ObjectId(),
    subject: row.subject as 'math' | 'reading' | 'writing',
    difficulty: row.difficulty as 'easy' | 'medium' | 'hard',
    difficultyScore: parseInt(row.difficultyScore || '0', 10),
    content,
    metadata,
    tags,
    createdAt,
    updatedAt,
  };

  return question;
}

/**
 * Import a single CSV file
 */
async function importCSVFile(filePath: string, upsert: boolean = false): Promise<{ imported: number; skipped: number; errors: number }> {
  console.log(`\n📄 Reading ${filePath}...`);

  const rows = await readCSVFile(filePath);
  console.log(`   Found ${rows.length} rows`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const questionData = transformCSVRowToQuestion(row);

      // Validate required fields
      if (!questionData.subject || !questionData.difficulty || !questionData.content?.questionText) {
        console.warn(`⚠️  Skipping ${row._id}: Missing required fields`);
        skipped++;
        continue;
      }

      // Check if question already exists
      // First try by the CSV _id if it's a valid ObjectId
      let existing = null;
      if (row._id && mongoose.Types.ObjectId.isValid(row._id) && row._id.length === 24) {
        existing = await Question.findById(row._id);
      }

      if (existing) {
        if (upsert) {
          // Update existing
          await Question.findByIdAndUpdate(existing._id, questionData, { new: true });
          console.log(`   ✓ Updated: ${row._id}`);
          imported++;
        } else {
          console.log(`   ⊘ Skipped (exists): ${row._id}`);
          skipped++;
        }
      } else {
        // Create new - use the _id from CSV only if it's a valid ObjectId format
        try {
          // CSV IDs like "batch10-math-001" are not valid ObjectIds
          // Only use CSV _id if it's a valid 24-character hex ObjectId
          if (row._id && mongoose.Types.ObjectId.isValid(row._id) && row._id.length === 24) {
            questionData._id = new mongoose.Types.ObjectId(row._id);
          }
          // Otherwise, MongoDB will auto-generate an _id
          await Question.create(questionData);
          console.log(`   ✓ Imported: ${row._id || questionData._id}`);
          imported++;
        } catch (createError: any) {
          // If _id conflict, try without _id
          if (createError.code === 11000) {
            delete questionData._id;
            await Question.create(questionData);
            console.log(`   ✓ Imported (new _id): ${row._id}`);
            imported++;
          } else {
            throw createError;
          }
        }
      }
    } catch (error: any) {
      console.error(`   ✗ Error importing ${row._id}:`, error.message);
      errors++;
    }
  }

  return { imported, skipped, errors };
}

/**
 * Main function
 */
async function main() {
  // Load environment variables
  require('dotenv').config({ path: path.join(__dirname, '..', 'packages', 'db-backend', '.env') });

  const args = process.argv.slice(2);
  const targetFile = args[0];
  const upsert = args.includes('--upsert') || args.includes('-u');

  try {
    // Connect to database
    console.log('🔌 Connecting to MongoDB...');
    await connectDatabase();

    if (targetFile) {
      // Import single file
      const filePath = path.isAbsolute(targetFile) 
        ? targetFile 
        : path.join(__dirname, '..', 'data', 'question-batches', targetFile);

      if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        process.exit(1);
      }

      const stats = await importCSVFile(filePath, upsert);
      console.log(`\n✅ Import complete:`);
      console.log(`   Imported: ${stats.imported}`);
      console.log(`   Skipped: ${stats.skipped}`);
      console.log(`   Errors: ${stats.errors}`);
    } else {
      // Import all CSV files in directory
      const batchDir = path.join(__dirname, '..', 'data', 'question-batches');
      
      if (!fs.existsSync(batchDir)) {
        console.error(`❌ Directory not found: ${batchDir}`);
        process.exit(1);
      }

      const files = fs.readdirSync(batchDir)
        .filter(file => file.endsWith('.csv'))
        .sort();

      if (files.length === 0) {
        console.log(`⚠️  No CSV files found in ${batchDir}`);
        process.exit(0);
      }

      console.log(`\n📁 Found ${files.length} CSV file(s):`);
      files.forEach(file => console.log(`   - ${file}`));

      let totalImported = 0;
      let totalSkipped = 0;
      let totalErrors = 0;

      for (const file of files) {
        const filePath = path.join(batchDir, file);
        const stats = await importCSVFile(filePath, upsert);
        totalImported += stats.imported;
        totalSkipped += stats.skipped;
        totalErrors += stats.errors;
      }

      console.log(`\n✅ All imports complete:`);
      console.log(`   Total imported: ${totalImported}`);
      console.log(`   Total skipped: ${totalSkipped}`);
      console.log(`   Total errors: ${totalErrors}`);
    }

  } catch (error: any) {
    console.error('❌ Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Disconnect from database
    await disconnectDatabase();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { importCSVFile, transformCSVRowToQuestion };

