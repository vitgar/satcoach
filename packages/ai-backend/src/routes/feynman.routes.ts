/**
 * Feynman Technique API Routes
 * 
 * Endpoints for evaluating student explanations using AI.
 */

import { Router, Request, Response } from 'express';
import { feynmanAIService, EvaluationRequest, FeynmanEvaluationResult } from '../services/feynmanAI.service';

const router = Router();

interface EvaluateRequestBody {
  topic: string;
  explanation: string;
  conceptContext?: string;
  previousAttempts?: string[];
  studentLevel?: number;
  targetBloomLevel?: number;
}

interface EvaluateResponse {
  success: boolean;
  data?: {
    evaluation: FeynmanEvaluationResult;
    overallScore: number;
    needsRefinement: boolean;
    refinementPrompts: string[];
    bloomLevelDemonstrated: number;
  };
  error?: string;
}

/**
 * POST /api/v1/feynman/evaluate
 * Evaluate a student's explanation using AI
 */
router.post('/evaluate', async (req: Request<{}, {}, EvaluateRequestBody>, res: Response<EvaluateResponse>) => {
  try {
    const { topic, explanation, conceptContext, previousAttempts, studentLevel, targetBloomLevel } = req.body;

    // Validation
    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Topic is required',
      });
    }

    if (!explanation || typeof explanation !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Explanation is required',
      });
    }

    if (explanation.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Explanation is too short',
      });
    }

    // Build evaluation request
    const evaluationRequest: EvaluationRequest = {
      topic,
      explanation,
      conceptContext,
      previousAttempts,
      studentLevel,
      targetBloomLevel,
    };

    // Evaluate using AI
    const evaluation = await feynmanAIService.evaluateExplanation(evaluationRequest);
    const overallScore = feynmanAIService.getOverallScore(evaluation);
    const needsRefinement = feynmanAIService.needsRefinement(evaluation);
    
    // Generate refinement prompts if needed
    let refinementPrompts: string[] = [];
    if (needsRefinement) {
      refinementPrompts = await feynmanAIService.generateRefinementPrompts(
        topic,
        explanation,
        evaluation
      );
    }

    return res.json({
      success: true,
      data: {
        evaluation,
        overallScore,
        needsRefinement,
        refinementPrompts,
        bloomLevelDemonstrated: evaluation.bloomLevel,
      },
    });
  } catch (error: any) {
    console.error('Feynman evaluation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to evaluate explanation',
    });
  }
});

/**
 * POST /api/v1/feynman/prompts
 * Get Feynman explanation prompts for a topic
 */
router.post('/prompts', async (req: Request, res: Response) => {
  try {
    const { topic, bloomLevel = 2 } = req.body;

    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Topic is required',
      });
    }

    // Generate prompts based on Bloom level
    const prompts = getExplanationPrompts(topic, bloomLevel);

    return res.json({
      success: true,
      data: {
        topic,
        bloomLevel,
        prompts,
      },
    });
  } catch (error: any) {
    console.error('Feynman prompts error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate prompts',
    });
  }
});

/**
 * Generate explanation prompts based on Bloom level
 */
function getExplanationPrompts(topic: string, bloomLevel: number): {
  main: string;
  analogy: string;
  teaching: string;
} {
  switch (bloomLevel) {
    case 1: // Remember
      return {
        main: `What is ${topic}? Describe the basic definition in your own words.`,
        analogy: `What does ${topic} remind you of?`,
        teaching: `List the key facts about ${topic}.`,
      };
    case 2: // Understand
      return {
        main: `Explain ${topic} as if you're teaching a friend who has never seen it before.`,
        analogy: `"${topic} is like _____ because _____"`,
        teaching: `Why is ${topic} important? What does it help us do?`,
      };
    case 3: // Apply
      return {
        main: `How would you use ${topic} to solve a problem? Walk through an example.`,
        analogy: `Give a real-world situation where ${topic} applies.`,
        teaching: `Show the steps to solve a problem using ${topic}.`,
      };
    case 4: // Analyze
      return {
        main: `Compare ${topic} with related concepts. What patterns do you see?`,
        analogy: `How is ${topic} similar to or different from related ideas?`,
        teaching: `Break down ${topic} into its key components and explain how they connect.`,
      };
    case 5: // Evaluate
      return {
        main: `When is ${topic} the best approach? When might you use something else?`,
        analogy: `What are the strengths and limitations of ${topic}?`,
        teaching: `Critique a solution that uses ${topic}. How could it be improved?`,
      };
    case 6: // Create
      return {
        main: `Create a new problem or scenario that uses ${topic} in an interesting way.`,
        analogy: `Design a real-world application using ${topic}.`,
        teaching: `How would you teach ${topic} to a struggling student? Create a lesson plan.`,
      };
    default:
      return {
        main: `Explain ${topic} in your own words, as simply as possible.`,
        analogy: `Create an analogy: "${topic} is like..."`,
        teaching: `How would you teach ${topic} to a classmate?`,
      };
  }
}

export default router;

