/**
 * Script to validate and correct answer markings in the database
 * 
 * This script uses OpenAI Batch API for cost-effective answer validation:
 * 1. Connects to MongoDB
 * 2. Fetches all questions (data is already structured)
 * 3. Uses gpt-4o-mini for answer validation (reasoning-intensive task)
 * 4. Submits to OpenAI Batch API (50% cost savings!)
 * 5. Polls for completion with exponential backoff
 * 6. Processes results and bulk-updates database
 * 
 * Usage: 
 *   npx tsx validate-question-answers.ts
 *   OR
 *   npm run validate-answers
 * 
 * Recovery:
 *   If script fails, check batch-state.json for batch IDs to resume
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import OpenAI from 'openai';
import { Question, IQuestion } from './src/models/Question.model';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const CONFIG = {
  MODEL: 'gpt-4o-mini', // Use gpt-4o-mini for cost-effective reasoning tasks
  TEMPERATURE: 0.1,
  MAX_TOKENS: 800,
  POLL_INITIAL_INTERVAL_MS: 5000,
  POLL_MAX_INTERVAL_MS: 60000,
  POLL_BACKOFF_MULTIPLIER: 1.5,
  MAX_POLL_DURATION_MS: 2 * 60 * 60 * 1000, // 2 hours
  UPDATE_DELAY_MS: 3000,
} as const;

// Initialize OpenAI - use environment variable only
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Type definitions
interface ValidationResult {
  questionId: string;
  questionText: string;
  subject: string;
  storedAnswer: string;
  validatedAnswer: string;
  needsCorrection: boolean;
  reasoning?: string;
  confidence?: 'high' | 'medium' | 'low';
  requiresAlgebraicSteps?: boolean;
}

interface BatchRequest {
  custom_id: string;
  method: 'POST';
  url: '/v1/chat/completions';
  body: {
    model: string;
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    temperature: number;
    max_tokens: number;
    response_format: { type: 'json_object' };
  };
}

interface BatchResponse {
  custom_id: string;
  response?: {
    body?: {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };
  };
  error?: {
    message: string;
  };
}

interface EvaluationResult {
  correctAnswer: string;
  reasoning: string;
  requiresAlgebraicSteps: boolean;
  confidence: 'high' | 'medium' | 'low';
}

interface BatchState {
  batchId: string;
  fileId: string;
  createdAt: string;
  questionCount: number;
}

// File paths
const STATE_FILE = path.join(__dirname, 'batch-state.json');
const BATCH_FILE = path.join(__dirname, 'batch-requests.jsonl');
const REPORT_FILE = path.join(__dirname, 'answer-validation-report.json');

/**
 * Create evaluation batch request for a question
 * NOTE: We skip preprocessing since data is already structured in DB
 */
function createEvaluationRequest(question: IQuestion): BatchRequest {
  const { questionText, options, correctAnswer: storedAnswer, explanation } = question.content;
  const { subject } = question;
  const questionId = (question._id as mongoose.Types.ObjectId).toString();

  // Validate options array
  if (!options || options.length !== 4) {
    throw new Error(`Question ${questionId} has invalid options array`);
  }

  const prompt = `You are an expert SAT tutor. Evaluate this SAT ${subject} question and determine the correct answer.

QUESTION:
${questionText}

ANSWER CHOICES:
A) ${options[0]}
B) ${options[1]}
C) ${options[2]}
D) ${options[3]}

STORED CORRECT ANSWER: ${storedAnswer}
${explanation ? `CURRENT EXPLANATION: ${explanation}` : ''}

Tasks:
1. Solve/analyze the question carefully step by step
2. Determine which answer (A, B, C, or D) is actually correct
3. Provide clear reasoning for your answer
4. For math questions: note if algebraic steps are required
5. Assess your confidence level

IMPORTANT: The stored answer may be WRONG. Verify independently.

Respond with ONLY valid JSON:
{
  "correctAnswer": "A" | "B" | "C" | "D",
  "reasoning": "Step-by-step explanation of why this answer is correct",
  "requiresAlgebraicSteps": true | false,
  "confidence": "high" | "medium" | "low"
}`;

  return {
    custom_id: `q-${questionId}`,
    method: 'POST',
    url: '/v1/chat/completions',
    body: {
      model: CONFIG.MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert SAT tutor. Analyze questions carefully and provide accurate answers with detailed reasoning. Always verify the answer independently - do not trust the stored answer.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: CONFIG.TEMPERATURE,
      max_tokens: CONFIG.MAX_TOKENS,
      response_format: { type: 'json_object' },
    },
  };
}

/**
 * Save batch state for recovery
 */
function saveBatchState(state: BatchState): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  console.log(`💾 Batch state saved to ${STATE_FILE}`);
}

/**
 * Load batch state for recovery
 */
function loadBatchState(): BatchState | null {
  if (fs.existsSync(STATE_FILE)) {
    const content = fs.readFileSync(STATE_FILE, 'utf-8');
    return JSON.parse(content);
  }
  return null;
}

/**
 * Clear batch state after successful completion
 */
function clearBatchState(): void {
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
  }
}

/**
 * Create and upload batch file
 */
async function createAndUploadBatch(questions: IQuestion[]): Promise<{ fileId: string }> {
  console.log('📦 Creating batch file...');
  
  const requests: BatchRequest[] = [];
  const errors: string[] = [];
  
  for (const question of questions) {
    try {
      requests.push(createEvaluationRequest(question));
    } catch (error: any) {
      errors.push(`Question ${question._id}: ${error.message}`);
    }
  }
  
  if (errors.length > 0) {
    console.warn(`⚠️  Skipped ${errors.length} invalid questions:`);
    errors.slice(0, 5).forEach(e => console.warn(`   - ${e}`));
    if (errors.length > 5) console.warn(`   ... and ${errors.length - 5} more`);
  }
  
  if (requests.length === 0) {
    throw new Error('No valid questions to process');
  }
  
  // Create JSONL file
  const batchFileContent = requests.map(req => JSON.stringify(req)).join('\n');
  fs.writeFileSync(BATCH_FILE, batchFileContent);
  console.log(`✅ Created batch file with ${requests.length} requests`);

  // Upload file to OpenAI
  console.log('📤 Uploading batch file to OpenAI...');
  const file = await openai.files.create({
    file: fs.createReadStream(BATCH_FILE),
    purpose: 'batch',
  });

  console.log(`✅ File uploaded. File ID: ${file.id}`);
  return { fileId: file.id };
}

/**
 * Create batch job
 */
async function createBatchJob(fileId: string): Promise<string> {
  console.log('🚀 Creating batch job...');
  
  const batch = await openai.batches.create({
    input_file_id: fileId,
    endpoint: '/v1/chat/completions',
    completion_window: '24h',
  });

  console.log(`✅ Batch job created. Batch ID: ${batch.id}`);
  console.log(`📊 Status: ${batch.status}`);
  
  return batch.id;
}

/**
 * Poll batch job with exponential backoff
 */
async function waitForBatchCompletion(batchId: string): Promise<OpenAI.Batches.Batch> {
  console.log('\n⏳ Waiting for batch to complete...');
  console.log('   (Using exponential backoff polling)');
  
  let interval: number = CONFIG.POLL_INITIAL_INTERVAL_MS;
  const startTime = Date.now();
  
  while (Date.now() - startTime < CONFIG.MAX_POLL_DURATION_MS) {
    const batch = await openai.batches.retrieve(batchId);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    
    console.log(`📊 Status: ${batch.status} | Elapsed: ${elapsed}s | Next check: ${Math.round(interval / 1000)}s`);
    
    if (batch.request_counts) {
      const { completed, failed, total } = batch.request_counts;
      console.log(`   Progress: ${completed}/${total} completed, ${failed} failed`);
    }
    
    if (batch.status === 'completed') {
      console.log('✅ Batch completed!');
      return batch;
    }
    
    if (batch.status === 'failed' || batch.status === 'expired' || batch.status === 'cancelled') {
      const errorMsg = batch.errors?.data?.[0]?.message || 'Unknown error';
      throw new Error(`Batch ${batch.status}: ${errorMsg}`);
    }
    
    // Wait with exponential backoff
    await new Promise(resolve => setTimeout(resolve, interval));
    interval = Math.min(interval * CONFIG.POLL_BACKOFF_MULTIPLIER, CONFIG.POLL_MAX_INTERVAL_MS);
  }
  
  throw new Error(`Batch processing timed out after ${CONFIG.MAX_POLL_DURATION_MS / 1000 / 60} minutes`);
}

/**
 * Download and parse batch results
 */
async function downloadBatchResults(batch: OpenAI.Batches.Batch): Promise<BatchResponse[]> {
  console.log('📥 Downloading batch results...');
  
  if (!batch.output_file_id) {
    console.error('❌ Batch completed but no output file. This usually means all requests failed.');
    console.error(`   Batch status: ${batch.status}`);
    console.error(`   Request counts: ${JSON.stringify(batch.request_counts)}`);
    if (batch.errors) {
      console.error(`   Errors: ${JSON.stringify(batch.errors)}`);
    }
    throw new Error('No output file ID in batch response - all requests likely failed');
  }
  
  const file = await openai.files.content(batch.output_file_id);
  const fileContent = await file.text();
  
  const results: BatchResponse[] = fileContent
    .split('\n')
    .filter((line: string) => line.trim())
    .map((line: string) => JSON.parse(line));
  
  console.log(`✅ Downloaded ${results.length} results`);
  return results;
}

/**
 * Parse evaluation result from batch response
 */
function parseEvaluationResult(response: BatchResponse): EvaluationResult | null {
  const content = response.response?.body?.choices?.[0]?.message?.content;
  if (!content) return null;
  
  const parsed = JSON.parse(content);
  
  // Validate answer format
  if (!['A', 'B', 'C', 'D'].includes(parsed.correctAnswer)) {
    throw new Error(`Invalid answer: ${parsed.correctAnswer}`);
  }
  
  return {
    correctAnswer: parsed.correctAnswer,
    reasoning: parsed.reasoning || 'No reasoning provided',
    requiresAlgebraicSteps: Boolean(parsed.requiresAlgebraicSteps),
    confidence: parsed.confidence || 'medium',
  };
}

/**
 * Bulk update questions in database
 */
async function bulkUpdateQuestions(
  corrections: Array<{ questionId: string; newAnswer: string }>
): Promise<number> {
  if (corrections.length === 0) return 0;
  
  const bulkOps = corrections.map(({ questionId, newAnswer }) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(questionId) },
      update: {
        $set: {
          'content.correctAnswer': newAnswer,
          updatedAt: new Date(),
        },
      },
    },
  }));
  
  const result = await Question.bulkWrite(bulkOps);
  return result.modifiedCount;
}

/**
 * Main validation function
 */
async function validateAllQuestions(): Promise<void> {
  let batchId: string | null = null;
  
  try {
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI not defined in environment variables');
    }

    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB\n');

    // Check for existing batch state (resume capability)
    const existingState = loadBatchState();
    if (existingState) {
      console.log('📂 Found existing batch state. Attempting to resume...');
      console.log(`   Batch ID: ${existingState.batchId}`);
      console.log(`   Created: ${existingState.createdAt}`);
      batchId = existingState.batchId;
    }

    // Fetch all questions (with optional limit for testing)
    // TEST MODE: Set to 10 for testing, undefined for full run
    const TEST_LIMIT = 10; // TODO: Change to undefined for full run
    console.log('📚 Fetching all questions from database...');
    let questions = await Question.find({}).lean<IQuestion[]>();
    console.log(`   [DEBUG] Fetched ${questions.length} questions, TEST_LIMIT = ${TEST_LIMIT}`);
    
    if (TEST_LIMIT && TEST_LIMIT > 0 && !isNaN(TEST_LIMIT)) {
      console.log(`🧪 TEST MODE: Limiting to ${TEST_LIMIT} questions (found ${questions.length} total)`);
      questions = questions.slice(0, TEST_LIMIT);
      console.log(`   [DEBUG] After slice: ${questions.length} questions`);
    } else {
      console.log(`   [DEBUG] TEST_LIMIT check failed: TEST_LIMIT=${TEST_LIMIT}, >0=${TEST_LIMIT > 0}, !isNaN=${!isNaN(TEST_LIMIT)}`);
    }
    
    console.log(`✅ Found ${questions.length} questions to validate\n`);

    if (questions.length === 0) {
      console.log('⚠️  No questions found in database');
      await mongoose.connection.close();
      return;
    }

    // Create question map for quick lookup
    const questionMap = new Map<string, IQuestion>();
    questions.forEach(q => questionMap.set((q._id as mongoose.Types.ObjectId).toString(), q));

    // Create new batch if not resuming
    if (!batchId) {
      console.log('='.repeat(80));
      console.log(`VALIDATION (${CONFIG.MODEL})`);
      console.log('='.repeat(80));
      console.log('Task: Validate correct answers with reasoning\n');

      const { fileId } = await createAndUploadBatch(questions);
      batchId = await createBatchJob(fileId);
      
      // Save state for recovery
      saveBatchState({
        batchId,
        fileId,
        createdAt: new Date().toISOString(),
        questionCount: questions.length,
      });
    }

    // Wait for completion
    const batch = await waitForBatchCompletion(batchId);
    
    // Download results
    const batchResults = await downloadBatchResults(batch);
    
    // Process results
    console.log('\n📊 Processing results...');
    
    const results: ValidationResult[] = [];
    const corrections: Array<{ questionId: string; newAnswer: string }> = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const response of batchResults) {
      const questionId = response.custom_id.replace('q-', '');
      const question = questionMap.get(questionId);
      
      if (!question) {
        console.warn(`⚠️  Question ${questionId} not found`);
        continue;
      }
      
      if (response.error) {
        errorCount++;
        results.push({
          questionId,
          questionText: question.content.questionText,
          subject: question.subject,
          storedAnswer: question.content.correctAnswer,
          validatedAnswer: 'ERROR',
          needsCorrection: false,
          reasoning: `Error: ${response.error.message}`,
        });
        continue;
      }
      
      try {
        const evaluation = parseEvaluationResult(response);
        if (!evaluation) throw new Error('Failed to parse response');
        
        const needsCorrection = evaluation.correctAnswer !== question.content.correctAnswer;
        
        if (needsCorrection) {
          corrections.push({ questionId, newAnswer: evaluation.correctAnswer });
        }
        
        results.push({
          questionId,
          questionText: question.content.questionText,
          subject: question.subject,
          storedAnswer: question.content.correctAnswer,
          validatedAnswer: evaluation.correctAnswer,
          needsCorrection,
          reasoning: evaluation.reasoning,
          confidence: evaluation.confidence,
          requiresAlgebraicSteps: evaluation.requiresAlgebraicSteps,
        });
        
        successCount++;
      } catch (error: any) {
        errorCount++;
        results.push({
          questionId,
          questionText: question.content.questionText,
          subject: question.subject,
          storedAnswer: question.content.correctAnswer,
          validatedAnswer: 'ERROR',
          needsCorrection: false,
          reasoning: `Parse error: ${error.message}`,
        });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total questions: ${questions.length}`);
    console.log(`Processed successfully: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Correct answers: ${successCount - corrections.length}`);
    console.log(`❌ Questions needing correction: ${corrections.length}`);

    if (corrections.length > 0) {
      console.log('\n⚠️  QUESTIONS THAT NEED CORRECTION:');
      console.log('='.repeat(80));
      
      // Create results map for O(1) lookup
      const resultsMap = new Map(results.map(r => [r.questionId, r]));
      
      for (const { questionId, newAnswer } of corrections) {
        const question = questionMap.get(questionId);
        const result = resultsMap.get(questionId);
        
        if (!question) continue;
        
        console.log(`\nQuestion ID: ${questionId}`);
        console.log(`Subject: ${question.subject}`);
        console.log(`Question: ${question.content.questionText.substring(0, 100)}...`);
        console.log(`Stored: ${question.content.correctAnswer} → Correct: ${newAnswer}`);
        console.log(`Confidence: ${result?.confidence || 'unknown'}`);
        console.log('-'.repeat(80));
      }

      console.log(`\n⚠️  About to update ${corrections.length} questions.`);
      console.log(`Waiting ${CONFIG.UPDATE_DELAY_MS / 1000}s... (Press Ctrl+C to cancel)\n`);
      
      await new Promise(resolve => setTimeout(resolve, CONFIG.UPDATE_DELAY_MS));

      // Bulk update database
      console.log('🔄 Updating database (bulk operation)...');
      const updateCount = await bulkUpdateQuestions(corrections);
      console.log(`✅ Successfully updated ${updateCount} questions`);
    } else {
      console.log('\n✅ All answers are correct! No corrections needed.');
    }

    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      batchId,
      model: CONFIG.MODEL,
      totalQuestions: questions.length,
      processed: successCount,
      errors: errorCount,
      correctAnswers: successCount - corrections.length,
      incorrectAnswers: corrections.length,
      results,
    };

    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${REPORT_FILE}`);

    // Clean up
    clearBatchState();
    if (fs.existsSync(BATCH_FILE)) {
      fs.unlinkSync(BATCH_FILE);
    }
    console.log('🧹 Cleaned up temporary files');

    await mongoose.connection.close();
    console.log('\n✅ Validation complete!');

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    
    if (batchId) {
      console.log(`\n💡 Batch ID saved. Re-run script to resume: ${batchId}`);
    }
    
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run
if (require.main === module) {
  // Check for command-line argument for test limit
  const args = process.argv.slice(2);
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  if (limitArg) {
    const limit = parseInt(limitArg.split('=')[1], 10);
    if (!isNaN(limit) && limit > 0) {
      process.env.TEST_LIMIT = limit.toString();
      console.log(`🧪 Test mode: Processing only ${limit} questions\n`);
    }
  }
  
  validateAllQuestions().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { validateAllQuestions };
