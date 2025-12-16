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

const shuffle = (array) => {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const formatNumber = (value) => {
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return value.toString();
    return parseFloat(value.toFixed(2)).toString();
  }
  return value;
};

const createOptionsWithSolution = (solution, distractors) => {
  const formattedSolution = formatNumber(solution);
  const formattedDistractors = distractors.map((val) => formatNumber(val)).filter((val) => val !== formattedSolution);
  const uniqueValues = [formattedSolution, ...formattedDistractors].slice(0, 4);
  const options = shuffle(uniqueValues);
  const correctAnswer = letters[options.indexOf(formattedSolution)];
  return { options, correctAnswer };
};

const buildLinearEquationSeeds = (params) =>
  params.map(({ a, b, c, difficulty, tags }) => {
    const solution = (c - b) / a;
    const { options, correctAnswer } = createOptionsWithSolution(solution, [solution + 2, solution - 2, -solution]);
    const questionText = `If ${a}x ${b >= 0 ? '+ ' : '- '}${Math.abs(b)} = ${c}, what is the value of x?`;
    const explanation = `${b >= 0 ? 'Subtract' : 'Add'} ${Math.abs(b)} to both sides to get ${a}x = ${c - b}. Divide by ${a} to find x = ${formatNumber(solution)}.`;
    return createSeed({ subject: 'math', difficulty, questionText, options, correctAnswer, explanation, tags });
  });

const buildInequalitySeeds = (params) =>
  params.map(({ constant, coefficient, rhs, direction, difficulty, tags }) => {
    const solution = direction === 'greater' ? (constant - rhs) / coefficient : (rhs - constant) / (-coefficient);
    const { options, correctAnswer } = createOptionsWithSolution(solution, [solution + 1, solution - 1, solution + 3]);
    const inequality = `${constant} ${coefficient >= 0 ? '- ' : '+ '}${Math.abs(coefficient)}x ${direction === 'greater' ? '≥' : '≤'} ${rhs}`;
    const explanation = `Rearrange ${inequality} and divide by ${-coefficient} (remember to flip the inequality) to get x ${direction === 'greater' ? '≥' : '≤'} ${formatNumber(solution)}.`;
    return createSeed({ subject: 'math', difficulty, questionText: `Which inequality solution satisfies ${inequality}?`, options, correctAnswer, explanation, tags });
  });

const buildSlopeInterceptSeeds = (params) =>
  params.map(({ slope, point, difficulty, tags }) => {
    const intercept = point.y - slope * point.x;
    const { options, correctAnswer } = createOptionsWithSolution(intercept, [intercept + 2, intercept - 3, -intercept]);
    const questionText = `A line has slope ${slope} and passes through (${point.x}, ${point.y}). What is its y-intercept?`;
    const explanation = `Use y = mx + b → ${point.y} = ${slope}(${point.x}) + b, so b = ${formatNumber(intercept)}.`;
    return createSeed({ subject: 'math', difficulty, questionText, options, correctAnswer, explanation, tags });
  });

const buildSystemSeeds = (params) =>
  params.map(({ a, b, c, offset, difficulty, tags }) => {
    const y = (c - a * offset) / (a + b);
    const x = y + offset;
    const { options, correctAnswer } = createOptionsWithSolution(x, [x + 1, x - 1, x + 2]);
    const questionText = `Solve the system: ${a}x + ${b}y = ${c} and x - y = ${offset}. What is the value of x?`;
    const explanation = `From x - y = ${offset}, x = y + ${offset}. Substitute into ${a}x + ${b}y = ${c} to find y = ${formatNumber(y)}, then x = ${formatNumber(x)}.`;
    return createSeed({ subject: 'math', difficulty, questionText, options, correctAnswer, explanation, tags });
  });

const buildQuadraticSeeds = (params) =>
  params.map(({ h, k, difficulty, tags }) => {
    const questionText = `The quadratic function f(x) = (x - ${h})^2 + ${k} is graphed. What is the minimum value of f(x)?`;
    const { options, correctAnswer } = createOptionsWithSolution(k, [k + 2, k - 3, -k]);
    const explanation = 'Vertex form shows the minimum (or maximum) value is the constant term when the parabola opens upward, so min = ' + k + '.';
    return createSeed({ subject: 'math', difficulty, questionText, options, correctAnswer, explanation, tags });
  });

const buildFactorQuadraticSeeds = (params) =>
  params.map(({ r1, r2, difficulty, tags }) => {
    const questionText = `What are the solutions to x^2 - ${(r1 + r2)}x + ${r1 * r2} = 0?`;
    const options = [
      `x = ${r1} or x = ${r2}`,
      `x = ${r1 + 1} or x = ${r2 + 1}`,
      `x = -${r1} or x = -${r2}`,
      `x = ${r1 - 2} or x = ${r2 - 2}`,
    ];
    const correctAnswer = 'A';
    const explanation = `Factor to (x - ${r1})(x - ${r2}) = 0.`;
    return createSeed({ subject: 'math', difficulty, questionText, options, correctAnswer, explanation, tags });
  });

const buildExponentialSeeds = (params) =>
  params.map(({ initial, rate, periods, type, prompt, difficulty, tags }) => {
    const value = type === 'growth' ? initial * (1 + rate) ** periods : initial * (1 - rate) ** periods;
    const { options, correctAnswer } = createOptionsWithSolution(value, [value * 1.2, value * 0.8, initial]);
    const questionText = prompt;
    const explanation = `${type === 'growth' ? 'Growth' : 'Decay'} formula: ${initial}${type === 'growth' ? '(1 + ' : '(1 - '}${rate})^${periods} = ${formatNumber(value)}.`;
    return createSeed({ subject: 'math', difficulty, questionText, options, correctAnswer, explanation, tags });
  });

const buildWorkRateSeeds = (params) =>
  params.map(({ fill, empty, difficulty, tags }) => {
    const minutes = 1 / (1 / fill - 1 / empty);
    const { options, correctAnswer } = createOptionsWithSolution(minutes, [minutes + 10, minutes - 8, minutes + 5]);
    const questionText = `One faucet fills a tank in ${fill} minutes while a drain empties it in ${empty} minutes. If both operate, how many minutes to fill the tank?`;
    const explanation = `Net rate = 1/${fill} - 1/${empty}; time = 1 / net rate = ${formatNumber(minutes)} minutes.`;
    return createSeed({ subject: 'math', difficulty, questionText, options, correctAnswer, explanation, tags });
  });

const buildGeometrySeeds = (params) =>
  params.map(({ questionText, options, correctAnswer, explanation, difficulty, tags, graph }) =>
    createSeed({ subject: 'math', difficulty, questionText, options, correctAnswer, explanation, tags, graph })
  );

const linearEquationParams = [
  { a: 4, b: -12, c: 8, difficulty: 'easy', tags: ['heart of algebra', 'linear equations'] },
  { a: -5, b: 15, c: -10, difficulty: 'easy', tags: ['heart of algebra', 'linear equations'] },
  { a: 6, b: -18, c: 0, difficulty: 'easy', tags: ['heart of algebra', 'linear equations'] },
  { a: 7, b: 21, c: 0, difficulty: 'easy', tags: ['heart of algebra', 'linear equations'] },
  { a: 3, b: -9, c: 27, difficulty: 'medium', tags: ['heart of algebra', 'linear equations'] },
  { a: 8, b: 4, c: 28, difficulty: 'medium', tags: ['heart of algebra', 'linear equations'] },
  { a: 9, b: -6, c: 30, difficulty: 'medium', tags: ['heart of algebra', 'linear equations'] },
  { a: -4, b: -8, c: 16, difficulty: 'medium', tags: ['heart of algebra', 'linear equations'] },
  { a: 10, b: 25, c: 5, difficulty: 'hard', tags: ['heart of algebra', 'linear equations'] },
  { a: -6, b: 12, c: -30, difficulty: 'hard', tags: ['heart of algebra', 'linear equations'] },
];

const inequalityParams = [
  { constant: 12, coefficient: 3, rhs: 0, direction: 'greater', difficulty: 'easy', tags: ['heart of algebra', 'inequalities'] },
  { constant: -8, coefficient: -4, rhs: 16, direction: 'less', difficulty: 'easy', tags: ['heart of algebra', 'inequalities'] },
  { constant: 20, coefficient: 5, rhs: -5, direction: 'greater', difficulty: 'medium', tags: ['heart of algebra', 'inequalities'] },
  { constant: 7, coefficient: -2, rhs: 15, direction: 'less', difficulty: 'medium', tags: ['heart of algebra', 'inequalities'] },
];

const slopeInterceptParams = [
  { slope: -3, point: { x: 2, y: -1 }, difficulty: 'easy', tags: ['heart of algebra', 'slope intercept'] },
  { slope: 5, point: { x: -1, y: 4 }, difficulty: 'easy', tags: ['heart of algebra', 'slope intercept'] },
  { slope: 1.5, point: { x: 4, y: 10 }, difficulty: 'medium', tags: ['heart of algebra', 'slope intercept'] },
  { slope: -0.5, point: { x: -6, y: 9 }, difficulty: 'medium', tags: ['heart of algebra', 'slope intercept'] },
  { slope: 2, point: { x: 7, y: -3 }, difficulty: 'hard', tags: ['heart of algebra', 'slope intercept'] },
];

const systemParams = [
  { a: 2, b: 3, c: 24, offset: 5, difficulty: 'medium', tags: ['heart of algebra', 'systems of equations'] },
  { a: 4, b: -2, c: 18, offset: 3, difficulty: 'medium', tags: ['heart of algebra', 'systems of equations'] },
  { a: 5, b: 5, c: 50, offset: 2, difficulty: 'medium', tags: ['heart of algebra', 'systems of equations'] },
  { a: 7, b: 4, c: 46, offset: 6, difficulty: 'hard', tags: ['heart of algebra', 'systems of equations'] },
];

const quadraticParams = [
  { h: -2, k: 5, difficulty: 'easy', tags: ['passport to advanced math', 'quadratics'] },
  { h: 3, k: -4, difficulty: 'easy', tags: ['passport to advanced math', 'quadratics'] },
  { h: 1, k: 8, difficulty: 'medium', tags: ['passport to advanced math', 'quadratics'] },
  { h: -4, k: -6, difficulty: 'medium', tags: ['passport to advanced math', 'quadratics'] },
  { h: 5, k: -9, difficulty: 'hard', tags: ['passport to advanced math', 'quadratics'] },
];

const factorQuadraticParams = [
  { r1: 2, r2: 7, difficulty: 'easy', tags: ['passport to advanced math', 'quadratic roots'] },
  { r1: -4, r2: 3, difficulty: 'medium', tags: ['passport to advanced math', 'quadratic roots'] },
  { r1: 5, r2: 9, difficulty: 'medium', tags: ['passport to advanced math', 'quadratic roots'] },
];

const exponentialParams = [
  {
    initial: 800,
    rate: 0.1,
    periods: 3,
    type: 'growth',
    prompt: 'A city’s bike-share membership grows by 10% per year from 800 riders. How many after 3 years?',
    difficulty: 'medium',
    tags: ['passport to advanced math', 'exponential growth'],
  },
  {
    initial: 1200,
    rate: 0.18,
    periods: 2,
    type: 'decay',
    prompt: 'A chemical sample loses 18% of its mass per hour from 1,200 grams. How much remains after 2 hours?',
    difficulty: 'medium',
    tags: ['passport to advanced math', 'exponential decay'],
  },
  {
    initial: 450,
    rate: 0.25,
    periods: 4,
    type: 'growth',
    prompt: 'A fundraiser’s donor pool grows 25% each quarter starting at 450 donors. How many after 4 quarters?',
    difficulty: 'hard',
    tags: ['passport to advanced math', 'exponential growth'],
  },
];

const workRateParams = [
  { fill: 18, empty: 45, difficulty: 'medium', tags: ['problem solving and data analysis', 'rates'] },
  { fill: 30, empty: 50, difficulty: 'medium', tags: ['problem solving and data analysis', 'rates'] },
];

const geometryParams = [
  {
    difficulty: 'easy',
    questionText: 'A rectangle has length 18 meters and width 7 meters. What is its area?',
    options: ['25 m²', '54 m²', '105 m²', '126 m²'],
    correctAnswer: 'D',
    explanation: 'Area = length × width = 18 × 7 = 126 m².',
    tags: ['geometry', 'area'],
  },
  {
    difficulty: 'medium',
    questionText: 'A right triangle has legs 9 and 12. What is the length of the hypotenuse?',
    options: ['13', '14', '15', '16'],
    correctAnswer: 'C',
    explanation: 'Hypotenuse = √(9² + 12²) = √225 = 15.',
    tags: ['geometry', 'pythagorean theorem'],
  },
  {
    difficulty: 'medium',
    questionText: 'The line graph shows quarterly revenue for two products. In which quarter does Product Y surpass Product X?',
    options: ['Q1', 'Q2', 'Q3', 'Q4'],
    correctAnswer: 'C',
    explanation: 'Product Y overtakes Product X in Q3 as shown by the intersection of the lines.',
    tags: ['problem solving and data analysis', 'line graph comparison'],
    graph: {
      type: 'line',
      data: [
        { quarter: 'Q1', productX: 18, productY: 12 },
        { quarter: 'Q2', productX: 22, productY: 19 },
        { quarter: 'Q3', productX: 21, productY: 25 },
        { quarter: 'Q4', productX: 26, productY: 28 },
      ],
      config: {
        title: 'Quarterly Revenue (Millions)',
        xLabel: 'Quarter',
        yLabel: 'Revenue',
        showLegend: true,
        dataKeys: ['productX', 'productY'],
        showGrid: true,
      },
    },
  },
  {
    difficulty: 'medium',
    questionText: 'A circle has radius 6 centimeters. What is its circumference? (Use π ≈ 3.14)',
    options: ['12.56 cm', '18.84 cm', '28.26 cm', '37.68 cm'],
    correctAnswer: 'D',
    explanation: 'Circumference = 2πr ≈ 2 × 3.14 × 6 = 37.68 cm.',
    tags: ['geometry', 'circles'],
  },
  {
    difficulty: 'hard',
    questionText: 'Vector u = <3, -2> and v = <1, 5>. What is the magnitude of u + v?',
    options: ['√10', '√29', '√34', '√45'],
    correctAnswer: 'C',
    explanation: 'u + v = <4, 3>; |u + v| = √(4² + 3²) = √25 = 5 ≈ √25? Wait value 5 not in options. Need fix before finalizing. placeholder',
    tags: ['geometry', 'vectors'],
  },
  {
    difficulty: 'hard',
    questionText: 'In △ABC, AB = 12, AC = 15, and cos(A) = 4/5. Find BC to the nearest tenth.',
    options: ['10.2', '11.6', '12.8', '13.4'],
    correctAnswer: 'B',
    explanation: 'Use Law of Cosines with cos(A) = (AB² + AC² - BC²) / (2·AB·AC). Solve for BC.',
    tags: ['geometry', 'law of cosines'],
  },
  {
    difficulty: 'easy',
    questionText: 'A cylinder has radius 4 centimeters and height 10 centimeters. What is its volume? (Use π ≈ 3.14)',
    options: ['125.6 cm³', '200.9 cm³', '251.2 cm³', '502.4 cm³'],
    correctAnswer: 'D',
    explanation: 'Volume = πr²h ≈ 3.14 × 16 × 10 = 502.4 cm³.',
    tags: ['geometry', 'solid geometry'],
  },
  {
    difficulty: 'medium',
    questionText: 'A trapezoid has bases measuring 14 meters and 20 meters with a height of 6 meters. What is its area?',
    options: ['68 m²', '96 m²', '102 m²', '204 m²'],
    correctAnswer: 'C',
    explanation: 'Area = 0.5 × (14 + 20) × 6 = 102 m².',
    tags: ['geometry', 'area'],
  },
  {
    difficulty: 'medium',
    questionText: 'A sector of a circle with radius 9 inches subtends a central angle of 60°. What is its area? (Use π ≈ 3.14)',
    options: ['28.3 in²', '42.4 in²', '84.8 in²', '113.0 in²'],
    correctAnswer: 'B',
    explanation: 'Sector area = (θ/360)πr² = (60/360) × 3.14 × 81 ≈ 42.4 in².',
    tags: ['geometry', 'circles'],
  },
  {
    difficulty: 'medium',
    questionText: 'The scatter plot shows study hours and quiz scores for five students. Which point represents the greatest increase per hour compared with the previous student?',
    options: ['Student B', 'Student C', 'Student D', 'Student E'],
    correctAnswer: 'C',
    explanation: 'Student D’s score jumps most steeply between consecutive points.',
    tags: ['problem solving and data analysis', 'scatter plots'],
    graph: {
      type: 'scatter',
      data: [
        { student: 'A', hours: 2, score: 68 },
        { student: 'B', hours: 3, score: 74 },
        { student: 'C', hours: 4, score: 79 },
        { student: 'D', hours: 5, score: 90 },
        { student: 'E', hours: 6, score: 94 },
      ],
      config: {
        title: 'Study Hours vs Quiz Score',
        xLabel: 'Hours',
        yLabel: 'Score',
        showGrid: true,
      },
    },
  },
  {
    difficulty: 'medium',
    questionText: 'A right triangle has hypotenuse 17 and one leg 8. What is sin of the angle opposite the 8-unit leg?',
    options: ['8/17', '15/17', '8/15', '17/8'],
    correctAnswer: 'A',
    explanation: 'Other leg is √(17² - 8²) = 15, so sin θ = opposite/hypotenuse = 8/17.',
    tags: ['geometry', 'trigonometry'],
  },
  {
    difficulty: 'medium',
    questionText: 'A warehouse inventory pie chart (shown) records shipments: Electronics 30%, Apparel 25%, Home Goods 20%, Books 15%, Other 10%. What percent of shipments are Electronics and Books combined?',
    options: ['35%', '40%', '45%', '55%'],
    correctAnswer: 'C',
    explanation: 'Electronics + Books = 30% + 15% = 45%.',
    tags: ['problem solving and data analysis', 'pie charts'],
    graph: {
      type: 'pie',
      data: [
        { name: 'Electronics', value: 30 },
        { name: 'Apparel', value: 25 },
        { name: 'Home Goods', value: 20 },
        { name: 'Books', value: 15 },
        { name: 'Other', value: 10 },
      ],
      config: {
        title: 'Distribution of Shipments (%)',
        showLegend: true,
      },
    },
  },
  {
    difficulty: 'medium',
    questionText: 'The histogram displays daily water use (gallons) for 40 homes. Which range contains the median usage?',
    options: ['30–39 gallons', '40–49 gallons', '50–59 gallons', '60–69 gallons'],
    correctAnswer: 'C',
    explanation: 'Cumulative frequencies place the 20th data point in the 50–59 bin.',
    tags: ['problem solving and data analysis', 'histograms'],
    graph: {
      type: 'histogram',
      data: [
        { range: '30-39', homes: 6 },
        { range: '40-49', homes: 9 },
        { range: '50-59', homes: 14 },
        { range: '60-69', homes: 7 },
        { range: '70-79', homes: 4 },
      ],
      config: {
        title: 'Daily Water Use',
        xLabel: 'Gallons',
        yLabel: 'Number of Homes',
        dataKeys: ['homes'],
        showGrid: true,
      },
    },
  },
  {
    difficulty: 'hard',
    questionText: 'A sphere has surface area 452.16 square centimeters. What is its radius? (Use π ≈ 3.14)',
    options: ['6 cm', '7 cm', '8 cm', '9 cm'],
    correctAnswer: 'A',
    explanation: 'Surface area = 4πr² ⇒ r = √(452.16 / (4 × 3.14)) = √36 = 6 cm.',
    tags: ['geometry', 'surface area'],
  },
];

geometryParams[4].questionText = 'Vector u = <3, -2> and v = <-1, 4>. What is the magnitude of u + v?';
geometryParams[4].options = ['√5', '√10', '√13', '√17'];
geometryParams[4].correctAnswer = 'C';
geometryParams[4].explanation = 'u + v = <2, 2>; magnitude = √(2² + 2²) = √8 ≈ 2.83, which matches √8 ≈ 2.83? need adjust';
geometryParams[4].options = ['√5', '√8', '√10', '√13'];
geometryParams[4].correctAnswer = 'B';
geometryParams[4].explanation = 'u + v = <2, 2>; |u + v| = √(2² + 2²) = √8.';
geometryParams[4].tags = ['geometry', 'vectors'];

const mathSeeds = [
  ...buildLinearEquationSeeds(linearEquationParams),
  ...buildInequalitySeeds(inequalityParams),
  ...buildSlopeInterceptSeeds(slopeInterceptParams),
  ...buildSystemSeeds(systemParams),
  ...buildQuadraticSeeds(quadraticParams),
  ...buildFactorQuadraticSeeds(factorQuadraticParams),
  ...buildExponentialSeeds(exponentialParams),
  ...buildWorkRateSeeds(workRateParams),
  ...buildGeometrySeeds(geometryParams),
];

if (mathSeeds.length !== 50) {
  throw new Error(`Expected 50 math seeds, found ${mathSeeds.length}`);
}

const readingData = [
  {
    difficulty: 'easy',
    passage: '"The renovated greenhouse sits at the edge of campus, where Ella now catalogues seedlings for community gardens."',
    question: 'What is the main focus of the passage?',
    options: [
      'Ella’s dedication to organizing seedlings for public use',
      'Arguments over greenhouse funding',
      'Tourists visiting the greenhouse daily',
      'Equipment problems that halted planting',
    ],
    correctAnswer: 'A',
    explanation: 'The sentence highlights Ella’s work cataloguing seedlings for gardens.',
    tags: ['reading', 'information and ideas', 'main idea'],
  },
  {
    difficulty: 'easy',
    passage: '"The orchestra’s rehearsal paused when the conductor asked the brass section to listen for the clarinet’s quiet entrance."',
    question: 'What inference can be made about the conductor?',
    options: [
      'The conductor wants the musicians to balance dynamics.',
      'The conductor is canceling the performance.',
      'The conductor dislikes the brass section.',
      'The conductor is leaving the rehearsal early.',
    ],
    correctAnswer: 'A',
    explanation: 'She asks the brass to listen so the clarinet can be heard, indicating balance.',
    tags: ['reading', 'information and ideas', 'inference'],
  },
  {
    difficulty: 'medium',
    passage: '"Rashad describes his drone mapping experiments with dry humor, noting that the prototype crashed so often it deserved its own parachute."',
    question: 'Which word best describes Rashad’s tone?',
    options: ['Somber', 'Amused', 'Irritated', 'Indifferent'],
    correctAnswer: 'B',
    explanation: 'He jokes about crashes, indicating an amused tone.',
    tags: ['reading', 'craft and structure', 'tone'],
  },
  {
    difficulty: 'medium',
    passage: '"Because the glacier’s melt exposes sediment layers, geochemists can sample pollen grains to reconstruct historical forests."',
    question: 'What is the purpose of the sentence?',
    options: [
      'To explain how scientists gather evidence from the glacier',
      'To warn tourists about glacier hazards',
      'To describe the pollen’s aroma',
      'To compare glaciers to deserts',
    ],
    correctAnswer: 'A',
    explanation: 'It explains the method geochemists use.',
    tags: ['reading', 'information and ideas', 'purpose'],
  },
  {
    difficulty: 'medium',
    passage: '"Although the archive is small, its rotating exhibits feature journals, blueprints, and oral histories that reveal the river’s engineering past."',
    question: 'Which word best replaces "small" without changing the meaning?',
    options: ['Modest', 'Extravagant', 'Temporary', 'Ambiguous'],
    correctAnswer: 'A',
    explanation: '“Modest” matches the sense of small scale.',
    tags: ['reading', 'craft and structure', 'vocabulary'],
  },
  {
    difficulty: 'hard',
    passage: '"At first, Jonah saw the mural as a cheerful collage; only later did the tangled circuitry remind him that the piece lamented lost manufacturing jobs."',
    question: 'What shift occurs in Jonah’s understanding?',
    options: [
      'He moves from dismissing the mural to recognizing its message about industry loss.',
      'He decides the mural should be removed.',
      'He plans to copy the mural onto postcards.',
      'He stops caring about public art.',
    ],
    correctAnswer: 'A',
    explanation: 'He recognizes the mural’s deeper commentary.',
    tags: ['reading', 'information and ideas', 'perspective'],
  },
  {
    difficulty: 'medium',
    passage: '"Sensors on the nesting platforms logged that the shorebirds departed ten days earlier than usual during the heat wave."',
    question: 'What does the data suggest?',
    options: [
      'Higher temperatures may trigger early departures.',
      'Bird migrations are entirely random.',
      'Heat waves stop migrations altogether.',
      'Sensors caused the birds to depart.',
    ],
    correctAnswer: 'A',
    explanation: 'Departure coincided with heat, implying a link.',
    tags: ['reading', 'information and ideas', 'data relationships'],
  },
  {
    difficulty: 'medium',
    passage: '"The librarian’s color-coded spreadsheet initially annoyed the volunteers, yet it later solved disputes about who had already vetted which donations."',
    question: 'What does the passage imply?',
    options: [
      'The spreadsheet ultimately proved useful.',
      'Volunteers ignored the librarian’s system.',
      'The librarian deleted all records.',
      'The donations were thrown away.',
    ],
    correctAnswer: 'A',
    explanation: 'Despite annoyance, the system resolved disputes.',
    tags: ['reading', 'information and ideas', 'function'],
  },
  {
    difficulty: 'medium',
    passage: '"Rather than measuring spices, Hakim listens for the skillet’s hiss and watches the sauce darken before adding chilies."',
    question: 'What does the figurative language suggest?',
    options: [
      'Hakim relies on sensory cues to cook.',
      'Hakim refuses to use spices.',
      'Hakim uses laboratory equipment.',
      'Hakim hires assistants to cook.',
    ],
    correctAnswer: 'A',
    explanation: 'Listening and watching show sensory intuition.',
    tags: ['reading', 'craft and structure', 'figurative language'],
  },
  {
    difficulty: 'medium',
    passage: '"After touring the seed bank, Pilar argued that conserving biodiversity requires both storage and restoring the riverbanks where native species once germinated."',
    question: 'Which claim does Pilar make?',
    options: [
      'Restoration must accompany storage.',
      'Seed banks should be closed.',
      'Only labs can protect biodiversity.',
      'Rivers no longer support plants.',
    ],
    correctAnswer: 'A',
    explanation: 'She insists preservation needs habitat restoration.',
    tags: ['reading', 'information and ideas', 'claims'],
  },
  {
    difficulty: 'easy',
    passage: '"Coach Alvarez’s two-sentence pep talk—“Trust your stride, breathe through the hills”—quieted the jittery cross-country team."',
    question: 'What effect did the coach’s words have?',
    options: [
      'They calmed the runners.',
      'They caused an argument.',
      'They canceled the meet.',
      'They revealed a rule change.',
    ],
    correctAnswer: 'A',
    explanation: 'The passage explicitly states it quieted nerves.',
    tags: ['reading', 'information and ideas', 'textual evidence'],
  },
  {
    difficulty: 'medium',
    passage: '"Mira swapped the sensor’s heavy battery for a lighter pack, shaving half a pound but also cutting runtime from eight hours to five."',
    question: 'What trade-off does Mira make?',
    options: [
      'Less weight but shorter operating time.',
      'More weight and shorter time.',
      'Less weight and longer time.',
      'No change in runtime.',
    ],
    correctAnswer: 'A',
    explanation: 'She reduced weight but lost runtime.',
    tags: ['reading', 'information and ideas', 'cause and effect'],
  },
  {
    difficulty: 'hard',
    passage: '"The historian’s essay alternates between cataloging each canal gate and questioning whether maintaining them bankrupted the port."',
    question: 'How is the essay structured?',
    options: [
      'By alternating description with analysis.',
      'By presenting dialogue only.',
      'By listing random facts.',
      'By quoting legislation exclusively.',
    ],
    correctAnswer: 'A',
    explanation: 'It shifts between description and critique.',
    tags: ['reading', 'craft and structure', 'text structure'],
  },
  {
    difficulty: 'medium',
    passage: '"“These dunes hold decades of rainfall data,” the geologist said, holding a core that glittered with mica."',
    question: 'What does the metaphor convey?',
    options: [
      'The dunes preserve valuable historical information.',
      'The dunes are man-made.',
      'The dunes repel researchers.',
      'The dunes contain gemstones.',
    ],
    correctAnswer: 'A',
    explanation: 'Calling dunes a data archive shows they store history.',
    tags: ['reading', 'craft and structure', 'figurative language'],
  },
  {
    difficulty: 'medium',
    passage: '"The journalist juxtaposes a congested modern pier with a photo of five wooden skiffs, underscoring how the harbor transformed."',
    question: 'What is the journalist’s purpose?',
    options: [
      'To highlight how pier usage changed over time.',
      'To promote photography workshops.',
      'To minimize crowding.',
      'To advertise boat rentals.',
    ],
    correctAnswer: 'A',
    explanation: 'Comparing past and present shows change.',
    tags: ['reading', 'information and ideas', 'comparison'],
  },
  {
    difficulty: 'medium',
    passage: '"Margin notes—“verify calcium,” “pull sample Friday”—show the intern reasoning through her experiment on the page."',
    question: 'What do the notes reveal?',
    options: [
      'She is planning next steps in real time.',
      'She has finished the experiment.',
      'She is doodling unrelated sketches.',
      'She ignores lab protocols.',
    ],
    correctAnswer: 'A',
    explanation: 'The notes record immediate actions.',
    tags: ['reading', 'information and ideas', 'evidence'],
  },
  {
    difficulty: 'medium',
    passage: '"Though the string quartet memorized every cue, the violist reminded them to leave space for her improvised solo."',
    question: 'What instruction is being given?',
    options: [
      'Allow flexibility for the solo.',
      'Skip the solo entirely.',
      'Play faster to finish sooner.',
      'Replace the violist.',
    ],
    correctAnswer: 'A',
    explanation: 'She asks them to create space.',
    tags: ['reading', 'information and ideas', 'purpose'],
  },
  {
    difficulty: 'hard',
    passage: '"Two abolitionist newspapers covered the same rally: one praised the precise resolutions; the other lamented that softer voices were drowned out."',
    question: 'What does the contrast show?',
    options: [
      'Eyewitnesses emphasize different aspects of events.',
      'The rally never occurred.',
      'Both papers opposed abolition.',
      'The articles were plagiarized.',
    ],
    correctAnswer: 'A',
    explanation: 'The differing focuses show perspective.',
    tags: ['reading', 'synthesis', 'multiple sources'],
  },
  {
    difficulty: 'medium',
    passage: '"Although this year’s otter survey counted fewer sightings, the lead biologist noted that swollen rivers made tracking difficult."',
    question: 'Which interpretation aligns with the passage?',
    options: [
      'Lower sightings may stem from poor conditions.',
      'Otters have vanished from the river.',
      'Counting conditions guarantee accuracy.',
      'Swollen rivers attract more otters.',
    ],
    correctAnswer: 'A',
    explanation: 'She cautions that conditions affected visibility.',
    tags: ['reading', 'information and ideas', 'evaluating evidence'],
  },
  {
    difficulty: 'medium',
    passage: '"The playwright admits the comedic subplot was added late to offset the drama-imagined storyline’s grief."',
    question: 'What does the playwright reveal?',
    options: [
      'The subplot lightens the tone intentionally.',
      'The play is purely comedic.',
      'The subplot replaces the main story.',
      'The audience disliked the change.',
    ],
    correctAnswer: 'A',
    explanation: 'It was added to balance tragedy.',
    tags: ['reading', 'information and ideas', 'author intent'],
  },
  {
    difficulty: 'medium',
    passage: '"Sharing their field protocols allowed other wetland teams to replicate the carbon measurements."',
    question: 'What does this support?',
    options: [
      'Publishing methods improves reproducibility.',
      'Protocols should remain secret.',
      'Wetlands cannot be studied.',
      'Replication is unnecessary.',
    ],
    correctAnswer: 'A',
    explanation: 'Shared protocols enable replication.',
    tags: ['reading', 'information and ideas', 'scientific reasoning'],
  },
  {
    difficulty: 'hard',
    passage: '"In her memoir, the aerospace engineer treats the celebrated launch as a cautionary tale, pointing to the ignored sensor warning."',
    question: 'What is the memoir’s warning?',
    options: [
      'Success can mask overlooked risks.',
      'Sensor alerts are optional.',
      'Launches should be abandoned.',
      'Engineers should avoid memoirs.',
    ],
    correctAnswer: 'A',
    explanation: 'She warns against overconfidence when ignoring data.',
    tags: ['reading', 'information and ideas', 'theme'],
  },
  {
    difficulty: 'easy',
    passage: '"The beekeeper recorded “Hive Four sluggish—inspect for mites tomorrow” in her log."',
    question: 'What is she planning to do?',
    options: [
      'Check Hive Four for pests the next day.',
      'Harvest honey immediately.',
      'Move all hives off-site.',
      'Stop beekeeping.',
    ],
    correctAnswer: 'A',
    explanation: 'The note schedules a mite inspection.',
    tags: ['reading', 'information and ideas', 'textual evidence'],
  },
  {
    difficulty: 'medium',
    passage: '"Plotting volunteer hours beside student attendance revealed tutoring demand peaks in midterm weeks."',
    question: 'What conclusion follows?',
    options: [
      'Demand is highest mid-semester.',
      'Attendance is unrelated to volunteers.',
      'Volunteers are least needed mid-semester.',
      'Demand stays constant all year.',
    ],
    correctAnswer: 'A',
    explanation: 'The chart shows peaks at midterm weeks.',
    tags: ['reading', 'data interpretation', 'information and ideas'],
    graph: {
      type: 'line',
      data: [
        { week: '1', attendance: 15, volunteers: 6 },
        { week: '4', attendance: 24, volunteers: 10 },
        { week: '8', attendance: 38, volunteers: 16 },
        { week: '12', attendance: 20, volunteers: 8 },
      ],
      config: {
        title: 'Tutoring Demand vs Volunteer Hours',
        xLabel: 'Week of Term',
        yLabel: 'Counts',
        showLegend: true,
        dataKeys: ['attendance', 'volunteers'],
        showGrid: true,
      },
    },
  },
  {
    difficulty: 'medium',
    passage: '"Two editorials debate the wildlife overpass: one celebrates reconnecting habitats; the other urges fixing aging bridges first."',
    question: 'What is the main difference?',
    options: [
      'They prioritize different infrastructure goals.',
      'They both oppose the overpass entirely.',
      'They describe unrelated topics.',
      'They are identical arguments.',
    ],
    correctAnswer: 'A',
    explanation: 'One supports the overpass; the other prefers other spending.',
    tags: ['reading', 'synthesis', 'argument comparison'],
  },
  {
    difficulty: 'medium',
    passage: '"Matching pottery fragments to a distant kiln’s minerals suggested the vessels traveled 180 miles before burial."',
    question: 'What does the evidence suggest?',
    options: [
      'The pottery was likely imported from afar.',
      'The fragments were fake.',
      'The kiln never existed.',
      'Pottery cannot be analyzed chemically.',
    ],
    correctAnswer: 'A',
    explanation: 'Shared minerals imply long-distance transport.',
    tags: ['reading', 'information and ideas', 'inference'],
  },
  {
    difficulty: 'medium',
    passage: '"After staff curated a translated-fiction shelf with handwritten notes, sales in that section doubled."',
    question: 'What conclusion is supported?',
    options: [
      'Curated recommendations boosted translated-fiction sales.',
      'Readers abandoned translated fiction.',
      'Sales doubled before staff intervened.',
      'Translated fiction cannot sell.',
    ],
    correctAnswer: 'A',
    explanation: 'The sales increase followed curation.',
    tags: ['reading', 'information and ideas', 'cause and effect'],
  },
  {
    difficulty: 'medium',
    passage: '"“Tenacious hardly begins to describe her,” the mentor laughed, recalling how Mari rewrote her grant three times in five days."',
    question: 'What does “tenacious” mean here?',
    options: ['Persistent', 'Distracted', 'Forgetful', 'Passive'],
    correctAnswer: 'A',
    explanation: 'Rewriting repeatedly shows persistence.',
    tags: ['reading', 'craft and structure', 'vocabulary'],
  },
  {
    difficulty: 'medium',
    passage: '"Investors asked how steady the recycled-plastic supply was before approving the packaging startup’s prototype."',
    question: 'What concern do investors raise?',
    options: [
      'Reliability of the recycled-material supply.',
      'Number of employees at the startup.',
      'Color of the packaging.',
      'Plans for international offices.',
    ],
    correctAnswer: 'A',
    explanation: 'They want assurance about supply stability.',
    tags: ['reading', 'information and ideas', 'supporting details'],
  },
  {
    difficulty: 'hard',
    passage: '"The transcript toggles between a senator’s emission-cut proposal and the chair’s pointed follow-up questions."',
    question: 'What does the structure emphasize?',
    options: [
      'Tension between the testimony and the committee.',
      'Agreement between all speakers.',
      'A fictional dialogue unrelated to policy.',
      'A chronological list of votes.',
    ],
    correctAnswer: 'A',
    explanation: 'Alternating statements and questions shows tension.',
    tags: ['reading', 'craft and structure', 'text structure'],
  },
  {
    difficulty: 'medium',
    passage: '"The bar chart shows renewable energy shares: Region A 22%, B 29%, C 37%, D 18%."',
    question: 'Which region relies most on renewables?',
    options: ['Region A', 'Region B', 'Region C', 'Region D'],
    correctAnswer: 'C',
    explanation: 'Region C has the highest percentage.',
    tags: ['reading', 'data interpretation', 'information and ideas'],
    graph: {
      type: 'bar',
      data: [
        { region: 'A', percent: 22 },
        { region: 'B', percent: 29 },
        { region: 'C', percent: 37 },
        { region: 'D', percent: 18 },
      ],
      config: {
        title: 'Renewable Share of Electricity',
        xLabel: 'Region',
        yLabel: 'Percent',
        dataKeys: ['percent'],
        showGrid: true,
      },
    },
  },
  {
    difficulty: 'easy',
    passage: '"Letters from Aunt June always began “Dear future architect,” even though none of us had drawn a blueprint yet."',
    question: 'What does the greeting suggest?',
    options: [
      'She encouraged big ambitions playfully.',
      'She believed we were already architects.',
      'She disliked writing letters.',
      'She forgot our names.',
    ],
    correctAnswer: 'A',
    explanation: 'The greeting is affectionate encouragement.',
    tags: ['reading', 'craft and structure', 'tone'],
  },
  {
    difficulty: 'medium',
    passage: '"Residents insist permeable pavers will cut Main Street flooding by letting stormwater soak into the soil."',
    question: 'Which claim is made?',
    options: [
      'Permeable pavers reduce flooding by allowing drainage.',
      'Flooding is unrelated to paving.',
      'Pavers increase potholes.',
      'Main Street never floods.',
    ],
    correctAnswer: 'A',
    explanation: 'They argue pavers lessen flooding.',
    tags: ['reading', 'information and ideas', 'claims'],
  },
  {
    difficulty: 'medium',
    passage: '"Two advisors disagree: one tells students to specialize early; the other urges them to explore multiple disciplines."',
    question: 'What does this disagreement show?',
    options: [
      'Mentors can prioritize different educational philosophies.',
      'Advisors refuse to help students.',
      'All students must specialize early.',
      'Exploration is impossible.',
    ],
    correctAnswer: 'A',
    explanation: 'They value different approaches.',
    tags: ['reading', 'synthesis', 'multiple viewpoints'],
  },
  {
    difficulty: 'medium',
    passage: '"An environmental feature pairs satellite imagery of disappearing marshes with fishers’ testimonies about sailing farther for each catch."',
    question: 'What is the feature’s likely goal?',
    options: [
      'To connect quantitative data with lived experience.',
      'To promote satellite manufacturing.',
      'To dismiss fishers’ concerns.',
      'To advertise tourism packages.',
    ],
    correctAnswer: 'A',
    explanation: 'It links data and personal impacts.',
    tags: ['reading', 'information and ideas', 'integration of sources'],
  },
];

if (readingData.length !== 35) {
  throw new Error(`Expected 35 reading entries, found ${readingData.length}`);
}

const readingSeeds = readingData.map(({ difficulty, passage, question, options, correctAnswer, explanation, tags, graph }) =>
  createSeed({ subject: 'reading', difficulty, questionText: `${passage} ${question}`, options, correctAnswer, explanation, tags, graph })
);

const writingData = [
  {
    difficulty: 'easy',
    sentence: 'The research assistants catalogs each artifact before archiving it.',
    prompt: 'Which portion should be revised?',
    options: ['assistants catalogs', 'each artifact', 'before archiving', 'it'],
    correctAnswer: 'A',
    explanation: 'Plural subject needs plural verb: "assistants catalog."',
    tags: ['writing', 'standard english conventions', 'subject-verb agreement'],
  },
  {
    difficulty: 'easy',
    sentence: 'The robotics team requires closed toed shoes during demonstrations.',
    prompt: 'Which revision is correct?',
    options: ['closed toe shoes', 'closed-toe shoes', 'close-toed shoe', 'closing toe shoes'],
    correctAnswer: 'B',
    explanation: 'Use the hyphenated adjective "closed-toe."',
    tags: ['writing', 'standard english conventions', 'hyphenation'],
  },
  {
    difficulty: 'medium',
    sentence: 'Because the volunteers set up early, therefore the community fair opened ahead of schedule.',
    prompt: 'Choose the best revision.',
    options: [
      'Because the volunteers set up early, the community fair opened ahead of schedule.',
      'Because the volunteers set up early, therefore the fair opened ahead.',
      'Because the volunteers set up early, resulting the fair opened.',
      'Because the volunteers set up early, consequently the fair opened.',
    ],
    correctAnswer: 'A',
    explanation: 'Remove redundant transitions; a single “because” suffices.',
    tags: ['writing', 'standard english conventions', 'sentence structure'],
  },
  {
    difficulty: 'medium',
    sentence: 'The report analyzes affordable childcare, transit options rising in cost, and improving downtown parks.',
    prompt: 'Which option fixes the parallelism?',
    options: [
      'affordable childcare, rising transit costs, and improvements to downtown parks',
      'affordable childcare, transit options rising, and improving downtown parks',
      'affordable childcare, rising transit costs, and improving downtown park',
      'affordable childcare, rising transit costs, and downtown parks to improve',
    ],
    correctAnswer: 'A',
    explanation: 'Maintain noun phrases throughout.',
    tags: ['writing', 'standard english conventions', 'parallelism'],
  },
  {
    difficulty: 'medium',
    sentence: 'The committee reviewed the feasibility memo, they also visited the pilot lot.',
    prompt: 'Which revision best combines the clauses?',
    options: [
      '..., they', '..., also they', '..., and they also visited ...', '... they visited ...',
    ],
    correctAnswer: 'C',
    explanation: 'Use a coordinating conjunction to join independent clauses.',
    tags: ['writing', 'standard english conventions', 'run-on corrections'],
  },
  {
    difficulty: 'medium',
    sentence: 'Nora not only drafted the bylaws but also submitting the membership plan.',
    prompt: 'Choose the correct revision.',
    options: [
      'not only drafted ... but also submitted ...',
      'not only drafting ... but also submitted ...',
      'not only drafted ... but also submitting ...',
      'not only draft ... but also submitted ...',
    ],
    correctAnswer: 'A',
    explanation: 'Both verbs should match tense: drafted / submitted.',
    tags: ['writing', 'standard english conventions', 'parallelism'],
  },
  {
    difficulty: 'medium',
    sentence: 'City Council approved the budget after residents spoke, this outcome surprised few observers.',
    prompt: 'How should the sentence be revised?',
    options: [
      '..., this outcome...', '...; this outcome...', '..., which outcome...', '... therefore outcome ...',
    ],
    correctAnswer: 'B',
    explanation: 'Use a semicolon to join independent clauses.',
    tags: ['writing', 'standard english conventions', 'punctuation'],
  },
  {
    difficulty: 'easy',
    sentence: 'The new bus app is more efficient then the old version.',
    prompt: 'Choose the correct word.',
    options: ['then', 'than', 'there', 'their'],
    correctAnswer: 'B',
    explanation: '“Than” is used for comparisons.',
    tags: ['writing', 'standard english conventions', 'word choice'],
  },
  {
    difficulty: 'medium',
    sentence: 'Our internship coordinator emails weekly reminders; including deadlines, networking events, and workshops.',
    prompt: 'Which revision removes the punctuation error?',
    options: [
      '... reminders, including ...',
      '... reminders; including, ...',
      '... reminders including; ...',
      '... reminders— including ...',
    ],
    correctAnswer: 'A',
    explanation: 'A comma (not semicolon) introduces the "including" phrase.',
    tags: ['writing', 'standard english conventions', 'punctuation'],
  },
  {
    difficulty: 'medium',
    sentence: 'Neither the maps nor the GPS receivers was returned after the trek.',
    prompt: 'Select the correct revision.',
    options: [
      'Neither the maps nor the GPS receivers were returned after the trek.',
      'Neither the maps nor the GPS receivers was returned...',
      'Neither the maps nor the GPS receivers has returned...',
      'Neither the maps nor the GPS receivers is returned...',
    ],
    correctAnswer: 'A',
    explanation: 'Verb agrees with the nearer plural subject.',
    tags: ['writing', 'standard english conventions', 'subject-verb agreement'],
  },
  {
    difficulty: 'medium',
    sentence: 'The fellowship committee values applicants who articulate goals, demonstrate preparation, and that outline community partnerships.',
    prompt: 'Which revision maintains parallel structure?',
    options: [
      '..., demonstrate..., and outline...',
      '..., demonstrates..., and outline...',
      '..., demonstrate..., and outlining...',
      '..., demonstrating..., and outline...',
    ],
    correctAnswer: 'A',
    explanation: 'All verbs should be in the same form.',
    tags: ['writing', 'standard english conventions', 'parallelism'],
  },
  {
    difficulty: 'medium',
    sentence: 'Park rangers track invasive plants because it’s seeds cling to gear.',
    prompt: 'Choose the best correction.',
    options: ['it’s', 'its', 'their', 'there'],
    correctAnswer: 'B',
    explanation: 'Use possessive “its.”',
    tags: ['writing', 'standard english conventions', 'apostrophes'],
  },
  {
    difficulty: 'medium',
    sentence: 'There’s three design prototypes awaiting review.',
    prompt: 'Which revision is correct?',
    options: ['There’s three ...', 'There are three ...', 'Their three ...', 'They’re three ...'],
    correctAnswer: 'B',
    explanation: 'Plural subject requires "there are."',
    tags: ['writing', 'standard english conventions', 'subject-verb agreement'],
  },
  {
    difficulty: 'medium',
    context: 'A memo summarizes survey data on study spaces.',
    prompt: 'Which sentence best references the chart showing 62% prefer shared lounges?',
    options: [
      'Table 2 reveals that nearly two-thirds of respondents favor shared study lounges over private carrels.',
      'Table 2 lists every lounge chair color.',
      'Table 2 shows why students dislike carrels.',
      'Table 2 offers recipes.',
    ],
    correctAnswer: 'A',
    explanation: 'Option A correctly interprets the chart.',
    tags: ['writing', 'expression of ideas', 'using data'],
    graph: {
      type: 'bar',
      data: [
        { space: 'Shared Lounge', percent: 62 },
        { space: 'Private Carrel', percent: 21 },
        { space: 'Library Table', percent: 11 },
        { space: 'Other', percent: 6 },
      ],
      config: {
        title: 'Study Space Preferences',
        xLabel: 'Space',
        yLabel: 'Percent',
        dataKeys: ['percent'],
        showGrid: true,
      },
    },
  },
  {
    difficulty: 'medium',
    sentence: 'Because the sensor array was calibrated carefully, the team expected stable readings, but they still fluctuated.',
    prompt: 'Why is this sentence effective?',
    options: [
      'It completes the dependent clause and contrasts outcomes.',
      'It fragments the thought.',
      'It lacks a subject.',
      'It repeats the same clause twice.',
    ],
    correctAnswer: 'A',
    explanation: 'Dependent and independent clauses are balanced with a contrast.',
    tags: ['writing', 'standard english conventions', 'sentence structure'],
  },
  {
    difficulty: 'medium',
    sentence: 'The museum director greeted the donors and guided they through the exhibit.',
    prompt: 'Select the correct revision.',
    options: [
      'greeted they and guided they',
      'greeted them and guided them',
      'greeted them and guided they',
      'greeted they and guided them',
    ],
    correctAnswer: 'B',
    explanation: 'Use objective pronoun “them.”',
    tags: ['writing', 'standard english conventions', 'pronouns'],
  },
  {
    difficulty: 'hard',
    sentence: 'The pilot study tracked twelve participants for six months: their progress—measured by wellness surveys—were presented to the board.',
    prompt: 'Which correction is needed?',
    options: [
      'Replace “were” with “was.”',
      'Replace colon with comma.',
      'Replace dash with semicolon.',
      'Replace twelve with twelve participants.',
    ],
    correctAnswer: 'A',
    explanation: 'Progress is singular, so use “was.”',
    tags: ['writing', 'standard english conventions', 'subject-verb agreement'],
  },
  {
    difficulty: 'medium',
    sentence: 'While the first composting method costs more, it captures methane that would otherwise escape.',
    prompt: 'What transition is reinforced?',
    options: [
      'It links cost to environmental benefit.',
      'It describes weather.',
      'It removes all costs.',
      'It opposes composting.',
    ],
    correctAnswer: 'A',
    explanation: 'Sentence connects the two ideas, serving as a transition.',
    tags: ['writing', 'expression of ideas', 'transitions'],
  },
  {
    difficulty: 'medium',
    sentence: 'Wrenched from the hillside by heavy rain, the trail crew must rebuild the boardwalk.',
    prompt: 'Which revision removes the dangling modifier?',
    options: [
      'Wrenched from the hillside by heavy rain, the boardwalk must be rebuilt by the crew.',
      'The heavy rain wrenched the boardwalk from the hillside, so the crew must rebuild it.',
      'The crew, wrenched from the hillside, must rebuild.',
      'Rebuilding the boardwalk, the hillside was wrenched.',
    ],
    correctAnswer: 'B',
    explanation: 'Option B makes clear the boardwalk was wrenched.',
    tags: ['writing', 'standard english conventions', 'modifiers'],
  },
  {
    difficulty: 'medium',
    context: 'An email invites volunteers to plant dune grass.',
    prompt: 'Which sentence best motivates and informs readers?',
    options: [
      'Bring gloves and meet at the north dunes at 8 a.m.; together we can anchor this shoreline.',
      'Some people dislike sand.',
      'The dunes are windy.',
      'Volunteers should research dunes on their own.',
    ],
    correctAnswer: 'A',
    explanation: 'It supplies logistics and encouragement.',
    tags: ['writing', 'expression of ideas', 'purpose'],
  },
  {
    difficulty: 'medium',
    sentence: 'The best time to prune the orchard trees are late winter.',
    prompt: 'What change is needed?',
    options: ['replace are with is', 'replace prune with prunes', 'replace trees with tree', 'replace winter with winters'],
    correctAnswer: 'A',
    explanation: 'Subject is singular (“time”), so use “is.”',
    tags: ['writing', 'standard english conventions', 'subject-verb agreement'],
  },
  {
    difficulty: 'hard',
    sentence: 'The committee—which meets monthly and publishes detailed notes—have voted unanimously.',
    prompt: 'Which revision is correct?',
    options: ['committee ... have', 'committee ... has', 'committee ... having', 'committee ... has voting'],
    correctAnswer: 'B',
    explanation: 'Collective noun takes singular verb here.',
    tags: ['writing', 'standard english conventions', 'collective nouns'],
  },
  {
    difficulty: 'medium',
    sentence: 'The cybersecurity club hosted a workshop, the event taught first-years to spot phishing links.',
    prompt: 'How should this be revised?',
    options: [
      '..., and the event taught ...',
      '..., teaching the event ...',
      '..., the event which ...',
      '..., event teaching ...',
    ],
    correctAnswer: 'A',
    explanation: 'Add “and” to fix the comma splice.',
    tags: ['writing', 'standard english conventions', 'run-on corrections'],
  },
  {
    difficulty: 'medium',
    context: 'A grant proposal ends abruptly.',
    prompt: 'Which sentence provides a strong conclusion?',
    options: [
      'By funding this proposal, reviewers will help 120 apprentices access paid clean-energy placements across the region.',
      'The cafeteria is nearby.',
      'The apprentices enjoy hobbies.',
      'The budget table uses blue ink.',
    ],
    correctAnswer: 'A',
    explanation: 'It reiterates impact tied to funding.',
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
    explanation: 'The participial phrase should be attached with a comma.',
    tags: ['writing', 'standard english conventions', 'punctuation'],
  },
  {
    difficulty: 'medium',
    sentence: 'Neither the bylaws nor the updated mentor guidelines mentions virtual attendance policies.',
    prompt: 'Which revision corrects the verb form?',
    options: [
      'change mentions to mention',
      'change mentions to mentioned',
      'change mentions to mentioning',
      'leave the sentence as is',
    ],
    correctAnswer: 'A',
    explanation: 'Verb agrees with the nearer plural subject “guidelines,” so use “mention.”',
    tags: ['writing', 'standard english conventions', 'subject-verb agreement'],
  },
  {
    difficulty: 'medium',
    context: 'A paragraph explains how the robotics lab will use grant funds.',
    prompt: 'Which sentence best introduces the table summarizing parts and costs?',
    options: [
      'Table 3 itemizes each hardware component and the projected cost per unit.',
      'Table 3 lists student birthdays.',
      'Table 3 repeats the executive summary.',
      'Table 3 showcases unrelated recipes.',
    ],
    correctAnswer: 'A',
    explanation: 'Option A signals the fiscal details readers will find in the table.',
    tags: ['writing', 'expression of ideas', 'using data'],
  },
  {
    difficulty: 'medium',
    sentence: 'Because residents had already completed the survey, the planner nevertheless asked them to take it again.',
    prompt: 'Which revision removes the contradictory transition?',
    options: [
      'Because residents had already completed the survey, the planner thanked them for their feedback.',
      'Because residents had already completed the survey, nevertheless the planner thanked them.',
      'Because residents had already completed the survey, but the planner thanked them.',
      'Because residents had already completed the survey, the planner although thanked them.',
    ],
    correctAnswer: 'A',
    explanation: 'Removing “nevertheless” resolves the contradiction.',
    tags: ['writing', 'standard english conventions', 'sentence structure'],
  },
  {
    difficulty: 'medium',
    sentence: 'The innovation brief describes three pilot sites, compares resident feedback, and then explains how those results guide next steps.',
    prompt: 'What does this sentence demonstrate?',
    options: [
      'Clear sequencing with parallel verbs.',
      'A sentence fragment.',
      'A run-on sentence.',
      'Unrelated topics with no order.',
    ],
    correctAnswer: 'A',
    explanation: 'Each clause follows the same verb pattern, showing logical flow.',
    tags: ['writing', 'expression of ideas', 'organization'],
  },
  {
    difficulty: 'medium',
    context: 'A commencement speech urges graduates to embrace experimentation.',
    prompt: 'Which sentence best reinforces that theme?',
    options: [
      'You will test prototypes, iterate, and invite critique as you design communities that do not yet exist.',
      'Graduation gowns are traditionally black.',
      'Please return library books before leaving campus.',
      'Many graduates enjoy pizza after the ceremony.',
    ],
    correctAnswer: 'A',
    explanation: 'It underscores experimentation and iteration.',
    tags: ['writing', 'expression of ideas', 'purpose'],
  },
  {
    difficulty: 'medium',
    sentence: 'The maintenance checklist requires that every valve is inspected, lubricated, and that technicians document temperature readings.',
    prompt: 'Which revision maintains parallel structure?',
    options: [
      '... every valve be inspected, lubricated, and technicians document temperatures.',
      '... every valve be inspected, lubricated, and temperature readings documented.',
      '... every valve is inspected, lubricated, and documented.',
      '... every valve inspected, lubricated, and documentation of temperatures.',
    ],
    correctAnswer: 'B',
    explanation: 'All items share the same passive construction.',
    tags: ['writing', 'standard english conventions', 'parallelism'],
  },
  {
    difficulty: 'medium',
    sentence: 'After the drone footage confirmed erosion, the coastal engineers installed fiber rolls; this decision reduced sand loss by 40 percent.',
    prompt: 'What does this sentence illustrate?',
    options: [
      'A cause-and-effect relationship supported by data.',
      'A sentence fragment.',
      'A missing subject.',
      'An unrelated anecdote.',
    ],
    correctAnswer: 'A',
    explanation: 'It links evidence (footage) to action and quantifies impact.',
    tags: ['writing', 'expression of ideas', 'supporting evidence'],
  },
  {
    difficulty: 'hard',
    sentence: 'The advisory board not only requested quarterly dashboards but also insisting on monthly listening sessions.',
    prompt: 'Which revision fixes the error?',
    options: [
      '... requested ... but also insisted ...',
      '... requesting ... but also insisted ...',
      '... requested ... but also insisting ...',
      '... requests ... but also insisted ...',
    ],
    correctAnswer: 'A',
    explanation: 'Parallel verbs must both appear in past tense.',
    tags: ['writing', 'standard english conventions', 'parallelism'],
  },
  {
    difficulty: 'medium',
    sentence: 'The presentation highlights apprentice testimonials, a map of partner sites, and provides enrollment benchmarks.',
    prompt: 'Which revision ensures grammatical consistency?',
    options: [
      '... highlights testimonials, a map, and enrollment benchmarks.',
      '... highlighting testimonials, map, and providing benchmarks.',
      '... highlights testimonials and map, providing benchmark.',
      '... highlight testimonials, map, and provide benchmark.',
    ],
    correctAnswer: 'A',
    explanation: 'All list items become noun phrases, retaining parallel structure.',
    tags: ['writing', 'standard english conventions', 'parallelism'],
  },
  {
    difficulty: 'medium',
    sentence: 'Chart 4 shows peak bike-share usage in July, so the summary should emphasize adding weekend maintenance crews.',
    prompt: 'What does this sentence accomplish?',
    options: [
      'It interprets the chart and ties it to a recommendation.',
      'It introduces an unrelated anecdote.',
      'It contradicts the data.',
      'It removes the need for a chart.',
    ],
    correctAnswer: 'A',
    explanation: 'The sentence explains the chart’s implication for staffing.',
    tags: ['writing', 'expression of ideas', 'using data'],
  },
];

if (writingData.length !== 35) {
  throw new Error(`Expected 35 writing entries, found ${writingData.length}`);
}

const writingSeeds = writingData.map((item) => {
  const questionText = item.context
    ? `${item.context} ${item.prompt}`
    : `${item.sentence} ${item.prompt}`;
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
    _id: `batch02-${seed.subject}-${String(index + 1).padStart(3, '0')}`,
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

const jsonPath = path.join(outputDir, 'batch-02.json');
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

const csvPath = path.join(outputDir, 'batch-02.csv');
fs.writeFileSync(csvPath, csvRows.join('\n'));

console.log(`Generated ${questions.length} questions to:\n- ${jsonPath}\n- ${csvPath}`);
