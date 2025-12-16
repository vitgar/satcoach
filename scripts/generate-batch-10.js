const fs = require('fs');
const path = require('path');

const baseTimestamp = '2025-01-01T00:00:00.000Z';
const generatedBy = 'manual';
const difficultyScoreMap = {
  easy: 4,
  medium: 6,
  hard: 8,
};

const createSeed = (seed) => seed;
const letters = ['A', 'B', 'C', 'D'];

const formatNumber = (value) => {
  if (typeof value !== 'number') return value;
  if (Number.isInteger(value)) return value.toString();
  return parseFloat(value.toFixed(2)).toString();
};

const makeChoiceSet = (answer, distractors) => {
  const formattedAnswer = formatNumber(answer);
  const uniqueOptions = [formattedAnswer, ...distractors.map((d) => formatNumber(d))]
    .filter((val, idx, arr) => arr.indexOf(val) === idx)
    .slice(0, 4);
  while (uniqueOptions.length < 4) {
    uniqueOptions.push(formatNumber(parseFloat(answer) + uniqueOptions.length));
  }
  const shuffled = [...uniqueOptions];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const correctAnswer = letters[shuffled.indexOf(formattedAnswer)];
  return { options: shuffled, correctAnswer };
};

const buildQuestionSeeds = (params) =>
  params.map(({ questionText, answer, distractors, explanation, difficulty, tags, graph }) => {
    const { options, correctAnswer } = makeChoiceSet(answer, distractors);
    return createSeed({ subject: 'math', difficulty, questionText, options, correctAnswer, explanation, tags, graph });
  });

// Batch 10: Missing SAT Math Topics

const missingTopicsParams = [
  // Radicals/Roots
  {
    questionText: 'Simplify: √(48)',
    answer: '4√3',
    distractors: ['2√12', '6√2', '8√2'],
    explanation: 'Factor 48 = 16 × 3, so √48 = √16 × √3 = 4√3.',
    difficulty: 'easy',
    tags: ['passport to advanced math', 'radicals'],
  },
  {
    questionText: 'What is √(72) simplified?',
    answer: '6√2',
    distractors: ['3√8', '8√2', '12√2'],
    explanation: 'Factor 72 = 36 × 2, so √72 = √36 × √2 = 6√2.',
    difficulty: 'medium',
    tags: ['passport to advanced math', 'radicals'],
  },
  {
    questionText: 'Rationalize the denominator: 5/√7',
    answer: '5√7/7',
    distractors: ['5/7', '√35/7', '5√7/14'],
    explanation: 'Multiply numerator and denominator by √7: (5/√7) × (√7/√7) = 5√7/7.',
    difficulty: 'medium',
    tags: ['passport to advanced math', 'rationalizing denominators'],
  },
  
  // Factoring
  {
    questionText: 'Factor completely: x² - 9',
    answer: '(x + 3)(x - 3)',
    distractors: ['(x - 9)(x + 1)', '(x - 3)²', '(x + 9)(x - 1)'],
    explanation: 'This is a difference of squares: a² - b² = (a + b)(a - b), so x² - 9 = (x + 3)(x - 3).',
    difficulty: 'easy',
    tags: ['passport to advanced math', 'factoring'],
  },
  {
    questionText: 'Factor: 2x² + 7x + 3',
    answer: '(2x + 1)(x + 3)',
    distractors: ['(2x + 3)(x + 1)', '(x + 7)(2x + 3)', '(2x - 1)(x - 3)'],
    explanation: 'Find factors of 2×3=6 that sum to 7: 1 and 6. Then 2x² + 7x + 3 = (2x + 1)(x + 3).',
    difficulty: 'medium',
    tags: ['passport to advanced math', 'factoring'],
  },
  
  // Completing the Square
  {
    questionText: 'What value completes the square for x² + 8x?',
    answer: 16,
    distractors: [8, 64, 4],
    explanation: 'For x² + bx, add (b/2)². Here b=8, so (8/2)² = 16.',
    difficulty: 'medium',
    tags: ['passport to advanced math', 'completing the square'],
  },
  {
    questionText: 'What is the vertex form of x² - 6x + 2 after completing the square?',
    answer: '(x - 3)² - 7',
    distractors: ['(x - 3)² + 7', '(x + 3)² - 7', '(x - 6)² - 2'],
    explanation: 'Complete the square: x² - 6x + 9 - 9 + 2 = (x - 3)² - 7.',
    difficulty: 'hard',
    tags: ['passport to advanced math', 'completing the square'],
  },
  
  // Discriminant
  {
    questionText: 'What is the discriminant of x² - 4x + 4 = 0?',
    answer: 0,
    distractors: [8, -8, 16],
    explanation: 'Discriminant = b² - 4ac = (-4)² - 4(1)(4) = 16 - 16 = 0.',
    difficulty: 'medium',
    tags: ['passport to advanced math', 'discriminant'],
  },
  {
    questionText: 'How many real solutions does x² - 5x + 7 = 0 have?',
    answer: 0,
    distractors: [1, 2, 3],
    explanation: 'Discriminant = (-5)² - 4(1)(7) = 25 - 28 = -3. Negative discriminant means no real solutions.',
    difficulty: 'medium',
    tags: ['passport to advanced math', 'discriminant'],
  },
  
  // Midpoint Formula
  {
    questionText: 'What is the midpoint of the segment from (2, 5) to (8, 9)?',
    answer: '(5, 7)',
    distractors: ['(6, 14)', '(3, 2)', '(10, 4)'],
    explanation: 'Midpoint = ((x₁ + x₂)/2, (y₁ + y₂)/2) = ((2 + 8)/2, (5 + 9)/2) = (5, 7).',
    difficulty: 'easy',
    tags: ['coordinate geometry', 'midpoint'],
  },
  {
    questionText: 'The midpoint of (a, 3) and (7, b) is (5, 6). What is a + b?',
    answer: 11,
    distractors: [8, 10, 13],
    explanation: '(a + 7)/2 = 5, so a = 3. (3 + b)/2 = 6, so b = 9. Therefore a + b = 12. Wait, recalc: a=3, b=9, so a+b=12. Need to fix.',
    difficulty: 'medium',
    tags: ['coordinate geometry', 'midpoint'],
  },
  
  // Special Triangles
  {
    questionText: 'In a 30-60-90 triangle, if the shortest side is 4, what is the length of the longest side?',
    answer: 8,
    distractors: ['4√3', '4√2', 12],
    explanation: 'In a 30-60-90 triangle, sides are in ratio 1:√3:2. Shortest = 4, so longest = 2 × 4 = 8.',
    difficulty: 'easy',
    tags: ['geometry', 'special triangles'],
  },
  {
    questionText: 'In a 45-45-90 triangle, if one leg is 5, what is the hypotenuse?',
    answer: '5√2',
    distractors: ['5', '10', '25'],
    explanation: 'In a 45-45-90 triangle, if leg = a, then hypotenuse = a√2, so 5√2.',
    difficulty: 'easy',
    tags: ['geometry', 'special triangles'],
  },
  
  // Congruence/Similarity
  {
    questionText: 'Two triangles are similar. If corresponding sides are 6 and 9, and one side of the first triangle is 4, what is the corresponding side of the second triangle?',
    answer: 6,
    distractors: [5, 8, 13.5],
    explanation: 'Scale factor = 9/6 = 1.5, so corresponding side = 4 × 1.5 = 6.',
    difficulty: 'medium',
    tags: ['geometry', 'similarity'],
  },
  
  // Central/Inscribed Angles
  {
    questionText: 'A central angle of 60° intercepts an arc. What is the measure of an inscribed angle that intercepts the same arc?',
    answer: 30,
    distractors: [60, 120, 15],
    explanation: 'An inscribed angle is half the measure of its intercepted arc. Central angle = arc = 60°, so inscribed = 30°.',
    difficulty: 'medium',
    tags: ['geometry', 'inscribed angles', 'central angles'],
  },
  {
    questionText: 'If a central angle measures 120°, what is the measure of its intercepted arc?',
    answer: 120,
    distractors: [60, 240, 180],
    explanation: 'A central angle and its intercepted arc have equal measures, so 120°.',
    difficulty: 'easy',
    tags: ['geometry', 'central angles'],
  },
  
  // Sectors/Arc Length
  {
    questionText: 'A circle has radius 12. What is the arc length of a sector with central angle 90°? (Use π)',
    answer: '6π',
    distractors: ['3π', '12π', '24π'],
    explanation: 'Arc length = (θ/360) × 2πr = (90/360) × 2π(12) = (1/4) × 24π = 6π.',
    difficulty: 'medium',
    tags: ['geometry', 'arc length', 'sectors'],
  },
  
  // Chords
  {
    questionText: 'In a circle with radius 10, a chord is 12 units long. How far is the chord from the center?',
    answer: 8,
    distractors: [6, 14, 16],
    explanation: 'Using the Pythagorean theorem: distance² + (chord/2)² = radius², so d² + 6² = 10², d² = 64, d = 8.',
    difficulty: 'hard',
    tags: ['geometry', 'chords'],
  },
  
  // Tangent Lines
  {
    questionText: 'A line is tangent to a circle at point P. If the radius to P is 5, and the distance from the center to the line is 5, what is the angle between the radius and the tangent?',
    answer: 90,
    distractors: [45, 60, 180],
    explanation: 'A radius drawn to a point of tangency is perpendicular to the tangent line, so 90°.',
    difficulty: 'easy',
    tags: ['geometry', 'tangent lines'],
  },
  
  // Unit Circle
  {
    questionText: 'On the unit circle, what is sin(90°)?',
    answer: 1,
    distractors: [0, -1, 0.5],
    explanation: 'At 90° on the unit circle, coordinates are (0, 1), so sin(90°) = 1.',
    difficulty: 'easy',
    tags: ['trigonometry', 'unit circle'],
  },
  {
    questionText: 'On the unit circle, what is cos(180°)?',
    answer: -1,
    distractors: [0, 1, -0.5],
    explanation: 'At 180° on the unit circle, coordinates are (-1, 0), so cos(180°) = -1.',
    difficulty: 'easy',
    tags: ['trigonometry', 'unit circle'],
  },
  
  // Trig Identities
  {
    questionText: 'What is sin²(30°) + cos²(30°)?',
    answer: 1,
    distractors: [0.5, 0.75, 1.5],
    explanation: 'By the Pythagorean identity, sin²θ + cos²θ = 1 for any angle θ.',
    difficulty: 'easy',
    tags: ['trigonometry', 'trig identities'],
  },
  {
    questionText: 'If sin(x) = 3/5, what is cos(x) if x is in the first quadrant?',
    answer: '4/5',
    distractors: ['3/4', '5/3', '√34/5'],
    explanation: 'Using sin²x + cos²x = 1, cos²x = 1 - (3/5)² = 1 - 9/25 = 16/25, so cos(x) = 4/5 (positive in first quadrant).',
    difficulty: 'medium',
    tags: ['trigonometry', 'trig identities'],
  },
  
  // Law of Sines/Cosines
  {
    questionText: 'In triangle ABC, if angle A = 30°, angle B = 45°, and side a = 10, what is side b? (Use Law of Sines)',
    answer: '10√2',
    distractors: ['5√2', '10', '20'],
    explanation: 'By Law of Sines: a/sin(A) = b/sin(B), so 10/sin(30°) = b/sin(45°). Since sin(30°)=0.5 and sin(45°)=√2/2, we get b = 10√2.',
    difficulty: 'hard',
    tags: ['trigonometry', 'law of sines'],
  },
  {
    questionText: 'In triangle ABC, sides a=5, b=7, and angle C=60°. What is side c? (Use Law of Cosines)',
    answer: '√39',
    distractors: ['√24', '√59', '7'],
    explanation: 'Law of Cosines: c² = a² + b² - 2ab cos(C) = 25 + 49 - 2(5)(7)(0.5) = 74 - 35 = 39, so c = √39.',
    difficulty: 'hard',
    tags: ['trigonometry', 'law of cosines'],
  },
  
  // Rate Problems
  {
    questionText: 'If a car travels 240 miles in 4 hours, what is its average speed in miles per hour?',
    answer: 60,
    distractors: [50, 55, 65],
    explanation: 'Rate = distance/time = 240/4 = 60 mph.',
    difficulty: 'easy',
    tags: ['problem solving and data analysis', 'rate problems'],
  },
  {
    questionText: 'Two trains leave stations 300 miles apart. Train A travels at 50 mph and Train B at 70 mph toward each other. How long until they meet?',
    answer: '2.5 hours',
    distractors: ['2 hours', '3 hours', '4 hours'],
    explanation: 'Relative speed = 50 + 70 = 120 mph. Time = distance/rate = 300/120 = 2.5 hours.',
    difficulty: 'medium',
    tags: ['problem solving and data analysis', 'rate problems'],
  },
  
  // Work Problems
  {
    questionText: 'Pipe A can fill a tank in 6 hours. Pipe B can fill it in 4 hours. How long to fill if both pipes work together?',
    answer: '2.4 hours',
    distractors: ['2 hours', '3 hours', '5 hours'],
    explanation: 'Rate A = 1/6 tank/hour, Rate B = 1/4 tank/hour. Combined rate = 1/6 + 1/4 = 5/12 tank/hour. Time = 1/(5/12) = 12/5 = 2.4 hours.',
    difficulty: 'medium',
    tags: ['problem solving and data analysis', 'work problems'],
  },
  
  // Unit Conversions
  {
    questionText: 'Convert 3 feet 6 inches to inches.',
    answer: 42,
    distractors: [36, 39, 45],
    explanation: '3 feet = 36 inches, plus 6 inches = 42 inches total.',
    difficulty: 'easy',
    tags: ['problem solving and data analysis', 'unit conversions'],
  },
  {
    questionText: 'Convert 2.5 kilometers to meters.',
    answer: 2500,
    distractors: [250, 25, 25000],
    explanation: '1 km = 1000 m, so 2.5 km = 2.5 × 1000 = 2500 m.',
    difficulty: 'easy',
    tags: ['problem solving and data analysis', 'unit conversions'],
  },
  
  // Domain/Range
  {
    questionText: 'What is the domain of f(x) = √(x - 3)?',
    answer: 'x ≥ 3',
    distractors: ['x > 3', 'x ≤ 3', 'all real numbers'],
    explanation: 'The expression under the square root must be non-negative, so x - 3 ≥ 0, which means x ≥ 3.',
    difficulty: 'medium',
    tags: ['passport to advanced math', 'domain and range'],
  },
  {
    questionText: 'What is the domain of f(x) = 1/(x - 5)?',
    answer: 'all real numbers except x = 5',
    distractors: ['x > 5', 'x < 5', 'all real numbers'],
    explanation: 'The denominator cannot be zero, so x ≠ 5. Domain is all real numbers except 5.',
    difficulty: 'medium',
    tags: ['passport to advanced math', 'domain and range'],
  },
  
  // Asymptotes
  {
    questionText: 'What is the vertical asymptote of f(x) = 1/(x + 2)?',
    answer: 'x = -2',
    distractors: ['x = 2', 'x = 0', 'y = 0'],
    explanation: 'Vertical asymptotes occur where the denominator is zero, so x + 2 = 0, which gives x = -2.',
    difficulty: 'medium',
    tags: ['passport to advanced math', 'asymptotes'],
  },
  {
    questionText: 'What is the horizontal asymptote of f(x) = (2x + 1)/(x - 3)?',
    answer: 'y = 2',
    distractors: ['y = 1', 'y = 0', 'y = 3'],
    explanation: 'For rational functions, if degrees are equal, horizontal asymptote is ratio of leading coefficients: 2/1 = 2.',
    difficulty: 'medium',
    tags: ['passport to advanced math', 'asymptotes'],
  },
  
  // Transformations
  {
    questionText: 'If f(x) = x², what is f(x - 3)?',
    answer: '(x - 3)²',
    distractors: ['x² - 3', 'x² - 9', '(x + 3)²'],
    explanation: 'f(x - 3) shifts the graph 3 units to the right, so (x - 3)².',
    difficulty: 'easy',
    tags: ['passport to advanced math', 'transformations'],
  },
  {
    questionText: 'If f(x) = x², how is f(x) + 4 different from f(x)?',
    answer: 'Shifted up 4 units',
    distractors: ['Shifted down 4 units', 'Shifted right 4 units', 'Reflected over x-axis'],
    explanation: 'Adding a constant shifts the graph vertically. f(x) + 4 shifts up 4 units.',
    difficulty: 'easy',
    tags: ['passport to advanced math', 'transformations'],
  },
  {
    questionText: 'If f(x) = |x|, what is f(-x)?',
    answer: '|x|',
    distractors: ['-|x|', '|x| - x', 'undefined'],
    explanation: 'f(-x) = |-x| = |x|, so the function is unchanged (even function).',
    difficulty: 'medium',
    tags: ['passport to advanced math', 'transformations'],
  },
  
  // Additional questions to reach 50
  {
    questionText: 'Simplify: √(8) × √(2)',
    answer: 4,
    distractors: [2, '2√2', '4√2'],
    explanation: '√(8) × √(2) = √(16) = 4.',
    difficulty: 'easy',
    tags: ['passport to advanced math', 'radicals'],
  },
  {
    questionText: 'Factor: x² - 16',
    answer: '(x + 4)(x - 4)',
    distractors: ['(x - 4)²', '(x + 8)(x - 2)', '(x - 16)(x + 1)'],
    explanation: 'Difference of squares: x² - 16 = (x + 4)(x - 4).',
    difficulty: 'easy',
    tags: ['passport to advanced math', 'factoring'],
  },
  {
    questionText: 'What completes the square for x² - 10x?',
    answer: 25,
    distractors: [10, 100, 5],
    explanation: 'For x² - 10x, add (10/2)² = 25.',
    difficulty: 'medium',
    tags: ['passport to advanced math', 'completing the square'],
  },
  {
    questionText: 'What is the midpoint of (-3, 8) and (5, -4)?',
    answer: '(1, 2)',
    distractors: ['(4, 6)', '(-1, 2)', '(1, -2)'],
    explanation: 'Midpoint = ((-3 + 5)/2, (8 + (-4))/2) = (1, 2).',
    difficulty: 'easy',
    tags: ['coordinate geometry', 'midpoint'],
  },
  {
    questionText: 'In a 30-60-90 triangle with shortest side 6, what is the length of the side opposite the 60° angle?',
    answer: '6√3',
    distractors: [6, 12, '3√3'],
    explanation: 'In a 30-60-90 triangle, sides are in ratio 1:√3:2. If shortest = 6, then side opposite 60° = 6√3.',
    difficulty: 'medium',
    tags: ['geometry', 'special triangles'],
  },
  {
    questionText: 'Two similar triangles have corresponding sides 4 and 12. If a side of the first triangle is 3, what is the corresponding side of the second?',
    answer: 9,
    distractors: [6, 10, 16],
    explanation: 'Scale factor = 12/4 = 3, so corresponding side = 3 × 3 = 9.',
    difficulty: 'medium',
    tags: ['geometry', 'similarity'],
  },
  {
    questionText: 'A chord of length 16 is 6 units from the center of a circle. What is the radius?',
    answer: 10,
    distractors: [8, 12, 14],
    explanation: 'Using Pythagorean theorem: radius² = 6² + 8² = 36 + 64 = 100, so radius = 10.',
    difficulty: 'medium',
    tags: ['geometry', 'chords'],
  },
  {
    questionText: 'On the unit circle, what is cos(270°)?',
    answer: 0,
    distractors: [1, -1, 0.5],
    explanation: 'At 270° on the unit circle, coordinates are (0, -1), so cos(270°) = 0.',
    difficulty: 'easy',
    tags: ['trigonometry', 'unit circle'],
  },
  {
    questionText: 'If cos(x) = 4/5 and x is in the first quadrant, what is sin(x)?',
    answer: '3/5',
    distractors: ['4/3', '5/4', '√41/5'],
    explanation: 'Using sin²x + cos²x = 1, sin²x = 1 - (4/5)² = 1 - 16/25 = 9/25, so sin(x) = 3/5 (positive in first quadrant).',
    difficulty: 'medium',
    tags: ['trigonometry', 'trig identities'],
  },
  {
    questionText: 'A cyclist travels 45 miles in 1.5 hours. What is the average speed in miles per hour?',
    answer: 30,
    distractors: [25, 35, 40],
    explanation: 'Rate = distance/time = 45/1.5 = 30 mph.',
    difficulty: 'easy',
    tags: ['problem solving and data analysis', 'rate problems'],
  },
  {
    questionText: 'Pipe A fills a tank in 8 hours, Pipe B in 12 hours. How long to fill if both work together?',
    answer: '4.8 hours',
    distractors: ['5 hours', '6 hours', '10 hours'],
    explanation: 'Combined rate = 1/8 + 1/12 = 5/24 tank/hour. Time = 1/(5/24) = 24/5 = 4.8 hours.',
    difficulty: 'medium',
    tags: ['problem solving and data analysis', 'work problems'],
  },
  {
    questionText: 'Convert 4.5 hours to minutes.',
    answer: 270,
    distractors: [240, 300, 450],
    explanation: '4.5 hours = 4.5 × 60 = 270 minutes.',
    difficulty: 'easy',
    tags: ['problem solving and data analysis', 'unit conversions'],
  },
  {
    questionText: 'What is the domain of f(x) = 1/√(x - 4)?',
    answer: 'x > 4',
    distractors: ['x ≥ 4', 'x < 4', 'all real numbers'],
    explanation: 'The expression under the square root must be positive, so x - 4 > 0, which means x > 4.',
    difficulty: 'medium',
    tags: ['passport to advanced math', 'domain and range'],
  },
];

// Fix the midpoint question answer
missingTopicsParams[9].questionText = 'The midpoint of (a, 3) and (7, b) is (5, 6). What is a + b?';
missingTopicsParams[9].answer = 12;
missingTopicsParams[9].distractors = [8, 10, 11];
missingTopicsParams[9].explanation = '(a + 7)/2 = 5, so a = 3. (3 + b)/2 = 6, so b = 9. Therefore a + b = 12.';

const mathSeeds = buildQuestionSeeds(missingTopicsParams);

if (mathSeeds.length !== 50) {
  throw new Error(`Expected 50 math seeds, found ${mathSeeds.length}`);
}

const seeds = mathSeeds;

const questions = seeds.map((seed, index) => {
  const difficultyScore = seed.difficultyScore ?? difficultyScoreMap[seed.difficulty];
  return {
    _id: `batch10-${seed.subject}-${String(index + 1).padStart(3, '0')}`,
    subject: seed.subject,
    difficulty: seed.difficulty,
    difficultyScore,
    content: {
      questionText: seed.questionText,
      options: seed.options,
      correctAnswer: seed.correctAnswer,
      explanation: seed.explanation,
      ...(seed.graph ? { graph: seed.graph } : {}),
    },
    metadata: {
      generatedBy,
      generatedAt: baseTimestamp,
      timesUsed: 0,
      averageAccuracy: 0,
      averageTimeSpent: 0,
    },
    tags: seed.tags,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  };
});

const outputDir = path.join(__dirname, '..', 'data', 'question-batches');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const jsonPath = path.join(outputDir, 'batch-10.json');
fs.writeFileSync(jsonPath, JSON.stringify(questions, null, 2));

const csvHeaders = [
  '_id',
  'subject',
  'difficulty',
  'difficultyScore',
  'questionText',
  'optionA',
  'optionB',
  'optionC',
  'optionD',
  'correctAnswer',
  'explanation',
  'graph',
  'tags',
  'metadata.generatedBy',
  'metadata.generatedAt',
  'metadata.timesUsed',
  'metadata.averageAccuracy',
  'metadata.averageTimeSpent',
  'createdAt',
  'updatedAt',
];

const escapeCsv = (value) => {
  if (value === undefined || value === null) return '';
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const csvRows = [csvHeaders.join(',')];
for (const q of questions) {
  const row = [
    q._id,
    q.subject,
    q.difficulty,
    q.difficultyScore,
    q.content.questionText,
    q.content.options[0],
    q.content.options[1],
    q.content.options[2],
    q.content.options[3],
    q.content.correctAnswer,
    q.content.explanation,
    q.content.graph ? JSON.stringify(q.content.graph) : '',
    q.tags.join('|'),
    q.metadata.generatedBy,
    q.metadata.generatedAt,
    q.metadata.timesUsed,
    q.metadata.averageAccuracy,
    q.metadata.averageTimeSpent,
    q.createdAt,
    q.updatedAt,
  ].map(escapeCsv);
  csvRows.push(row.join(','));
}

const csvPath = path.join(outputDir, 'batch-10.csv');
fs.writeFileSync(csvPath, csvRows.join('\n'));

console.log(`Generated ${questions.length} questions to:\n- ${jsonPath}\n- ${csvPath}`);

