# 🔄 Data Flow and Decision Logic
## How the System Tracks State and Makes Decisions

This document explains **exactly** how the system saves data, retrieves state, and makes decisions about which Bloom levels and techniques to use.

---

## 📊 Data Storage Architecture

### Core Data Collections

The system uses **5 main MongoDB collections** to track everything:

#### 1. **StudentProgress Collection** (Main State Tracker)
**Purpose:** Stores learner's progress per concept/topic

```typescript
// One document per: userId + subject + topic
{
  _id: ObjectId,
  userId: ObjectId("..."),          // Links to User
  subject: "math",
  topic: "linear-equations",
  
  // Performance metrics
  attempts: [...],                   // All attempts at questions
  
  // THE KEY STATE TRACKING:
  performance: {
    // Existing metrics
    masteryLevel: 65,                // 0-100 overall mastery
    
    // NEW: Bloom Taxonomy Progress - THIS IS HOW WE TRACK BLOOM LEVELS
    bloomProgress: {
      remember: {
        attempts: 5,
        mastery: 85,                 // 0-100 (mastered if >= 80)
        lastAttempt: Date("2024-01-15")
      },
      understand: {
        attempts: 4,
        mastery: 75,                 // Not yet mastered (< 80)
        lastAttempt: Date("2024-01-14")
      },
      apply: {
        attempts: 3,
        mastery: 60,                 // Still learning
        lastAttempt: Date("2024-01-13")
      },
      analyze: { mastery: 0, attempts: 0 },
      evaluate: { mastery: 0, attempts: 0 },
      create: { mastery: 0, attempts: 0 },
      
      // DECISION MAKERS:
      currentLevel: 2,               // Highest level with mastery >= 80
      nextTargetLevel: 3             // Next level to work on (currentLevel + 1)
    },
    
    // NEW: Feynman Quality Tracking
    feynmanQuality: {
      explanationClarity: 72,        // 0-100 (AI-evaluated)
      completeness: 68,              // 0-100
      lastExplained: Date("2024-01-15"),
      explanationHistory: [...]      // Track improvements
    },
    
    // NEW: Flow State Tracking
    flowMetrics: {
      averageChallenge: 6,           // 1-10
      averageSkill: 6,               // 1-10
      flowScore: 70,                 // 0-100
      timeInFlow: 25                 // minutes
    },
    
    // Enhanced Spaced Repetition
    spacedRepetition: {
      nextReviewDate: Date("2024-01-19"),
      reviewLevel: 2,                // Bloom level for next review
      progressiveChallenge: true     // Should we increase difficulty?
    }
  }
}
```

**Key Point:** This document tells us:
- ✅ Which Bloom levels are mastered (`bloomProgress.remember.mastery >= 80`)
- ✅ Which level to target next (`nextTargetLevel: 3`)
- ✅ How well they explain concepts (`feynmanQuality`)
- ✅ Their flow state (`flowMetrics`)

---

#### 2. **Concept Collection** (Content Mapping)
**Purpose:** Maps concepts to Bloom levels and learning resources

```typescript
{
  _id: ObjectId("concept-linear-equations"),
  name: "Linear Equations",
  subject: "math",
  tags: ["algebra", "equations"],
  
  // Bloom Taxonomy Mapping - THIS IS HOW WE KNOW WHAT QUESTIONS TO USE
  bloomLevels: {
    remember: {
      description: "Recall definition, identify form",
      exampleQuestions: [
        ObjectId("q1"), ObjectId("q2"), ObjectId("q3")
      ],
      masteredThreshold: 80          // Need 80% to master
    },
    understand: {
      description: "Explain concept, interpret meaning",
      exampleQuestions: [ObjectId("q4"), ObjectId("q5")],
      masteredThreshold: 80
    },
    apply: {
      description: "Solve problems, use in new situations",
      exampleQuestions: [ObjectId("q6"), ObjectId("q7")],
      masteredThreshold: 80
    }
    // ... analyze, evaluate, create
  },
  
  // Prerequisites - tells us what they need to know first
  prerequisiteConcepts: [
    ObjectId("concept-basic-arithmetic")
  ]
}
```

**Key Point:** This tells us:
- ✅ Which questions test which Bloom levels
- ✅ What resources to show at each level
- ✅ What concepts must be mastered first

---

#### 3. **Question Collection** (Enhanced)
**Purpose:** Questions tagged with Bloom levels

```typescript
{
  _id: ObjectId("q1"),
  subject: "math",
  topic: "linear-equations",
  difficulty: "medium",
  
  // NEW: Bloom Taxonomy Tagging
  bloomLevel: {
    primary: 2,                      // Understand (Level 2)
    secondary: [1],                  // Also tests Remember
    description: "Tests ability to understand linear equations"
  },
  
  content: {
    questionText: "...",
    options: [...],
    correctAnswer: "B",
    explanation: "..."
  },
  
  // NEW: Feynman Prompts
  feynmanPrompts: {
    explanationPrompt: "Explain how to solve this equation",
    analogyPrompt: "Create an analogy for this concept"
  }
}
```

**Key Point:** Every question knows which Bloom level it tests!

---

#### 4. **LearnerExplanation Collection**
**Purpose:** Stores Feynman-style explanations for evaluation

```typescript
{
  _id: ObjectId("explanation-123"),
  userId: ObjectId("user-456"),
  conceptId: ObjectId("concept-linear-equations"),
  questionId: ObjectId("q1"),
  
  explanation: "A linear equation is like a balance scale...",
  
  // AI Evaluation Results - THIS IS HOW WE TRACK FEYNMAN QUALITY
  evaluation: {
    clarity: 75,                     // 0-100
    completeness: 70,                // 0-100
    accuracy: 85,                    // 0-100
    jargonDetected: ["variable"],    // Terms to simplify
    misconceptions: [],              // Errors detected
    gaps: ["missing example"],       // What's missing
    bloomLevel: 2,                   // Which level demonstrated
    feedback: "Good explanation but..."
  },
  
  iteration: 1,                      // Is this first, second, etc.?
  createdAt: Date("2024-01-15")
}
```

**Key Point:** Each explanation is saved and evaluated, building history!

---

#### 5. **LearningSession Collection**
**Purpose:** Tracks complete sessions with Flow states

```typescript
{
  _id: ObjectId("session-789"),
  userId: ObjectId("user-456"),
  startTime: Date("2024-01-15 09:00"),
  endTime: Date("2024-01-15 09:45"),
  
  // Flow tracking (per-minute)
  flowStates: [
    {
      timestamp: Date("2024-01-15 09:05"),
      challenge: 6,
      skill: 6,
      flowZone: "flow",              // "boredom" | "flow" | "anxiety"
      activity: "solving_question"
    },
    // ... more states
  ],
  
  conceptsCovered: [ObjectId("concept-linear-equations")],
  questionsAttempted: [ObjectId("q1"), ObjectId("q2")]
}
```

---

## 🧠 Decision-Making Flow

### Step-by-Step: How the System Decides What to Do

#### Scenario: Student starts a new session

```
┌─────────────────────────────────────────────────────────┐
│ 1. STUDENT OPENS STUDY PAGE                             │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 2. SYSTEM LOADS LEARNER STATE                           │
│                                                          │
│ GET /api/v1/progress/learner-state?userId=123           │
│                                                          │
│ Backend queries:                                         │
│ - StudentProgress.find({ userId: 123 })                 │
│ - LearningSession.find({ userId: 123, endTime: null })  │
│ - User.findById(123).select('learningProfile')          │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 3. DETERMINE WHICH CONCEPT TO WORK ON                   │
│                                                          │
│ Algorithm:                                               │
│ 1. Check spaced repetition schedule                     │
│    - Find topics with nextReviewDate <= now            │
│    - Prioritize by mastery level (lower = higher)      │
│                                                          │
│ 2. If no reviews due, select new concept:               │
│    - Check prerequisiteConcepts                         │
│    - Find concepts where prerequisites mastered         │
│    - Select based on learning goals                     │
│                                                          │
│ Result: conceptId = "linear-equations"                  │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 4. DETERMINE BLOOM LEVEL                                │
│                                                          │
│ Load StudentProgress for this concept:                  │
│ const progress = await StudentProgress.findOne({        │
│   userId: 123,                                          │
│   topic: "linear-equations"                             │
│ });                                                     │
│                                                          │
│ Decision Logic:                                         │
│                                                          │
│ if (!progress || progress.bloomProgress.currentLevel === 0) {
│   // New concept - start at Remember (Level 1)          │
│   targetBloomLevel = 1;                                 │
│ }                                                        │
│                                                          │
│ else if (progress.bloomProgress.nextTargetLevel <= 6) { │
│   // Use the next level they should work on             │
│   targetBloomLevel = progress.bloomProgress.nextTargetLevel;
│ }                                                        │
│                                                          │
│ else {                                                   │
│   // Mastered all levels - review or advance            │
│   targetBloomLevel = 6;  // Create level for challenge  │
│ }                                                        │
│                                                          │
│ Result: targetBloomLevel = 2 (Understand)               │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 5. DETERMINE TECHNIQUE TO USE                           │
│                                                          │
│ Check multiple factors:                                 │
│                                                          │
│ a) Is this a new concept?                               │
│    → Use FEYNMAN (explain to build understanding)       │
│                                                          │
│ b) Is Feynman quality below threshold?                  │
│    → Use FEYNMAN refinement                             │
│                                                          │
│ c) Is this a review session?                            │
│    → Use SPACED REPETITION + active recall              │
│                                                          │
│ d) Is Flow state in anxiety?                            │
│    → Use FLOW ENGINE (adjust difficulty down)           │
│                                                          │
│ e) Is Flow state in boredom?                            │
│    → Use FLOW ENGINE (increase challenge)               │
│                                                          │
│ Decision Algorithm:                                      │
│                                                          │
│ if (isNewConcept || feynmanQuality.clarity < 70) {      │
│   technique = "FEYNMAN_EXPLANATION";                    │
│ }                                                        │
│                                                          │
│ else if (isReviewSession) {                             │
│   technique = "SPACED_REPETITION";                      │
│ }                                                        │
│                                                          │
│ else {                                                   │
│   technique = "PRACTICE_APPLICATION";                   │
│ }                                                        │
│                                                          │
│ // Flow Engine always monitors                          │
│ flowEngine.monitorAndAdjust();                          │
│                                                          │
│ Result: technique = "FEYNMAN_EXPLANATION"               │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 6. SELECT QUESTIONS FOR THIS BLOOM LEVEL                │
│                                                          │
│ Load Concept:                                            │
│ const concept = await Concept.findById(conceptId);      │
│                                                          │
│ Get questions for target Bloom level:                   │
│ const questions = await Question.find({                 │
│   subject: "math",                                       │
│   topic: "linear-equations",                            │
│   "bloomLevel.primary": targetBloomLevel,               │
│   _id: { $nin: seenQuestionIds }                        │
│ });                                                      │
│                                                          │
│ Or get from concept mapping:                            │
│ const questionIds = concept.bloomLevels                 │
│   .understand.exampleQuestions;                         │
│                                                          │
│ Result: [questionId1, questionId2, questionId3]         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 7. DETERMINE DIFFICULTY (Flow Engine)                   │
│                                                          │
│ Load user's flow metrics:                               │
│ const flowState = progress.flowMetrics;                 │
│                                                          │
│ Calculate optimal challenge:                            │
│ const challenge = flowEngine.calculateOptimalChallenge( │
│   flowState.averageSkill,                               │
│   progress.bloomProgress.currentLevel                    │
│ );                                                       │
│                                                          │
│ Map to question difficulty:                             │
│ if (challenge <= 3) → "easy"                            │
│ if (challenge <= 6) → "medium"                          │
│ if (challenge <= 10) → "hard"                           │
│                                                          │
│ Result: difficulty = "medium"                           │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 8. PRESENT TO STUDENT                                   │
│                                                          │
│ Frontend receives:                                       │
│ {                                                         │
│   concept: "Linear Equations",                          │
│   bloomLevel: 2,                                        │
│   technique: "FEYNMAN_EXPLANATION",                     │
│   questions: [...],                                     │
│   difficulty: "medium",                                 │
│   instructions: "Explain this concept to me..."         │
│ }                                                        │
│                                                          │
│ UI shows:                                                │
│ - Concept explanation (if new)                          │
│ - Prompt: "Now explain linear equations to me..."       │
│ - Text input for explanation                            │
└─────────────────────────────────────────────────────────┘
```

---

## 💾 Data Saving Flow

### Scenario: Student answers a question (Automatic Confidence Calculation)

```
┌─────────────────────────────────────────────────────────┐
│ 1. STUDENT ANSWERS QUESTION                             │
│                                                          │
│ POST /api/v1/progress/attempt                           │
│ {                                                        │
│   userId: "123",                                        │
│   questionId: "q456",                                   │
│   isCorrect: true,                                      │
│   timeSpent: 45,        // seconds                      │
│   hintsUsed: 0,                                         │
│   chatInteractions: 0                                   │
│   // NOTE: NO confidence field - calculated automatically!
│ }                                                        │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 2. SYSTEM AUTOMATICALLY CALCULATES CONFIDENCE           │
│                                                          │
│ const automaticConfidence = confidenceCalculator        │
│   .calculateAutomaticConfidence(                        │
│     isCorrect: true,                                    │
│     timeSpent: 45,                                      │
│     averageTime: 90,    // expected for this question   │
│     hintsUsed: 0,                                       │
│     chatInteractions: 0,                                │
│     previousAccuracy: 0.75,                             │
│     questionDifficulty: 5,                              │
│     studentLevel: 6,                                    │
│     studentType: 'intermediate'                         │
│   );                                                    │
│                                                          │
│ Result: confidence = 4.5/5                              │
│ (High because: correct + fast + no hints + no chat)     │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 3. SAVE WITH AUTOMATIC CONFIDENCE                       │
│                                                          │
│ progress.addAttempt({                                   │
│   questionId: ObjectId("q456"),                         │
│   isCorrect: true,                                      │
│   timeSpent: 45,                                        │
│   hintsUsed: 0,                                         │
│   confidence: 4.5,      // ← AUTOMATIC, not from student│
│   chatInteractions: 0                                   │
│ });                                                     │
└─────────────────────────────────────────────────────────┘
```

**Key Point:** Students NEVER rate their own confidence. The system calculates it automatically from behavior to:
- Remove burden from students
- Provide objective confidence scores
- Build confidence (especially for struggling students)
- Support students at all levels

### Scenario: Student explains a concept (Feynman)

```
┌─────────────────────────────────────────────────────────┐
│ 1. STUDENT SUBMITS EXPLANATION                          │
│                                                          │
│ POST /api/v1/learning/explain                           │
│ {                                                        │
│   userId: "123",                                        │
│   conceptId: "linear-equations",                        │
│   explanation: "A linear equation is like..."           │
│ }                                                        │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 2. AI EVALUATES EXPLANATION                             │
│                                                          │
│ Backend calls AI Backend:                               │
│ POST /api/v1/ai/evaluate-explanation                    │
│                                                          │
│ AI returns:                                              │
│ {                                                        │
│   clarity: 75,                                          │
│   completeness: 70,                                     │
│   accuracy: 85,                                         │
│   jargonDetected: ["variable"],                         │
│   misconceptions: [],                                   │
│   gaps: ["missing example"],                            │
│   bloomLevel: 2,                                        │
│   feedback: "Good explanation but add an example"       │
│ }                                                        │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 3. SAVE EXPLANATION                                     │
│                                                          │
│ Create LearnerExplanation document:                     │
│                                                          │
│ const explanation = new LearnerExplanation({            │
│   userId: ObjectId("123"),                              │
│   conceptId: ObjectId("linear-equations"),              │
│   explanation: userExplanation,                         │
│   evaluation: aiEvaluationResult,                       │
│   iteration: 1,                                         │
│   createdAt: new Date()                                 │
│ });                                                      │
│                                                          │
│ await explanation.save();                               │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 4. UPDATE STUDENT PROGRESS                              │
│                                                          │
│ Update StudentProgress document:                        │
│                                                          │
│ const progress = await StudentProgress.findOne({        │
│   userId: "123",                                        │
│   topic: "linear-equations"                             │
│ });                                                     │
│                                                          │
│ // Update Feynman quality                               │
│ progress.performance.feynmanQuality = {                 │
│   explanationClarity: 75,                               │
│   completeness: 70,                                     │
│   lastExplained: new Date(),                            │
│   explanationHistory: [                                 │
│     ...progress.performance.feynmanQuality              │
│       .explanationHistory,                              │
│     {                                                    │
│       date: new Date(),                                 │
│       clarity: 75,                                      │
│       completeness: 70,                                 │
│       feedback: "Good but add example"                  │
│     }                                                    │
│   ]                                                      │
│ };                                                      │
│                                                          │
│ // Update Bloom progress                                │
│ if (aiEvaluationResult.bloomLevel === 2) {              │
│   progress.performance.bloomProgress                    │
│     .understand.attempts += 1;                          │
│                                                          │
│   // Calculate mastery                                  │
│   const mastery = calculateBloomMastery(                │
│     progress.performance.bloomProgress.understand       │
│   );                                                    │
│                                                          │
│   progress.performance.bloomProgress                    │
│     .understand.mastery = mastery;                      │
│                                                          │
│   // Check if mastered                                  │
│   if (mastery >= 80) {                                  │
│     progress.performance.bloomProgress                  │
│       .currentLevel = 2;                                │
│     progress.performance.bloomProgress                  │
│       .nextTargetLevel = 3;  // Move to Apply          │
│   }                                                      │
│ }                                                        │
│                                                          │
│ await progress.save();                                  │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 5. UPDATE FLOW METRICS                                  │
│                                                          │
│ Calculate current flow state:                           │
│ const challenge = determineChallenge(bloomLevel);       │
│ const skill = estimateSkill(                            │
│   progress.bloomProgress.currentLevel,                  │
│   progress.performance.masteryLevel                      │
│ );                                                      │
│                                                          │
│ const flowState = flowEngine                            │
│   .calculateFlowState(challenge, skill);                │
│                                                          │
│ // Update flow metrics                                  │
│ progress.performance.flowMetrics.averageChallenge =     │
│   (progress.performance.flowMetrics.averageChallenge +  │
│    challenge) / 2;                                      │
│                                                          │
│ progress.performance.flowMetrics.flowScore =            │
│   flowState.flowScore;                                  │
│                                                          │
│ await progress.save();                                  │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 6. RETURN DECISION TO FRONTEND                          │
│                                                          │
│ Response includes:                                       │
│ {                                                        │
│   evaluation: { clarity: 75, ... },                     │
│   feedback: "Good but add an example",                  │
│   shouldRefine: true,  // clarity < 80                  │
│   nextAction: "REFINE_EXPLANATION",                     │
│   bloomLevel: 2,                                        │
│   mastered: false                                       │
│ }                                                        │
│                                                          │
│ Frontend shows feedback and prompts for refinement      │
└─────────────────────────────────────────────────────────┘
```

---

## 🔍 Key Decision Algorithms

### Algorithm 1: Determine Next Bloom Level

```typescript
async function determineNextBloomLevel(
  userId: string,
  conceptId: string
): Promise<number> {
  // 1. Load progress
  const progress = await StudentProgress.findOne({
    userId,
    conceptId
  });
  
  // 2. If no progress, start at Level 1 (Remember)
  if (!progress || 
      progress.performance.bloomProgress.currentLevel === 0) {
    return 1;
  }
  
  // 3. Check if next level is available
  const nextLevel = progress.performance.bloomProgress.nextTargetLevel;
  
  // 4. Verify prerequisites (if level > 3, check lower levels mastered)
  if (nextLevel > 3) {
    const lowerLevels = [1, 2, 3];
    const allMastered = lowerLevels.every(level => {
      const levelData = progress.performance.bloomProgress[
        BLOOM_LEVEL_NAMES[level]
      ];
      return levelData.mastery >= 80;
    });
    
    if (!allMastered) {
      // Find highest unmastered level
      for (let i = 1; i <= 3; i++) {
        const levelData = progress.performance.bloomProgress[
          BLOOM_LEVEL_NAMES[i]
        ];
        if (levelData.mastery < 80) {
          return i;
        }
      }
    }
  }
  
  // 5. Return next target level
  return Math.min(6, nextLevel);
}
```

### Algorithm 2: Select Technique

```typescript
async function selectTechnique(
  userId: string,
  conceptId: string,
  sessionType: 'new' | 'review' | 'practice'
): Promise<string> {
  const progress = await StudentProgress.findOne({ userId, conceptId });
  const flowState = progress?.performance.flowMetrics;
  
  // Decision Tree:
  
  // 1. New concept or weak explanation quality?
  if (!progress || 
      progress.performance.feynmanQuality.explanationClarity < 70) {
    return 'FEYNMAN_EXPLANATION';
  }
  
  // 2. Review session?
  if (sessionType === 'review') {
    const reviewLevel = progress.performance.spacedRepetition.reviewLevel;
    if (reviewLevel < progress.performance.bloomProgress.currentLevel) {
      return 'SPACED_REPETITION_REVIEW';
    }
    return 'PROGRESSIVE_CHALLENGE';  // Review at higher level
  }
  
  // 3. Flow state in anxiety?
  if (flowState?.flowScore < 50) {
    return 'FLOW_SUPPORT';  // Reduce challenge, provide scaffolding
  }
  
  // 4. Flow state in boredom?
  if (flowState?.flowScore > 85 && 
      flowState.averageChallenge < flowState.averageSkill - 1) {
    return 'FLOW_CHALLENGE';  // Increase difficulty
  }
  
  // 5. Default: Practice at current Bloom level
  return 'PRACTICE_APPLICATION';
}
```

### Algorithm 3: Determine Question Difficulty (Flow Engine)

```typescript
function calculateOptimalDifficulty(
  studentSkill: number,      // 1-10
  bloomLevel: number,        // 1-6
  flowState: FlowState
): Difficulty {
  // Base challenge from Bloom level
  let baseChallenge = bloomLevel * 1.5;  // 1.5-9
  
  // Adjust for student skill
  let targetChallenge = (baseChallenge + studentSkill) / 2;
  
  // Flow Engine adjustments
  if (flowState.zone === 'anxiety') {
    targetChallenge = Math.max(1, targetChallenge - 1.5);  // Reduce
  } else if (flowState.zone === 'boredom') {
    targetChallenge = Math.min(10, targetChallenge + 1.5);  // Increase
  }
  
  // Map to difficulty levels
  if (targetChallenge <= 3.5) return 'easy';
  if (targetChallenge <= 7) return 'medium';
  return 'hard';
}
```

### Algorithm 4: Update Bloom Mastery

```typescript
async function updateBloomMastery(
  progressId: string,
  bloomLevel: number,
  qualityScore: number  // 0-5 from attempt
): Promise<void> {
  const progress = await StudentProgress.findById(progressId);
  const levelName = BLOOM_LEVEL_NAMES[bloomLevel];
  const levelData = progress.performance.bloomProgress[levelName];
  
  // Update attempts
  levelData.attempts += 1;
  levelData.lastAttempt = new Date();
  
  // Calculate mastery (weighted average of quality scores)
  // Quality: 5 = 100%, 4 = 80%, 3 = 60%, 2 = 40%, 1 = 20%, 0 = 0%
  const qualityPercent = (qualityScore / 5) * 100;
  
  // Weighted average: recent attempts matter more
  const oldMastery = levelData.mastery;
  const weight = Math.min(levelData.attempts, 10) / 10;  // Max 10 attempts
  levelData.mastery = (oldMastery * (1 - weight)) + 
                      (qualityPercent * weight);
  
  // Check if mastered (>= 80%)
  if (levelData.mastery >= 80 && 
      bloomLevel > progress.performance.bloomProgress.currentLevel) {
    progress.performance.bloomProgress.currentLevel = bloomLevel;
    progress.performance.bloomProgress.nextTargetLevel = 
      Math.min(6, bloomLevel + 1);
  }
  
  await progress.save();
}
```

---

## 📈 State Retrieval Examples

### Example 1: Check What Bloom Level to Use

```typescript
// GET /api/v1/progress/bloom-state?userId=123&conceptId=linear-equations

async function getBloomState(userId: string, conceptId: string) {
  const progress = await StudentProgress.findOne({ userId, conceptId });
  
  if (!progress) {
    return {
      currentLevel: 0,
      nextTargetLevel: 1,
      technique: "FEYNMAN_EXPLANATION",  // New concept
      questions: []  // Will be selected based on Level 1
    };
  }
  
  const bloom = progress.performance.bloomProgress;
  
  return {
    currentLevel: bloom.currentLevel,      // e.g., 2 (Understand)
    nextTargetLevel: bloom.nextTargetLevel, // e.g., 3 (Apply)
    mastered: {
      remember: bloom.remember.mastery >= 80,
      understand: bloom.understand.mastery >= 80,
      apply: bloom.apply.mastery >= 80,
      // ...
    },
    technique: determineTechnique(progress),
    reviewDate: progress.performance.spacedRepetition.nextReviewDate
  };
}
```

### Example 2: Get Questions for Bloom Level

```typescript
// GET /api/v1/questions/by-bloom?conceptId=linear-equations&level=2

async function getQuestionsForBloomLevel(
  conceptId: string,
  bloomLevel: number
): Promise<Question[]> {
  // Method 1: Query by question tags
  const questions = await Question.find({
    conceptId,
    "bloomLevel.primary": bloomLevel,
    difficulty: { $in: ["easy", "medium"] }  // Adjust by Flow
  }).limit(5);
  
  // Method 2: Use concept mapping
  const concept = await Concept.findById(conceptId);
  const questionIds = concept.bloomLevels[
    BLOOM_LEVEL_NAMES[bloomLevel]
  ].exampleQuestions;
  
  const questions2 = await Question.find({
    _id: { $in: questionIds }
  });
  
  return questions;
}
```

---

## 🔄 Complete Flow Diagram

```
START: Student Opens Study Page
  │
  ├─→ Load StudentProgress (userId + concept)
  │     │
  │     ├─→ Check bloomProgress.currentLevel
  │     ├─→ Check bloomProgress.nextTargetLevel
  │     ├─→ Check feynmanQuality.clarity
  │     └─→ Check flowMetrics.flowScore
  │
  ├─→ Decision Point 1: Is concept new?
  │     YES → Start at Bloom Level 1 (Remember)
  │     NO  → Use bloomProgress.nextTargetLevel
  │
  ├─→ Decision Point 2: Which technique?
  │     ├─→ Feynman quality < 70? → FEYNMAN_EXPLANATION
  │     ├─→ Review session? → SPACED_REPETITION
  │     ├─→ Flow in anxiety? → FLOW_SUPPORT
  │     ├─→ Flow in boredom? → FLOW_CHALLENGE
  │     └─→ Default → PRACTICE_APPLICATION
  │
  ├─→ Decision Point 3: Get questions
  │     ├─→ Query Question collection
  │     │     WHERE bloomLevel.primary = targetBloomLevel
  │     │     AND difficulty = calculatedDifficulty
  │     │     AND NOT in seenQuestions
  │     └─→ Return questions
  │
  ├─→ Present to Student
  │
  ├─→ Student Interacts (explains, answers, etc.)
  │
  ├─→ Save Results:
  │     ├─→ Save LearnerExplanation (if Feynman)
  │     ├─→ Update StudentProgress.bloomProgress
  │     ├─→ Update StudentProgress.feynmanQuality
  │     ├─→ Update StudentProgress.flowMetrics
  │     └─→ Update spacedRepetition schedule
  │
  └─→ Return Feedback & Next Steps
```

---

## 💡 Key Takeaways

1. **State is Stored in StudentProgress** - One document per user+concept tracks everything
2. **Bloom Levels are Tracked Per Level** - Each of 6 levels has mastery score (0-100)
3. **Decisions are Algorithm-Based** - Clear logic determines next steps
4. **Questions are Tagged** - Every question knows its Bloom level
5. **Flow Engine Always Monitors** - Adjusts difficulty in real-time
6. **Feynman Quality is Evaluated** - AI scores each explanation (0-100)
7. **Confidence is Automatic** - Calculated from behavior, not asked from students (zero burden!)
8. **Questions Can Repeat** - After 30+ days, especially for spaced repetition reviews
9. **Everything is Saved** - Complete history for analytics and improvement

---

## 🎯 Automatic Confidence Calculation Details

### Why Automatic?
- **Removes burden** from students - especially struggling students
- **More objective** - based on observable behavior, not self-assessment
- **Builds confidence** - system can be generous with struggling students
- **Supports all levels** - no student feels overwhelmed by rating themselves

### How It's Calculated

The system analyzes multiple behavioral signals:

```typescript
confidence = f(
  isCorrect,           // Did they get it right? (heaviest weight)
  timeSpent,           // Fast = confident, slow = less confident
  hintsUsed,           // No hints = confident, many hints = less confident
  chatInteractions,    // Few questions = confident
  previousAccuracy,    // Good track record = confident
  questionDifficulty,  // Easier question = more confident
  studentLevel         // Higher level = more confident baseline
)
```

### Example Calculations

**High Confidence (5/5):**
- Correct answer
- Solved quickly (< 50% of expected time)
- No hints needed
- No chat questions asked
- Good historical performance

**Medium Confidence (3-4/5):**
- Correct answer
- Normal time
- 1-2 hints used
- Some chat interactions
- Mixed historical performance

**Low Confidence (1-2/5):**
- Incorrect answer
- Took very long
- Many hints needed
- Lots of chat questions
- Poor historical performance

**Special Handling for Struggling Students:**
- More generous scoring (multiplier: 1.2x)
- Less penalty for taking time
- Extra boost for correct answers (even if slow)
- Helps build confidence gradually

---

**Model Used:** GPT-4

