/**
 * Content Mapper Service
 * 
 * Maps concepts to questions, Bloom levels, and learning resources.
 * Provides the content layer between concepts and questions.
 */

import mongoose from 'mongoose';
import { Question, Subject, Difficulty } from '../models/Question.model';
import { Concept, IConcept } from '../models/Concept.model';
import { BLOOM_LEVEL_NAMES, BLOOM_LEVEL_DESCRIPTIONS } from './bloomService';

export interface ConceptContent {
  conceptId: string;
  name: string;
  subject: string;
  
  // Current level content
  explanation: {
    text: string;
    analogies: string[];
    visuals: string[];
  };
  
  // Common misconceptions
  misconceptions: {
    misconception: string;
    correction: string;
  }[];
  
  // Real-world applications
  applications: string[];
  
  // Related concepts for exploration
  relatedConcepts: {
    id: string;
    name: string;
    relationship: string;
  }[];
  
  // Prerequisites needed
  prerequisites: {
    id: string;
    name: string;
    mastered: boolean;
  }[];
}

export interface QuestionsByBloom {
  level: number;
  levelName: string;
  description: string;
  questions: any[];
  totalCount: number;
}

export interface ConceptMapping {
  conceptId: string;
  conceptName: string;
  subject: string;
  tags: string[];
  questionCounts: Record<number, number>; // Bloom level -> count
  totalQuestions: number;
}

export class ContentMapperService {
  /**
   * Get all questions for a concept at a specific Bloom level
   */
  async getQuestionsForBloomLevel(
    conceptId: mongoose.Types.ObjectId | null,
    bloomLevel: number,
    difficulty?: Difficulty,
    excludeQuestionIds: mongoose.Types.ObjectId[] = [],
    limit: number = 10
  ): Promise<any[]> {
    const query: any = {
      'bloomLevel.primary': bloomLevel,
      _id: { $nin: excludeQuestionIds },
    };

    if (conceptId) {
      query.conceptId = conceptId;
    }

    if (difficulty) {
      query.difficulty = difficulty;
    }

    return Question.find(query)
      .limit(limit)
      .sort({ 'metadata.timesUsed': 1 }) // Prefer less-used questions
      .exec();
  }

  /**
   * Get questions by topic and Bloom level
   */
  async getQuestionsByTopicAndBloom(
    topic: string,
    bloomLevel: number,
    subject?: Subject,
    difficulty?: Difficulty,
    limit: number = 10
  ): Promise<any[]> {
    const query: any = {
      tags: topic,
      'bloomLevel.primary': bloomLevel,
    };

    if (subject) {
      query.subject = subject;
    }

    if (difficulty) {
      query.difficulty = difficulty;
    }

    return Question.find(query)
      .limit(limit)
      .sort({ 'metadata.timesUsed': 1 })
      .exec();
  }

  /**
   * Map a question to its concepts
   */
  async mapQuestionToConcepts(questionId: mongoose.Types.ObjectId): Promise<IConcept[]> {
    const question = await Question.findById(questionId);
    if (!question) {
      return [];
    }

    // First try direct concept reference
    if (question.conceptId) {
      const concept = await Concept.findById(question.conceptId);
      if (concept) {
        return [concept];
      }
    }

    // Fall back to tag matching
    const concepts = await Concept.find({
      $or: [
        { tags: { $in: question.tags } },
        { name: { $regex: question.tags.join('|'), $options: 'i' } },
      ],
    });

    return concepts;
  }

  /**
   * Get content resources for a concept at a specific level
   */
  async getConceptContent(
    conceptId: mongoose.Types.ObjectId,
    bloomLevel: number,
    studentLevel: number
  ): Promise<ConceptContent | null> {
    const concept = await Concept.findById(conceptId)
      .populate('relatedConcepts', 'name')
      .populate('prerequisiteConcepts', 'name');

    if (!concept) {
      return null;
    }

    // Get explanation appropriate for student level
    const explanations = concept.content.explanations || [];
    const appropriateExplanation = explanations.find(
      (e) => e.level <= studentLevel
    ) || explanations[0] || { text: '', analogies: [], visuals: [] };

    // Get related concepts
    const relatedConcepts = (concept.relatedConcepts || []).map((rc: any) => ({
      id: rc._id.toString(),
      name: rc.name,
      relationship: 'related',
    }));

    // Get prerequisites
    const prerequisites = (concept.prerequisiteConcepts || []).map((pc: any) => ({
      id: pc._id.toString(),
      name: pc.name,
      mastered: false, // Would need student progress to determine this
    }));

    return {
      conceptId: String(concept._id),
      name: concept.name,
      subject: concept.subject,
      explanation: {
        text: appropriateExplanation.text || '',
        analogies: appropriateExplanation.analogies || [],
        visuals: appropriateExplanation.visuals || [],
      },
      misconceptions: concept.content.commonMisconceptions || [],
      applications: concept.content.realWorldApplications || [],
      relatedConcepts,
      prerequisites,
    };
  }

  /**
   * Get all questions for a concept grouped by Bloom level
   */
  async getQuestionsByBloomForConcept(
    conceptId: mongoose.Types.ObjectId
  ): Promise<QuestionsByBloom[]> {
    const result: QuestionsByBloom[] = [];

    for (let level = 1; level <= 6; level++) {
      const questions = await Question.find({
        conceptId,
        'bloomLevel.primary': level,
      }).limit(20);

      const totalCount = await Question.countDocuments({
        conceptId,
        'bloomLevel.primary': level,
      });

      result.push({
        level,
        levelName: BLOOM_LEVEL_NAMES[level],
        description: BLOOM_LEVEL_DESCRIPTIONS[level],
        questions,
        totalCount,
      });
    }

    return result;
  }

  /**
   * Get concept mapping for a topic
   */
  async getConceptMappingForTopic(
    topic: string,
    subject?: Subject
  ): Promise<ConceptMapping | null> {
    // Try to find an existing concept
    const query: any = {
      $or: [
        { tags: topic },
        { name: { $regex: topic, $options: 'i' } },
      ],
    };

    if (subject) {
      query.subject = subject;
    }

    const concept = await Concept.findOne(query);

    if (concept) {
      // Get question counts by Bloom level
      const questionCounts: Record<number, number> = {};
      let totalQuestions = 0;

      for (let level = 1; level <= 6; level++) {
        const count = await Question.countDocuments({
          conceptId: concept._id,
          'bloomLevel.primary': level,
        });
        questionCounts[level] = count;
        totalQuestions += count;
      }

      return {
        conceptId: String(concept._id),
        conceptName: concept.name,
        subject: concept.subject,
        tags: concept.tags,
        questionCounts,
        totalQuestions,
      };
    }

    // No concept found, create mapping from questions
    const questionQuery: any = { tags: topic };
    if (subject) {
      questionQuery.subject = subject;
    }

    const questions = await Question.find(questionQuery);

    if (questions.length === 0) {
      return null;
    }

    // Build mapping from questions
    const questionCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    questions.forEach((q) => {
      const level = q.bloomLevel?.primary || 3;
      questionCounts[level] = (questionCounts[level] || 0) + 1;
    });

    return {
      conceptId: '', // No concept
      conceptName: topic,
      subject: subject || questions[0].subject,
      tags: [topic],
      questionCounts,
      totalQuestions: questions.length,
    };
  }

  /**
   * Create or update concept from questions
   */
  async ensureConceptExists(
    name: string,
    subject: Subject,
    tags: string[]
  ): Promise<IConcept> {
    let concept = await Concept.findOne({ name, subject });

    if (!concept) {
      concept = new Concept({
        name,
        subject,
        tags,
        bloomLevels: {
          remember: { description: 'Recall basic facts and definitions', exampleQuestions: [], masteredThreshold: 80 },
          understand: { description: 'Explain concepts and interpret meaning', exampleQuestions: [], masteredThreshold: 80 },
          apply: { description: 'Solve problems in new situations', exampleQuestions: [], masteredThreshold: 80 },
          analyze: { description: 'Break down and compare concepts', exampleQuestions: [], masteredThreshold: 80 },
          evaluate: { description: 'Judge and critique approaches', exampleQuestions: [], masteredThreshold: 80 },
          create: { description: 'Design and produce new solutions', exampleQuestions: [], masteredThreshold: 80 },
        },
        content: {
          explanations: [],
          realWorldApplications: [],
          commonMisconceptions: [],
        },
        prerequisiteConcepts: [],
        relatedConcepts: [],
      });

      await concept.save();
    }

    return concept;
  }

  /**
   * Link questions to a concept
   */
  async linkQuestionsToConcept(
    conceptId: mongoose.Types.ObjectId,
    questionIds: mongoose.Types.ObjectId[]
  ): Promise<number> {
    const result = await Question.updateMany(
      { _id: { $in: questionIds } },
      { $set: { conceptId } }
    );

    return result.modifiedCount;
  }

  /**
   * Auto-map questions to concepts based on tags
   */
  async autoMapQuestionsToConcepts(subject?: Subject): Promise<{
    mapped: number;
    conceptsCreated: number;
  }> {
    const query: any = { conceptId: { $exists: false } };
    if (subject) {
      query.subject = subject;
    }

    const unmappedQuestions = await Question.find(query);
    let mapped = 0;
    let conceptsCreated = 0;

    for (const question of unmappedQuestions) {
      const primaryTag = question.tags[0];
      if (!primaryTag) continue;

      // Ensure concept exists
      let concept = await Concept.findOne({
        tags: primaryTag,
        subject: question.subject,
      });

      if (!concept) {
        concept = await this.ensureConceptExists(
          primaryTag,
          question.subject,
          question.tags
        );
        conceptsCreated++;
      }

      // Link question to concept
      if (concept && concept._id) {
        question.conceptId = concept._id as any;
        await question.save();
        mapped++;
      }
    }

    return { mapped, conceptsCreated };
  }

  /**
   * Get Feynman prompts for a concept
   */
  getFeynmanPrompts(conceptName: string, bloomLevel: number): {
    explanationPrompt: string;
    analogyPrompt: string;
    teachingPrompt: string;
  } {
    const prompts = {
      explanationPrompt: '',
      analogyPrompt: '',
      teachingPrompt: '',
    };

    switch (bloomLevel) {
      case 1: // Remember
        prompts.explanationPrompt = `What is ${conceptName}? Describe the basic definition.`;
        prompts.analogyPrompt = `What does ${conceptName} remind you of?`;
        prompts.teachingPrompt = `List the key facts about ${conceptName}.`;
        break;
      case 2: // Understand
        prompts.explanationPrompt = `Explain ${conceptName} in your own words as if teaching a friend.`;
        prompts.analogyPrompt = `Create an analogy: "${conceptName} is like _____ because _____"`;
        prompts.teachingPrompt = `Why is ${conceptName} important? What does it help us do?`;
        break;
      case 3: // Apply
        prompts.explanationPrompt = `Explain how you would use ${conceptName} to solve a problem.`;
        prompts.analogyPrompt = `Give a real-world example where ${conceptName} applies.`;
        prompts.teachingPrompt = `Walk through solving a problem using ${conceptName} step by step.`;
        break;
      case 4: // Analyze
        prompts.explanationPrompt = `Compare and contrast ${conceptName} with related concepts.`;
        prompts.analogyPrompt = `What patterns do you see in ${conceptName}?`;
        prompts.teachingPrompt = `Break down the components of ${conceptName} and explain how they relate.`;
        break;
      case 5: // Evaluate
        prompts.explanationPrompt = `When is ${conceptName} the best approach vs. alternatives?`;
        prompts.analogyPrompt = `What are the strengths and weaknesses of using ${conceptName}?`;
        prompts.teachingPrompt = `Critique a solution that uses ${conceptName}. How could it be improved?`;
        break;
      case 6: // Create
        prompts.explanationPrompt = `Create a new problem that uses ${conceptName} in an interesting way.`;
        prompts.analogyPrompt = `Design a real-world application using ${conceptName}.`;
        prompts.teachingPrompt = `Develop a lesson plan to teach ${conceptName} to a struggling student.`;
        break;
      default:
        prompts.explanationPrompt = `Explain ${conceptName} as if teaching a classmate who has never seen it.`;
        prompts.analogyPrompt = `Create an analogy to help someone understand ${conceptName}.`;
        prompts.teachingPrompt = `How would you teach ${conceptName} to someone new?`;
    }

    return prompts;
  }
}

export const contentMapperService = new ContentMapperService();

