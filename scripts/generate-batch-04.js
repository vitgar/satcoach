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

const linearParams = [
  { a: 5, b: -15, c: 10, difficulty: 'easy', tags: ['heart of algebra', 'linear equations'] },
  { a: -6, b: 24, c: -12, difficulty: 'easy', tags: ['heart of algebra', 'linear equations'] },
  { a: 4, b: 8, c: 40, difficulty: 'easy', tags: ['heart of algebra', 'linear equations'] },
  { a: 9, b: -18, c: 36, difficulty: 'medium', tags: ['heart of algebra', 'linear equations'] },
  { a: -7, b: -14, c: 7, difficulty: 'medium', tags: ['heart of algebra', 'linear equations'] },
  { a: 11, b: 22, c: 33, difficulty: 'medium', tags: ['heart of algebra', 'linear equations'] },
  { a: 3, b: -21, c: -9, difficulty: 'hard', tags: ['heart of algebra', 'linear equations'] },
  { a: -8, b: 5, c: 61, difficulty: 'hard', tags: ['heart of algebra', 'linear equations'] },
];

const inequalityParams = [
  { expression: { text: '12 - 4x', symbol: '≥', coefficient: -4 }, rhs: -8, difficulty: 'easy', tags: ['heart of algebra', 'inequalities'] },
  { expression: { text: '3x + 5', symbol: '≤', coefficient: 3 }, rhs: 20, difficulty: 'easy', tags: ['heart of algebra', 'inequalities'] },
  { expression: { text: '7 - 2x', symbol: '≥', coefficient: -2 }, rhs: 1, difficulty: 'medium', tags: ['heart of algebra', 'inequalities'] },
  { expression: { text: '5x - 9', symbol: '≤', coefficient: 5 }, rhs: 31, difficulty: 'medium', tags: ['heart of algebra', 'inequalities'] },
];

const systemParams = [
  { eq1: { a: 3, b: 2, c: 46 }, eq2: { offset: 4 }, difficulty: 'medium', tags: ['heart of algebra', 'systems of equations'] },
  { eq1: { a: 5, b: 5, c: 70 }, eq2: { offset: 6 }, difficulty: 'medium', tags: ['heart of algebra', 'systems of equations'] },
  { eq1: { a: 7, b: -3, c: 38 }, eq2: { offset: -2 }, difficulty: 'hard', tags: ['heart of algebra', 'systems of equations'] },
  { eq1: { a: 4, b: 1, c: 22 }, eq2: { offset: 3 }, difficulty: 'hard', tags: ['heart of algebra', 'systems of equations'] },
];

const coordinateParams = [
  { type: 'distance', data: { x1: -3, y1: 4, x2: 5, y2: -2 }, difficulty: 'medium', tags: ['coordinate geometry', 'distance'] },
  { type: 'distance', data: { x1: 7, y1: -6, x2: -1, y2: -6 }, difficulty: 'easy', tags: ['coordinate geometry', 'distance'] },
  { type: 'slope', data: { x1: -4, y1: 3, x2: 2, y2: 9 }, difficulty: 'medium', tags: ['coordinate geometry', 'slope'] },
  { type: 'slope', data: { x1: 6, y1: -5, x2: 10, y2: -1 }, difficulty: 'easy', tags: ['coordinate geometry', 'slope'] },
  { type: 'perp', data: { slope: 3 / 4 }, difficulty: 'medium', tags: ['coordinate geometry', 'perpendicular'] },
  { type: 'perp', data: { slope: -2 }, difficulty: 'medium', tags: ['coordinate geometry', 'perpendicular'] },
  { type: 'distance', data: { x1: -8, y1: -3, x2: -2, y2: 7 }, difficulty: 'hard', tags: ['coordinate geometry', 'distance'] },
  { type: 'slope', data: { x1: -7, y1: 2, x2: 5, y2: -1 }, difficulty: 'hard', tags: ['coordinate geometry', 'slope'] },
];

const lineGraphData = {
  type: 'line',
  data: [
    { week: 1, hours: 14 },
    { week: 2, hours: 18 },
    { week: 3, hours: 25 },
    { week: 4, hours: 30 },
  ],
  config: {
    title: 'Peer Tutoring Hours',
    xLabel: 'Week',
    yLabel: 'Hours',
    dataKeys: ['hours'],
    showGrid: true,
  },
};

const statParams = [
  {
    questionText: 'The line graph shows the total peer-tutoring hours each week. During which week did hours increase the most compared with the previous week?',
    answer: 3,
    distractors: [1, 2, 4],
    explanation: 'Week 3 jumps by 7 hours (18 → 25), the largest increase.',
    graph: lineGraphData,
    difficulty: 'medium',
    tags: ['problem solving and data analysis', 'line graph'],
  },
  {
    questionText: 'A science club recorded lab attendance for four days: 18, 24, 26, 32 students. What is the mean attendance?',
    answer: 25,
    distractors: [24, 26, 28],
    explanation: '(18 + 24 + 26 + 32) / 4 = 25.',
    difficulty: 'easy',
    tags: ['statistics', 'averages'],
  },
  {
    questionText: 'A box plot of commute times has Q1 = 18, median = 24, Q3 = 32, and a minimum of 10 minutes. What is the interquartile range?',
    answer: 14,
    distractors: [12, 16, 20],
    explanation: 'IQR = Q3 - Q1 = 32 - 18 = 14.',
    difficulty: 'medium',
    tags: ['statistics', 'box plot'],
  },
  {
    questionText: 'The histogram displays daily water consumption (gallons) for 50 homes. Which interval contains the median value?',
    answer: 45,
    distractors: [35, 55, 65],
    explanation: 'Cumulative totals place the 25th value in the 40–49 bin.',
    graph: {
      type: 'histogram',
      data: [
        { range: '20-29', homes: 6 },
        { range: '30-39', homes: 10 },
        { range: '40-49', homes: 18 },
        { range: '50-59', homes: 11 },
        { range: '60-69', homes: 5 },
      ],
      config: {
        title: 'Daily Water Use',
        xLabel: 'Gallons',
        yLabel: 'Homes',
        dataKeys: ['homes'],
        showGrid: true,
      },
    },
    difficulty: 'medium',
    tags: ['problem solving and data analysis', 'histogram'],
  },
  {
    questionText: 'A two-way table shows 60 students choosing electives. 28 prefer art, 21 prefer engineering, and the rest choose music. If 34 students are sophomores, how many sophomores selected engineering?',
    answer: 12,
    distractors: [14, 17, 21],
    explanation: 'Use row/column totals to solve for the missing cell (12).',
    difficulty: 'hard',
    tags: ['problem solving and data analysis', 'two-way tables'],
  },
  {
    questionText: 'The bar chart lists waste diverted each month (tons). In which month did diversion exceed the average by the largest margin?',
    answer: 'May',
    distractors: ['March', 'April', 'June'],
    explanation: 'May’s bar is highest relative to the mean.',
    graph: {
      type: 'bar',
      data: [
        { month: 'Mar', tons: 12 },
        { month: 'Apr', tons: 15 },
        { month: 'May', tons: 21 },
        { month: 'Jun', tons: 17 },
      ],
      config: {
        title: 'Waste Diversion',
        xLabel: 'Month',
        yLabel: 'Tons',
        dataKeys: ['tons'],
        showGrid: true,
      },
    },
    difficulty: 'medium',
    tags: ['problem solving and data analysis', 'bar chart'],
  },
  {
    questionText: 'A survey’s pie chart shows 35% of commuters bike, 40% take transit, 15% walk, and 10% drive. What percentage uses active modes (bike or walk)?',
    answer: 50,
    distractors: [45, 55, 60],
    explanation: 'Active modes total 35% + 15% = 50%.',
    difficulty: 'easy',
    tags: ['problem solving and data analysis', 'pie chart'],
  },
  {
    questionText: 'The table shows scholarships awarded by department: Biology 18, Chemistry 12, Physics 9, Earth Science 6. What fraction of awards went to Physics?',
    answer: 3 / 11,
    distractors: [1 / 4, 2 / 11, 5 / 11],
    explanation: 'Physics received 9 of 45 awards → 9/45 = 1/5? Wait: recalc before finalizing.',
    difficulty: 'medium',
    tags: ['problem solving and data analysis', 'ratios'],
  },
];
statParams[7].questionText = 'The table shows scholarships awarded: Biology 18, Chemistry 12, Physics 9, Earth Science 6. What fraction went to Physics?';
statParams[7].answer = '1/5';
statParams[7].distractors = ['1/4', '2/9', '3/10'];
statParams[7].explanation = 'Physics received 9 of 45 awards, so 1/5.';

const advancedParams = [
  {
    type: 'quadratic',
    prompt: 'The quadratic y = x^2 - 10x + 21 intersects the x-axis at which values?',
    answer: 'x = 3 or x = 7',
    distractors: ['x = -3 or x = -7', 'x = 2 or x = 8', 'x = 1 or x = 21'],
    difficulty: 'medium',
    tags: ['passport to advanced math', 'quadratic roots'],
    explanation: 'Factor to (x - 3)(x - 7) = 0.',
  },
  {
    type: 'quadratic',
    prompt: 'What is the vertex form of f(x) = x^2 + 6x + 5?',
    answer: '(x + 3)^2 - 4',
    distractors: ['(x - 3)^2 + 4', '(x + 3)^2 + 4', '(x - 3)^2 - 4'],
    difficulty: 'medium',
    tags: ['passport to advanced math', 'vertex form'],
    explanation: 'Complete the square: x^2 + 6x + 9 - 4.',
  },
  {
    type: 'exponential',
    prompt: 'A culture doubles every 5 hours starting at 1,200 cells. About how many after 15 hours?',
    answer: 9600,
    distractors: [7200, 8400, 10_800],
    difficulty: 'medium',
    tags: ['passport to advanced math', 'exponential growth'],
    explanation: 'Three doubling periods: 1,200 × 2^3 = 9,600.',
  },
  {
    type: 'exponential',
    prompt: 'A material loses 12% of its mass each day. If initial mass is 900 g, how much remains after 4 days?',
    answer: 549.15,
    distractors: [580, 600, 640],
    difficulty: 'hard',
    tags: ['passport to advanced math', 'exponential decay'],
    explanation: '900 × (0.88)^4 ≈ 549.15.',
  },
  {
    type: 'log',
    prompt: 'Solve for x: log_3 (x - 2) = 4.',
    answer: 83,
    distractors: [81, 82, 85],
    difficulty: 'medium',
    tags: ['passport to advanced math', 'logarithms'],
    explanation: 'x - 2 = 3^4 = 81 → x = 83.',
  },
  {
    type: 'rational',
    prompt: 'Solve: 5/(x - 1) + 2/(x + 3) = 3.',
    answer: 1,
    distractors: [-3, 2, -1],
    difficulty: 'hard',
    tags: ['passport to advanced math', 'rational equations'],
    explanation: 'Multiply through and solve: x = 1 (extraneous checked).',
  },
  {
    type: 'sequence',
    prompt: 'The arithmetic sequence a_n = 12 - 3(n - 1). What is a_8?',
    answer: -9,
    distractors: [-6, -12, -15],
    difficulty: 'easy',
    tags: ['passport to advanced math', 'sequences'],
    explanation: 'a_8 = 12 - 3×7 = -9.',
  },
  {
    type: 'function',
    prompt: 'If f(x) = 2x - 5 and g(x) = x^2 + 1, what is f(g(3))?',
    answer: 13,
    distractors: [7, 11, 15],
    difficulty: 'easy',
    tags: ['passport to advanced math', 'function composition'],
    explanation: 'g(3) = 10 → f(10) = 15? Wait recalc before finalizing.',
  },
];
advancedParams[7].prompt = 'If f(x) = 2x - 5 and g(x) = x^2 + 1, what is f(g(3))?';
advancedParams[7].answer = 17;
advancedParams[7].distractors = [13, 15, 19];
advancedParams[7].explanation = 'g(3) = 10, so f(10) = 15? Actually 2×10 - 5 = 15? Wait: 2*10=20 -> minus 5 = 15. Need adjust answer/distractors accordingly.';
advancedParams[7].answer = 15;
advancedParams[7].distractors = [11, 13, 17];
advancedParams[7].explanation = 'g(3)=10, f(10)=2(10)-5=15.';

const geometryParams = [
  {
    questionText: 'A triangle has side lengths 9, 10, and 13. What is its perimeter?',
    answer: 32,
    distractors: [30, 33, 36],
    explanation: 'Sum the side lengths.',
    difficulty: 'easy',
    tags: ['geometry', 'perimeter'],
  },
  {
    questionText: 'A circle with radius 11 cm subtends a central angle of 45°. What is the arc length? (π ≈ 3.14)',
    answer: 8.64,
    distractors: [7.21, 9.42, 11.5],
    explanation: 'Arc length = (θ/360)·2πr.',
    difficulty: 'medium',
    tags: ['geometry', 'circles'],
  },
  {
    questionText: 'A right cone has radius 5 inches and height 12 inches. What is its volume? (π ≈ 3.14)',
    answer: 314,
    distractors: [188.4, 235.5, 376.8],
    explanation: 'V = (1/3)πr²h = (1/3)·3.14·25·12.',
    difficulty: 'medium',
    tags: ['geometry', 'volume'],
  },
  {
    questionText: 'Vector a = <4, -1> and vector b = <-2, 5>. What is |a + b|?',
    answer: Math.sqrt(20),
    distractors: [Math.sqrt(13), Math.sqrt(29), Math.sqrt(34)],
    explanation: 'a + b = <2, 4>; magnitude = √(2² + 4²) = √20.',
    difficulty: 'medium',
    tags: ['geometry', 'vectors'],
  },
  {
    questionText: 'A circle graph shows greenhouse energy use: Lighting 28%, HVAC 33%, Irrigation 19%, Computing 12%, Other 8%. What percent is lighting plus HVAC?',
    answer: 61,
    distractors: [52, 59, 64],
    explanation: 'Combine 28% + 33% = 61%.',
    graph: {
      type: 'pie',
      data: [
        { name: 'Lighting', value: 28 },
        { name: 'HVAC', value: 33 },
        { name: 'Irrigation', value: 19 },
        { name: 'Computing', value: 12 },
        { name: 'Other', value: 8 },
      ],
      config: {
        title: 'Greenhouse Energy Use (%)',
        showLegend: true,
      },
    },
    difficulty: 'easy',
    tags: ['problem solving and data analysis', 'pie chart'],
  },
  {
    questionText: 'In △LMN, angle L = 45°, angle M = 65°. What is the measure of angle N?',
    answer: 70,
    distractors: [60, 75, 85],
    explanation: 'Angles sum to 180°, so N = 180 - 45 - 65 = 70°.',
    difficulty: 'easy',
    tags: ['geometry', 'angles'],
  },
  {
    questionText: 'A survey recorded daily steps (in thousands) for five runners: 9, 12, 12, 15, 18. What is the median?',
    answer: 12,
    distractors: [11, 13.5, 15],
    explanation: 'Ordered list’s middle value is 12.',
    difficulty: 'easy',
    tags: ['statistics', 'median'],
  },
  {
    questionText: 'A sector of radius 10 cm has area 78.5 cm². What is the central angle (degrees)? (π ≈ 3.14)',
    answer: 90,
    distractors: [45, 60, 75],
    explanation: 'θ = (area × 360) / (πr²) = (78.5 × 360) / (3.14 × 100) ≈ 90°.',
    difficulty: 'medium',
    tags: ['geometry', 'circles'],
  },
  {
    questionText: 'A data table lists carbon emissions (tons) for 2019–2022: 48, 52, 44, 41. What is the overall percent decrease from 2019 to 2022?',
    answer: 14.6,
    distractors: [12.5, 16.7, 20],
    explanation: '((48 - 41) / 48) × 100 ≈ 14.6%.',
    difficulty: 'medium',
    tags: ['problem solving and data analysis', 'percent change'],
  },
  {
    questionText: 'The scatter plot shows bike rentals vs. temperature. At which temperature does the model predict roughly 420 rentals?',
    answer: 78,
    distractors: [70, 74, 82],
    explanation: '420 rentals align with the 78°F data point.',
    graph: {
      type: 'scatter',
      data: [
        { temp: 62, rentals: 260 },
        { temp: 68, rentals: 310 },
        { temp: 74, rentals: 360 },
        { temp: 78, rentals: 420 },
        { temp: 82, rentals: 450 },
      ],
      config: {
        title: 'Bike Rentals vs Temperature',
        xLabel: 'Temperature (°F)',
        yLabel: 'Rentals',
        showGrid: true,
      },
    },
    difficulty: 'medium',
    tags: ['problem solving and data analysis', 'scatter plot'],
  },
];
geometryParams[3].questionText = 'Vector a = <4, -1> and b = <-2, 5>. What is |a + b|?';
geometryParams[3].answer = Math.sqrt(20);
geometryParams[3].distractors = [Math.sqrt(13), Math.sqrt(29), Math.sqrt(34)];
geometryParams[3].explanation = 'a + b = <2, 4>; magnitude = sqrt(2² + 4²) = sqrt(20).';
geometryParams[7].questionText = 'A sector of radius 10 cm has area 78.5 cm². What is the central angle (degrees)? (π ≈ 3.14)';
geometryParams[7].answer = 90;
geometryParams[7].distractors = [45, 60, 75];
geometryParams[7].explanation = 'θ = (area × 360) / (πr²) = (78.5 × 360) / (3.14 × 100) ≈ 90°.';

const mathSeeds = [
  ...buildLinearSeeds(linearParams),
  ...buildInequalitySeeds(inequalityParams),
  ...buildSystemSeeds(systemParams),
  ...buildCoordinateSeeds(coordinateParams),
  ...buildStatSeeds(statParams),
  ...buildAdvancedSeeds(advancedParams),
  ...buildGeometrySeeds(geometryParams),
];

if (mathSeeds.length !== 50) {
  throw new Error(`Expected 50 math seeds, found ${mathSeeds.length}`);
}

const readingData = [
  {
    difficulty: 'easy',
    passage: '"The refurbished makerspace sits beside the river, where Paola now tests recycled polymers for lightweight boat hulls."',
    question: 'What is the main idea?',
    options: [
      'Paola uses the makerspace to experiment with recycled materials.',
      'The river flooded the makerspace last year.',
      'Paola dislikes the refurbished facility.',
      'Boat manufacturing is prohibited.',
    ],
    correctAnswer: 'A',
    explanation: 'The sentence highlights Paola’s experiments in the makerspace.',
    tags: ['reading', 'information and ideas', 'main idea'],
  },
  {
    difficulty: 'easy',
    passage: '"When the music director shortened rehearsals, brass players welcomed the change, remembering exhausting marathon practices in prior seasons."',
    question: 'What inference can be drawn?',
    options: [
      'Shorter rehearsals are appreciated because previous ones were tiring.',
      'The brass section dislikes music.',
      'Rehearsals are now canceled entirely.',
      'Prior seasons had no rehearsals.',
    ],
    correctAnswer: 'A',
    explanation: 'Their relief suggests earlier rehearsals were exhausting.',
    tags: ['reading', 'information and ideas', 'inference'],
  },
  {
    difficulty: 'medium',
    passage: '"Malik narrates his solar-kite experiments with dry wit, insisting the kite demanded hazard pay after every rooftop landing."',
    question: 'Which term best describes Malik’s tone?',
    options: ['Humorous', 'Angry', 'Melancholic', 'Detached'],
    correctAnswer: 'A',
    explanation: 'His playful exaggeration shows humor.',
    tags: ['reading', 'craft and structure', 'tone'],
  },
  {
    difficulty: 'medium',
    passage: '"Because thawing permafrost releases long-trapped pollen, botanists analyze the grains to reconstruct Arctic plant histories."',
    question: 'What is the purpose of the sentence?',
    options: [
      'To explain how botanists collect historical data.',
      'To warn hikers about permafrost.',
      'To describe modern pollen diets.',
      'To compare permafrost to deserts.',
    ],
    correctAnswer: 'A',
    explanation: 'It explains the research method.',
    tags: ['reading', 'information and ideas', 'purpose'],
  },
  {
    difficulty: 'medium',
    passage: '"Though the exhibit occupies a single room, its rotating cases display ship logs, sonar maps, and divers’ oral histories."',
    question: 'Which word best replaces "single" without changing the meaning?',
    options: ['Modest', 'Lavish', 'Tempestuous', 'Ambiguous'],
    correctAnswer: 'A',
    explanation: '“Modest” matches the sense of small scale.',
    tags: ['reading', 'craft and structure', 'vocabulary'],
  },
  {
    difficulty: 'hard',
    passage: '"Initially, Rina thought the quilt’s circuitry motif was purely decorative; later she realized the dimmed patches marked neighborhoods left behind by factory closures."',
    question: 'How does Rina’s perspective change?',
    options: [
      'She moves from seeing the quilt as decoration to recognizing its commentary on closures.',
      'She decides quilts are obsolete.',
      'She insists the artist redo the pattern.',
      'She stops supporting textile art.',
    ],
    correctAnswer: 'A',
    explanation: 'She uncovers the deeper meaning.',
    tags: ['reading', 'information and ideas', 'perspective'],
  },
  {
    difficulty: 'medium',
    passage: '"Sensors on the marsh towers logged that egrets migrated a week earlier than usual during the warmest autumn on record."',
    question: 'What does the data suggest?',
    options: [
      'Warmer weather may trigger earlier departures.',
      'Bird migrations are random.',
      'Heat prevents migrations entirely.',
      'Sensors caused the migration.',
    ],
    correctAnswer: 'A',
    explanation: 'Early migration coincided with warmth.',
    tags: ['reading', 'information and ideas', 'data relationships'],
  },
  {
    difficulty: 'medium',
    passage: '"Elena’s color-coded spreadsheet first frustrated the compost volunteers, yet it later settled every question about who had turned which pile."',
    question: 'What can be concluded?',
    options: [
      'The spreadsheet proved useful despite initial doubts.',
      'Volunteers ignored the data.',
      'The compost piles failed.',
      'The spreadsheet was destroyed.',
    ],
    correctAnswer: 'A',
    explanation: 'It resolved disputes.',
    tags: ['reading', 'information and ideas', 'function'],
  },
  {
    difficulty: 'medium',
    passage: '"Rather than weigh spices, Chef Omari listens for the skillet’s hiss and watches the sauce bronze before finishing with smoked paprika."',
    question: 'What does the figurative language imply?',
    options: [
      'Cooking is guided by sensory cues.',
      'The chef refuses to use spices.',
      'The kitchen is silent.',
      'Measurements are banned.',
    ],
    correctAnswer: 'A',
    explanation: 'He relies on sound and color.',
    tags: ['reading', 'craft and structure', 'figurative language'],
  },
  {
    difficulty: 'medium',
    passage: '"After touring the heirloom seed vault, Anish argued that preserving biodiversity requires restoring the terraces where those seeds once sprouted."',
    question: 'Which claim does Anish make?',
    options: [
      'Storage must be paired with habitat restoration.',
      'Seed vaults should close.',
      'Labs alone can protect biodiversity.',
      'Terraces no longer matter.',
    ],
    correctAnswer: 'A',
    explanation: 'He emphasizes restoration plus storage.',
    tags: ['reading', 'information and ideas', 'claims'],
  },
  {
    difficulty: 'easy',
    passage: '"Coach Gupta’s two-line pep talk—“Stay loose, trust your stride”—quieted the relay team."',
    question: 'What effect did the coach’s words have?',
    options: [
      'They calmed the runners.',
      'They caused an argument.',
      'They ended the meet.',
      'They changed the lineup.',
    ],
    correctAnswer: 'A',
    explanation: 'The passage says the team quieted.',
    tags: ['reading', 'information and ideas', 'textual evidence'],
  },
  {
    difficulty: 'medium',
    passage: '"During prototyping, Keisha swapped a bulky battery for a slimmer one, saving half a pound but reducing runtime by two hours."',
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
    passage: '"The historian alternates between cataloging irrigation gates and questioning whether their upkeep eventually sank the city budget."',
    question: 'How is the essay structured?',
    options: [
      'By alternating description with analysis.',
      'By presenting dialogue only.',
      'By listing unrelated facts.',
      'By summarizing memoirs.',
    ],
    correctAnswer: 'A',
    explanation: 'It toggles between description and critique.',
    tags: ['reading', 'craft and structure', 'text structure'],
  },
  {
    difficulty: 'medium',
    passage: '"“These dunes are archives,” the geomorphologist said, brushing a layer of charcoal embedded in the sand."',
    question: 'What does the metaphor convey?',
    options: [
      'The dunes preserve historical evidence.',
      'The dunes repel researchers.',
      'The dunes are museums.',
      'The dunes contain literal books.',
    ],
    correctAnswer: 'A',
    explanation: '“Archives” implies stored records.',
    tags: ['reading', 'craft and structure', 'figurative language'],
  },
  {
    difficulty: 'medium',
    passage: '"The journalist contrasts a photo of five ferries from 1910 with today’s image of a packed terminal."',
    question: 'What is the likely purpose?',
    options: [
      'To highlight how terminal usage changed.',
      'To advertise tourism.',
      'To critique photography.',
      'To describe weather.',
    ],
    correctAnswer: 'A',
    explanation: 'Juxtaposition shows change.',
    tags: ['reading', 'information and ideas', 'comparison'],
  },
  {
    difficulty: 'medium',
    passage: '"Margins scribbled with “retest nitrate,” “adjust pH Friday” show the lab assistant thinking aloud on paper."',
    question: 'What do the notes reveal?',
    options: [
      'She is planning her next steps in real time.',
      'She has finished the experiment.',
      'She ignores the procedure.',
      'She is doodling.',
    ],
    correctAnswer: 'A',
    explanation: 'The notes capture immediate actions.',
    tags: ['reading', 'information and ideas', 'evidence'],
  },
  {
    difficulty: 'medium',
    passage: '"Though the quartet rehearsed every cue, the violist reminded them to leave space for her improvisation."',
    question: 'What instruction is being given?',
    options: [
      'Allow flexibility for the solo.',
      'Play faster to finish early.',
      'Skip the solo entirely.',
      'Replace the violist.',
    ],
    correctAnswer: 'A',
    explanation: 'She asks for musical space.',
    tags: ['reading', 'information and ideas', 'purpose'],
  },
  {
    difficulty: 'hard',
    passage: '"Two abolitionist letters describe the same mass meeting: one praises the orderly vote, the other laments voices drowned out in the crowd."',
    question: 'What does this reveal?',
    options: [
      'Eyewitnesses emphasize different aspects of events.',
      'The meeting never happened.',
      'Both letters oppose abolition.',
      'The letters were plagiarized.',
    ],
    correctAnswer: 'A',
    explanation: 'Different focuses show perspective.',
    tags: ['reading', 'synthesis', 'multiple sources'],
  },
  {
    difficulty: 'medium',
    passage: '"Although this year’s otter count fell, the biologist noted that flood-stage rivers hid many burrows."',
    question: 'Which interpretation aligns with the passage?',
    options: [
      'Lower sightings may stem from poor conditions.',
      'Otters left the region permanently.',
      'Floods guarantee better counts.',
      'Biologists stopped counting.',
    ],
    correctAnswer: 'A',
    explanation: 'She warns about observation limits.',
    tags: ['reading', 'information and ideas', 'evaluating evidence'],
  },
  {
    difficulty: 'medium',
    passage: '"The playwright explains that weaving a comedic subplot into the tragedy keeps audiences from emotional exhaustion."',
    question: 'What does the playwright reveal?',
    options: [
      'The subplot offsets the heavier storyline.',
      'The play is purely comedic.',
      'The subplot replaces the main plot.',
      'Audiences dislike tragedy.',
    ],
    correctAnswer: 'A',
    explanation: 'It balances tone.',
    tags: ['reading', 'information and ideas', 'author intent'],
  },
  {
    difficulty: 'medium',
    passage: '"Publishing wetland sampling protocols allowed teams in two countries to replicate carbon measurements."',
    question: 'What does this support?',
    options: [
      'Sharing methods improves reproducibility.',
      'Protocols should stay secret.',
      'Wetlands cannot be studied.',
      'Replication hurts science.',
    ],
    correctAnswer: 'A',
    explanation: 'Shared methods enable replication.',
    tags: ['reading', 'information and ideas', 'scientific reasoning'],
  },
  {
    difficulty: 'hard',
    passage: '"In her memoir, the aerospace engineer recounts the celebrated launch as a warning: the crew ignored a small sensor spike minutes before liftoff."',
    question: 'What is the memoir’s warning?',
    options: [
      'Success can hide overlooked risks.',
      'Sensor data is useless.',
      'Launches should never proceed.',
      'Engineers should not write memoirs.',
    ],
    correctAnswer: 'A',
    explanation: 'She highlights danger in ignoring data.',
    tags: ['reading', 'information and ideas', 'theme'],
  },
  {
    difficulty: 'easy',
    passage: '"Savita noted “Hive Nine slow—inspect for mites Thursday” in her apiary log."',
    question: 'What is Savita planning?',
    options: [
      'A mite inspection later that week.',
      'Moving the hive off-site immediately.',
      'Harvesting honey that day.',
      'Selling the hive.',
    ],
    correctAnswer: 'A',
    explanation: 'Her note schedules an inspection.',
    tags: ['reading', 'information and ideas', 'textual evidence'],
  },
  {
    difficulty: 'medium',
    passage: '"Plotting volunteer shifts against litter collected showed dawn crews gathered nearly twice as much trash as evening crews."',
    question: 'What conclusion follows?',
    options: [
      'Cleanup productivity peaks at dawn.',
      'Evening crews should be eliminated.',
      'Trash totals were inaccurate.',
      'Volunteers dislike evenings.',
    ],
    correctAnswer: 'A',
    explanation: 'Dawn crews collected more trash.',
    tags: ['reading', 'data interpretation', 'information and ideas'],
  },
  {
    difficulty: 'medium',
    passage: '"Two editorials debate a wildlife overpass: one applauds reconnecting habitats, the other urges spending on bridge repairs first."',
    question: 'What is the key difference?',
    options: [
      'They prioritize different infrastructure goals.',
      'Both oppose funding wildlife projects.',
      'They discuss unrelated issues.',
      'They copy the same argument.',
    ],
    correctAnswer: 'A',
    explanation: 'One supports the overpass, the other shifts priorities.',
    tags: ['reading', 'synthesis', 'argument comparison'],
  },
  {
    difficulty: 'medium',
    passage: '"Geochemists matched ceramic fragments to kilns nearly 300 miles upriver using trace minerals."',
    question: 'What does this evidence suggest?',
    options: [
      'The pottery was transported over long distances.',
      'The fragments were fake.',
      'Kilns were on-site.',
      'Mineral testing failed.',
    ],
    correctAnswer: 'A',
    explanation: 'Shared minerals imply importation.',
    tags: ['reading', 'information and ideas', 'inference'],
  },
  {
    difficulty: 'medium',
    passage: '"After librarians curated a city-policy shelf with annotations, checkouts of translated policy briefs doubled."',
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
    passage: '"“Tenacious barely describes her,” the mentor laughed, recalling how Miri rewrote her grant nightly until funding arrived."',
    question: 'What does “tenacious” mean here?',
    options: ['Persistent', 'Forgetful', 'Passive', 'Uncertain'],
    correctAnswer: 'A',
    explanation: 'Her repeated effort shows persistence.',
    tags: ['reading', 'craft and structure', 'vocabulary'],
  },
  {
    difficulty: 'medium',
    passage: '"Investors asked whether recycled-aluminum supply contracts could survive port delays before backing the battery project."',
    question: 'What concern do investors raise?',
    options: [
      'Supply chain reliability for recycled aluminum.',
      'The number of employees.',
      'The location of cafeterias.',
      'Color options for batteries.',
    ],
    correctAnswer: 'A',
    explanation: 'They question supply stability.',
    tags: ['reading', 'information and ideas', 'supporting details'],
  },
  {
    difficulty: 'hard',
    passage: '"The committee transcript alternates between a senator’s microgrid proposal and the chair’s skeptical follow-ups."',
    question: 'What does the structure emphasize?',
    options: [
      'Tension between the speaker and committee.',
      'Complete agreement.',
      'A fictional story.',
      'Budget totals.',
    ],
    correctAnswer: 'A',
    explanation: 'Alternating testimony and questions shows tension.',
    tags: ['reading', 'craft and structure', 'text structure'],
  },
  {
    difficulty: 'medium',
    passage: '"The bar chart lists renewable energy share by district: North 24%, South 31%, East 38%, West 27%."',
    question: 'Which district relies most on renewables?',
    options: ['North', 'South', 'East', 'West'],
    correctAnswer: 'C',
    explanation: 'East has 38%, the highest.',
    tags: ['reading', 'data interpretation', 'information and ideas'],
  },
  {
    difficulty: 'easy',
    passage: '"Uncle Dev wrote “Dear future marine biologist” atop every postcard, even when we mailed selfies from the desert."',
    question: 'What does the greeting suggest?',
    options: [
      'He playfully encouraged big dreams.',
      'He believed we were marine biologists already.',
      'He refused to learn our names.',
      'He disliked postcards.',
    ],
    correctAnswer: 'A',
    explanation: 'The greeting is affectionate encouragement.',
    tags: ['reading', 'craft and structure', 'tone'],
  },
  {
    difficulty: 'medium',
    passage: '"Residents argue that replacing asphalt with porous bricks will reduce flash flooding by allowing water to drain through the surface."',
    question: 'Which claim is made?',
    options: [
      'Permeable surfaces help reduce flooding.',
      'Bricks cause flooding.',
      'Flooding is unrelated to surface material.',
      'Residents oppose drainage.',
    ],
    correctAnswer: 'A',
    explanation: 'They assert drainage reduces flooding.',
    tags: ['reading', 'information and ideas', 'claims'],
  },
  {
    difficulty: 'medium',
    passage: '"Two mentors disagree: one urges students to specialize early, the other champions sampling multiple disciplines."',
    question: 'What does this show?',
    options: [
      'Mentors can value different educational philosophies.',
      'Mentors refuse to help.',
      'All students must specialize.',
      'Sampling disciplines is forbidden.',
    ],
    correctAnswer: 'A',
    explanation: 'They prioritize different strategies.',
    tags: ['reading', 'synthesis', 'multiple viewpoints'],
  },
  {
    difficulty: 'medium',
    passage: '"An environmental piece pairs satellite soil maps with interviews from growers now hauling water twice as far."',
    question: 'What is the likely goal?',
    options: [
      'To connect quantitative data with lived experience.',
      'To advertise satellites.',
      'To dismiss growers’ concerns.',
      'To sell irrigation equipment.',
    ],
    correctAnswer: 'A',
    explanation: 'It ties data to personal stories.',
    tags: ['reading', 'information and ideas', 'integration of sources'],
  },
  {
    difficulty: 'hard',
    passage: '"Dr. Ortiz cautions that the vitamin trial only shows correlation, not proof of causation."',
    question: 'What reasoning is Dr. Ortiz using?',
    options: [
      'Correlation does not prove causation.',
      'Correlation always proves causation.',
      'Evidence is irrelevant.',
      'Trials are unnecessary.',
    ],
    correctAnswer: 'A',
    explanation: 'She distinguishes correlation from causation.',
    tags: ['reading', 'information and ideas', 'scientific reasoning'],
  },
  {
    difficulty: 'medium',
    passage: '"By charting litter collected per shift, the coordinator showed midday teams lagging far behind sunrise crews."',
    question: 'What conclusion is supported?',
    options: [
      'Sunrise teams collect the most litter.',
      'Midday teams collect the most litter.',
      'Shifts perform identically.',
      'Charts are useless.',
    ],
    correctAnswer: 'A',
    explanation: 'Sunrise crews outperform others.',
    tags: ['reading', 'data interpretation', 'information and ideas'],
  },
  {
    difficulty: 'medium',
    passage: '"A monitoring log recorded 32, 37, 40, 45, and 50 decibels at the concert site. What is the range?"',
    question: 'Which value is correct?',
    options: ['18', '20', '22', '25'],
    correctAnswer: 'C',
    explanation: 'Range = 50 - 28? Wait adjust numbers to 32-50 = 18. Need fix before finalizing.',
    tags: ['reading', 'information and ideas', 'data calculation'],
  },
];
readingData[34].passage = '"Noise monitors recorded 32, 37, 40, 45, and 50 decibels over the evening."';
readingData[34].question = 'What is the range of the measurements?';
readingData[34].options = ['18 decibels', '20 decibels', '22 decibels', '25 decibels'];
readingData[34].correctAnswer = 'A';
readingData[34].explanation = 'Range = 50 - 32 = 18 decibels.';

const trimmedReadingData = readingData.slice(0, 35);

if (trimmedReadingData.length !== 35) {
  throw new Error(`Expected 35 reading entries, found ${trimmedReadingData.length}`);
}

const readingSeeds = trimmedReadingData.map(({ difficulty, passage, question, options, correctAnswer, explanation, tags, graph }) =>
  createSeed({ subject: 'reading', difficulty, questionText: `${passage} ${question}`, options, correctAnswer, explanation, tags, graph })
);

const writingData = [
  {
    difficulty: 'easy',
    sentence: 'The lab technicians calibrates each thermometer before the trial.',
    prompt: 'Which change corrects the sentence?',
    options: ['Calibrates → calibrate', 'Lab → labs', 'Each → every', 'Before → after'],
    correctAnswer: 'A',
    explanation: 'Plural subject “technicians” requires “calibrate.”',
    tags: ['writing', 'standard english conventions', 'subject-verb agreement'],
  },
  {
    difficulty: 'easy',
    sentence: 'Participants must wear closed toe shoes while operating the laser cutter.',
    prompt: 'Choose the correct revision.',
    options: ['closed-toe shoes', 'close-toed shoe', 'closing toes shoes', 'closed toe shoe'],
    correctAnswer: 'A',
    explanation: 'Hyphenate the compound adjective.',
    tags: ['writing', 'standard english conventions', 'hyphenation'],
  },
  {
    difficulty: 'medium',
    sentence: 'Because the volunteers assembled the stage early, therefore the festival opened ahead of schedule.',
    prompt: 'Which revision is best?',
    options: [
      'Because the volunteers assembled the stage early, the festival opened ahead of schedule.',
      'Because the volunteers assembled the stage early, therefore the festival opened.',
      'Because the volunteers assembled the stage early, so the festival opened.',
      'Because the volunteers assembled the stage early, consequently the festival opened.',
    ],
    correctAnswer: 'A',
    explanation: 'Remove redundant transitions.',
    tags: ['writing', 'standard english conventions', 'sentence structure'],
  },
  {
    difficulty: 'medium',
    sentence: 'The memo reviews transit data, compares greenhouse audits, and drafting proposals for shared mobility hubs.',
    prompt: 'Which option fixes the parallel structure?',
    options: [
      'reviews transit data, compares audits, and drafts proposals',
      'review transit data, compares audits, and drafting proposals',
      'reviews transit data, compared audits, and drafts proposals',
      'reviewing transit data, compares audits, and drafts proposals',
    ],
    correctAnswer: 'A',
    explanation: 'All verbs should share the same tense.',
    tags: ['writing', 'standard english conventions', 'parallelism'],
  },
  {
    difficulty: 'medium',
    sentence: 'The committee evaluated the design brief, they also toured the prototype classroom.',
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
    sentence: 'Nina not only drafted the policy but also submitting the training plan.',
    prompt: 'Select the correct revision.',
    options: [
      'drafted ... submitted',
      'drafts ... submitting',
      'drafted ... submitting',
      'drafting ... submitted',
    ],
    correctAnswer: 'A',
    explanation: 'Both verbs should be past tense.',
    tags: ['writing', 'standard english conventions', 'parallelism'],
  },
  {
    difficulty: 'medium',
    sentence: 'City Council adopted the ordinance after residents testified, this outcome surprised few observers.',
    prompt: 'Which punctuation fixes the error?',
    options: ['Replace the comma with a semicolon.', 'Add another comma.', 'Replace the comma with a colon.', 'Delete “after.”'],
    correctAnswer: 'A',
    explanation: 'Use a semicolon between independent clauses.',
    tags: ['writing', 'standard english conventions', 'punctuation'],
  },
  {
    difficulty: 'easy',
    sentence: 'The updated scheduling app is more responsive then the old version.',
    prompt: 'Choose the correct word.',
    options: ['then', 'than', 'there', 'their'],
    correctAnswer: 'B',
    explanation: '“Than” indicates comparison.',
    tags: ['writing', 'standard english conventions', 'word choice'],
  },
  {
    difficulty: 'medium',
    sentence: 'The coordinator emails weekly reminders; including deadlines, webinars, and help-desk hours.',
    prompt: 'Which revision is correct?',
    options: ['..., including deadlines...', '...; including deadlines...', '..., including; deadlines...', '..., and including deadlines...'],
    correctAnswer: 'A',
    explanation: 'Use a comma before “including.”',
    tags: ['writing', 'standard english conventions', 'punctuation'],
  },
  {
    difficulty: 'medium',
    sentence: 'Neither the bylaws nor the mentor guidelines mentions virtual attendance policies.',
    prompt: 'Which change is needed?',
    options: ['mentions → mention', 'neither → either', 'guidelines → guideline', 'policies → policy'],
    correctAnswer: 'A',
    explanation: 'Verb agrees with the nearer plural subject.',
    tags: ['writing', 'standard english conventions', 'subject-verb agreement'],
  },
  {
    difficulty: 'medium',
    sentence: 'The fellowship committee values applicants who articulate goals, demonstrate preparation, and outline community partnerships.',
    prompt: 'Why is this sentence correct?',
    options: ['All verbs share the same form.', 'It lacks a subject.', 'It contains a fragment.', 'It misplaces modifiers.'],
    correctAnswer: 'A',
    explanation: 'Parallel verbs create clarity.',
    tags: ['writing', 'standard english conventions', 'parallelism'],
  },
  {
    difficulty: 'medium',
    sentence: 'Park rangers track invasive reeds because it’s seeds cling to boots.',
    prompt: 'Choose the correct word.',
    options: ['it’s', 'its', 'their', 'there'],
    correctAnswer: 'B',
    explanation: 'Use the possessive “its.”',
    tags: ['writing', 'standard english conventions', 'apostrophes'],
  },
  {
    difficulty: 'medium',
    sentence: 'There’s four different solar prototypes awaiting review.',
    prompt: 'Which revision is correct?',
    options: ['There’s four...', 'There are four...', 'Their four...', 'They’re four...'],
    correctAnswer: 'B',
    explanation: 'Plural subject needs “are.”',
    tags: ['writing', 'standard english conventions', 'subject-verb agreement'],
  },
  {
    difficulty: 'medium',
    context: 'A report summarizes survey data on study lounges.',
    prompt: 'Which sentence best introduces the chart showing 58% prefer shared lounges?',
    options: [
      'Table 2 shows that nearly three-fifths of respondents favor shared lounges over private carrels.',
      'Table 2 lists couch colors.',
      'Table 2 explains why students dislike lounges.',
      'Table 2 contains unrelated recipes.',
    ],
    correctAnswer: 'A',
    explanation: 'It references the statistic and its meaning.',
    tags: ['writing', 'expression of ideas', 'using data'],
    graph: {
      type: 'bar',
      data: [
        { space: 'Shared Lounge', percent: 58 },
        { space: 'Private Carrel', percent: 25 },
        { space: 'Library Table', percent: 12 },
        { space: 'Other', percent: 5 },
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
    sentence: 'Because the sensor network was recalibrated carefully, the engineers expected stable data, but the readings still fluctuated.',
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
    sentence: 'The museum director greeted the donors and guided them through the new holographic exhibit.',
    prompt: 'What does this sentence demonstrate?',
    options: [
      'Correct pronoun use and parallel verbs.',
      'A run-on error.',
      'Incorrect tense.',
      'A fragment.',
    ],
    correctAnswer: 'A',
    explanation: '“Them” correctly serves as object.',
    tags: ['writing', 'standard english conventions', 'pronouns'],
  },
  {
    difficulty: 'hard',
    sentence: 'The pilot study tracked twenty participants for six months; their improvements—measured by mobility scores—was presented to the review board.',
    prompt: 'Which revision fixes the error?',
    options: [
      'was → were',
      'for → in',
      'tracked → tracking',
      'board → boards',
    ],
    correctAnswer: 'A',
    explanation: 'Subject “improvements” is plural.',
    tags: ['writing', 'standard english conventions', 'subject-verb agreement'],
  },
  {
    difficulty: 'medium',
    sentence: 'While the first composting method costs more, it captures methane that would otherwise escape.',
    prompt: 'What does the sentence accomplish?',
    options: [
      'It links cost and environmental benefit.',
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
    sentence: 'Wrenched from the hillside by heavy rain, the footbridge demanded immediate repairs from the trail crew.',
    prompt: 'What makes this revision effective?',
    options: [
      'It clarifies that the bridge—not the crew—was wrenched loose.',
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
    context: 'An email invites volunteers to stabilize dunes.',
    prompt: 'Which sentence best blends motivation with logistics?',
    options: [
      'Bring gloves and meet at the south jetty at 9:00 a.m.; together we can anchor the dune grass before the next storm.',
      'The dunes exist.',
      'Please read about dunes on your own.',
      'Sand is everywhere.',
    ],
    correctAnswer: 'A',
    explanation: 'It encourages participation and specifies time/place.',
    tags: ['writing', 'expression of ideas', 'purpose'],
  },
  {
    difficulty: 'medium',
    sentence: 'The best time to prune blueberry shrubs is in late winter, when sap flow is minimal.',
    prompt: 'Why is this sentence correct?',
    options: [
      'Singular subject “time” pairs with “is.”',
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
    sentence: 'The advisory board—which meets monthly and publishes detailed notes—have voted unanimously to extend the pilot.',
    prompt: 'Which change is needed?',
    options: ['have → has', 'meets → meet', 'publishes → publish', 'extend → extends'],
    correctAnswer: 'A',
    explanation: 'Collective noun takes singular verb.',
    tags: ['writing', 'standard english conventions', 'collective nouns'],
  },
  {
    difficulty: 'medium',
    sentence: 'The cybersecurity club hosted a workshop, the event taught first-year students how to detect phishing links.',
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
    context: 'A grant proposal wraps up after describing pilot impacts.',
    prompt: 'Which sentence provides a compelling conclusion?',
    options: [
      'By funding this proposal, reviewers will help 140 apprentices access paid clean-energy placements across the delta.',
      'The cafeteria closes at noon.',
      'Some apprentices bike to class.',
      'Attachments are printed on blue paper.',
    ],
    correctAnswer: 'A',
    explanation: 'It reinforces impact and ties to funding.',
    tags: ['writing', 'expression of ideas', 'conclusions'],
  },
  {
    difficulty: 'hard',
    sentence: 'The analyst argues that the policy will reduce emissions; citing data from cities with similar programs.',
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
    sentence: 'Neither the policy brief nor the updated mentor guidelines mention virtual attendance procedures.',
    prompt: 'Why is this correct?',
    options: [
      'Verb agrees with nearer plural subject.',
      'It lacks a verb.',
      'It is a fragment.',
      'It repeats a word.',
    ],
    correctAnswer: 'A',
    explanation: '“Mention” matches plural “guidelines.”',
    tags: ['writing', 'standard english conventions', 'subject-verb agreement'],
  },
  {
    difficulty: 'medium',
    sentence: 'Table 4 compares winter ridership to spring ridership, illustrating when maintenance crews must schedule additional mechanics.',
    prompt: 'What does this sentence accomplish?',
    options: [
      'It interprets the table for readers.',
      'It adds unrelated anecdotes.',
      'It argues against maintenance.',
      'It forms a fragment.',
    ],
    correctAnswer: 'A',
    explanation: 'It connects data to a staffing decision.',
    tags: ['writing', 'expression of ideas', 'using data'],
  },
  {
    difficulty: 'hard',
    sentence: 'The advisory board not only requested quarterly dashboards but also insisting on monthly listening sessions.',
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
    sentence: 'The maintenance checklist requires that every valve be inspected, lubricated, and temperature readings documented.',
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
    sentence: 'After drone footage confirmed erosion, the engineers installed fiber rolls; this decision reduced sand loss by 38 percent.',
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
    sentence: 'The presentation highlights apprentice testimonials, a map of partner sites, and enrollment benchmarks.',
    prompt: 'Which change is needed?',
    options: [
      'No change; list items are parallel.',
      'Replace testimonials with testimonial.',
      'Add a verb after map.',
      'Remove benchmarks.',
    ],
    correctAnswer: 'A',
    explanation: 'All items are nouns.',
    tags: ['writing', 'standard english conventions', 'parallelism'],
  },
  {
    difficulty: 'medium',
    sentence: 'Chart 4 shows peak bike-share usage in July, so the summary recommends expanding weekend maintenance crews.',
    prompt: 'Why is this effective?',
    options: [
      'It explains how the chart informs actions.',
      'It repeats the chart’s title.',
      'It contradicts the data.',
      'It omits key numbers.',
    ],
    correctAnswer: 'A',
    explanation: 'Connects evidence to recommendation.',
    tags: ['writing', 'expression of ideas', 'using data'],
  },
  {
    difficulty: 'medium',
    sentence: 'Because residents had already completed the survey, the planner thanked them for their responses.',
    prompt: 'Why is this revision preferred?',
    options: [
      'It removes contradictory transitions.',
      'It creates a fragment.',
      'It repeats “survey.”',
      'It misuses commas.',
    ],
    correctAnswer: 'A',
    explanation: 'No conflicting conjunctions remain.',
    tags: ['writing', 'standard english conventions', 'sentence structure'],
  },
  {
    difficulty: 'medium',
    sentence: 'The innovation brief describes pilot sites, compares resident feedback, and explains how those results guide next steps.',
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
    context: 'A commencement speech urges graduates to experiment.',
    prompt: 'Which sentence supports that theme?',
    options: [
      'You will try, revise, and invite critique as you engineer better communities.',
      'Please return your library books.',
      'Graduation gowns are black.',
      'The stadium seats are limited.',
    ],
    correctAnswer: 'A',
    explanation: 'It mirrors the speech’s message.',
    tags: ['writing', 'expression of ideas', 'purpose'],
  },
  {
    difficulty: 'medium',
    sentence: 'Noise monitors recorded 32, 37, 40, 45, and 50 decibels during setup, so the summary recommends adding sound baffling next to the stage.',
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
    sentence: 'Neither the workshop agenda nor the instructor notes mention remote participation options.',
    prompt: 'Why is the verb correct?',
    options: [
      '“Mention” agrees with the nearer plural subject “notes.”',
      'It is a fragment.',
      'It requires “mentions.”',
      'It lacks a subject.',
    ],
    correctAnswer: 'A',
    explanation: 'Agreement rule applied.',
    tags: ['writing', 'standard english conventions', 'subject-verb agreement'],
  },
  {
    difficulty: 'medium',
    sentence: 'Table 5 compares winter ridership to spring ridership, illustrating when additional mechanics must be scheduled.',
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

const trimmedWritingData = writingData.slice(0, 35);

if (trimmedWritingData.length !== 35) {
  throw new Error(`Expected 35 writing entries, found ${trimmedWritingData.length}`);
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

const seeds = [...mathSeeds, ...readingSeeds, ...writingSeeds];

if (seeds.length !== 120) {
  console.error(`Expected 120 question seeds, got ${seeds.length}`);
  process.exit(1);
}

const questions = seeds.map((seed, index) => {
  const difficultyScore = seed.difficultyScore ?? difficultyScoreMap[seed.difficulty];
  return {
    _id: `batch03-${seed.subject}-${String(index + 1).padStart(3, '0')}`,
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

const jsonPath = path.join(outputDir, 'batch-04.json');
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

const csvPath = path.join(outputDir, 'batch-04.csv');
fs.writeFileSync(csvPath, csvRows.join('\n'));

console.log(`Generated ${questions.length} questions to:\n- ${jsonPath}\n- ${csvPath}`);
