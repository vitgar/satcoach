/**
 * Guided Chat Service
 * 
 * Provides conversational tutoring for guided review sessions.
 * Can embed practice questions inline in the conversation.
 */

import { openaiService, ChatMessage } from './openai.service';
import { topicRecommenderService } from './topicRecommender.service';

export type ConceptMasteryLevel = 'introduced' | 'practicing' | 'understood' | 'mastered';

export interface ConceptWithMastery {
  concept: string;
  mastery: ConceptMasteryLevel;
  lastCovered: string; // ISO date string
  timesReviewed: number;
}

export interface PreviousSessionsContext {
  hasHistory: boolean;
  totalSessions: number;
  lastSessionDate?: string;
  lastSessionAccuracy?: number;
  conceptsCovered?: string[]; // Legacy - simple list
  conceptsWithMastery?: ConceptWithMastery[]; // Enhanced - with mastery tracking
  conceptsDueForReview?: string[]; // Concepts needing spaced repetition review
  recommendedStartingPoint?: string; // Where to resume teaching
}

export interface IntelligentSelectionContext {
  isReturningStudent: boolean;
  daysAway: number;
  previousConceptsCovered: string[];
  conceptsNeedingWork: string[];
  recommendedApproach: string;
  difficultyAdjustment: 'easier' | 'standard' | 'challenging';
}

export interface SessionContext {
  subject: string;
  topic: string;
  studentLevel: number;
  learningStyle?: 'visual' | 'verbal' | 'procedural' | 'conceptual' | 'mixed';
  weakAreas?: string[];
  masteryLevel?: number;
  chatHistory?: ChatMessage[];
  questionsAttempted?: number;
  questionsCorrect?: number;
  previousSessions?: PreviousSessionsContext;
  // Enhanced context from intelligent topic selection
  aiContext?: IntelligentSelectionContext;
  selectionReason?: string;
  focusAreas?: string[];
}

export interface EmbeddedQuestion {
  id: string;
  text: string;
  options: { label: string; text: string }[];
  correctAnswer: string;
  explanation: string;
}

export interface PolygonPoint {
  x: number;
  y: number;
  label?: string;
  labelOffset?: { x?: number; y?: number };
}

export interface PolygonConfig {
  points: PolygonPoint[];
  extraLines?: Array<{ from: number; to: number; dashed?: boolean }>;
  angleLabels?: Array<{
    text: string;
    atVertex?: string;
    x?: number;
    y?: number;
    radialOffset?: number;
  }>;
  sideLabels?: Array<{
    text: string;
    onSide?: [string, string];
    x?: number;
    y?: number;
  }>;
  strokeColor?: string;
  fillColor?: string;
  width?: number;
  height?: number;
}

export interface RectangleConfig {
  rows: number;
  cols: number;
  shadedCells: number[];
  shadedColor?: string;
  emptyColor?: string;
  outlineColor?: string;
  caption?: string;
}

// Annotation for highlighting specific points on graphs (e.g., y-intercept, vertex)
export interface GraphPointAnnotation {
  x: number;
  y: number;
  label?: string;
  color?: string;
}

export interface GraphData {
  type: 'line' | 'bar' | 'scatter' | 'pie' | 'area' | 'histogram' | 'polygon' | 'fraction-rectangle';
  data?: Array<Record<string, number | string>>;
  config?: {
    title?: string;
    xLabel?: string;
    yLabel?: string;
    xDomain?: [number, number];
    yDomain?: [number, number];
    showGrid?: boolean;
    showLegend?: boolean;
    dataKeys?: string[];
    xKey?: string;
    yKey?: string;
    polygonConfig?: PolygonConfig;
    rectangleConfig?: RectangleConfig;
    annotations?: GraphPointAnnotation[]; // For highlighting specific points
  };
}

export interface GuidedChatResponse {
  response: string;
  embeddedQuestion: EmbeddedQuestion | null;
  conceptsCovered: string[];
  suggestedFollowUp: string | null;
  graph?: GraphData | null;
}

export interface SessionSummary {
  summary: string;
  conceptsMastered: string[];
  conceptsNeedingWork: string[];
  recommendedNextSteps: string[];
  overallProgress: string;
}

const GUIDED_REVIEW_SYSTEM_PROMPT = `You are an expert SAT tutor conducting a guided review session.

CONTEXT:
- Subject: {subject}
- Topic: {topic}
- Student Level: {level}/10
- Weak Areas: {weakAreas}
- Learning Style: {learningStyle}

SESSION MEMORY:
{sessionMemory}

YOUR GOALS:
1. Help the student understand concepts they're struggling with
2. Present practice questions when appropriate to check understanding
3. Build confidence through scaffolded learning
4. Identify gaps and misconceptions
5. Use visual aids (graphs) when they would enhance understanding

QUESTION PRESENTATION:
When you want to present a practice question to check understanding, use this EXACT format:

<question>
{
  "text": "Question text here",
  "options": [
    {"label": "A", "text": "Option A text"},
    {"label": "B", "text": "Option B text"},
    {"label": "C", "text": "Option C text"},
    {"label": "D", "text": "Option D text"}
  ],
  "correctAnswer": "A",
  "explanation": "Brief explanation of why A is correct"
}
</question>

IMPORTANT: Only include a question when it genuinely helps check understanding or reinforce a concept. 
Do NOT ask a question on every response. Questions should feel natural, not forced.
Good times for questions: after explaining a concept, when the student seems ready, or when they ask to practice.
Bad times for questions: when the student asks a clarifying question, when explaining a new sub-concept.

GRAPH/VISUAL PRESENTATION:
When a visual would help explain a concept, use this EXACT format:

<graph>
{
  "type": "quadratic",
  "a": 1,
  "b": 0,
  "c": -4,
  "title": "y = x² - 4"
}
</graph>

Available graph types:
- "quadratic": Parabola. Params: a (coefficient), b, c for y = ax² + bx + c
- "linear": Line. Params: m (slope), b (y-intercept) for y = mx + b
- "absolute": Absolute value. Params: a, h, k for y = a|x - h| + k
- "exponential": Exponential. Params: base for y = base^x
- "bar": Bar chart for categorical/frequency data. Params: data array with {category, value}, xLabel, yLabel
- "histogram": Histogram for distributions. Params: data array with {bin, frequency}, xLabel, yLabel
- "scatter": Scatter plot for data points. Params: data array with {x, y}, xLabel, yLabel
- "number-line": Data points on a number line. Params: values array of numbers, annotations for mean/median/mode
- "pie": Pie chart for proportions. Params: data array with {name, value}
- "polygon": Geometric shapes (triangles, angles, quadrilaterals). Use ONLY for geometry topics.
- "fraction-rectangle": Visual fraction representation with shaded cells. Use for fraction topics.

CRITICAL - TOPIC-APPROPRIATE VISUALS (MUST FOLLOW):
- STATISTICS (mean, median, mode, distributions, data analysis): Use "bar", "histogram", "scatter", or "number-line"
- GEOMETRY (triangles, angles, shapes, circles): Use "polygon"
- ALGEBRA (functions, equations, graphs): Use "quadratic", "linear", "absolute", "exponential"
- FRACTIONS: Use "fraction-rectangle"
- PROPORTIONS/PERCENTAGES: Use "pie"
- DO NOT use "polygon" for statistics - polygons are for geometric shapes only!
- DO NOT use line graphs for discrete data points - use bar or scatter instead.

CRITICAL: JSON does NOT support comments. Never include // comments in graph JSON.

Example for STATISTICS (mean, median, mode):
<graph>
{
  "type": "bar",
  "title": "Frequency Distribution",
  "data": [
    {"category": "1", "value": 2},
    {"category": "2", "value": 3},
    {"category": "3", "value": 5},
    {"category": "4", "value": 1}
  ],
  "xLabel": "Value",
  "yLabel": "Frequency"
}
</graph>

For GEOMETRY topics (angles, triangles, circles, etc.), use "polygon" type.
IMPORTANT: Coordinates must be in 0-100 range (the viewBox is 100x100).
Example right triangle:
<graph>
{
  "type": "polygon",
  "title": "Right Triangle",
  "polygonConfig": {
    "points": [
      {"x": 20, "y": 80, "label": "A"},
      {"x": 80, "y": 80, "label": "B"},
      {"x": 20, "y": 20, "label": "C"}
    ],
    "angleLabels": [{"text": "90°", "atVertex": "A", "radialOffset": 12}],
    "sideLabels": [{"text": "base", "onSide": ["A", "B"]}],
    "strokeColor": "#2563eb",
    "fillColor": "#dbeafe"
  }
}
</graph>

Example showing angles:
<graph>
{
  "type": "polygon",
  "title": "Acute vs Obtuse Angles",
  "polygonConfig": {
    "points": [
      {"x": 50, "y": 50, "label": "O"},
      {"x": 90, "y": 50, "label": "A"},
      {"x": 70, "y": 20, "label": "B"},
      {"x": 30, "y": 80, "label": "C"}
    ],
    "extraLines": [
      {"from": 0, "to": 1},
      {"from": 0, "to": 2},
      {"from": 0, "to": 3}
    ],
    "angleLabels": [
      {"text": "Acute", "x": 72, "y": 40},
      {"text": "Obtuse", "x": 38, "y": 62}
    ],
    "strokeColor": "#2563eb",
    "fillColor": "transparent"
  }
}
</graph>

For FRACTION topics, use "fraction-rectangle" type like this:
<graph>
{
  "type": "fraction-rectangle",
  "title": "3/4 Shaded",
  "rectangleConfig": {
    "rows": 1,
    "cols": 4,
    "shadedCells": [0, 1, 2],
    "caption": "Three-fourths shaded"
  }
}
</graph>

VISUAL GUIDELINES (CRITICAL - MUST FOLLOW):
If you mention a visual, you MUST include a <graph> tag IMMEDIATELY after. No exceptions.

FORBIDDEN PHRASES (if you use these, you MUST follow with a <graph> tag):
- "Here's a visual representation"
- "Let me show you"
- "Here's a diagram"
- "Notice in this image"
- "As you can see"

RULE: If your response mentions showing/displaying something visual, the <graph> tag MUST be in the same response.
If you cannot include a graph, DO NOT mention that you're showing one.

FOR GEOMETRY (triangles, angles, shapes) - use "polygon" type:
<graph>{"type": "polygon", "title": "Scalene Triangle", "polygonConfig": {"points": [{"x": 15, "y": 75, "label": "A"}, {"x": 85, "y": 80, "label": "B"}, {"x": 55, "y": 15, "label": "C"}], "sideLabels": [{"text": "a", "onSide": ["B", "C"]}, {"text": "b", "onSide": ["A", "C"]}, {"text": "c", "onSide": ["A", "B"]}], "strokeColor": "#2563eb", "fillColor": "#dbeafe"}}</graph>

CORRECT pattern:
"A scalene triangle has all different side lengths.
<graph>{"type": "polygon", ...full JSON here...}</graph>
Notice how sides a, b, and c all have different lengths."

WRONG pattern (ABSOLUTELY FORBIDDEN):
"Here's a visual representation of a scalene triangle:
[NO graph tag, just continues talking]"
This is WRONG because you mentioned showing something but didn't include the <graph> tag.

TEACHING FLOW AND PACING:
You are the guide. The student should NOT have to decide what to learn next.

1. ONE CONCEPT PER RESPONSE: Explain ONE thing, show its visual, verify understanding. Do NOT cover multiple concepts in one response.

2. COMPLETE BEFORE ADVANCING: Do not move to a new concept until the current one is understood.
   - If student says "go on" or "continue" → They understood, move to the NEXT related concept (not skip ahead)
   - If student seems confused → Reteach with a different approach or analogy

3. SMOOTH TRANSITIONS: Always connect concepts before introducing the next one.
   GOOD: "Now that you understand equilateral triangles (all sides equal), let's look at what happens when only TWO sides are equal. This is called an isosceles triangle."
   BAD: "Great! Now let's talk about the Pythagorean theorem." (unrelated jump)

4. PROGRESSIVE DIFFICULTY: Follow a logical learning path within the topic.
   For triangles: Basic types → Properties → Angle relationships → Special triangles → Theorems
   Do NOT jump from "types of triangles" directly to "Pythagorean theorem"

5. UNDERSTANDING CHECKS: After each concept, verify with a SPECIFIC question (not opinion-based).
   GOOD: "In an isosceles triangle, if the two equal sides are 5cm each, what can you tell me about the angles opposite those sides - are they equal or different?"
   BAD: "What do you think about isosceles triangles?"

6. FEYNMAN TECHNIQUE: Explain as if teaching a 12-year-old. Use analogies and everyday examples.

7. IDENTIFY MISCONCEPTIONS: When student gives wrong answer, correct it directly and explain why.

8. MAINTAIN FLOW: Keep the student engaged - not too easy (boredom), not too hard (anxiety).

INTERACTIVE LEARNING PATTERNS (for efficient learning):

1. START SESSIONS WITH A QUESTION, NOT A LECTURE
   GOOD: "What do you already know about linear equations?"
   GOOD: "Have you worked with equations like y = 2x + 1 before?"
   BAD: "Welcome! Linear equations represent relationships between variables..."
   This tells you where to begin and engages them immediately.

2. WHEN STUDENT SAYS "NO" OR "I DON'T KNOW" - START ULTRA-SIMPLE
   When a student says they haven't seen something before or don't know it:
   - Introduce ONLY ONE concept at a time (not 4 variables at once!)
   - Use flowing sentences, NEVER bullet points
   - Show a visual FIRST, then explain what they're seeing
   - Ask an OBSERVATION question (what do you notice?) before asking conceptual questions
   
   WRONG approach (too much at once, bullet-point style):
   "y = mx + b, where:
   • y is the output
   • m is the slope
   • x is the input
   • b is the y-intercept
   The slope tells us how much y changes..."
   
   RIGHT approach (one concept, conversational):
   "No worries! Let me show you something first.
   [graph of y = 2x + 1]
   This is what a linear equation looks like when you graph it - just a straight line.
   Looking at this line, does it go up, down, or stay flat as you move right?"
   
   After they answer that simple observation, THEN you can introduce "slope" as the name for what they noticed.

3. ASK OBSERVATION QUESTIONS BEFORE CONCEPTUAL QUESTIONS
   WRONG order: "What does the slope tell us about the line's behavior?" (conceptual - requires prior knowledge)
   RIGHT order: "Looking at this graph, what do you notice about the line?" (observation - anyone can answer)
   
   Scaffold from observation → vocabulary → deeper understanding:
   1. "What do you see? Does the line go up or down?"
   2. "That upward direction has a name - it's called a positive slope."
   3. "Now, what do you think slope means based on what you just observed?"

4. USE THE EXPLAIN → CHECK → CONFIRM CYCLE
   - Explain ONE concept briefly (2-3 sentences max, NO bullet points)
   - Ask a SPECIFIC question to check understanding
   - Confirm or correct based on their answer
   - Only then move to the next concept

5. GUIDE DISCOVERY OVER TELLING
   BAD: "The slope tells us the line rises 2 units for every 1 unit right."
   GOOD: "Look at the graph. When x goes from 0 to 1, what happens to y?"
   Let students discover insights - they remember what they figure out.

6. WHEN STUDENT IS WRONG - UNDERSTAND FIRST
   - Don't immediately say "That's incorrect"
   - Ask: "Walk me through how you got that" or "What was your thinking?"
   - Then address the SPECIFIC misconception, not just give the right answer

7. WHEN STUDENT GIVES A SHORT CORRECT ANSWER - PROBE DEEPER
   A one-word or short correct answer does NOT mean deep understanding. They might be guessing or pattern-matching.
   
   WRONG approach:
   Student: "3" (for slope)
   AI: "That's right! The slope is 3, which means..." (explains everything for them, moves on)
   
   RIGHT approach:
   Student: "3" (for slope)
   AI: "Good! And what does that 3 actually tell you about how the line behaves?"
   
   SHORT ANSWER FOLLOW-UPS (use these before moving on):
   - "Right! And why do you think that is?"
   - "Good! Can you explain what that means in your own words?"
   - "Correct! How did you figure that out?"
   - "Yes! What does that tell us about [the concept]?"
   
   Only move to the next concept AFTER the student demonstrates they understand the WHY, not just the WHAT.

8. GIVE SPECIFIC PRAISE, NOT GENERIC
   BAD: "Great job!" "Correct!"
   GOOD: "Exactly! You recognized that b in y=mx+b is always the y-intercept."
   Specific praise reinforces WHY they got it right.

9. REQUEST SUMMARIZATION PERIODICALLY
   "Before we move on, can you explain slope in your own words?"
   This uses the Feynman technique - explaining deepens understanding.

10. KEEP IT CONVERSATIONAL AND NATURAL - NO BULLET POINTS
   ABSOLUTELY FORBIDDEN in explanations:
   - Bullet points (•) or numbered lists when explaining concepts
   - "where: [list of definitions]" format
   - Any textbook-style formatting
   
   BAD (bullet-point textbook style):
   "The equation y = mx + b has four parts:
   • y is the output
   • m is the slope
   • x is the input
   • b is the y-intercept"
   
   GOOD (flowing conversational prose):
   "Think of it this way - y = mx + b. The 'm' is your slope, that's how steep the line is. The 'b' is where your line starts on the y-axis, we call that the y-intercept."
   
   Always write as if you're SPEAKING to a student, not writing a textbook.

RESPONSE STRUCTURE:
Every teaching response should follow this pattern:
1. Brief connection to previous concept (if applicable)
2. Explain ONE new concept simply (2-3 sentences max)
3. Show the visual (if applicable) - INLINE, not referenced
4. Quick observation about the visual
5. Understanding check OR smooth transition to next concept

BAD patterns (NEVER do these):
- "What do you think about this?" (too vague)
- "Do you have a preference?" (puts burden on student)
- "Would you like to explore...?" (makes student decide)
- "Any questions?" (passive, ends momentum)
- Covering 3+ concepts in one response
- Jumping from basic concepts to advanced theorems

GOOD patterns (use these):
- "Let me show you exactly what this looks like." [then show visual]
- "Now that you understand X, here's how it connects to Y."
- "Quick check: [specific factual question about the concept]"
- "Notice how [observation]. This is important because..."
- "Let's see this in action with an example."

TONE GUIDELINES:
- Sound like a friendly, patient human tutor - not a textbook
- Use contractions (don't, let's, here's, that's)
- Use casual phrases ("So basically...", "Here's the thing...", "Think of it like...")
- Avoid formal phrases ("It is important to note that...", "fundamentally...", "Let us examine...")
- Be encouraging but not over-the-top ("Nice!" not "Excellent work! I'm so proud!")

FORBIDDEN PHRASES (never use these - they sound robotic):
- "I'm excited to..." / "Let's embark on..." / "our journey"
- "This is fundamental..." / "This topic is crucial..." / "It's important to understand..."
- "Let's dive right in!" / "Let's explore..." / "Let's delve into..."
- "Absolutely!" / "Certainly!" / "Of course!"
- "Welcome! I'm excited to start..."
- Any phrase that sounds like a textbook or corporate training video

RESPONSE GUIDELINES:
- Keep responses focused and concise (under 150 words)
- Use simple language appropriate for the student's level
- Include concrete examples, not abstract descriptions
- Show ONE visual per concept, INLINE with the explanation
- End with a DIRECTIVE statement that moves the lesson forward
- If the student says they don't know much, show visual FIRST, then explain ONE concept
- If student says "go on" or similar, treat as confirmation and continue to the next logical concept
- NEVER use bullet points or numbered lists to explain concepts - use flowing sentences
- When introducing new topics, ask OBSERVATION questions ("what do you notice?") before CONCEPTUAL questions ("what does slope mean?")

FORMATTING RULES (CRITICAL):
- NO bullet points (•) in teaching explanations
- NO numbered lists (1. 2. 3.) when defining terms
- NO "where:" followed by a list of definitions
- Write in SENTENCES, like you're talking to a friend
- It's okay to use a short list when listing STEPS to solve a problem, but NOT for definitions

WHEN STUDENT IS STUCK OR SAYS "I DON'T KNOW" (HELP THEM DISCOVER THE ANSWER):
Sometimes students don't know where to start. Use these scaffolding strategies BEFORE giving the answer:

a) OFFER CHOICES - Convert open questions to multiple choice:
   STUCK ON: "What is the slope?"
   HELP WITH: "Looking at the line, do you think the slope is: positive (going up), negative (going down), or zero (flat)?"

b) GIVE A HINT - Point to something specific:
   "Here's a clue: look at the red dot on the graph. What number is it at on the y-axis?"

c) SENTENCE STARTER - Give them words to complete:
   "Try finishing this thought: 'When x goes up by 1, y goes ___ by ___'"

d) MODEL FIRST - Show one example, then have them try:
   "Let me show you with one point. At x=0, y=1. Now you try: at x=1, what would y be?"

e) BREAK INTO STEPS - Decompose the question:
   "Let's take it piece by piece. First, what is 2 times 1?"

The goal is to GUIDE them to discover the answer, not just tell them. Only give the answer if they're still stuck after 2-3 scaffolding attempts.

MATHEMATICAL ACCURACY (CRITICAL - AVOID CONFUSING ERRORS):
ALWAYS ensure your examples match the equation you're currently discussing.

WRONG: You're discussing y = 2x + 1, then you say "start at (0, 0) and move to (1, 2)"
- This is WRONG because y = 2x + 1 passes through (0, 1), NOT (0, 0)!
- Students will be confused when your example doesn't match the graph.

RIGHT: "Start at the y-intercept (0, 1). Move right 1 unit to x=1, and up 2 units to y=3. So the next point is (1, 3)."

If you want to use a simpler equation (like y = 2x through the origin), EXPLICITLY switch:
"Let's use a simpler example first: y = 2x. This one goes through the origin (0, 0), so if we start there and go right 1 unit..."

NEVER mix up which equation you're discussing. Double-check your arithmetic matches your equation.`;


export class GuidedChatService {
  /**
   * Generate a response for the guided review chat
   */
  async generateGuidedResponse(
    userMessage: string,
    context: SessionContext
  ): Promise<GuidedChatResponse> {
    const systemPrompt = this.buildSystemPrompt(context);
    
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add chat history if provided
    if (context.chatHistory && context.chatHistory.length > 0) {
      messages.push(...context.chatHistory.slice(-8)); // Last 8 messages for context
    }

    // Add current user message
    messages.push({ role: 'user', content: userMessage });

    try {
      const rawResponse = await openaiService.generateChatCompletion({
        messages,
        temperature: 0.7,
        maxTokens: 1200,
      });

      // Parse response for embedded questions and graphs
      const { cleanResponse, embeddedQuestion } = this.parseQuestionFromResponse(rawResponse);
      const { finalResponse, graph } = this.parseGraphFromResponse(cleanResponse);

      // Clean up any broken visual references (AI mentioned showing but didn't include graph)
      const cleanedResponse = this.cleanBrokenVisualReferences(finalResponse, graph);

      // Extract concepts mentioned in the response
      const conceptsCovered = this.extractConcepts(cleanedResponse, context.topic);

      // Generate a follow-up suggestion if appropriate
      const suggestedFollowUp = this.generateFollowUpSuggestion(cleanedResponse, context);

      return {
        response: cleanedResponse,
        embeddedQuestion,
        conceptsCovered,
        suggestedFollowUp,
        graph,
      };
    } catch (error: any) {
      console.error('[GuidedChat] Error generating response:', error);
      throw new Error(`Failed to generate guided response: ${error.message}`);
    }
  }

  /**
   * Generate an introduction message when starting a topic
   */
  async generateTopicIntroduction(context: SessionContext): Promise<GuidedChatResponse> {
    const introduction = await topicRecommenderService.generateTopicIntroduction(
      context.topic,
      context.subject,
      {
        level: context.studentLevel,
        learningStyle: context.learningStyle,
      },
      context.masteryLevel || 0,
      context.previousSessions
    );

    // Check if the introduction contains a graph request
    const { finalResponse, graph } = this.parseGraphFromResponse(introduction);

    // Clean up any broken visual references
    const cleanedResponse = this.cleanBrokenVisualReferences(finalResponse, graph);

    return {
      response: cleanedResponse,
      embeddedQuestion: null,
      conceptsCovered: [context.topic],
      suggestedFollowUp: null,
      graph,
    };
  }

  /**
   * Generate a response for when a student answers an embedded question
   */
  async generateQuestionFeedback(
    studentAnswer: string,
    question: EmbeddedQuestion,
    isCorrect: boolean,
    context: SessionContext
  ): Promise<GuidedChatResponse> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an SAT tutor providing feedback on a practice question.
Be encouraging regardless of whether the answer is correct or not.
If incorrect, explain the mistake without being discouraging.
Keep feedback concise (2-3 sentences) and offer to explain further if needed.`
      },
      {
        role: 'user',
        content: `The student answered "${studentAnswer}" to this question:

Question: ${question.text}
Options: ${question.options.map(o => `${o.label}) ${o.text}`).join(', ')}
Correct Answer: ${question.correctAnswer}
Student's Answer: ${studentAnswer}
Is Correct: ${isCorrect}

${question.explanation}

Provide brief, encouraging feedback. If they got it wrong, explain why in a supportive way.`
      },
    ];

    try {
      const response = await openaiService.generateChatCompletion({
        messages,
        temperature: 0.7,
        maxTokens: 200,
      });

      return {
        response,
        embeddedQuestion: null,
        conceptsCovered: this.extractConcepts(response, context.topic),
        suggestedFollowUp: isCorrect 
          ? 'Want to try another question or explore a related concept?'
          : 'Would you like me to explain this concept in more detail?',
      };
    } catch (error: any) {
      console.error('[GuidedChat] Error generating feedback:', error);
      
      // Fallback feedback
      const fallback = isCorrect
        ? `Great job! ${question.correctAnswer} is correct. ${question.explanation}`
        : `Not quite - the correct answer is ${question.correctAnswer}. ${question.explanation} Would you like to try another one?`;

      return {
        response: fallback,
        embeddedQuestion: null,
        conceptsCovered: [],
        suggestedFollowUp: null,
      };
    }
  }

  /**
   * Generate a session summary when ending the guided review
   */
  async generateSessionSummary(context: SessionContext & {
    questionsAttempted: number;
    questionsCorrect: number;
    conceptsCovered: string[];
    sessionDurationMinutes: number;
  }): Promise<SessionSummary> {
    const accuracy = context.questionsAttempted > 0
      ? Math.round((context.questionsCorrect / context.questionsAttempted) * 100)
      : 0;

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an SAT tutor summarizing a guided review session.
Provide a brief, encouraging summary that:
1. Acknowledges their effort
2. Highlights what they did well
3. Identifies areas for continued focus
4. Suggests next steps

Return a JSON object with the summary.`
      },
      {
        role: 'user',
        content: `Summarize this guided review session:

Topic: ${context.topic}
Subject: ${context.subject}
Duration: ${context.sessionDurationMinutes} minutes
Questions Attempted: ${context.questionsAttempted}
Questions Correct: ${context.questionsCorrect}
Accuracy: ${accuracy}%
Concepts Covered: ${context.conceptsCovered.join(', ') || 'General review'}
Weak Areas Going In: ${context.weakAreas?.join(', ') || 'None identified'}

Return JSON: {
  "summary": "2-3 sentence summary",
  "conceptsMastered": ["concepts they showed strong understanding of"],
  "conceptsNeedingWork": ["concepts that need more practice"],
  "recommendedNextSteps": ["1-2 specific next steps"],
  "overallProgress": "encouraging statement about progress"
}`
      },
    ];

    try {
      const response = await openaiService.generateStructuredData<SessionSummary>({
        messages,
        temperature: 0.7,
        maxTokens: 400,
      }, {
        name: 'generate_session_summary',
        description: 'Generate a session summary for guided review',
        parameters: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            conceptsMastered: { type: 'array', items: { type: 'string' } },
            conceptsNeedingWork: { type: 'array', items: { type: 'string' } },
            recommendedNextSteps: { type: 'array', items: { type: 'string' } },
            overallProgress: { type: 'string' },
          },
          required: ['summary', 'conceptsMastered', 'conceptsNeedingWork', 'recommendedNextSteps', 'overallProgress'],
        },
      });

      return response;
    } catch (error: any) {
      console.error('[GuidedChat] Error generating summary:', error);
      
      // Fallback summary
      return {
        summary: `You spent ${context.sessionDurationMinutes} minutes reviewing ${context.topic} and answered ${context.questionsCorrect} of ${context.questionsAttempted} questions correctly.`,
        conceptsMastered: accuracy >= 70 ? [context.topic] : [],
        conceptsNeedingWork: accuracy < 70 ? [context.topic] : [],
        recommendedNextSteps: [`Continue practicing ${context.topic}`, 'Try related topics'],
        overallProgress: 'Keep up the good work! Consistent practice leads to improvement.',
      };
    }
  }

  // Private helper methods

  private buildSystemPrompt(context: SessionContext): string {
    const sessionMemory = this.buildSessionMemoryContext(context);
    
    return GUIDED_REVIEW_SYSTEM_PROMPT
      .replace('{subject}', context.subject)
      .replace('{topic}', context.topic)
      .replace('{level}', String(context.studentLevel))
      .replace('{weakAreas}', context.weakAreas?.join(', ') || 'None identified')
      .replace('{learningStyle}', context.learningStyle || 'mixed')
      .replace('{sessionMemory}', sessionMemory);
  }

  /**
   * Build session memory context string for the AI
   */
  private buildSessionMemoryContext(context: SessionContext): string {
    const prev = context.previousSessions;
    
    if (!prev?.hasHistory) {
      return `This is a NEW STUDENT for this topic. Start from the basics.
- No previous sessions on this topic
- Begin with foundational concepts
- Build understanding step by step`;
    }

    const lines: string[] = [];
    lines.push(`RETURNING STUDENT - ${prev.totalSessions} previous session(s) on this topic`);
    
    if (prev.lastSessionDate) {
      const lastDate = new Date(prev.lastSessionDate);
      const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      lines.push(`- Last studied: ${daysSince === 0 ? 'Today' : daysSince === 1 ? 'Yesterday' : `${daysSince} days ago`}`);
    }

    if (prev.lastSessionAccuracy !== undefined) {
      lines.push(`- Last session accuracy: ${prev.lastSessionAccuracy}%`);
    }

    // Add concept mastery details
    if (prev.conceptsWithMastery && prev.conceptsWithMastery.length > 0) {
      lines.push('');
      lines.push('CONCEPT MASTERY STATUS:');
      
      const masteredConcepts = prev.conceptsWithMastery.filter(c => c.mastery === 'mastered');
      const understoodConcepts = prev.conceptsWithMastery.filter(c => c.mastery === 'understood');
      const practicingConcepts = prev.conceptsWithMastery.filter(c => c.mastery === 'practicing');
      const introducedConcepts = prev.conceptsWithMastery.filter(c => c.mastery === 'introduced');
      
      if (masteredConcepts.length > 0) {
        lines.push(`- Mastered: ${masteredConcepts.map(c => c.concept).join(', ')}`);
      }
      if (understoodConcepts.length > 0) {
        lines.push(`- Understood: ${understoodConcepts.map(c => c.concept).join(', ')}`);
      }
      if (practicingConcepts.length > 0) {
        lines.push(`- Still practicing: ${practicingConcepts.map(c => c.concept).join(', ')}`);
      }
      if (introducedConcepts.length > 0) {
        lines.push(`- Recently introduced: ${introducedConcepts.map(c => c.concept).join(', ')}`);
      }
    }

    // Add spaced repetition due concepts
    if (prev.conceptsDueForReview && prev.conceptsDueForReview.length > 0) {
      lines.push('');
      lines.push(`CONCEPTS DUE FOR REVIEW (spaced repetition): ${prev.conceptsDueForReview.join(', ')}`);
      lines.push('  → Integrate a brief review of these during the lesson');
    }

    // Add recommended starting point
    if (prev.recommendedStartingPoint) {
      lines.push('');
      if (prev.recommendedStartingPoint === 'continue_new_material') {
        lines.push('RECOMMENDED: Continue with new material (all previous concepts are well-understood)');
      } else {
        lines.push(`RECOMMENDED STARTING POINT: "${prev.recommendedStartingPoint}"`);
        lines.push('  → Begin the lesson by reviewing or strengthening this concept');
      }
    }

    // Add intelligent selection context
    if (context.aiContext) {
      lines.push('');
      lines.push('AI TUTOR APPROACH (from intelligent topic selection):');
      if (context.selectionReason) {
        lines.push(`- Why this topic: ${context.selectionReason}`);
      }
      if (context.aiContext.recommendedApproach) {
        lines.push(`- Recommended approach: ${context.aiContext.recommendedApproach}`);
      }
      if (context.focusAreas && context.focusAreas.length > 0) {
        lines.push(`- Focus areas: ${context.focusAreas.join(', ')}`);
      }
      if (context.aiContext.difficultyAdjustment === 'easier') {
        lines.push('- Difficulty: EASIER - Use simpler examples, more scaffolding, celebrate small wins');
      } else if (context.aiContext.difficultyAdjustment === 'challenging') {
        lines.push('- Difficulty: CHALLENGING - Student is ready for harder problems and deeper concepts');
      }
      if (context.aiContext.conceptsNeedingWork.length > 0) {
        lines.push(`- Concepts needing work: ${context.aiContext.conceptsNeedingWork.join(', ')}`);
      }
    }

    // Add instructions for using this memory
    lines.push('');
    lines.push('HOW TO USE THIS MEMORY:');
    lines.push('1. Acknowledge the student\'s progress ("Welcome back! Last time we covered...")');
    lines.push('2. Start from their recommended starting point, not from scratch');
    lines.push('3. Naturally review concepts that are due for spaced repetition');
    lines.push('4. Build on mastered concepts, reinforce ones still practicing');
    lines.push('5. Check if they remember key concepts before building on them');
    lines.push('6. Apply the recommended approach from the AI tutor guidance');

    return lines.join('\n');
  }

  /**
   * Parse embedded question from AI response
   */
  parseQuestionFromResponse(response: string): {
    cleanResponse: string;
    embeddedQuestion: EmbeddedQuestion | null;
  } {
    const questionMatch = response.match(/<question>([\s\S]*?)<\/question>/);

    if (!questionMatch) {
      return { cleanResponse: response.trim(), embeddedQuestion: null };
    }

    // Remove question tag from response
    const cleanResponse = response.replace(/<question>[\s\S]*?<\/question>/g, '').trim();

    try {
      const rawJson = questionMatch[1].trim();
      // Strip JavaScript-style comments that AI sometimes includes
      const questionJson = this.stripJsonComments(rawJson);
      const parsed = JSON.parse(questionJson);

      const embeddedQuestion: EmbeddedQuestion = {
        id: `q_${Date.now()}`,
        text: parsed.text,
        options: parsed.options || [],
        correctAnswer: parsed.correctAnswer,
        explanation: parsed.explanation || '',
      };

      return { cleanResponse, embeddedQuestion };
    } catch (parseError) {
      console.warn('[GuidedChat] Failed to parse question JSON:', parseError);
      // Always remove the question tag even on parse failure to prevent raw JSON in chat
      return { cleanResponse, embeddedQuestion: null };
    }
  }

  /**
   * Strip JavaScript-style comments from JSON string
   * AI sometimes outputs comments like // which break JSON.parse
   */
  private stripJsonComments(json: string): string {
    // Remove single-line comments (// ...) but not inside strings
    return json.replace(/\/\/[^\n\r]*/g, '');
  }

  /**
   * Parse graph request from AI response
   */
  private parseGraphFromResponse(response: string): {
    finalResponse: string;
    graph: GraphData | null;
  } {
    const graphMatch = response.match(/<graph>([\s\S]*?)<\/graph>/);

    if (!graphMatch) {
      return { finalResponse: response.trim(), graph: null };
    }

    // Remove graph tag from response
    const finalResponse = response.replace(/<graph>[\s\S]*?<\/graph>/g, '').trim();

    try {
      const rawJson = graphMatch[1].trim();
      // Strip JavaScript-style comments that AI sometimes includes
      const graphJson = this.stripJsonComments(rawJson);
      const parsed = JSON.parse(graphJson);

      const graph = this.generateGraphFromRequest(parsed);
      return { finalResponse, graph };
    } catch (parseError) {
      console.warn('[GuidedChat] Failed to parse graph JSON:', parseError);
      // Always remove the graph tag even on parse failure to prevent raw JSON in chat
      return { finalResponse, graph: null };
    }
  }

  /**
   * Generate graph data from AI's graph request
   */
  private generateGraphFromRequest(request: any): GraphData | null {
    const { type, title } = request;

    // Validate graph type
    const validTypes = [
      'quadratic', 'linear', 'absolute', 'exponential',
      'polygon', 'fraction-rectangle', 'bar', 'histogram',
      'scatter', 'number-line', 'pie'
    ];

    if (!type || !validTypes.includes(type)) {
      console.warn(`[GuidedChat] Invalid or missing graph type: ${type}`);
      return null;
    }

    switch (type) {
      case 'quadratic': {
        const a = request.a ?? 1;
        const b = request.b ?? 0;
        const c = request.c ?? 0;
        const direction = a > 0 ? 'upward' : 'downward';
        // Calculate vertex: x = -b/(2a), y = c - b²/(4a)
        const vertexX = -b / (2 * a);
        const vertexY = c - (b * b) / (4 * a);
        return {
          type: 'line',
          data: this.generateQuadraticData(a, b, c),
          config: {
            title: title || `Quadratic Function (opens ${direction})`,
            xLabel: 'x',
            yLabel: 'y',
            showGrid: true,
            dataKeys: ['y'],
            xDomain: [-5, 5],
            yDomain: a > 0 ? [-5, 15] : [-15, 5],
            // Highlight the vertex and y-intercept
            annotations: [
              {
                x: vertexX,
                y: vertexY,
                label: `Vertex (${vertexX.toFixed(1)}, ${vertexY.toFixed(1)})`,
                color: '#ef4444',
              },
              {
                x: 0,
                y: c,
                label: `(0, ${c})`,
                color: '#2563eb',
              },
            ],
          },
        };
      }

      case 'linear': {
        const m = request.m ?? 1;
        const b = request.b ?? 0;
        return {
          type: 'line',
          data: this.generateLinearData(m, b),
          config: {
            title: title || `Graph of y = ${m}x + ${b}`,
            xLabel: 'x',
            yLabel: 'y',
            showGrid: true,
            dataKeys: ['y'],
            xDomain: [-5, 5],
            yDomain: [-10, 10],
            // Highlight the y-intercept point
            annotations: [
              {
                x: 0,
                y: b,
                label: `(0, ${b})`,
                color: '#ef4444',
              },
            ],
          },
        };
      }

      case 'absolute': {
        const a = request.a ?? 1;
        const h = request.h ?? 0;
        const k = request.k ?? 0;
        return {
          type: 'line',
          data: this.generateAbsoluteValueDataWithParams(a, h, k),
          config: {
            title: title || `Absolute Value Function`,
            xLabel: 'x',
            yLabel: 'y',
            showGrid: true,
            dataKeys: ['y'],
            xDomain: [-6, 6],
            yDomain: [-2, 10],
          },
        };
      }

      case 'exponential': {
        const base = request.base ?? 2;
        return {
          type: 'line',
          data: this.generateExponentialData(base),
          config: {
            title: title || `Exponential Function: y = ${base}^x`,
            xLabel: 'x',
            yLabel: 'y',
            showGrid: true,
            dataKeys: ['y'],
            xDomain: [-3, 4],
            yDomain: [0, 20],
          },
        };
      }

      case 'polygon': {
        // For geometric shapes like angles, triangles, quadrilaterals
        const polygonConfig = request.polygonConfig || {};
        return {
          type: 'polygon',
          config: {
            title: title || 'Geometric Figure',
            polygonConfig: {
              points: polygonConfig.points || [],
              extraLines: polygonConfig.extraLines || [],
              angleLabels: polygonConfig.angleLabels || [],
              sideLabels: polygonConfig.sideLabels || [],
              strokeColor: polygonConfig.strokeColor || '#2563eb',
              fillColor: polygonConfig.fillColor || '#dbeafe',
              width: polygonConfig.width || 300,
              height: polygonConfig.height || 300,
            },
          },
        };
      }

      case 'fraction-rectangle': {
        // For fraction visualizations with shaded cells
        const rectangleConfig = request.rectangleConfig || {};
        return {
          type: 'fraction-rectangle',
          config: {
            title: title || 'Fraction',
            rectangleConfig: {
              rows: rectangleConfig.rows || 1,
              cols: rectangleConfig.cols || 1,
              shadedCells: rectangleConfig.shadedCells || [],
              shadedColor: rectangleConfig.shadedColor || '#c7d2fe',
              emptyColor: rectangleConfig.emptyColor || '#fff',
              outlineColor: rectangleConfig.outlineColor || '#94a3b8',
              caption: rectangleConfig.caption,
            },
          },
        };
      }

      case 'bar': {
        // For frequency distributions, categorical data (statistics)
        return {
          type: 'bar',
          data: request.data || [],
          config: {
            title: title || 'Bar Chart',
            xLabel: request.xLabel || 'Category',
            yLabel: request.yLabel || 'Value',
            showGrid: true,
            dataKeys: request.dataKeys || ['value'],
          },
        };
      }

      case 'histogram': {
        // For frequency distributions (statistics)
        return {
          type: 'histogram',
          data: request.data || [],
          config: {
            title: title || 'Histogram',
            xLabel: request.xLabel || 'Value',
            yLabel: request.yLabel || 'Frequency',
            showGrid: true,
          },
        };
      }

      case 'scatter': {
        // For scatter plots (correlation, data points)
        return {
          type: 'scatter',
          data: request.data || [],
          config: {
            title: title || 'Scatter Plot',
            xLabel: request.xLabel || 'x',
            yLabel: request.yLabel || 'y',
            showGrid: true,
          },
        };
      }

      case 'number-line': {
        // For visualizing data points on a number line (statistics - mean, median, mode)
        const values = request.values || [];
        return {
          type: 'scatter',
          data: values.map((v: number) => ({ x: v, y: 0 })),
          config: {
            title: title || 'Number Line',
            xLabel: 'Value',
            yLabel: '',
            showGrid: true,
            yDomain: [-1, 1] as [number, number],
          },
        };
      }

      case 'pie': {
        // For proportions and percentages
        return {
          type: 'pie',
          data: request.data || [],
          config: {
            title: title || 'Pie Chart',
          },
        };
      }

      default:
        console.warn(`[GuidedChat] Unknown graph type: ${type}`);
        return null;
    }
  }

  /**
   * Generate absolute value data with parameters: y = a|x - h| + k
   */
  private generateAbsoluteValueDataWithParams(a: number, h: number, k: number): Array<{ x: number; y: number }> {
    const data: Array<{ x: number; y: number }> = [];
    for (let x = -5; x <= 5; x += 0.5) {
      data.push({ x, y: a * Math.abs(x - h) + k });
    }
    return data;
  }

  private extractConcepts(response: string, topic: string): string[] {
    const concepts: string[] = [];
    const lowerResponse = response.toLowerCase();

    // Specific sub-concepts by topic area (more granular tracking)
    const geometryTriangleConcepts = [
      'equilateral triangle',
      'isosceles triangle', 
      'scalene triangle',
      'right triangle',
      'acute triangle',
      'obtuse triangle',
      'classification by sides',
      'classification by angles',
      'triangle properties',
      'pythagorean theorem',
      'triangle angles sum',
      'angle relationships',
      'congruent triangles',
      'similar triangles',
      'triangle inequality',
      'hypotenuse',
      'right angle',
      'acute angle',
      'obtuse angle',
    ];

    const algebraConcepts = [
      'linear equation',
      'quadratic equation',
      'slope-intercept form',
      'point-slope form',
      'standard form',
      'vertex form',
      'factoring',
      'completing the square',
      'quadratic formula',
      'systems of equations',
      'substitution method',
      'elimination method',
      'graphing linear equations',
      'slope',
      'y-intercept',
      'x-intercept',
      'parabola',
      'vertex',
      'axis of symmetry',
      'roots',
      'solutions',
    ];

    const dataConcepts = [
      'mean',
      'median',
      'mode',
      'range',
      'standard deviation',
      'scatter plot',
      'line of best fit',
      'correlation',
      'probability',
      'ratio',
      'proportion',
      'percentage',
      'percent change',
    ];

    const readingConcepts = [
      'main idea',
      'central theme',
      'author purpose',
      'author tone',
      'inference',
      'textual evidence',
      'vocabulary in context',
      'passage structure',
      'argument analysis',
      'point of view',
    ];

    const writingConcepts = [
      'subject-verb agreement',
      'pronoun reference',
      'comma usage',
      'semicolon usage',
      'sentence structure',
      'parallel structure',
      'modifier placement',
      'verb tense',
      'transitions',
      'conciseness',
    ];

    // Combine all concept lists
    const allConcepts = [
      ...geometryTriangleConcepts,
      ...algebraConcepts,
      ...dataConcepts,
      ...readingConcepts,
      ...writingConcepts,
    ];

    // Extract concepts mentioned in the response
    for (const concept of allConcepts) {
      if (lowerResponse.includes(concept.toLowerCase()) && !concepts.includes(concept)) {
        concepts.push(concept);
      }
    }

    // Also check for teaching patterns that indicate specific concepts
    // e.g., "An equilateral triangle has..." should extract "equilateral triangle"
    const teachingPatterns = [
      { pattern: /equilateral/i, concept: 'equilateral triangle' },
      { pattern: /isosceles/i, concept: 'isosceles triangle' },
      { pattern: /scalene/i, concept: 'scalene triangle' },
      { pattern: /right\s+(triangle|angle)/i, concept: 'right triangle' },
      { pattern: /acute\s+(triangle|angle)/i, concept: 'acute angle' },
      { pattern: /obtuse\s+(triangle|angle)/i, concept: 'obtuse angle' },
      { pattern: /pythagorean/i, concept: 'pythagorean theorem' },
      { pattern: /90\s*°|90\s*degrees|ninety degrees/i, concept: 'right angle' },
      { pattern: /three equal sides|all sides equal/i, concept: 'equilateral triangle' },
      { pattern: /two equal sides|two sides equal/i, concept: 'isosceles triangle' },
      { pattern: /all sides different|no equal sides/i, concept: 'scalene triangle' },
      { pattern: /classif(y|ied|ication)\s+.*\s+by\s+sides/i, concept: 'classification by sides' },
      { pattern: /classif(y|ied|ication)\s+.*\s+by\s+angles/i, concept: 'classification by angles' },
    ];

    for (const { pattern, concept } of teachingPatterns) {
      if (pattern.test(response) && !concepts.includes(concept)) {
        concepts.push(concept);
      }
    }

    // Always include the main topic if it's not already there
    if (!concepts.includes(topic) && concepts.length < 8) {
      concepts.unshift(topic);
    }

    return concepts.slice(0, 8); // Limit to 8 concepts for tracking granularity
  }

  /**
   * Clean up broken visual references where AI mentions showing a visual but didn't include <graph> tag
   */
  private cleanBrokenVisualReferences(response: string, graph: GraphData | null): string {
    // If a graph was included, the references are valid
    if (graph) {
      return response;
    }

    // Patterns that indicate the AI tried to show something but didn't include a graph
    const brokenVisualPatterns = [
      /here'?s?\s+a\s+visual\s+representation[^.]*:/gi,
      /let\s+me\s+show\s+you[^.]*:/gi,
      /here'?s?\s+(?:a\s+)?(?:the\s+)?(?:diagram|image|figure|visual|graph)[^.]*:/gi,
      /as\s+(?:you\s+can\s+)?see\s+(?:in\s+)?(?:the\s+)?(?:diagram|image|figure|visual)[^.]*:/gi,
      /notice\s+(?:in\s+)?(?:this|the)\s+(?:diagram|image|figure|visual)[^.]*:/gi,
      /here'?s?\s+(?:a\s+)?(?:visual\s+)?representation\s+(?:of|showing)[^.]*:/gi,
    ];

    let cleaned = response;

    for (const pattern of brokenVisualPatterns) {
      // Replace broken references with a clean version that doesn't claim to show something
      cleaned = cleaned.replace(pattern, (match) => {
        console.warn(`[GuidedChat] Removing broken visual reference: "${match}"`);
        return ''; // Remove the broken reference
      });
    }

    // Also clean up standalone lines that just say "Here's a visual:" with nothing after
    cleaned = cleaned.replace(/\n\s*(?:Here'?s?\s+(?:a\s+)?visual[^.]*[.:]\s*)+\n/gi, '\n');
    
    // Clean up double newlines that might result
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    return cleaned.trim();
  }

  private generateFollowUpSuggestion(
    _response: string,
    context: SessionContext
  ): string | null {
    // Generate contextual follow-up based on session state
    const questionsAttempted = context.questionsAttempted || 0;

    if (questionsAttempted === 0) {
      return 'Would you like to try a practice question to test your understanding?';
    }

    if (questionsAttempted > 0 && questionsAttempted % 3 === 0) {
      return 'You\'ve answered a few questions. Want to discuss any concepts or try a different approach?';
    }

    return null;
  }

  /**
   * Generate data points for a quadratic function y = ax² + bx + c
   */
  private generateQuadraticData(a: number, b: number, c: number): Array<{ x: number; y: number }> {
    const data: Array<{ x: number; y: number }> = [];
    for (let x = -4; x <= 4; x += 0.5) {
      data.push({ x, y: a * x * x + b * x + c });
    }
    return data;
  }

  /**
   * Generate data points for a linear function y = mx + b
   */
  private generateLinearData(m: number, b: number): Array<{ x: number; y: number }> {
    const data: Array<{ x: number; y: number }> = [];
    for (let x = -4; x <= 4; x += 1) {
      data.push({ x, y: m * x + b });
    }
    return data;
  }

  /**
   * Generate data points for an exponential function y = base^x
   */
  private generateExponentialData(base: number): Array<{ x: number; y: number }> {
    const data: Array<{ x: number; y: number }> = [];
    for (let x = -2; x <= 4; x += 0.5) {
      data.push({ x, y: Math.pow(base, x) });
    }
    return data;
  }

}

export const guidedChatService = new GuidedChatService();

