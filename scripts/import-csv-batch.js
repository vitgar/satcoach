/**
 * CSV Batch Import Script (JavaScript version)
 * 
 * Imports question batches from CSV files into MongoDB.
 * 
 * Usage:
 *   node scripts/import-csv-batch.js [batch-file.csv] [--upsert]
 * 
 * If no file is specified, imports all CSV files in data/question-batches/
 * Use --upsert to update existing questions instead of skipping them
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '..', 'packages', 'db-backend', '.env') });

// Import mongoose and models
const mongoose = require('mongoose');

// We'll need to compile TypeScript or use a different approach
// For now, let's use mongoose directly without the model
const QuestionSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
    enum: ['math', 'reading', 'writing'],
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['easy', 'medium', 'hard'],
  },
  difficultyScore: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
  },
  content: {
    questionText: { type: String, required: true },
    options: { type: [String], required: true, validate: (v) => v.length === 4 },
    correctAnswer: { type: String, required: true, enum: ['A', 'B', 'C', 'D'] },
    explanation: { type: String, required: true },
    graph: mongoose.Schema.Types.Mixed,
  },
  metadata: {
    generatedBy: { type: String, enum: ['ai', 'manual'], default: 'manual' },
    generatedAt: { type: Date, default: Date.now },
    timesUsed: { type: Number, default: 0, min: 0 },
    averageAccuracy: { type: Number, default: 0, min: 0, max: 1 },
    averageTimeSpent: { type: Number, default: 0, min: 0 },
  },
  tags: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Use existing model if available, otherwise create
let Question;
try {
  Question = mongoose.model('Question');
} catch (e) {
  Question = mongoose.model('Question', QuestionSchema);
}

/**
 * Parse CSV line, handling quoted fields
 */
function parseCSVLine(line) {
  const result = [];
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
async function readCSVFile(filePath) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const rows = [];
  let headers = [];
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

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    rows.push(row);
  }

  return rows;
}

/**
 * Transform CSV row to database document
 */
function transformCSVRowToQuestion(row) {
  // Parse graph if present
  let graph = undefined;
  if (row.graph && row.graph.trim()) {
    try {
      graph = JSON.parse(row.graph);
    } catch (e) {
      console.warn(`⚠️  Failed to parse graph for ${row._id}:`, e.message);
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
  const content = {
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
    generatedBy: row['metadata.generatedBy'] || 'manual',
    generatedAt,
    timesUsed: parseInt(row['metadata.timesUsed'] || '0', 10),
    averageAccuracy: parseFloat(row['metadata.averageAccuracy'] || '0'),
    averageTimeSpent: parseFloat(row['metadata.averageTimeSpent'] || '0'),
  };

  // Build question document
  const question = {
    subject: row.subject,
    difficulty: row.difficulty,
    difficultyScore: parseInt(row.difficultyScore || '0', 10),
    content,
    metadata,
    tags,
    createdAt,
    updatedAt,
  };

  // Use CSV _id only if it's a valid ObjectId format (24 hex chars)
  // CSV IDs like "batch10-math-001" are not valid ObjectIds, so we'll let MongoDB generate new ones
  if (row._id && mongoose.Types.ObjectId.isValid(row._id) && row._id.length === 24) {
    question._id = new mongoose.Types.ObjectId(row._id);
  }
  // Otherwise, MongoDB will auto-generate an _id

  return question;
}

/**
 * Import a single CSV file
 */
async function importCSVFile(filePath, upsert = false) {
  console.log(`\n📄 Reading ${path.basename(filePath)}...`);

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
        console.warn(`⚠️  Skipping ${row._id || 'unknown'}: Missing required fields`);
        skipped++;
        continue;
      }

      // Check if question already exists
      // First try by the CSV _id if it's a valid ObjectId
      // Otherwise, try to find by a custom identifier or skip the check
      let existing = null;
      if (questionData._id && mongoose.Types.ObjectId.isValid(questionData._id)) {
        existing = await Question.findById(questionData._id);
      } else {
        // Try to find by a combination of fields that should be unique
        // For now, we'll just create new ones if _id is not a valid ObjectId
        // The user can use --upsert to handle duplicates manually
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
        // Create new
        try {
          await Question.create(questionData);
          console.log(`   ✓ Imported: ${row._id || questionData._id || 'new'}`);
          imported++;
        } catch (createError) {
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
    } catch (error) {
      console.error(`   ✗ Error importing ${row._id || 'unknown'}:`, error.message);
      errors++;
    }
  }

  return { imported, skipped, errors };
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const targetFile = args.find(arg => !arg.startsWith('--'));
  const upsert = args.includes('--upsert') || args.includes('-u');

  // Check for MongoDB URI
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    console.error('   Please set it in packages/db-backend/.env');
    process.exit(1);
  }

  try {
    // Connect to database
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    const dbName = mongoose.connection.db?.databaseName || 'unknown';
    console.log(`✅ Connected to: ${dbName}\n`);

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

      console.log(`📁 Found ${files.length} CSV file(s):`);
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

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Disconnect from database
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { importCSVFile, transformCSVRowToQuestion };

