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

// Batch 5: New math topics - Complex numbers, probability, advanced trig, polynomials
const linearParams = [
  { a: 6, b: -12, c: 18, difficulty: 'easy', tags: ['heart of algebra', 'linear equations'] },
  { a: -5, b: 20, c: -10, difficulty: 'easy', tags: ['heart of algebra', 'linear equations'] },
  { a: 8, b: 16, c: 48, difficulty: 'easy', tags: ['heart of algebra', 'linear equations'] },
  { a: 12, b: -24, c: 48, difficulty: 'medium', tags: ['heart of algebra', 'linear equations'] },
  { a: -9, b: -18, c: 9, difficulty: 'medium', tags: ['heart of algebra', 'linear equations'] },
  { a: 13, b: 26, c: 39, difficulty: 'medium', tags: ['heart of algebra', 'linear equations'] },
  { a: 4, b: -28, c: -12, difficulty: 'hard', tags: ['heart of algebra', 'linear equations'] },
  { a: -10, b: 6, c: 76, difficulty: 'hard', tags: ['heart of algebra', 'linear equations'] },
];

const inequalityParams = [
  { expression: { text: '15 - 5x', symbol: '≥', coefficient: -5 }, rhs: -10, difficulty: 'easy', tags: ['heart of algebra', 'inequalities'] },
  { expression: { text: '4x + 7', symbol: '≤', coefficient: 4 }, rhs: 27, difficulty: 'easy', tags: ['heart of algebra', 'inequalities'] },
  { expression: { text: '9 - 3x', symbol: '≥', coefficient: -3 }, rhs: 0, difficulty: 'medium', tags: ['heart of algebra', 'inequalities'] },
  { expression: { text: '6x - 11', symbol: '≤', coefficient: 6 }, rhs: 37, difficulty: 'medium', tags: ['heart of algebra', 'inequalities'] },
];

const systemParams = [
  { eq1: { a: 4, b: 3, c: 50 }, eq2: { offset: 5 }, difficulty: 'medium', tags: ['heart of algebra', 'systems of equations'] },
  { eq1: { a: 6, b: 6, c: 84 }, eq2: { offset: 7 }, difficulty: 'medium', tags: ['heart of algebra', 'systems of equations'] },
  { eq1: { a: 8, b: -4, c: 44 }, eq2: { offset: -3 }, difficulty: 'hard', tags: ['heart of algebra', 'systems of equations'] },
  { eq1: { a: 5, b: 2, c: 28 }, eq2: { offset: 4 }, difficulty: 'hard', tags: ['heart of algebra', 'systems of equations'] },
];

const coordinateParams = [
  { type: 'distance', data: { x1: -4, y1: 5, x2: 6, y2: -3 }, difficulty: 'medium', tags: ['coordinate geometry', 'distance'] },
  { type: 'distance', data: { x1: 8, y1: -7, x2: -2, y2: -7 }, difficulty: 'easy', tags: ['coordinate geometry', 'distance'] },
  { type: 'slope', data: { x1: -5, y1: 4, x2: 3, y2: 10 }, difficulty: 'medium', tags: ['coordinate geometry', 'slope'] },
  { type: 'slope', data: { x1: 7, y1: -6, x2: 11, y2: -2 }, difficulty: 'easy', tags: ['coordinate geometry', 'slope'] },
  { type: 'perp', data: { slope: 2 / 3 }, difficulty: 'medium', tags: ['coordinate geometry', 'perpendicular'] },
  { type: 'perp', data: { slope: -3 }, difficulty: 'medium', tags: ['coordinate geometry', 'perpendicular'] },
  { type: 'distance', data: { x1: -9, y1: -4, x2: -3, y2: 8 }, difficulty: 'hard', tags: ['coordinate geometry', 'distance'] },
  { type: 'slope', data: { x1: -8, y1: 3, x2: 6, y2: -2 }, difficulty: 'hard', tags: ['coordinate geometry', 'slope'] },
];

const buildLinearSeeds = (params) =>
  params.map(({ a, b, c, difficulty, tags }) => {
    const solution = (c - b) / a;
    const { options, correctAnswer } = makeChoiceSet(solution, [solution + 1, solution - 2, solution + 4]);
    const questionText = `Solve for x: ${a}x ${b >= 0 ? '+ ' : '- '}${Math.abs(b)} = ${c}.`;
    const explanation = `${b >= 0 ? 'Subtract' : 'Add'} ${Math.abs(b)} to both sides, then divide by ${a} to get x = ${formatNumber(solution)}.`;
    return createSeed({ subject: 'math', difficulty, questionText, options, correctAnswer, explanation, tags });
  });

const buildInequalitySeeds = (params) =>
  params.map(({ expression, rhs, difficulty, tags }) => {
    const solution = rhs / expression.coefficient;
    const { options, correctAnswer } = makeChoiceSet(solution, [solution + 2, solution - 1, -solution]);
    const questionText = `Which value satisfies ${expression.text} ${expression.symbol} ${rhs}?`;
    const explanation = `Isolate x to find x ${expression.symbol} ${formatNumber(solution)}.`;
    return createSeed({ subject: 'math', difficulty, questionText, options, correctAnswer, explanation, tags });
  });

const buildSystemSeeds = (params) =>
  params.map(({ eq1, eq2, difficulty, tags }) => {
    const y = (eq1.c - eq1.a * eq2.offset) / (eq1.a + eq1.b);
    const x = y + eq2.offset;
    const { options, correctAnswer } = makeChoiceSet(x, [x + 2, x - 3, -x]);
    const questionText = `Solve the system: ${eq1.a}x + ${eq1.b}y = ${eq1.c} and x - y = ${eq2.offset}. What is x?`;
    const explanation = `Substitute x = y + ${eq2.offset} into the first equation to get y = ${formatNumber(y)} and x = ${formatNumber(x)}.`;
    return createSeed({ subject: 'math', difficulty, questionText, options, correctAnswer, explanation, tags });
  });

const buildCoordinateSeeds = (params) =>
  params.map(({ type, data, difficulty, tags }) => {
    let questionText = '';
    let answer;
    if (type === 'distance') {
      const dist = Math.sqrt((data.x2 - data.x1) ** 2 + (data.y2 - data.y1) ** 2);
      questionText = `What is the distance between (${data.x1}, ${data.y1}) and (${data.x2}, ${data.y2})?`;
      answer = dist;
    } else if (type === 'slope') {
      const slope = (data.y2 - data.y1) / (data.x2 - data.x1);
      questionText = `Find the slope of the line passing through (${data.x1}, ${data.y1}) and (${data.x2}, ${data.y2}).`;
      answer = slope;
    } else {
      const perpendicularSlope = -1 / data.slope;
      questionText = `Line m has slope ${data.slope}. What is the slope of a line perpendicular to m?`;
      answer = perpendicularSlope;
    }
    const { options, correctAnswer } = makeChoiceSet(answer, [answer + 1, answer - 1, -answer]);
    const explanation = type === 'perp'
      ? `Perpendicular slopes are negative reciprocals, so slope = ${formatNumber(answer)}.`
      : `Apply the ${type === 'distance' ? 'distance' : 'slope'} formula.`;
    return createSeed({ subject: 'math', difficulty, questionText, options, correctAnswer, explanation, tags });
  });

const buildStatSeeds = (params) =>
  params.map(({ questionText, answer, distractors, explanation, graph, difficulty, tags }) => {
    const { options, correctAnswer } = makeChoiceSet(answer, distractors);
    return createSeed({ subject: 'math', difficulty, questionText, options, correctAnswer, explanation, tags, graph });
  });

const buildAdvancedSeeds = (params) =>
  params.map(({ type, prompt, answer, distractors, difficulty, tags, explanation }) => {
    const { options, correctAnswer } = makeChoiceSet(answer, distractors);
    return createSeed({ subject: 'math', difficulty, questionText: prompt, options, correctAnswer, explanation, tags });
  });

const buildGeometrySeeds = (params) =>
  params.map(({ questionText, answer, distractors, explanation, graph, difficulty, tags }) => {
    const { options, correctAnswer } = makeChoiceSet(answer, distractors);
    return createSeed({ subject: 'math', difficulty, questionText, options, correctAnswer, explanation, tags, graph });
  });

const statParams = [
  {
    questionText: 'The line graph shows monthly library visits. Which month had the largest increase from the previous month?',
    answer: 'March',
    distractors: ['January', 'February', 'April'],
    explanation: 'March shows the steepest upward jump.',
    graph: {
      type: 'line',
      data: [
        { month: 'Jan', visits: 420 },
        { month: 'Feb', visits: 450 },
        { month: 'Mar', visits: 580 },
        { month: 'Apr', visits: 610 },
      ],
      config: {
        title: 'Monthly Library Visits',
        xLabel: 'Month',
        yLabel: 'Visits',
        dataKeys: ['visits'],
        showGrid: true,
      },
    },
    difficulty: 'medium',
    tags: ['problem solving and data analysis', 'line graph'],
  },
  {
    questionText: 'A survey recorded test scores: 72, 78, 85, 88, 92. What is the median score?',
    answer: 85,
    distractors: [78, 88, 90],
    explanation: 'The middle value in the ordered list is 85.',
    difficulty: 'easy',
    tags: ['statistics', 'median'],
  },
  {
    questionText: 'A box plot shows test times with Q1 = 20, median = 28, Q3 = 36, minimum = 12 minutes. What is the IQR?',
    answer: 16,
    distractors: [14, 18, 20],
    explanation: 'IQR = Q3 - Q1 = 36 - 20 = 16.',
    difficulty: 'medium',
    tags: ['statistics', 'box plot'],
  },
  {
    questionText: 'The histogram shows daily steps (thousands) for 60 walkers. Which range contains the median?',
    answer: 8,
    distractors: [6, 10, 12],
    explanation: 'The 30th value falls in the 7-9 thousand range.',
    graph: {
      type: 'histogram',
      data: [
        { range: '3-5', walkers: 8 },
        { range: '5-7', walkers: 14 },
        { range: '7-9', walkers: 22 },
        { range: '9-11', walkers: 12 },
        { range: '11-13', walkers: 4 },
      ],
      config: {
        title: 'Daily Steps',
        xLabel: 'Steps (thousands)',
        yLabel: 'Walkers',
        dataKeys: ['walkers'],
        showGrid: true,
      },
    },
    difficulty: 'medium',
    tags: ['problem solving and data analysis', 'histogram'],
  },
  {
    questionText: 'A two-way table shows 80 students by grade and sport: 32 freshmen, 24 sophomores, 18 juniors, 6 seniors. If 45 play soccer, how many sophomores play soccer?',
    answer: 15,
    distractors: [18, 21, 24],
    explanation: 'Use totals to solve for the missing cell (15).',
    difficulty: 'hard',
    tags: ['problem solving and data analysis', 'two-way tables'],
  },
  {
    questionText: 'The bar chart shows recycling collected (pounds) each quarter. Which quarter exceeded the average by the most?',
    answer: 'Q3',
    distractors: ['Q1', 'Q2', 'Q4'],
    explanation: 'Q3\'s bar is highest relative to the mean.',
    graph: {
      type: 'bar',
      data: [
        { quarter: 'Q1', pounds: 180 },
        { quarter: 'Q2', pounds: 210 },
        { quarter: 'Q3', pounds: 280 },
        { quarter: 'Q4', pounds: 230 },
      ],
      config: {
        title: 'Recycling by Quarter',
        xLabel: 'Quarter',
        yLabel: 'Pounds',
        dataKeys: ['pounds'],
        showGrid: true,
      },
    },
    difficulty: 'medium',
    tags: ['problem solving and data analysis', 'bar chart'],
  },
  {
    questionText: 'A pie chart shows transportation modes: 30% car, 25% bus, 20% bike, 15% walk, 10% other. What percent uses public transit (bus)?',
    answer: 25,
    distractors: [20, 30, 35],
    explanation: 'Bus represents 25% of commuters.',
    difficulty: 'easy',
    tags: ['problem solving and data analysis', 'pie chart'],
  },
  {
    questionText: 'The scatter plot shows study hours vs. test scores. At which study hour does the model predict a score of 85?',
    answer: 12,
    distractors: [10, 14, 16],
    explanation: 'The trend line intersects 85 at 12 hours.',
    graph: {
      type: 'scatter',
      data: [
        { hours: 8, score: 72 },
        { hours: 10, score: 78 },
        { hours: 12, score: 85 },
        { hours: 14, score: 90 },
        { hours: 16, score: 94 },
      ],
      config: {
        title: 'Study Hours vs Test Score',
        xLabel: 'Hours',
        yLabel: 'Score',
        showGrid: true,
      },
    },
    difficulty: 'medium',
    tags: ['problem solving and data analysis', 'scatter plot'],
  },
];

const advancedParams = [
  {
    type: 'quadratic',
    prompt: 'The quadratic y = x^2 - 12x + 32 intersects the x-axis at which values?',
    answer: 'x = 4 or x = 8',
    distractors: ['x = -4 or x = -8', 'x = 3 or x = 9', 'x = 2 or x = 16'],
    difficulty: 'medium',
    tags: ['passport to advanced math', 'quadratic roots'],
    explanation: 'Factor to (x - 4)(x - 8) = 0.',
  },
  {
    type: 'quadratic',
    prompt: 'What is the vertex form of f(x) = x^2 + 8x + 7?',
    answer: '(x + 4)^2 - 9',
    distractors: ['(x - 4)^2 + 9', '(x + 4)^2 + 9', '(x - 4)^2 - 9'],
    difficulty: 'medium',
    tags: ['passport to advanced math', 'vertex form'],
    explanation: 'Complete the square: x^2 + 8x + 16 - 9.',
  },
  {
    type: 'exponential',
    prompt: 'A population triples every 4 years starting at 2,500. About how many after 12 years?',
    answer: 67500,
    distractors: [45000, 60000, 75000],
    difficulty: 'medium',
    tags: ['passport to advanced math', 'exponential growth'],
    explanation: 'Three tripling periods: 2,500 × 3^3 = 67,500.',
  },
  {
    type: 'exponential',
    prompt: 'A substance loses 15% of its volume each hour. If initial volume is 800 mL, how much remains after 5 hours?',
    answer: 354.29,
    distractors: [380, 400, 420],
    difficulty: 'hard',
    tags: ['passport to advanced math', 'exponential decay'],
    explanation: '800 × (0.85)^5 ≈ 354.29.',
  },
  {
    type: 'log',
    prompt: 'Solve for x: log_2 (x + 3) = 5.',
    answer: 29,
    distractors: [27, 28, 31],
    difficulty: 'medium',
    tags: ['passport to advanced math', 'logarithms'],
    explanation: 'x + 3 = 2^5 = 32 → x = 29.',
  },
  {
    type: 'complex',
    prompt: 'What is (3 + 4i)(2 - i)?',
    answer: '10 + 5i',
    distractors: ['6 - 4i', '2 + 11i', '14 - 3i'],
    difficulty: 'hard',
    tags: ['passport to advanced math', 'complex numbers'],
    explanation: 'Multiply: 6 - 3i + 8i - 4i^2 = 6 + 5i + 4 = 10 + 5i.',
  },
  {
    type: 'sequence',
    prompt: 'The arithmetic sequence a_n = 20 - 4(n - 1). What is a_6?',
    answer: 0,
    distractors: [-4, 4, 8],
    difficulty: 'easy',
    tags: ['passport to advanced math', 'sequences'],
    explanation: 'a_6 = 20 - 4×5 = 0.',
  },
  {
    type: 'function',
    prompt: 'If f(x) = 3x + 2 and g(x) = x^2 - 1, what is f(g(4))?',
    answer: 47,
    distractors: [41, 44, 50],
    difficulty: 'easy',
    tags: ['passport to advanced math', 'function composition'],
    explanation: 'g(4) = 15, so f(15) = 3(15) + 2 = 47.',
  },
  {
    type: 'polynomial',
    prompt: 'What is (x + 5)(x^2 - 3x + 2) expanded?',
    answer: 'x^3 + 2x^2 - 13x + 10',
    distractors: ['x^3 - 2x^2 + 13x - 10', 'x^3 + 8x^2 - 15x + 10', 'x^3 - 8x^2 + 15x - 10'],
    difficulty: 'hard',
    tags: ['passport to advanced math', 'polynomials'],
    explanation: 'Multiply each term: x^3 - 3x^2 + 2x + 5x^2 - 15x + 10 = x^3 + 2x^2 - 13x + 10.',
  },
];

const geometryParams = [
  {
    questionText: 'A triangle has side lengths 7, 11, and 14. What is its perimeter?',
    answer: 32,
    distractors: [30, 33, 35],
    explanation: 'Sum the side lengths.',
    difficulty: 'easy',
    tags: ['geometry', 'perimeter'],
  },
  {
    questionText: 'A circle with radius 14 cm subtends a central angle of 60°. What is the arc length? (π ≈ 3.14)',
    answer: 14.65,
    distractors: [12.28, 16.75, 18.84],
    explanation: 'Arc length = (60/360)·2π(14) ≈ 14.65.',
    difficulty: 'medium',
    tags: ['geometry', 'circles'],
  },
  {
    questionText: 'A right cylinder has radius 6 inches and height 10 inches. What is its volume? (π ≈ 3.14)',
    answer: 1130.4,
    distractors: [942, 1256, 1413],
    explanation: 'V = πr²h = 3.14·36·10 ≈ 1,130.4.',
    difficulty: 'medium',
    tags: ['geometry', 'volume'],
  },
  {
    questionText: 'Vector a = <5, -2> and vector b = <-3, 6>. What is |a + b|?',
    answer: Math.sqrt(20),
    distractors: [Math.sqrt(13), Math.sqrt(29), Math.sqrt(40)],
    explanation: 'a + b = <2, 4>; magnitude = √(2² + 4²) = √20.',
    difficulty: 'medium',
    tags: ['geometry', 'vectors'],
  },
  {
    questionText: 'A pie chart shows budget allocation: Rent 40%, Food 25%, Transport 20%, Savings 10%, Other 5%. What percent is rent plus food?',
    answer: 65,
    distractors: [55, 60, 70],
    explanation: 'Combine 40% + 25% = 65%.',
    graph: {
      type: 'pie',
      data: [
        { name: 'Rent', value: 40 },
        { name: 'Food', value: 25 },
        { name: 'Transport', value: 20 },
        { name: 'Savings', value: 10 },
        { name: 'Other', value: 5 },
      ],
      config: {
        title: 'Monthly Budget (%)',
        showLegend: true,
      },
    },
    difficulty: 'easy',
    tags: ['problem solving and data analysis', 'pie chart'],
  },
  {
    questionText: 'In △PQR, angle P = 50°, angle Q = 70°. What is the measure of angle R?',
    answer: 60,
    distractors: [50, 70, 80],
    explanation: 'Angles sum to 180°, so R = 180 - 50 - 70 = 60°.',
    difficulty: 'easy',
    tags: ['geometry', 'angles'],
  },
  {
    questionText: 'A survey recorded daily steps: 8,500, 9,200, 9,200, 10,100, 11,800. What is the median?',
    answer: 9200,
    distractors: [9000, 9600, 10100],
    explanation: 'Ordered list\'s middle value is 9,200.',
    difficulty: 'easy',
    tags: ['statistics', 'median'],
  },
  {
    questionText: 'A sector of radius 12 cm has area 94.2 cm². What is the central angle (degrees)? (π ≈ 3.14)',
    answer: 75,
    distractors: [60, 90, 120],
    explanation: 'θ = (area × 360) / (πr²) = (94.2 × 360) / (3.14 × 144) ≈ 75°.',
    difficulty: 'medium',
    tags: ['geometry', 'circles'],
  },
  {
    questionText: 'A data table lists sales (thousands) for 2020–2023: 52, 58, 51, 47. What is the percent decrease from 2020 to 2023?',
    answer: 9.6,
    distractors: [8.5, 10.5, 12.0],
    explanation: '((52 - 47) / 52) × 100 ≈ 9.6%.',
    difficulty: 'medium',
    tags: ['problem solving and data analysis', 'percent change'],
  },
];

const mathSeeds = [
  ...buildLinearSeeds(linearParams),
  ...buildInequalitySeeds(inequalityParams),
  ...buildSystemSeeds(systemParams),
  ...buildCoordinateSeeds(coordinateParams),
  ...buildStatSeeds(statParams),
  ...buildAdvancedSeeds(advancedParams),
  ...buildGeometrySeeds(geometryParams),
];

const trimmedMathSeeds = mathSeeds.slice(0, 17);
if (trimmedMathSeeds.length !== 17) {
  throw new Error(`Expected 17 math seeds, found ${trimmedMathSeeds.length}`);
}

// Batch 5: New reading passages
const readingData = [
  {
    difficulty: 'easy',
    passage: '"The renovated observatory now houses a digital telescope, where students track asteroids and measure light from distant galaxies."',
    question: 'What is the main focus?',
    options: [
      'Students use the observatory for astronomical research.',
      'The observatory was destroyed last year.',
      'Students dislike the new equipment.',
      'Asteroids are no longer studied.',
    ],
    correctAnswer: 'A',
    explanation: 'The passage describes student research activities.',
    tags: ['reading', 'information and ideas', 'main idea'],
  },
  {
    difficulty: 'easy',
    passage: '"When the director extended library hours, night-shift workers celebrated, recalling how early closures had forced them to study at cafes."',
    question: 'What inference can be drawn?',
    options: [
      'Extended hours help workers who study late.',
      'Workers dislike libraries.',
      'Libraries are now closed permanently.',
      'Cafes replaced libraries.',
    ],
    correctAnswer: 'A',
    explanation: 'Their celebration suggests the change addresses their needs.',
    tags: ['reading', 'information and ideas', 'inference'],
  },
  {
    difficulty: 'medium',
    passage: '"Dr. Chen describes her climate-modeling work with measured enthusiasm, noting that each simulation reveals both patterns and surprises."',
    question: 'Which term best describes Dr. Chen\'s tone?',
    options: ['Balanced', 'Dismissive', 'Melancholic', 'Indifferent'],
    correctAnswer: 'A',
    explanation: 'Her measured approach shows balance.',
    tags: ['reading', 'craft and structure', 'tone'],
  },
  {
    difficulty: 'medium',
    passage: '"Because ancient pollen grains preserve in lake sediments, paleobotanists extract cores to reconstruct past vegetation."',
    question: 'What is the purpose of the sentence?',
    options: [
      'To explain how scientists study historical plant life.',
      'To warn about lake pollution.',
      'To describe modern diets.',
      'To compare lakes to oceans.',
    ],
    correctAnswer: 'A',
    explanation: 'It explains the research methodology.',
    tags: ['reading', 'information and ideas', 'purpose'],
  },
  {
    difficulty: 'medium',
    passage: '"Though the archive fills only two rooms, its digitized collections span centuries of local newspapers, photographs, and oral histories."',
    question: 'Which word best replaces "only" without changing the meaning?',
    options: ['Merely', 'Extensively', 'Temporarily', 'Vaguely'],
    correctAnswer: 'A',
    explanation: '"Merely" matches the sense of small scale.',
    tags: ['reading', 'craft and structure', 'vocabulary'],
  },
  {
    difficulty: 'hard',
    passage: '"At first, Sam thought the mural\'s geometric patterns were purely abstract; later he recognized the shapes mapped neighborhoods affected by highway construction."',
    question: 'How does Sam\'s perspective change?',
    options: [
      'He moves from seeing abstraction to recognizing social commentary.',
      'He decides murals are obsolete.',
      'He insists the artist change the design.',
      'He stops supporting public art.',
    ],
    correctAnswer: 'A',
    explanation: 'He uncovers the deeper meaning.',
    tags: ['reading', 'information and ideas', 'perspective'],
  },
  {
    difficulty: 'medium',
    passage: '"Weather stations logged that robins arrived two weeks earlier than typical during the mildest winter in decades."',
    question: 'What does the data suggest?',
    options: [
      'Warmer winters may trigger earlier migrations.',
      'Bird migrations are random.',
      'Cold prevents migrations entirely.',
      'Stations caused the migration.',
    ],
    correctAnswer: 'A',
    explanation: 'Early arrival coincided with mild weather.',
    tags: ['reading', 'information and ideas', 'data relationships'],
  },
  {
    difficulty: 'medium',
    passage: '"Initially, the team\'s shared spreadsheet confused volunteers, yet it eventually answered every question about which tasks were complete."',
    question: 'What can be concluded?',
    options: [
      'The spreadsheet proved useful despite initial confusion.',
      'Volunteers ignored the data.',
      'The spreadsheet failed.',
      'The spreadsheet was deleted.',
    ],
    correctAnswer: 'A',
    explanation: 'It resolved questions over time.',
    tags: ['reading', 'information and ideas', 'function'],
  },
  {
    difficulty: 'medium',
    passage: '"Instead of following recipes, Chef Lin listens for the oil\'s sizzle and watches vegetables soften before adding the final spices."',
    question: 'What does the figurative language imply?',
    options: [
      'Cooking relies on sensory observation.',
      'The chef refuses to use spices.',
      'The kitchen is silent.',
      'Recipes are banned.',
    ],
    correctAnswer: 'A',
    explanation: 'She relies on sound and visual cues.',
    tags: ['reading', 'craft and structure', 'figurative language'],
  },
  {
    difficulty: 'medium',
    passage: '"After visiting the seed library, Jordan argued that preserving crop diversity requires restoring the farms where those varieties once grew."',
    question: 'Which claim does Jordan make?',
    options: [
      'Storage must be paired with farm restoration.',
      'Seed libraries should close.',
      'Labs alone can protect diversity.',
      'Farms no longer matter.',
    ],
    correctAnswer: 'A',
    explanation: 'He emphasizes restoration plus storage.',
    tags: ['reading', 'information and ideas', 'claims'],
  },
  {
    difficulty: 'easy',
    passage: '"Coach Martinez\'s three-word reminder—"Breathe, focus, execute"—settled the debate team before finals."',
    question: 'What effect did the coach\'s words have?',
    options: [
      'They calmed the team.',
      'They caused an argument.',
      'They ended the competition.',
      'They changed the lineup.',
    ],
    correctAnswer: 'A',
    explanation: 'The passage says the team settled.',
    tags: ['reading', 'information and ideas', 'textual evidence'],
  },
  {
    difficulty: 'medium',
    passage: '"During testing, Alex replaced a heavy battery with a lighter one, saving eight ounces but cutting runtime by three hours."',
    question: 'What trade-off occurs?',
    options: [
      'Less weight but shorter runtime.',
      'More weight and shorter runtime.',
      'Less weight and longer runtime.',
      'No change in runtime.',
    ],
    correctAnswer: 'A',
    explanation: 'Weight decreases while runtime drops.',
    tags: ['reading', 'information and ideas', 'cause and effect'],
  },
  {
    difficulty: 'hard',
    passage: '"The archaeologist alternates between cataloging pottery shards and questioning whether their production eventually strained the region\'s clay resources."',
    question: 'How is the essay structured?',
    options: [
      'By alternating description with analysis.',
      'By presenting dialogue only.',
      'By listing unrelated facts.',
      'By summarizing diaries.',
    ],
    correctAnswer: 'A',
    explanation: 'It toggles between cataloging and critique.',
    tags: ['reading', 'craft and structure', 'text structure'],
  },
  {
    difficulty: 'medium',
    passage: '"These rock layers are time capsules," the geologist said, pointing to fossilized leaves pressed between shale."',
    question: 'What does the metaphor convey?',
    options: [
      'The layers preserve historical evidence.',
      'The layers repel researchers.',
      'The layers are literal capsules.',
      'The layers contain clocks.',
    ],
    correctAnswer: 'A',
    explanation: '"Time capsules" implies preserved records.',
    tags: ['reading', 'craft and structure', 'figurative language'],
  },
  {
    difficulty: 'medium',
    passage: '"The reporter contrasts a photo of three streetcars from 1920 with today\'s image of a crowded bus stop."',
    question: 'What is the likely purpose?',
    options: [
      'To highlight how public transit changed.',
      'To advertise tourism.',
      'To critique photography.',
      'To describe weather.',
    ],
    correctAnswer: 'A',
    explanation: 'Juxtaposition shows change over time.',
    tags: ['reading', 'information and ideas', 'comparison'],
  },
  {
    difficulty: 'medium',
    passage: '"Margins filled with "check pH Tuesday," "order supplies Friday" reveal the lab manager planning ahead on paper."',
    question: 'What do the notes reveal?',
    options: [
      'She is organizing future tasks.',
      'She has finished all work.',
      'She ignores procedures.',
      'She is doodling.',
    ],
    correctAnswer: 'A',
    explanation: 'The notes capture planned actions.',
    tags: ['reading', 'information and ideas', 'evidence'],
  },
  {
    difficulty: 'medium',
    passage: '"Though the quintet practiced every transition, the cellist reminded them to leave room for her cadenza."',
    question: 'What instruction is being given?',
    options: [
      'Allow space for the solo passage.',
      'Play faster to finish early.',
      'Skip the cadenza entirely.',
      'Replace the cellist.',
    ],
    correctAnswer: 'A',
    explanation: 'She asks for musical space.',
    tags: ['reading', 'information and ideas', 'purpose'],
  },
  {
    difficulty: 'hard',
    passage: '"Two newspaper articles describe the same town meeting: one highlights the orderly discussion, the other emphasizes voices lost in the crowd."',
    question: 'What does this reveal?',
    options: [
      'Reporters emphasize different aspects of events.',
      'The meeting never happened.',
      'Both articles oppose discussion.',
      'The articles were copied.',
    ],
    correctAnswer: 'A',
    explanation: 'Different focuses show perspective.',
    tags: ['reading', 'synthesis', 'multiple sources'],
  },
  {
    difficulty: 'medium',
    passage: '"Although this year\'s butterfly count dropped, the naturalist noted that heavy rains kept many species in shelter."',
    question: 'Which interpretation aligns with the passage?',
    options: [
      'Lower counts may stem from weather conditions.',
      'Butterflies left the region permanently.',
      'Rain guarantees better counts.',
      'Naturalists stopped counting.',
    ],
    correctAnswer: 'A',
    explanation: 'She warns about observation limits.',
    tags: ['reading', 'information and ideas', 'evaluating evidence'],
  },
  {
    difficulty: 'medium',
    passage: '"The playwright explains that weaving a humorous subplot into the drama prevents audiences from emotional overload."',
    question: 'What does the playwright reveal?',
    options: [
      'The subplot balances the serious storyline.',
      'The play is purely comedic.',
      'The subplot replaces the main plot.',
      'Audiences dislike drama.',
    ],
    correctAnswer: 'A',
    explanation: 'It balances emotional tone.',
    tags: ['reading', 'information and ideas', 'author intent'],
  },
  {
    difficulty: 'medium',
    passage: '"Publishing soil-testing protocols enabled teams in three countries to replicate carbon-sequestration measurements."',
    question: 'What does this support?',
    options: [
      'Sharing methods improves reproducibility.',
      'Protocols should stay secret.',
      'Soil cannot be studied.',
      'Replication harms science.',
    ],
    correctAnswer: 'A',
    explanation: 'Shared methods enable replication.',
    tags: ['reading', 'information and ideas', 'scientific reasoning'],
  },
  {
    difficulty: 'hard',
    passage: '"In his memoir, the test pilot recounts the celebrated flight as a cautionary tale: the crew ignored a minor warning light minutes before takeoff."',
    question: 'What is the memoir\'s warning?',
    options: [
      'Success can mask overlooked risks.',
      'Warning lights are useless.',
      'Flights should never proceed.',
      'Pilots should not write memoirs.',
    ],
    correctAnswer: 'A',
    explanation: 'He highlights danger in ignoring warnings.',
    tags: ['reading', 'information and ideas', 'theme'],
  },
  {
    difficulty: 'easy',
    passage: '"Ravi noted "Hive Twelve slow—check for disease Monday" in his beekeeping journal."',
    question: 'What is Ravi planning?',
    options: [
      'A disease inspection next week.',
      'Moving the hive immediately.',
      'Harvesting honey that day.',
      'Selling the hive.',
    ],
    correctAnswer: 'A',
    explanation: 'His note schedules an inspection.',
    tags: ['reading', 'information and ideas', 'textual evidence'],
  },
  {
    difficulty: 'medium',
    passage: '"Charting volunteer hours against trees planted showed morning crews planted nearly twice as many saplings as afternoon crews."',
    question: 'What conclusion follows?',
    options: [
      'Morning productivity exceeds afternoon productivity.',
      'Afternoon crews should be eliminated.',
      'Tree counts were inaccurate.',
      'Volunteers dislike afternoons.',
    ],
    correctAnswer: 'A',
    explanation: 'Morning crews planted more trees.',
    tags: ['reading', 'data interpretation', 'information and ideas'],
  },
  {
    difficulty: 'medium',
    passage: '"Two editorials debate a bike-lane expansion: one supports connecting neighborhoods, the other urges spending on road repairs first."',
    question: 'What is the key difference?',
    options: [
      'They prioritize different infrastructure goals.',
      'Both oppose bike lanes.',
      'They discuss unrelated issues.',
      'They copy the same argument.',
    ],
    correctAnswer: 'A',
    explanation: 'One supports expansion, the other shifts priorities.',
    tags: ['reading', 'synthesis', 'argument comparison'],
  },
  {
    difficulty: 'medium',
    passage: '"Archaeologists matched stone tools to quarries over 200 miles away using mineral signatures."',
    question: 'What does this evidence suggest?',
    options: [
      'The tools were transported over long distances.',
      'The tools were fake.',
      'Quarries were on-site.',
      'Mineral testing failed.',
    ],
    correctAnswer: 'A',
    explanation: 'Shared minerals imply importation.',
    tags: ['reading', 'information and ideas', 'inference'],
  },
  {
    difficulty: 'medium',
    passage: '"After librarians created a science-fiction shelf with reading guides, checkouts of translated novels tripled."',
    question: 'What conclusion is supported?',
    options: [
      'Curation boosted checkouts.',
      'Curation reduced interest.',
      'Translations were removed.',
      'Checkouts stayed flat.',
    ],
    correctAnswer: 'A',
    explanation: 'Checkouts increased after curation.',
    tags: ['reading', 'information and ideas', 'cause and effect'],
  },
  {
    difficulty: 'medium',
    passage: '"Persistent barely captures her approach," the advisor smiled, recalling how Yuki revised her proposal daily until approval arrived."',
    question: 'What does "persistent" mean here?',
    options: ['Determined', 'Forgetful', 'Passive', 'Uncertain'],
    correctAnswer: 'A',
    explanation: 'Her repeated effort shows determination.',
    tags: ['reading', 'craft and structure', 'vocabulary'],
  },
  {
    difficulty: 'medium',
    passage: '"Investors asked whether recycled-steel supply chains could survive shipping delays before funding the bridge project."',
    question: 'What concern do investors raise?',
    options: [
      'Supply chain reliability for recycled steel.',
      'The number of workers.',
      'The location of offices.',
      'Color options for bridges.',
    ],
    correctAnswer: 'A',
    explanation: 'They question supply stability.',
    tags: ['reading', 'information and ideas', 'supporting details'],
  },
  {
    difficulty: 'hard',
    passage: '"The hearing transcript alternates between a mayor\'s green-energy proposal and the council\'s skeptical questions."',
    question: 'What does the structure emphasize?',
    options: [
      'Tension between the speaker and council.',
      'Complete agreement.',
      'A fictional story.',
      'Budget totals.',
    ],
    correctAnswer: 'A',
    explanation: 'Alternating proposal and questions shows tension.',
    tags: ['reading', 'craft and structure', 'text structure'],
  },
  {
    difficulty: 'medium',
    passage: '"The bar chart shows renewable energy share by zone: North 28%, South 35%, East 42%, West 31%."',
    question: 'Which zone relies most on renewables?',
    options: ['North', 'South', 'East', 'West'],
    correctAnswer: 'C',
    explanation: 'East has 42%, the highest.',
    tags: ['reading', 'data interpretation', 'information and ideas'],
  },
  {
    difficulty: 'easy',
    passage: '"Aunt Mei wrote "Dear future engineer" on every birthday card, even when we sent photos from the beach."',
    question: 'What does the greeting suggest?',
    options: [
      'She playfully encouraged career dreams.',
      'She believed we were engineers already.',
      'She refused to learn our names.',
      'She disliked cards.',
    ],
    correctAnswer: 'A',
    explanation: 'The greeting is affectionate encouragement.',
    tags: ['reading', 'craft and structure', 'tone'],
  },
  {
    difficulty: 'medium',
    passage: '"Residents argue that replacing concrete with permeable pavers will reduce flooding by allowing water to seep through."',
    question: 'Which claim is made?',
    options: [
      'Permeable surfaces help reduce flooding.',
      'Pavers cause flooding.',
      'Flooding is unrelated to surface material.',
      'Residents oppose drainage.',
    ],
    correctAnswer: 'A',
    explanation: 'They assert permeability reduces flooding.',
    tags: ['reading', 'information and ideas', 'claims'],
  },
  {
    difficulty: 'medium',
    passage: '"Two advisors disagree: one urges students to focus early, the other champions exploring multiple fields first."',
    question: 'What does this show?',
    options: [
      'Advisors can value different educational approaches.',
      'Advisors refuse to help.',
      'All students must focus.',
      'Exploring fields is forbidden.',
    ],
    correctAnswer: 'A',
    explanation: 'They prioritize different strategies.',
    tags: ['reading', 'synthesis', 'multiple viewpoints'],
  },
  {
    difficulty: 'medium',
    passage: '"A climate article pairs satellite temperature maps with interviews from farmers now irrigating twice as often."',
    question: 'What is the likely goal?',
    options: [
      'To connect data with personal experience.',
      'To advertise satellites.',
      'To dismiss farmers\' concerns.',
      'To sell irrigation equipment.',
    ],
    correctAnswer: 'A',
    explanation: 'It ties data to personal stories.',
    tags: ['reading', 'information and ideas', 'integration of sources'],
  },
  {
    difficulty: 'hard',
    passage: '"Dr. Kim cautions that the nutrition study only shows correlation, not proof of causation."',
    question: 'What reasoning is Dr. Kim using?',
    options: [
      'Correlation does not prove causation.',
      'Correlation always proves causation.',
      'Evidence is irrelevant.',
      'Studies are unnecessary.',
    ],
    correctAnswer: 'A',
    explanation: 'She distinguishes correlation from causation.',
    tags: ['reading', 'information and ideas', 'scientific reasoning'],
  },
  {
    difficulty: 'medium',
    passage: '"By graphing volunteer hours against meals served, the coordinator showed evening teams serving far fewer meals than morning teams."',
    question: 'What conclusion is supported?',
    options: [
      'Morning teams serve the most meals.',
      'Evening teams serve the most meals.',
      'Teams perform identically.',
      'Graphs are useless.',
    ],
    correctAnswer: 'A',
    explanation: 'Morning crews outperform others.',
    tags: ['reading', 'data interpretation', 'information and ideas'],
  },
];

const trimmedReadingData = readingData.slice(0, 12);

if (trimmedReadingData.length !== 12) {
  throw new Error(`Expected 12 reading entries, found ${trimmedReadingData.length}`);
}

const readingSeeds = trimmedReadingData.map(({ difficulty, passage, question, options, correctAnswer, explanation, tags, graph }) =>
  createSeed({ subject: 'reading', difficulty, questionText: `${passage} ${question}`, options, correctAnswer, explanation, tags, graph })
);

// Batch 5: New writing questions
const writingData = [
  {
    difficulty: 'easy',
    sentence: 'The research assistants prepares each sample before analysis.',
    prompt: 'Which change corrects the sentence?',
    options: ['Prepares → prepare', 'Research → researches', 'Each → every', 'Before → after'],
    correctAnswer: 'A',
    explanation: 'Plural subject "assistants" requires "prepare."',
    tags: ['writing', 'standard english conventions', 'subject-verb agreement'],
  },
  {
    difficulty: 'easy',
    sentence: 'Participants must wear safety glasses while operating the 3D printer.',
    prompt: 'Choose the correct revision.',
    options: ['safety glasses', 'safety-glass', 'safely glasses', 'safety glass'],
    correctAnswer: 'A',
    explanation: 'No hyphen needed for this noun phrase.',
    tags: ['writing', 'standard english conventions', 'hyphenation'],
  },
  {
    difficulty: 'medium',
    sentence: 'Because the team completed the survey early, therefore the results were analyzed ahead of schedule.',
    prompt: 'Which revision is best?',
    options: [
      'Because the team completed the survey early, the results were analyzed ahead of schedule.',
      'Because the team completed the survey early, therefore the results were analyzed.',
      'Because the team completed the survey early, so the results were analyzed.',
      'Because the team completed the survey early, consequently the results were analyzed.',
    ],
    correctAnswer: 'A',
    explanation: 'Remove redundant transitions.',
    tags: ['writing', 'standard english conventions', 'sentence structure'],
  },
  {
    difficulty: 'medium',
    sentence: 'The report analyzes budget data, compares department spending, and proposing cost-saving measures.',
    prompt: 'Which option fixes the parallel structure?',
    options: [
      'analyzes budget data, compares spending, and proposes measures',
      'analyze budget data, compares spending, and proposing measures',
      'analyzes budget data, compared spending, and proposes measures',
      'analyzing budget data, compares spending, and proposes measures',
    ],
    correctAnswer: 'A',
    explanation: 'All verbs should share the same tense.',
    tags: ['writing', 'standard english conventions', 'parallelism'],
  },
  {
    difficulty: 'medium',
    sentence: 'The committee reviewed the proposal, they also toured the demonstration site.',
    prompt: 'How should the clauses be combined?',
    options: [
      '..., and they also toured ...',
      '..., they toured ...',
      '..., also touring ...',
      '..., therefore they toured ...',
    ],
    correctAnswer: 'A',
    explanation: 'Use a conjunction to avoid a comma splice.',
    tags: ['writing', 'standard english conventions', 'run-on corrections'],
  },
  {
    difficulty: 'medium',
    sentence: 'Maria not only designed the website but also creating the mobile app.',
    prompt: 'Select the correct revision.',
    options: [
      'designed ... created',
      'designs ... creating',
      'designed ... creating',
      'designing ... created',
    ],
    correctAnswer: 'A',
    explanation: 'Both verbs should be past tense.',
    tags: ['writing', 'standard english conventions', 'parallelism'],
  },
  {
    difficulty: 'medium',
    sentence: 'City Council approved the plan after residents testified, this outcome pleased many advocates.',
    prompt: 'Which punctuation fixes the error?',
    options: ['Replace the comma with a semicolon.', 'Add another comma.', 'Replace the comma with a colon.', 'Delete "after."'],
    correctAnswer: 'A',
    explanation: 'Use a semicolon between independent clauses.',
    tags: ['writing', 'standard english conventions', 'punctuation'],
  },
  {
    difficulty: 'easy',
    sentence: 'The new software is more efficient then the previous version.',
    prompt: 'Choose the correct word.',
    options: ['then', 'than', 'there', 'their'],
    correctAnswer: 'B',
    explanation: '"Than" indicates comparison.',
    tags: ['writing', 'standard english conventions', 'word choice'],
  },
  {
    difficulty: 'medium',
    sentence: 'The coordinator sends weekly updates; including deadlines, workshops, and office hours.',
    prompt: 'Which revision is correct?',
    options: ['..., including deadlines...', '...; including deadlines...', '..., including; deadlines...', '..., and including deadlines...'],
    correctAnswer: 'A',
    explanation: 'Use a comma before "including."',
    tags: ['writing', 'standard english conventions', 'punctuation'],
  },
  {
    difficulty: 'medium',
    sentence: 'Neither the guidelines nor the policy manual mention remote work options.',
    prompt: 'Which change is needed?',
    options: ['mention → mentions', 'neither → either', 'guidelines → guideline', 'options → option'],
    correctAnswer: 'A',
    explanation: 'Verb agrees with the nearer plural subject.',
    tags: ['writing', 'standard english conventions', 'subject-verb agreement'],
  },
  {
    difficulty: 'medium',
    sentence: 'The selection committee values applicants who demonstrate skills, show preparation, and outline goals.',
    prompt: 'Why is this sentence correct?',
    options: ['All verbs share the same form.', 'It lacks a subject.', 'It contains a fragment.', 'It misplaces modifiers.'],
    correctAnswer: 'A',
    explanation: 'Parallel verbs create clarity.',
    tags: ['writing', 'standard english conventions', 'parallelism'],
  },
  {
    difficulty: 'medium',
    sentence: 'The organization tracks volunteer hours because it\'s database stores all records.',
    prompt: 'Choose the correct word.',
    options: ['it\'s', 'its', 'their', 'there'],
    correctAnswer: 'B',
    explanation: 'Use the possessive "its."',
    tags: ['writing', 'standard english conventions', 'apostrophes'],
  },
  {
    difficulty: 'medium',
    sentence: 'There\'s five different prototypes awaiting review.',
    prompt: 'Which revision is correct?',
    options: ['There\'s five...', 'There are five...', 'Their five...', 'They\'re five...'],
    correctAnswer: 'B',
    explanation: 'Plural subject needs "are."',
    tags: ['writing', 'standard english conventions', 'subject-verb agreement'],
  },
  {
    difficulty: 'medium',
    context: 'A report summarizes survey data on study spaces.',
    prompt: 'Which sentence best introduces the chart showing 62% prefer quiet zones?',
    options: [
      'Table 3 shows that nearly two-thirds of respondents favor quiet zones over collaborative spaces.',
      'Table 3 lists furniture colors.',
      'Table 3 explains why students dislike spaces.',
      'Table 3 contains unrelated data.',
    ],
    correctAnswer: 'A',
    explanation: 'It references the statistic and its meaning.',
    tags: ['writing', 'expression of ideas', 'using data'],
    graph: {
      type: 'bar',
      data: [
        { space: 'Quiet Zone', percent: 62 },
        { space: 'Collaborative', percent: 28 },
        { space: 'Mixed', percent: 8 },
        { space: 'Other', percent: 2 },
      ],
      config: {
        title: 'Preferred Study Spaces',
        xLabel: 'Space Type',
        yLabel: 'Percent',
        dataKeys: ['percent'],
        showGrid: true,
      },
    },
  },
  {
    difficulty: 'medium',
    sentence: 'Because the network was updated carefully, the technicians expected stable performance, but the system still crashed.',
    prompt: 'Why is the sentence effective?',
    options: [
      'It contrasts expectation and outcome within one sentence.',
      'It contains a fragment.',
      'It repeats the same clause twice.',
      'It lacks a subject.',
    ],
    correctAnswer: 'A',
    explanation: 'It balances dependent and independent clauses.',
    tags: ['writing', 'standard english conventions', 'sentence structure'],
  },
  {
    difficulty: 'medium',
    sentence: 'The curator greeted the donors and guided them through the new interactive exhibit.',
    prompt: 'What does this sentence demonstrate?',
    options: [
      'Correct pronoun use and parallel verbs.',
      'A run-on error.',
      'Incorrect tense.',
      'A fragment.',
    ],
    correctAnswer: 'A',
    explanation: '"Them" correctly serves as object.',
    tags: ['writing', 'standard english conventions', 'pronouns'],
  },
  {
    difficulty: 'hard',
    sentence: 'The pilot study tracked thirty participants for eight months; their improvements—measured by fitness scores—was presented to the board.',
    prompt: 'Which revision fixes the error?',
    options: [
      'was → were',
      'for → in',
      'tracked → tracking',
      'board → boards',
    ],
    correctAnswer: 'A',
    explanation: 'Subject "improvements" is plural.',
    tags: ['writing', 'standard english conventions', 'subject-verb agreement'],
  },
  {
    difficulty: 'medium',
    sentence: 'While the first method costs more, it captures data that would otherwise be lost.',
    prompt: 'What does the sentence accomplish?',
    options: [
      'It links cost and data benefit.',
      'It introduces an unrelated anecdote.',
      'It contradicts itself.',
      'It forms a fragment.',
    ],
    correctAnswer: 'A',
    explanation: 'It provides a logical transition.',
    tags: ['writing', 'expression of ideas', 'transitions'],
  },
  {
    difficulty: 'medium',
    sentence: 'Damaged by the storm, the trail bridge required immediate repairs from the maintenance crew.',
    prompt: 'What makes this revision effective?',
    options: [
      'It clarifies that the bridge—not the crew—was damaged.',
      'It creates a fragment.',
      'It removes all verbs.',
      'It adds ambiguity.',
    ],
    correctAnswer: 'A',
    explanation: 'Dangling modifier resolved.',
    tags: ['writing', 'standard english conventions', 'modifiers'],
  },
  {
    difficulty: 'medium',
    context: 'An email invites volunteers to restore wetlands.',
    prompt: 'Which sentence best blends motivation with logistics?',
    options: [
      'Bring waders and meet at the north marsh at 8:00 a.m.; together we can plant native grasses before the next high tide.',
      'The wetlands exist.',
      'Please read about wetlands on your own.',
      'Water is everywhere.',
    ],
    correctAnswer: 'A',
    explanation: 'It encourages participation and specifies time/place.',
    tags: ['writing', 'expression of ideas', 'purpose'],
  },
  {
    difficulty: 'medium',
    sentence: 'The best time to prune fruit trees is in late winter, when sap flow is minimal.',
    prompt: 'Why is this sentence correct?',
    options: [
      'Singular subject "time" pairs with "is."',
      'It lacks a verb.',
      'It repeats the same idea twice.',
      'It misuses commas.',
    ],
    correctAnswer: 'A',
    explanation: 'Subject-verb agreement is correct.',
    tags: ['writing', 'standard english conventions', 'subject-verb agreement'],
  },
  {
    difficulty: 'hard',
    sentence: 'The review board—which meets quarterly and publishes summaries—have voted unanimously to continue the program.',
    prompt: 'Which change is needed?',
    options: ['have → has', 'meets → meet', 'publishes → publish', 'continue → continues'],
    correctAnswer: 'A',
    explanation: 'Collective noun takes singular verb.',
    tags: ['writing', 'standard english conventions', 'collective nouns'],
  },
  {
    difficulty: 'medium',
    sentence: 'The coding club hosted a workshop, the event taught students how to debug programs.',
    prompt: 'How should this be revised?',
    options: [
      '..., and the event taught ...',
      '..., teaching the event ...',
      '..., the event which ...',
      '..., event teaching ...',
    ],
    correctAnswer: 'A',
    explanation: 'Add a conjunction to fix the comma splice.',
    tags: ['writing', 'standard english conventions', 'run-on corrections'],
  },
  {
    difficulty: 'medium',
    context: 'A grant proposal wraps up after describing program impacts.',
    prompt: 'Which sentence provides a compelling conclusion?',
    options: [
      'By funding this proposal, reviewers will help 160 students access paid internships across the region.',
      'The cafeteria closes at 2 p.m.',
      'Some students bike to campus.',
      'Attachments are printed on white paper.',
    ],
    correctAnswer: 'A',
    explanation: 'It reinforces impact and ties to funding.',
    tags: ['writing', 'expression of ideas', 'conclusions'],
  },
  {
    difficulty: 'hard',
    sentence: 'The analyst argues that the policy will reduce costs; citing data from similar programs.',
    prompt: 'Which revision fixes the punctuation?',
    options: [
      '..., citing data ...',
      '...; citing data ...',
      '...: citing data ...',
      '..., and citing data ...',
    ],
    correctAnswer: 'A',
    explanation: 'Attach participial phrase with a comma.',
    tags: ['writing', 'standard english conventions', 'punctuation'],
  },
  {
    difficulty: 'medium',
    sentence: 'Neither the proposal nor the updated guidelines mention hybrid work arrangements.',
    prompt: 'Why is this correct?',
    options: [
      'Verb agrees with nearer plural subject.',
      'It lacks a verb.',
      'It is a fragment.',
      'It repeats a word.',
    ],
    correctAnswer: 'A',
    explanation: '"Mention" matches plural "guidelines."',
    tags: ['writing', 'standard english conventions', 'subject-verb agreement'],
  },
  {
    difficulty: 'medium',
    sentence: 'Table 6 compares fall enrollment to spring enrollment, illustrating when additional advisors must be scheduled.',
    prompt: 'What does this sentence accomplish?',
    options: [
      'It interprets the table for readers.',
      'It adds unrelated anecdotes.',
      'It argues against advisors.',
      'It forms a fragment.',
    ],
    correctAnswer: 'A',
    explanation: 'It connects data to a staffing decision.',
    tags: ['writing', 'expression of ideas', 'using data'],
  },
  {
    difficulty: 'hard',
    sentence: 'The board not only requested annual reports but also insisting on quarterly meetings.',
    prompt: 'Which revision fixes the error?',
    options: [
      'requested ... but also insisted',
      'requesting ... but also insisted',
      'requested ... but also insisting',
      'requests ... but also insisted',
    ],
    correctAnswer: 'A',
    explanation: 'Maintain parallel past tense verbs.',
    tags: ['writing', 'standard english conventions', 'parallelism'],
  },
  {
    difficulty: 'medium',
    sentence: 'The checklist requires that every component be inspected, tested, and calibration documented.',
    prompt: 'What makes this revision effective?',
    options: [
      'All items share the same passive structure.',
      'It creates a fragment.',
      'It removes verbs.',
      'It misplaces modifiers.',
    ],
    correctAnswer: 'A',
    explanation: 'Parallel passive verbs provide clarity.',
    tags: ['writing', 'standard english conventions', 'parallelism'],
  },
  {
    difficulty: 'medium',
    sentence: 'After satellite images confirmed erosion, the engineers installed barriers; this decision reduced soil loss by 42 percent.',
    prompt: 'What does this sentence illustrate?',
    options: [
      'A cause-and-effect relationship supported by data.',
      'A fragment.',
      'An unrelated comment.',
      'A tense shift.',
    ],
    correctAnswer: 'A',
    explanation: 'Shows evidence leading to action.',
    tags: ['writing', 'expression of ideas', 'supporting evidence'],
  },
  {
    difficulty: 'medium',
    sentence: 'The presentation highlights student testimonials, a map of partner sites, and enrollment statistics.',
    prompt: 'Which change is needed?',
    options: [
      'No change; list items are parallel.',
      'Replace testimonials with testimonial.',
      'Add a verb after map.',
      'Remove statistics.',
    ],
    correctAnswer: 'A',
    explanation: 'All items are nouns.',
    tags: ['writing', 'standard english conventions', 'parallelism'],
  },
  {
    difficulty: 'medium',
    sentence: 'Chart 5 shows peak usage in August, so the summary recommends expanding weekend staff.',
    prompt: 'Why is this effective?',
    options: [
      'It explains how the chart informs actions.',
      'It repeats the chart\'s title.',
      'It contradicts the data.',
      'It omits key numbers.',
    ],
    correctAnswer: 'A',
    explanation: 'Connects evidence to recommendation.',
    tags: ['writing', 'expression of ideas', 'using data'],
  },
  {
    difficulty: 'medium',
    sentence: 'Because participants had already submitted the forms, the coordinator thanked them for their responses.',
    prompt: 'Why is this revision preferred?',
    options: [
      'It removes contradictory transitions.',
      'It creates a fragment.',
      'It repeats "forms."',
      'It misuses commas.',
    ],
    correctAnswer: 'A',
    explanation: 'No conflicting conjunctions remain.',
    tags: ['writing', 'standard english conventions', 'sentence structure'],
  },
  {
    difficulty: 'medium',
    sentence: 'The proposal describes pilot sites, compares feedback, and explains how those results guide next steps.',
    prompt: 'What does the sentence demonstrate?',
    options: [
      'Parallel verbs and logical sequence.',
      'A fragment.',
      'A comma splice.',
      'Ambiguous pronouns.',
    ],
    correctAnswer: 'A',
    explanation: 'All verbs align.',
    tags: ['writing', 'expression of ideas', 'organization'],
  },
  {
    difficulty: 'medium',
    context: 'A commencement speech urges graduates to innovate.',
    prompt: 'Which sentence supports that theme?',
    options: [
      'You will design, test, and refine solutions as you build better systems.',
      'Please return your textbooks.',
      'Graduation caps are blue.',
      'The auditorium seats are limited.',
    ],
    correctAnswer: 'A',
    explanation: 'It mirrors the speech\'s message.',
    tags: ['writing', 'expression of ideas', 'purpose'],
  },
  {
    difficulty: 'medium',
    sentence: 'Sound monitors recorded 35, 40, 42, 48, and 52 decibels during setup, so the summary recommends adding acoustic panels near the stage.',
    prompt: 'What does this sentence do?',
    options: [
      'It interprets the data and connects it to a recommendation.',
      'It repeats the data without analysis.',
      'It forms a fragment.',
      'It changes the topic.',
    ],
    correctAnswer: 'A',
    explanation: 'The second clause explains the implication.',
    tags: ['writing', 'expression of ideas', 'using data'],
  },
  {
    difficulty: 'medium',
    sentence: 'Neither the agenda nor the instructor notes mention online participation options.',
    prompt: 'Why is the verb correct?',
    options: [
      '"Mention" agrees with the nearer plural subject "notes."',
      'It is a fragment.',
      'It requires "mentions."',
      'It lacks a subject.',
    ],
    correctAnswer: 'A',
    explanation: 'Agreement rule applied.',
    tags: ['writing', 'standard english conventions', 'subject-verb agreement'],
  },
  {
    difficulty: 'medium',
    sentence: 'Table 7 compares fall enrollment to spring enrollment, illustrating when additional staff must be scheduled.',
    prompt: 'Why is this sentence effective?',
    options: [
      'It interprets the chart and links it to staffing decisions.',
      'It lacks a subject.',
      'It repeats the table verbatim.',
      'It misplaces modifiers.',
    ],
    correctAnswer: 'A',
    explanation: 'Connects data to action.',
    tags: ['writing', 'expression of ideas', 'using data'],
  },
];

const trimmedWritingData = writingData.slice(0, 11);

if (trimmedWritingData.length !== 11) {
  throw new Error(`Expected 11 writing entries, found ${trimmedWritingData.length}`);
}

const writingSeeds = trimmedWritingData.map((item) => {
  const questionText = item.context ? `${item.context} ${item.prompt}` : `${item.sentence} ${item.prompt}`;
  return createSeed({
    subject: 'writing',
    difficulty: item.difficulty,
    questionText,
    options: item.options,
    correctAnswer: item.correctAnswer,
    explanation: item.explanation,
    tags: item.tags,
    graph: item.graph,
  });
});

const seeds = [...trimmedMathSeeds, ...readingSeeds, ...writingSeeds];

if (seeds.length !== 40) {
  console.error(`Expected 40 question seeds, got ${seeds.length}`);
  process.exit(1);
}

const questions = seeds.map((seed, index) => {
  const difficultyScore = seed.difficultyScore ?? difficultyScoreMap[seed.difficulty];
  return {
    _id: `batch09-${seed.subject}-${String(index + 1).padStart(3, '0')}`,
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

const jsonPath = path.join(outputDir, 'batch-09.json');
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

const csvPath = path.join(outputDir, 'batch-09.csv');
fs.writeFileSync(csvPath, csvRows.join('\n'));

console.log(`Generated ${questions.length} questions to:\n- ${jsonPath}\n- ${csvPath}`);
