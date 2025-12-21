/**
 * Topic Recommender Service
 * 
 * Uses AI to generate personalized study recommendations
 * with natural language explanations.
 */

import { openaiService, ChatMessage } from './openai.service';

export interface TopicRecommendation {
  topic: string;
  subject: string;
  score: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  masteryLevel: number;
  daysSincePractice: number;
  weakAreas: string[];
}

export interface StudentContext {
  level: number;
  learningStyle?: 'visual' | 'verbal' | 'procedural' | 'conceptual' | 'mixed';
  recentPerformance?: 'struggling' | 'average' | 'excelling';
  frustrationRisk?: 'low' | 'medium' | 'high';
}

export interface PerformanceData {
  overallMastery: number;
  recentEngagement: number;
  weakAreaCount: number;
  topicsToReview: number;
}

const RECOMMENDATION_SYSTEM_PROMPT = `You are an expert SAT tutor providing personalized study recommendations.

Your task is to explain to a student what topics they should focus on and why, based on their performance data.

Guidelines:
- Be encouraging and supportive
- Explain the "why" behind recommendations
- Acknowledge their progress
- Be specific about what to focus on
- Keep the explanation concise but friendly (2-4 sentences)

Format your response as natural, conversational text addressed to the student.`;

export class TopicRecommenderService {
  /**
   * Generate a natural language explanation of topic recommendations
   */
  async generateRecommendationExplanation(
    subject: string,
    recommendations: TopicRecommendation[],
    studentContext: StudentContext,
    performanceData: PerformanceData
  ): Promise<string> {
    if (recommendations.length === 0) {
      return this.generateEmptyRecommendationMessage(subject, performanceData);
    }

    const topRec = recommendations[0];
    const context = this.buildContextString(recommendations, studentContext, performanceData);

    const messages: ChatMessage[] = [
      { role: 'system', content: RECOMMENDATION_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Generate a personalized recommendation message for this student:

Subject: ${subject}
Student Level: ${studentContext.level}/10

Top Recommended Topic: ${topRec.topic}
- Current Mastery: ${topRec.masteryLevel}%
- Days Since Practice: ${topRec.daysSincePractice}
- Weak Areas: ${topRec.weakAreas.join(', ') || 'None identified'}
- Priority: ${topRec.priority}
- Reason: ${topRec.reason}

Other Recommendations: ${recommendations.slice(1, 3).map(r => r.topic).join(', ') || 'None'}

Overall Performance:
- Mastery: ${performanceData.overallMastery}%
- Engagement: ${performanceData.recentEngagement}%
- Areas Needing Work: ${performanceData.weakAreaCount}
- Topics Due for Review: ${performanceData.topicsToReview}

${context}

Generate a brief, encouraging recommendation (2-4 sentences) explaining what they should study and why.`
      },
    ];

    try {
      const response = await openaiService.generateChatCompletion({
        messages,
        temperature: 0.7,
        maxTokens: 200,
      });

      return response;
    } catch (error: any) {
      console.error('[TopicRecommender] Error generating explanation:', error);
      // Fallback to template-based explanation
      return this.generateFallbackExplanation(topRec, performanceData);
    }
  }

  /**
   * Generate AI-prioritized topic rankings
   */
  async prioritizeTopics(
    recommendations: TopicRecommendation[],
    studentContext: StudentContext,
    performanceData: PerformanceData
  ): Promise<{ topic: string; adjustedScore: number; reasoning: string }[]> {
    if (recommendations.length <= 1) {
      return recommendations.map(r => ({
        topic: r.topic,
        adjustedScore: r.score,
        reasoning: r.reason,
      }));
    }

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an educational AI helping prioritize study topics for SAT preparation.
Given a list of topics with their scores and context, provide a brief reasoning for the optimal study order.
Consider: mastery levels, time since practice, learning style, and engagement patterns.
Return a JSON object with an array of topics in recommended order with brief reasoning.`
      },
      {
        role: 'user',
        content: `Prioritize these topics for a level ${studentContext.level}/10 student:

Topics:
${recommendations.map((r, i) => `${i + 1}. ${r.topic} (Score: ${r.score}, Mastery: ${r.masteryLevel}%, Days: ${r.daysSincePractice})`).join('\n')}

Student Context:
- Learning Style: ${studentContext.learningStyle || 'mixed'}
- Recent Performance: ${studentContext.recentPerformance || 'average'}
- Frustration Risk: ${studentContext.frustrationRisk || 'low'}
- Overall Mastery: ${performanceData.overallMastery}%

Return JSON: { "prioritized": [{ "topic": "...", "adjustedScore": 0-100, "reasoning": "brief reason" }] }`
      },
    ];

    try {
      const response = await openaiService.generateStructuredData<{
        prioritized: { topic: string; adjustedScore: number; reasoning: string }[]
      }>({
        messages,
        temperature: 0.5,
        maxTokens: 500,
      }, {
        name: 'prioritize_topics',
        description: 'Prioritize study topics based on student context',
        parameters: {
          type: 'object',
          properties: {
            prioritized: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  topic: { type: 'string' },
                  adjustedScore: { type: 'number' },
                  reasoning: { type: 'string' },
                },
                required: ['topic', 'adjustedScore', 'reasoning'],
              },
            },
          },
          required: ['prioritized'],
        },
      });

      return response.prioritized;
    } catch (error: any) {
      console.error('[TopicRecommender] Error prioritizing topics:', error);
      // Return original order
      return recommendations.map(r => ({
        topic: r.topic,
        adjustedScore: r.score,
        reasoning: r.reason,
      }));
    }
  }

  /**
   * Generate a topic introduction for starting a guided session
   */
  async generateTopicIntroduction(
    topic: string,
    subject: string,
    studentContext: StudentContext,
    masteryLevel: number
  ): Promise<string> {
    const levelDescription = this.getLevelDescription(studentContext.level);
    const masteryDescription = this.getMasteryDescription(masteryLevel);

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a friendly SAT tutor starting a guided review session.
Your goal is to welcome the student and set expectations for the session.
Be encouraging, especially if the student is struggling.
Keep it brief (2-3 sentences) and end with an engaging question to start the discussion.`
      },
      {
        role: 'user',
        content: `Generate a welcoming introduction for a guided review session:

Topic: ${topic}
Subject: ${subject}
Student Level: ${studentContext.level}/10 (${levelDescription})
Current Mastery of Topic: ${masteryLevel}% (${masteryDescription})
Learning Style: ${studentContext.learningStyle || 'mixed'}

Create a brief, encouraging welcome message that:
1. Acknowledges the topic we'll be studying
2. Sets appropriate expectations based on their mastery level
3. Ends with an opening question to engage them`
      },
    ];

    try {
      const response = await openaiService.generateChatCompletion({
        messages,
        temperature: 0.7,
        maxTokens: 200,
      });

      return response;
    } catch (error: any) {
      console.error('[TopicRecommender] Error generating introduction:', error);
      return this.generateFallbackIntroduction(topic, masteryLevel);
    }
  }

  // Private helper methods

  private buildContextString(
    recommendations: TopicRecommendation[],
    studentContext: StudentContext,
    _performanceData: PerformanceData
  ): string {
    const parts: string[] = [];

    if (studentContext.frustrationRisk === 'high') {
      parts.push('Note: Student has shown signs of frustration. Be extra encouraging.');
    }

    if (studentContext.learningStyle && studentContext.learningStyle !== 'mixed') {
      parts.push(`Student prefers ${studentContext.learningStyle} learning.`);
    }

    const highPriorityCount = recommendations.filter(r => r.priority === 'high').length;
    if (highPriorityCount > 2) {
      parts.push('Multiple high-priority topics need attention.');
    }

    return parts.join(' ');
  }

  private generateEmptyRecommendationMessage(subject: string, performanceData: PerformanceData): string {
    if (performanceData.overallMastery >= 80) {
      return `Excellent work in ${subject}! You've shown strong mastery across topics. Consider exploring more advanced concepts or reviewing any topics that feel rusty.`;
    }
    return `Ready to start ${subject}? Let's find the right topics for you to practice. As you complete questions, I'll learn what areas to focus on.`;
  }

  private generateFallbackExplanation(
    topRec: TopicRecommendation,
    _performanceData: PerformanceData
  ): string {
    let message = `I recommend focusing on **${topRec.topic}** today. `;

    if (topRec.masteryLevel === 0) {
      message += "This is a new topic for you, and it's important for the SAT.";
    } else if (topRec.masteryLevel < 50) {
      message += `Your current mastery is ${topRec.masteryLevel}%, so there's good room for improvement.`;
    } else if (topRec.daysSincePractice > 7) {
      message += `It's been ${topRec.daysSincePractice} days since you practiced this - a review will help keep it fresh.`;
    } else {
      message += "Let's strengthen your understanding of this concept.";
    }

    return message;
  }

  private generateFallbackIntroduction(topic: string, masteryLevel: number): string {
    if (masteryLevel === 0) {
      return `Let's explore **${topic}** together! This is a new topic for you, so we'll start with the fundamentals. What do you already know about ${topic}?`;
    } else if (masteryLevel < 50) {
      return `Time to strengthen your **${topic}** skills! You've got a good foundation, and I'm here to help you build on it. What aspect of ${topic} would you like to focus on?`;
    }
    return `Let's review **${topic}**! You're doing well with this concept - let's make sure it stays sharp. Is there any specific part you'd like to practice?`;
  }

  private getLevelDescription(level: number): string {
    if (level <= 3) return 'building foundations';
    if (level <= 5) return 'developing skills';
    if (level <= 7) return 'proficient';
    return 'advanced';
  }

  private getMasteryDescription(mastery: number): string {
    if (mastery === 0) return 'new topic';
    if (mastery < 30) return 'beginning';
    if (mastery < 50) return 'developing';
    if (mastery < 70) return 'intermediate';
    if (mastery < 90) return 'proficient';
    return 'mastered';
  }
}

export const topicRecommenderService = new TopicRecommenderService();

