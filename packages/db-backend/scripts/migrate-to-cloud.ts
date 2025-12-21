/**
 * MongoDB Migration Script
 * 
 * Migrates data from local MongoDB to cloud MongoDB (Atlas)
 * 
 * Usage:
 *   LOCAL_MONGODB_URI="mongodb://localhost:27017/satcoach-dev" \
 *   CLOUD_MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/satcoach?retryWrites=true&w=majority" \
 *   npx ts-node scripts/migrate-to-cloud.ts
 * 
 * Or set in .env file:
 *   LOCAL_MONGODB_URI=mongodb://localhost:27017/satcoach-dev
 *   CLOUD_MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/satcoach
 */

import { MongoClient, Db } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

interface MigrationStats {
  collections: string[];
  totalDocuments: number;
  errors: string[];
  skipped: string[];
}

class MongoMigrator {
  private localClient: MongoClient | null = null;
  private cloudClient: MongoClient | null = null;
  private localDb: Db | null = null;
  private cloudDb: Db | null = null;

  constructor(
    private localUri: string,
    private cloudUri: string,
    private localDbName: string,
    private cloudDbName: string
  ) {}

  async connect(): Promise<void> {
    console.log('🔌 Connecting to databases...\n');
    
    // Connect to local database
    console.log('📍 Connecting to LOCAL database...');
    this.localClient = new MongoClient(this.localUri);
    await this.localClient.connect();
    this.localDb = this.localClient.db(this.localDbName);
    console.log(`✅ Connected to LOCAL: ${this.localDbName}\n`);

    // Connect to cloud database
    console.log('☁️  Connecting to CLOUD database...');
    this.cloudClient = new MongoClient(this.cloudUri);
    await this.cloudClient.connect();
    this.cloudDb = this.cloudClient.db(this.cloudDbName);
    console.log(`✅ Connected to CLOUD: ${this.cloudDbName}\n`);
  }

  async disconnect(): Promise<void> {
    if (this.localClient) {
      await this.localClient.close();
      console.log('✅ Local connection closed');
    }
    if (this.cloudClient) {
      await this.cloudClient.close();
      console.log('✅ Cloud connection closed');
    }
  }

  async listCollections(): Promise<string[]> {
    if (!this.localDb) throw new Error('Local database not connected');
    const collections = await this.localDb.listCollections().toArray();
    return collections.map(col => col.name);
  }

  async getCollectionStats(collectionName: string): Promise<number> {
    if (!this.localDb) throw new Error('Local database not connected');
    return await this.localDb.collection(collectionName).countDocuments();
  }

  async migrateCollection(
    collectionName: string,
    options: { dropExisting?: boolean; batchSize?: number } = {}
  ): Promise<{ documentsCopied: number; errors: string[] }> {
    if (!this.localDb || !this.cloudDb) {
      throw new Error('Databases not connected');
    }

    const { dropExisting = false, batchSize = 1000 } = options;
    const errors: string[] = [];
    let documentsCopied = 0;

    try {
      const localCollection = this.localDb.collection(collectionName);
      const cloudCollection = this.cloudDb.collection(collectionName);

      // Drop existing collection if requested
      if (dropExisting) {
        const exists = await this.cloudDb
          .listCollections({ name: collectionName })
          .hasNext();
        if (exists) {
          await cloudCollection.drop();
          console.log(`  🗑️  Dropped existing collection: ${collectionName}`);
        }
      }

      // Check if collection exists and has data
      const documentCount = await localCollection.countDocuments();
      if (documentCount === 0) {
        console.log(`  ⏭️  Skipping empty collection: ${collectionName}`);
        return { documentsCopied: 0, errors };
      }

      console.log(`  📦 Copying ${documentCount} documents from ${collectionName}...`);

      // Migrate in batches to handle large collections
      let skip = 0;
      while (true) {
        const batch = await localCollection
          .find({})
          .skip(skip)
          .limit(batchSize)
          .toArray();

        if (batch.length === 0) break;

        try {
          // Insert batch into cloud database
          if (batch.length > 0) {
            await cloudCollection.insertMany(batch, { ordered: false });
            documentsCopied += batch.length;
            console.log(`    ✅ Copied ${documentsCopied}/${documentCount} documents`);
          }
        } catch (error: any) {
          // Handle duplicate key errors (if collection already has some data)
          if (error.code === 11000 || error.code === 11001) {
            errors.push(
              `Duplicate key error in ${collectionName} (batch ${skip / batchSize + 1}): ${error.message}`
            );
            // Try inserting documents one by one to find duplicates
            for (const doc of batch) {
              try {
                await cloudCollection.insertOne(doc);
                documentsCopied++;
              } catch (individualError: any) {
                if (individualError.code !== 11000 && individualError.code !== 11001) {
                  errors.push(`Error inserting document in ${collectionName}: ${individualError.message}`);
                }
              }
            }
          } else {
            errors.push(`Error in batch ${skip / batchSize + 1} of ${collectionName}: ${error.message}`);
          }
        }

        skip += batchSize;
        if (batch.length < batchSize) break;
      }

      // Copy indexes
      try {
        const indexes = await localCollection.indexes();
        for (const index of indexes) {
          // Skip the default _id index
          if (Object.keys(index.key).length === 1 && index.key._id === 1) {
            continue;
          }

          try {
            // Remove the 'v' and 'ns' properties that can cause issues
            const indexSpec: any = { key: index.key };
            if (index.unique) indexSpec.unique = true;
            if (index.name) indexSpec.name = index.name;
            if (index.background !== undefined) indexSpec.background = index.background;
            if (index.sparse !== undefined) indexSpec.sparse = index.sparse;
            if (index.expireAfterSeconds !== undefined) indexSpec.expireAfterSeconds = index.expireAfterSeconds;

            // Build clean options object (omit null/undefined values)
            const indexOptions: Record<string, any> = {};
            if (index.name) indexOptions.name = index.name;
            if (index.unique === true) indexOptions.unique = true;
            if (index.background === true) indexOptions.background = true;
            if (index.sparse === true) indexOptions.sparse = true;
            if (typeof index.expireAfterSeconds === 'number') {
              indexOptions.expireAfterSeconds = index.expireAfterSeconds;
            }

            await cloudCollection.createIndex(indexSpec.key, indexOptions);
            console.log(`    📇 Created index: ${index.name || JSON.stringify(index.key)}`);
          } catch (indexError: any) {
            if (indexError.code !== 85 && indexError.code !== 86) {
              // 85 = IndexOptionsConflict, 86 = IndexKeySpecsConflict (index already exists)
              errors.push(`Error creating index ${index.name} in ${collectionName}: ${indexError.message}`);
            }
          }
        }
      } catch (indexError: any) {
        errors.push(`Error copying indexes for ${collectionName}: ${indexError.message}`);
      }

      console.log(`  ✅ Completed ${collectionName}: ${documentsCopied} documents\n`);
    } catch (error: any) {
      errors.push(`Fatal error migrating ${collectionName}: ${error.message}`);
      console.error(`  ❌ Error migrating ${collectionName}: ${error.message}\n`);
    }

    return { documentsCopied, errors };
  }

  async migrate(
    options: {
      collections?: string[];
      dropExisting?: boolean;
      batchSize?: number;
    } = {}
  ): Promise<MigrationStats> {
    const stats: MigrationStats = {
      collections: [],
      totalDocuments: 0,
      errors: [],
      skipped: [],
    };

    // Get list of collections to migrate
    let collectionsToMigrate = options.collections;
    if (!collectionsToMigrate) {
      collectionsToMigrate = await this.listCollections();
    }

    // Filter out system collections
    collectionsToMigrate = collectionsToMigrate.filter(
      (name) => !name.startsWith('system.')
    );

    console.log(`\n📋 Collections to migrate: ${collectionsToMigrate.join(', ')}\n`);
    console.log('='.repeat(60) + '\n');

    // Migrate each collection
    for (const collectionName of collectionsToMigrate) {
      try {
        const documentCount = await this.getCollectionStats(collectionName);
        if (documentCount === 0) {
          stats.skipped.push(collectionName);
          continue;
        }

        const result = await this.migrateCollection(collectionName, {
          dropExisting: options.dropExisting,
          batchSize: options.batchSize,
        });

        stats.collections.push(collectionName);
        stats.totalDocuments += result.documentsCopied;
        stats.errors.push(...result.errors);
      } catch (error: any) {
        stats.errors.push(`Failed to migrate ${collectionName}: ${error.message}`);
        console.error(`❌ Failed to migrate ${collectionName}: ${error.message}\n`);
      }
    }

    return stats;
  }
}

// Main execution
async function main() {
  const localUri = process.env.LOCAL_MONGODB_URI || 'mongodb://localhost:27017';
  const cloudUri = process.env.CLOUD_MONGODB_URI || process.env.MONGODB_URI;

  if (!cloudUri) {
    console.error('❌ Error: CLOUD_MONGODB_URI or MONGODB_URI environment variable is required');
    console.error('\nUsage:');
    console.error('  LOCAL_MONGODB_URI="mongodb://localhost:27017/satcoach-dev" \\');
    console.error('  CLOUD_MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/satcoach" \\');
    console.error('  npx ts-node scripts/migrate-to-cloud.ts\n');
    process.exit(1);
  }

  // Extract database names from URIs
  // Helper function to extract DB name from MongoDB URI
  const extractDbName = (uri: string): string => {
    // Check if database name is explicitly provided
    const match = uri.match(/\/([^/?]+)(\?|$)/);
    if (match && match[1]) {
      return match[1];
    }
    // Try parsing as URL (for mongodb://)
    try {
      const url = new URL(uri);
      if (url.pathname && url.pathname.length > 1) {
        return url.pathname.slice(1).split('?')[0];
      }
    } catch {
      // If URL parsing fails, try regex approach
      const regexMatch = uri.match(/mongodb(\+srv)?:\/\/[^\/]+\/([^?]+)/);
      if (regexMatch && regexMatch[2]) {
        return regexMatch[2];
      }
    }
    return '';
  };

  const localDbName = process.env.LOCAL_DB_NAME || extractDbName(localUri) || 'satcoach-dev';
  const cloudDbName = process.env.CLOUD_DB_NAME || extractDbName(cloudUri) || 'satcoach';

  // Parse command line arguments
  const args = process.argv.slice(2);
  const dropExisting = args.includes('--drop-existing');
  const collectionsOnly = args.find(arg => arg.startsWith('--collections='));
  const collections = collectionsOnly 
    ? collectionsOnly.split('=')[1].split(',').map(c => c.trim())
    : undefined;

  console.log('🚀 MongoDB Migration Tool');
  console.log('='.repeat(60));
  console.log(`📍 Local Database:  ${localDbName}`);
  console.log(`☁️  Cloud Database: ${cloudDbName}`);
  console.log(`🗑️  Drop Existing:  ${dropExisting ? 'YES' : 'NO'}`);
  if (collections) {
    console.log(`📋 Collections:     ${collections.join(', ')}`);
  }
  console.log('='.repeat(60) + '\n');

  if (dropExisting) {
    console.log('⚠️  WARNING: --drop-existing flag is set. Existing collections will be dropped!\n');
  }

  const migrator = new MongoMigrator(
    localUri,
    cloudUri,
    localDbName || 'satcoach-dev',
    cloudDbName || 'satcoach'
  );

  try {
    await migrator.connect();

    const stats = await migrator.migrate({
      collections,
      dropExisting,
      batchSize: 1000,
    });

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary');
    console.log('='.repeat(60));
    console.log(`✅ Collections migrated: ${stats.collections.length}`);
    console.log(`   ${stats.collections.join(', ')}`);
    console.log(`📄 Total documents copied: ${stats.totalDocuments.toLocaleString()}`);
    if (stats.skipped.length > 0) {
      console.log(`⏭️  Collections skipped (empty): ${stats.skipped.join(', ')}`);
    }
    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
      stats.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    } else {
      console.log('\n✅ Migration completed with no errors!');
    }
    console.log('='.repeat(60) + '\n');
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await migrator.disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { MongoMigrator };

