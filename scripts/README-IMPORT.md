# CSV Batch Import Script

This script imports question batches from CSV files into MongoDB.

## Prerequisites

1. MongoDB connection string must be set in `packages/db-backend/.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/satcoach-dev
   ```

2. Dependencies installed:
   ```bash
   cd packages/db-backend
   npm install
   ```

## Usage

### Import a single CSV file:
```bash
node scripts/import-csv-batch.js batch-10.csv
```

### Import all CSV files in `data/question-batches/`:
```bash
node scripts/import-csv-batch.js
```

### Update existing questions (upsert mode):
```bash
node scripts/import-csv-batch.js batch-10.csv --upsert
```

### Using TypeScript version (requires ts-node):
```bash
cd packages/db-backend
npx ts-node ../scripts/import-csv-batch.ts batch-10.csv
```

## CSV Format

The script expects CSV files with the following columns:

- `_id` - Question identifier (string, not necessarily a MongoDB ObjectId)
- `subject` - "math", "reading", or "writing"
- `difficulty` - "easy", "medium", or "hard"
- `difficultyScore` - Number (1-10)
- `questionText` - The question text
- `optionA`, `optionB`, `optionC`, `optionD` - Answer options
- `correctAnswer` - "A", "B", "C", or "D"
- `explanation` - Explanation text
- `graph` - JSON string (optional) for graph data
- `tags` - Pipe-separated tags (e.g., "algebra|linear equations")
- `metadata.generatedBy` - "ai" or "manual"
- `metadata.generatedAt` - ISO date string
- `metadata.timesUsed` - Number
- `metadata.averageAccuracy` - Number (0-1)
- `metadata.averageTimeSpent` - Number (seconds)
- `createdAt` - ISO date string
- `updatedAt` - ISO date string

## Transformation

The script transforms the flattened CSV structure into the nested database schema:

**CSV (flat):**
```csv
_id,subject,difficulty,questionText,optionA,optionB,optionC,optionD,correctAnswer,explanation,tags,metadata.generatedBy
```

**Database (nested):**
```javascript
{
  subject: "math",
  difficulty: "medium",
  content: {
    questionText: "...",
    options: ["A", "B", "C", "D"],
    correctAnswer: "A",
    explanation: "...",
    graph: {...} // if present
  },
  metadata: {
    generatedBy: "manual",
    generatedAt: Date,
    timesUsed: 0,
    averageAccuracy: 0,
    averageTimeSpent: 0
  },
  tags: ["tag1", "tag2"] // converted from pipe-separated string
}
```

## Notes

- CSV `_id` values like "batch10-math-001" are **not** valid MongoDB ObjectIds, so the script will let MongoDB auto-generate new `_id` values
- If you want to preserve the CSV `_id` as a reference, you could add a custom field or modify the script
- The script handles quoted CSV fields and escaped quotes
- Duplicate questions (by `_id` if valid ObjectId) are skipped unless `--upsert` is used
- Invalid rows are logged and skipped

## Example Output

```
🔌 Connecting to MongoDB...
✅ Connected to: satcoach-dev

📄 Reading batch-10.csv...
   Found 50 rows
   ✓ Imported: batch10-math-001
   ✓ Imported: batch10-math-002
   ...
   
✅ Import complete:
   Imported: 50
   Skipped: 0
   Errors: 0

✅ MongoDB connection closed
```

