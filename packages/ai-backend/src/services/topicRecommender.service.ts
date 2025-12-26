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
    masteryLevel: number,
    previousSessions?: {
      hasHistory: boolean;
      totalSessions: number;
      lastSessionDate?: string;
      lastSessionAccuracy?: number;
      conceptsCovered?: string[];
      // Enhanced concept tracking
      conceptsWithMastery?: Array<{
        concept: string;
        mastery: 'introduced' | 'practicing' | 'understood' | 'mastered';
        lastCovered: string;
        timesReviewed: number;
      }>;
      conceptsDueForReview?: string[];
      recommendedStartingPoint?: string;
    }
  ): Promise<string> {
    const levelDescription = this.getLevelDescription(studentContext.level);
    const masteryDescription = this.getMasteryDescription(masteryLevel);
    
    // Build comprehensive previous session context string
    const previousSessionContext = this.buildPreviousSessionContext(previousSessions, masteryLevel);

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a friendly SAT tutor starting a guided review session.
Your goal is to briefly welcome the student and begin teaching immediately.

CRITICAL RULES:
1. If this is a RETURNING student (has previous sessions):
   - DO NOT treat them as a beginner
   - DO NOT ask "what do you already know?"
   - DO reference specific concepts they've learned
   - DO start from their recommended starting point
   - DO acknowledge their progress (mastery level)

2. If this is a NEW student (first time on this topic):
   - Ask what they already know about the topic (ONE question)
   - Wait for their response before teaching

3. ALWAYS:
   - Be encouraging and specific
   - Lead the lesson (don't ask what they want to learn)
   - Keep the welcome to 1-2 sentences max

TONE GUIDELINES (CRITICAL - MUST FOLLOW):
- Sound like a friendly, patient human tutor - not a textbook
- Use contractions (don't, let's, here's, that's)
- Use casual phrases ("So basically...", "Here's the thing...", "Think of it like...")
- Be encouraging but not over-the-top ("Nice!" not "Excellent work! I'm so proud!")

FORBIDDEN PHRASES (never use these - they sound robotic):
- "Welcome! I'm excited to start our journey..."
- "This topic is fundamental/foundational/crucial..."
- "Let's dive right in!" / "Let's dive into..."
- "Let's explore..." / "Let's delve into..."
- "Absolutely!" / "Certainly!" / "Of course!"
- "...and beyond" / "step by step"
- Any phrase that sounds like a textbook or corporate training video

IMPORTANT: YOU selected this topic for the student based on their learning needs. Don't say "So you want to work on X?" - the student didn't choose it, you did.

GOOD OPENING EXAMPLES (for NEW students):
- "Alright, I've picked linear equations for us today - it's a key building block. Quick question: have you seen equations like y = 2x + 1 before?"
- "Today we're going to work on radicals. Before we start, what do you already know about square roots?"
- "We're focusing on geometry angles today. Have you worked with acute or obtuse angles before, or is this new territory?"

GOOD OPENING EXAMPLES (for RETURNING students):
- "Good to have you back! Last time we covered the basics of triangles. Ready to pick up where we left off?"
- "Hey! So last session we worked on slope. Today let's build on that with y-intercepts."

BAD OPENINGS (NEVER use):
- "So you want to work on radicals?" (implies student chose - they didn't)
- "Welcome! I'm excited to start our journey into the world of radicals together."
- "This topic is foundational in algebra, and we'll build your understanding step by step."

FORMATTING RULES (CRITICAL - NO TEXTBOOK STYLE):
- NEVER use bullet points (•) or numbered lists to explain concepts
- NEVER use "where:" followed by a list of definitions
- Write in flowing SENTENCES, like you're talking to a friend
- One concept at a time - don't introduce 4 variables in one response

VISUAL RULES (CRITICAL):
1. If you mention showing a visual, you MUST include a <graph> tag IMMEDIATELY after
2. NEVER say "here's a visual" or "let me show you" without a <graph> tag following it
3. Match graph type to topic:

For GEOMETRY (triangles, angles, shapes) - use "polygon":
<graph>{"type": "polygon", "title": "Triangle", "polygonConfig": {"points": [{"x": 20, "y": 80, "label": "A"}, {"x": 80, "y": 80, "label": "B"}, {"x": 50, "y": 20, "label": "C"}], "strokeColor": "#2563eb", "fillColor": "#dbeafe"}}</graph>

For ALGEBRA (equations, functions) - use appropriate type:
<graph>{"type": "quadratic", "a": 1, "b": 0, "c": 0, "title": "y = x²"}</graph>
<graph>{"type": "linear", "m": 2, "b": 1, "title": "y = 2x + 1"}</graph>

WRONG: "Here's a visual representation of a triangle:" (no <graph> tag follows)
RIGHT: "An isosceles triangle has two equal sides:" + <graph>...</graph>

If unsure which graph type to use, DO NOT mention visuals at all.`
      },
      {
        role: 'user',
        content: `Generate a welcoming introduction for a guided review session:

Topic: ${topic}
Subject: ${subject}
Student Level: ${studentContext.level}/10 (${levelDescription})
Current Mastery: ${masteryLevel}% (${masteryDescription})
Learning Style: ${studentContext.learningStyle || 'mixed'}

${previousSessionContext}

IMPORTANT: 
- If returning student with mastery > 0%: This is NOT their first time. Continue from where they need work.
- Start teaching after a brief welcome. Do NOT ask "what do you know about X?" to returning students.
- Reference their specific progress and what to work on next.`
      },
    ];

    try {
      const response = await openaiService.generateChatCompletion({
        messages,
        temperature: 0.7,
        maxTokens: 600,
      });

      return response;
    } catch (error: any) {
      console.error('[TopicRecommender] Error generating introduction:', error);
      return this.generateFallbackIntroduction(topic, masteryLevel, previousSessions);
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

  private generateFallbackIntroduction(
    topic: string, 
    masteryLevel: number,
    previousSessions?: {
      hasHistory: boolean;
      totalSessions: number;
      lastSessionDate?: string;
      lastSessionAccuracy?: number;
    }
  ): string {
    // Handle returning students (either has session history OR has mastery > 0)
    const isReturning = (previousSessions?.hasHistory && previousSessions.totalSessions > 0) || masteryLevel > 0;
    
    if (isReturning) {
      if (masteryLevel >= 70) {
        return `Welcome back to **${topic}**! You've made great progress - you're at ${masteryLevel}% mastery. Let's continue building on that momentum. We'll start by reviewing the key concepts and then move to more advanced applications.`;
      } else if (masteryLevel >= 40) {
        return `Good to see you back working on **${topic}**! You're at ${masteryLevel}% mastery - solid progress. Let's continue strengthening your understanding. I'll start with a quick concept check to see where we should focus.`;
      } else {
        return `Welcome back to **${topic}**! You're at ${masteryLevel}% mastery, and each session helps build understanding. Let's pick up where we left off and reinforce the fundamentals. Here's what we'll work on today...`;
      }
    }
    
    // New students
    return `Let's explore **${topic}** together! This is a new topic for you, so we'll start with the fundamentals. I'll guide you through the key concepts step by step. Let's begin...`;
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

  /**
   * Build comprehensive previous session context for the AI
   */
  private buildPreviousSessionContext(
    previousSessions?: {
      hasHistory: boolean;
      totalSessions: number;
      lastSessionDate?: string;
      lastSessionAccuracy?: number;
      conceptsCovered?: string[];
      conceptsWithMastery?: Array<{
        concept: string;
        mastery: 'introduced' | 'practicing' | 'understood' | 'mastered';
        lastCovered: string;
        timesReviewed: number;
      }>;
      conceptsDueForReview?: string[];
      recommendedStartingPoint?: string;
    },
    masteryLevel?: number
  ): string {
    // New student
    if (!previousSessions?.hasHistory || previousSessions.totalSessions === 0) {
      return `SESSION STATUS: NEW STUDENT
This is their first time studying this topic.
- Start from the basics
- Build understanding step by step
- This truly is a fresh start`;
    }

    // Returning student - build comprehensive context
    const lines: string[] = [];
    lines.push(`SESSION STATUS: RETURNING STUDENT`);
    lines.push(`- ${previousSessions.totalSessions} previous session(s) on this topic`);
    lines.push(`- Current mastery: ${masteryLevel ?? 0}%`);
    
    if (previousSessions.lastSessionDate) {
      const lastDate = new Date(previousSessions.lastSessionDate);
      const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      lines.push(`- Last studied: ${daysSince === 0 ? 'Today' : daysSince === 1 ? 'Yesterday' : `${daysSince} days ago`}`);
    }

    if (previousSessions.lastSessionAccuracy !== undefined) {
      lines.push(`- Last session accuracy: ${previousSessions.lastSessionAccuracy}%`);
    }

    // Add concept mastery details if available
    if (previousSessions.conceptsWithMastery && previousSessions.conceptsWithMastery.length > 0) {
      lines.push('');
      lines.push('CONCEPT PROGRESS:');
      
      const masteredConcepts = previousSessions.conceptsWithMastery.filter(c => c.mastery === 'mastered');
      const understoodConcepts = previousSessions.conceptsWithMastery.filter(c => c.mastery === 'understood');
      const practicingConcepts = previousSessions.conceptsWithMastery.filter(c => c.mastery === 'practicing');
      const introducedConcepts = previousSessions.conceptsWithMastery.filter(c => c.mastery === 'introduced');
      
      if (masteredConcepts.length > 0) {
        lines.push(`✓ Mastered: ${masteredConcepts.map(c => c.concept).join(', ')}`);
      }
      if (understoodConcepts.length > 0) {
        lines.push(`◐ Understood: ${understoodConcepts.map(c => c.concept).join(', ')}`);
      }
      if (practicingConcepts.length > 0) {
        lines.push(`○ Still practicing: ${practicingConcepts.map(c => c.concept).join(', ')}`);
      }
      if (introducedConcepts.length > 0) {
        lines.push(`• Recently introduced: ${introducedConcepts.map(c => c.concept).join(', ')}`);
      }
    } else if (previousSessions.conceptsCovered && previousSessions.conceptsCovered.length > 0) {
      lines.push('');
      lines.push(`Previously covered: ${previousSessions.conceptsCovered.join(', ')}`);
    }

    // Add spaced repetition due concepts
    if (previousSessions.conceptsDueForReview && previousSessions.conceptsDueForReview.length > 0) {
      lines.push('');
      lines.push(`REVIEW NEEDED: ${previousSessions.conceptsDueForReview.join(', ')}`);
    }

    // Add recommended starting point
    if (previousSessions.recommendedStartingPoint) {
      lines.push('');
      if (previousSessions.recommendedStartingPoint === 'continue_new_material') {
        lines.push('RECOMMENDED: Continue with new material (previous concepts well-understood)');
      } else {
        lines.push(`START WITH: "${previousSessions.recommendedStartingPoint}" (needs reinforcement)`);
      }
    }

    return lines.join('\n');
  }
}

export const topicRecommenderService = new TopicRecommenderService();

