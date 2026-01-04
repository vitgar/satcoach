/**
 * Message Analyzer Service
 * 
 * Performs local analysis on student messages without calling OpenAI.
 * Detects learning style signals, vocabulary level, and question quality.
 */

export interface LearningStyleSignals {
  visual: number;
  verbal: number;
  procedural: number;
  conceptual: number;
}

export interface VocabularyAnalysis {
  gradeLevel: number; // 1-12
  averageWordLength: number;
  averageSentenceLength: number;
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface QuestionQualityAnalysis {
  quality: 'vague' | 'specific' | 'mixed';
  isQuestion: boolean;
  hasContext: boolean;
  specificity: number; // 0-100
}

export interface LocalMessageAnalysis {
  learningStyleSignals: LearningStyleSignals;
  vocabulary: VocabularyAnalysis;
  questionQuality: QuestionQualityAnalysis;
  engagementScore: number; // 0-100
}

export interface SessionAggregation {
  dominantLearningStyle: 'visual' | 'verbal' | 'procedural' | 'conceptual' | 'mixed';
  averageVocabularyLevel: number;
  overallQuestionQuality: 'vague' | 'specific' | 'mixed';
  averageEngagement: number;
  totalSignals: LearningStyleSignals;
}

export class MessageAnalyzerService {
  // Learning style keyword patterns
  private readonly visualKeywords = [
    'show me', 'draw', 'graph', 'picture', 'diagram', 'chart',
    'what does it look like', 'visualize', 'see it', 'see how',
    'image', 'display', 'plot', 'sketch', 'illustrate'
  ];

  private readonly verbalKeywords = [
    'explain', 'tell me', 'describe', 'what does', 'analogy',
    'another way', 'in other words', 'like what', 'say it',
    'rephrase', 'put it differently', 'mean', 'definition',
    'words', 'saying', 'talk me through'
  ];

  private readonly proceduralKeywords = [
    'step', 'first', 'then', 'next', 'how do i', 'walk me through',
    'what do i do', 'process', 'procedure', 'steps',
    'start', 'begin', 'after that', 'finally', 'order',
    'sequence', 'method', 'instructions'
  ];

  private readonly conceptualKeywords = [
    'why', 'how does', 'what if', 'theory', 'principle',
    'connect', 'relate', 'understand', 'concept', 'reason',
    'logic', 'meaning', 'purpose', 'idea', 'relationship',
    'underlying', 'fundamentally', 'essentially'
  ];

  // Question quality indicators
  private readonly vagueIndicators = [
    'i don\'t get it', 'i\'m lost', 'confused', 'help',
    'what', 'huh', 'explain', 'i don\'t understand',
    '???', '?!', 'no idea', 'makes no sense'
  ];

  private readonly specificIndicators = [
    'in step', 'when you', 'why does', 'how come',
    'specifically', 'exactly', 'this part', 'the equation',
    'this term', 'this value', 'at line', 'coefficient',
    'variable', 'function', 'formula'
  ];

  /**
   * Analyze a single message for learning signals
   */
  analyzeMessage(message: string): LocalMessageAnalysis {
    const lowerMessage = message.toLowerCase();

    return {
      learningStyleSignals: this.detectLearningStyleSignals(lowerMessage),
      vocabulary: this.analyzeVocabulary(message),
      questionQuality: this.assessQuestionQuality(lowerMessage),
      engagementScore: this.calculateEngagementScore(message),
    };
  }

  /**
   * Detect learning style signals from keywords
   */
  detectLearningStyleSignals(message: string): LearningStyleSignals {
    return {
      visual: this.countKeywordMatches(message, this.visualKeywords),
      verbal: this.countKeywordMatches(message, this.verbalKeywords),
      procedural: this.countKeywordMatches(message, this.proceduralKeywords),
      conceptual: this.countKeywordMatches(message, this.conceptualKeywords),
    };
  }

  /**
   * Analyze vocabulary complexity using Flesch-Kincaid approximation
   */
  analyzeVocabulary(message: string): VocabularyAnalysis {
    const words = this.getWords(message);
    const sentences = this.getSentences(message);

    if (words.length === 0 || sentences.length === 0) {
      return {
        gradeLevel: 8,
        averageWordLength: 0,
        averageSentenceLength: 0,
        complexity: 'simple',
      };
    }

    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    const avgSentenceLength = words.length / sentences.length;
    
    // Simplified syllable count (approximation)
    const syllableCount = words.reduce((sum, word) => sum + this.countSyllables(word), 0);
    const avgSyllablesPerWord = syllableCount / words.length;

    // Flesch-Kincaid Grade Level approximation
    const gradeLevel = Math.round(
      0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59
    );

    // Clamp to valid range
    const clampedGradeLevel = Math.max(1, Math.min(12, gradeLevel));

    let complexity: 'simple' | 'moderate' | 'complex';
    if (clampedGradeLevel <= 5) {
      complexity = 'simple';
    } else if (clampedGradeLevel <= 9) {
      complexity = 'moderate';
    } else {
      complexity = 'complex';
    }

    return {
      gradeLevel: clampedGradeLevel,
      averageWordLength: Math.round(avgWordLength * 10) / 10,
      averageSentenceLength: Math.round(avgSentenceLength * 10) / 10,
      complexity,
    };
  }

  /**
   * Assess the quality of a question
   */
  assessQuestionQuality(message: string): QuestionQualityAnalysis {
    const isQuestion = message.includes('?') || 
      message.startsWith('how') ||
      message.startsWith('why') ||
      message.startsWith('what') ||
      message.startsWith('where') ||
      message.startsWith('when') ||
      message.startsWith('can you') ||
      message.startsWith('could you');

    const vagueMatches = this.countKeywordMatches(message, this.vagueIndicators);
    const specificMatches = this.countKeywordMatches(message, this.specificIndicators);

    // Check for context references
    const hasContext = /step \d|line \d|equation|formula|the \w+ in|when i|after|before/.test(message);

    // Calculate specificity score
    const wordCount = this.getWords(message).length;
    let specificity = 50; // baseline

    // Longer messages tend to be more specific
    if (wordCount > 10) specificity += 15;
    if (wordCount > 20) specificity += 10;

    // Context adds specificity
    if (hasContext) specificity += 20;

    // Specific indicators add points
    specificity += specificMatches * 10;

    // Vague indicators subtract points
    specificity -= vagueMatches * 15;

    // Clamp
    specificity = Math.max(0, Math.min(100, specificity));

    // Determine quality
    let quality: 'vague' | 'specific' | 'mixed';
    if (specificity >= 60) {
      quality = 'specific';
    } else if (specificity <= 30) {
      quality = 'vague';
    } else {
      quality = 'mixed';
    }

    return {
      quality,
      isQuestion,
      hasContext,
      specificity,
    };
  }

  /**
   * Calculate engagement score based on message characteristics
   */
  calculateEngagementScore(message: string): number {
    let score = 50; // baseline

    const words = this.getWords(message);
    const wordCount = words.length;

    // Length indicates engagement
    if (wordCount >= 5) score += 10;
    if (wordCount >= 15) score += 10;
    if (wordCount >= 30) score += 10;

    // Questions indicate engagement
    if (message.includes('?')) score += 15;

    // Multiple sentences indicate thought
    const sentences = this.getSentences(message);
    if (sentences.length > 1) score += 10;

    // Specific terms indicate deep engagement
    const specificCount = this.countKeywordMatches(message.toLowerCase(), this.specificIndicators);
    score += specificCount * 5;

    // Very short responses might indicate disengagement
    if (wordCount <= 2) score -= 20;

    // Single character or "ok" responses
    if (wordCount === 1 || /^(ok|yes|no|sure|k|thanks|ty)$/i.test(message.trim())) {
      score -= 30;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Aggregate multiple message analyses into session insights
   */
  aggregateSession(analyses: LocalMessageAnalysis[]): SessionAggregation {
    if (analyses.length === 0) {
      return {
        dominantLearningStyle: 'mixed',
        averageVocabularyLevel: 8,
        overallQuestionQuality: 'mixed',
        averageEngagement: 50,
        totalSignals: { visual: 0, verbal: 0, procedural: 0, conceptual: 0 },
      };
    }

    // Sum up all signals
    const totalSignals: LearningStyleSignals = { visual: 0, verbal: 0, procedural: 0, conceptual: 0 };
    let totalVocabulary = 0;
    let totalEngagement = 0;
    const qualities: string[] = [];

    analyses.forEach(analysis => {
      totalSignals.visual += analysis.learningStyleSignals.visual;
      totalSignals.verbal += analysis.learningStyleSignals.verbal;
      totalSignals.procedural += analysis.learningStyleSignals.procedural;
      totalSignals.conceptual += analysis.learningStyleSignals.conceptual;
      totalVocabulary += analysis.vocabulary.gradeLevel;
      totalEngagement += analysis.engagementScore;
      qualities.push(analysis.questionQuality.quality);
    });

    // Determine dominant style
    const dominantLearningStyle = this.getDominantStyle(totalSignals);

    // Calculate averages
    const averageVocabularyLevel = Math.round(totalVocabulary / analyses.length);
    const averageEngagement = Math.round(totalEngagement / analyses.length);

    // Determine overall question quality
    const vagueCount = qualities.filter(q => q === 'vague').length;
    const specificCount = qualities.filter(q => q === 'specific').length;
    let overallQuestionQuality: 'vague' | 'specific' | 'mixed';
    
    if (specificCount > vagueCount * 2) {
      overallQuestionQuality = 'specific';
    } else if (vagueCount > specificCount * 2) {
      overallQuestionQuality = 'vague';
    } else {
      overallQuestionQuality = 'mixed';
    }

    return {
      dominantLearningStyle,
      averageVocabularyLevel,
      overallQuestionQuality,
      averageEngagement,
      totalSignals,
    };
  }

  // Private helper methods

  private countKeywordMatches(text: string, keywords: string[]): number {
    let count = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        count++;
      }
    }
    return count;
  }

  private getWords(text: string): string[] {
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0);
  }

  private getSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .filter(s => s.trim().length > 0);
  }

  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    
    // Remove trailing 'e'
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    
    // Count vowel groups
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  private getDominantStyle(signals: LearningStyleSignals): 'visual' | 'verbal' | 'procedural' | 'conceptual' | 'mixed' {
    const total = signals.visual + signals.verbal + signals.procedural + signals.conceptual;
    
    if (total < 3) return 'mixed'; // Not enough data

    const max = Math.max(signals.visual, signals.verbal, signals.procedural, signals.conceptual);
    
    // Need at least 35% dominance
    if (max / total < 0.35) return 'mixed';

    if (signals.visual === max) return 'visual';
    if (signals.procedural === max) return 'procedural';
    if (signals.conceptual === max) return 'conceptual';
    if (signals.verbal === max) return 'verbal';

    return 'mixed';
  }
}

export const messageAnalyzerService = new MessageAnalyzerService();






