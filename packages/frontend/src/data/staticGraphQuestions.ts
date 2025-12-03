import { Question } from '../types';

const baseMeta = {
  generatedBy: 'manual' as const,
  generatedAt: '2025-01-01T00:00:00.000Z',
  timesUsed: 0,
  averageAccuracy: 0,
  averageTimeSpent: 0,
};

const baseTimestamp = '2025-01-01T00:00:00.000Z';

export const staticGraphQuestions: Question[] = [
  {
    _id: 'static-graph-01',
    subject: 'math',
    difficulty: 'medium',
    difficultyScore: 6,
    content: {
      questionText:
        'The graph of f(x) = x² - 4x + 3 is shown. What is the y-value of the vertex?',
      options: ['-1', '-2', '-3', '-4'],
      correctAnswer: 'B',
      explanation:
        'Completing the square or reading from the graph shows the vertex at (2, -1). Therefore the y-value is -1.',
      graph: {
        type: 'line',
        data: [
          { x: -1, y: 8 },
          { x: 0, y: 3 },
          { x: 1, y: 0 },
          { x: 2, y: -1 },
          { x: 3, y: 0 },
          { x: 4, y: 3 },
          { x: 5, y: 8 },
        ],
        config: {
          title: 'Graph of f(x) = x² - 4x + 3',
          xLabel: 'x',
          yLabel: 'f(x)',
          xDomain: [-2, 6],
          yDomain: [-2, 10],
          showGrid: true,
        },
      },
    },
    metadata: baseMeta,
    tags: ['quadratic', 'vertex', 'graphs'],
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
  {
    _id: 'static-graph-02',
    subject: 'math',
    difficulty: 'easy',
    difficultyScore: 4,
    content: {
      questionText:
        'According to the linear graph shown, what is f(2) for the function f(x) = 2x + 1?',
      options: ['2', '3', '5', '6'],
      correctAnswer: 'C',
      explanation:
        'Substituting x = 2 into f(x) = 2x + 1 gives f(2) = 5, which matches the point on the graph.',
      graph: {
        type: 'line',
        data: [
          { x: -2, y: -3 },
          { x: -1, y: -1 },
          { x: 0, y: 1 },
          { x: 1, y: 3 },
          { x: 2, y: 5 },
          { x: 3, y: 7 },
          { x: 4, y: 9 },
        ],
        config: {
          title: 'Graph of f(x) = 2x + 1',
          xLabel: 'x',
          yLabel: 'f(x)',
          xDomain: [-3, 5],
          yDomain: [-4, 10],
          showGrid: true,
        },
      },
    },
    metadata: baseMeta,
    tags: ['linear', 'function evaluation'],
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
  {
    _id: 'static-graph-03',
    subject: 'math',
    difficulty: 'medium',
    difficultyScore: 6,
    content: {
      questionText:
        'The exponential growth of a colony is represented by the graph. Approximately how many bacteria are present at day 4?',
      options: ['200', '350', '450', '600'],
      correctAnswer: 'C',
      explanation:
        'At day 4 the y-value on the exponential curve is just under 500, making 450 the best estimate.',
      graph: {
        type: 'line',
        data: [
          { x: 0, y: 100 },
          { x: 1, y: 150 },
          { x: 2, y: 220 },
          { x: 3, y: 320 },
          { x: 4, y: 450 },
          { x: 5, y: 620 },
          { x: 6, y: 850 },
        ],
        config: {
          title: 'Bacteria Growth Over Time',
          xLabel: 'Days',
          yLabel: 'Population',
          xDomain: [0, 6],
          yDomain: [0, 900],
          showGrid: true,
        },
      },
    },
    metadata: baseMeta,
    tags: ['exponential', 'data analysis'],
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
  {
    _id: 'static-graph-04',
    subject: 'math',
    difficulty: 'medium',
    difficultyScore: 5,
    content: {
      questionText:
        'The scatter plot shows the relationship between study hours and practice test scores. Which option best describes the trend?',
      options: [
        'No correlation',
        'Negative correlation',
        'Positive correlation',
        'Nonlinear correlation',
      ],
      correctAnswer: 'C',
      explanation:
        'As study hours increase, test scores also increase, indicating a positive correlation.',
      graph: {
        type: 'scatter',
        data: [
          { x: 1, y: 50 },
          { x: 2, y: 58 },
          { x: 3, y: 64 },
          { x: 4, y: 70 },
          { x: 5, y: 76 },
          { x: 6, y: 82 },
          { x: 7, y: 87 },
          { x: 8, y: 92 },
        ],
        config: {
          title: 'Study Hours vs Practice Scores',
          xLabel: 'Study Hours',
          yLabel: 'Score',
          xDomain: [0, 9],
          yDomain: [40, 100],
          showGrid: true,
        },
      },
    },
    metadata: baseMeta,
    tags: ['scatter', 'statistics'],
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
  {
    _id: 'static-graph-05',
    subject: 'math',
    difficulty: 'medium',
    difficultyScore: 5,
    content: {
      questionText:
        'The bar chart shows the number of students enrolled in each club. How many more students are in Robotics than in Drama?',
      options: ['5', '10', '15', '20'],
      correctAnswer: 'B',
      explanation:
        'Robotics has 45 students while Drama has 35, a difference of 10 students.',
      graph: {
        type: 'bar',
        data: [
          { category: 'Math', students: 30 },
          { category: 'Science', students: 40 },
          { category: 'Drama', students: 35 },
          { category: 'Robotics', students: 45 },
          { category: 'Art', students: 28 },
        ],
        config: {
          title: 'Club Enrollment',
          xLabel: 'Club',
          yLabel: 'Students',
          showGrid: true,
          dataKeys: ['students'],
        },
      },
    },
    metadata: baseMeta,
    tags: ['bar chart', 'data interpretation'],
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
  {
    _id: 'static-graph-06',
    subject: 'math',
    difficulty: 'medium',
    difficultyScore: 5,
    content: {
      questionText:
        'The pie chart represents a student’s weekly time allocation. What percent of time is spent on homework and studying combined?',
      options: ['35%', '45%', '55%', '65%'],
      correctAnswer: 'D',
      explanation:
        'Homework (30%) plus studying (35%) totals 65% of the time allocation.',
      graph: {
        type: 'pie',
        data: [
          { name: 'Classes', value: 25 },
          { name: 'Homework', value: 30 },
          { name: 'Studying', value: 35 },
          { name: 'Activities', value: 10 },
        ],
        config: {
          title: 'Weekly Time Allocation (%)',
          showLegend: true,
        },
      },
    },
    metadata: baseMeta,
    tags: ['pie chart', 'percentages'],
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
  {
    _id: 'static-graph-07',
    subject: 'math',
    difficulty: 'medium',
    difficultyScore: 6,
    content: {
      questionText:
        'The area chart shows cumulative rainfall over a week. How many total inches of rain fell by Day 5?',
      options: ['2.4', '2.9', '3.5', '4.0'],
      correctAnswer: 'B',
      explanation:
        'By Day 5 the cumulative rainfall reaches approximately 2.9 inches on the chart.',
      graph: {
        type: 'area',
        data: [
          { x: 1, rainfall: 0.4 },
          { x: 2, rainfall: 0.9 },
          { x: 3, rainfall: 1.6 },
          { x: 4, rainfall: 2.3 },
          { x: 5, rainfall: 2.9 },
          { x: 6, rainfall: 3.4 },
          { x: 7, rainfall: 3.8 },
        ],
        config: {
          title: 'Cumulative Rainfall (inches)',
          xLabel: 'Day',
          yLabel: 'Total Rainfall',
          xDomain: [1, 7],
          yDomain: [0, 4.5],
          showGrid: true,
          dataKeys: ['rainfall'],
        },
      },
    },
    metadata: baseMeta,
    tags: ['area chart', 'cumulative'],
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
  {
    _id: 'static-graph-08',
    subject: 'math',
    difficulty: 'medium',
    difficultyScore: 5,
    content: {
      questionText:
        'The graph shows the profit (in thousands of dollars) for two products. In which month does Product B first surpass Product A?',
      options: ['Month 2', 'Month 3', 'Month 4', 'Month 5'],
      correctAnswer: 'C',
      explanation:
        'The lines intersect between months 3 and 4, and at Month 4 Product B is above Product A for the first time.',
      graph: {
        type: 'line',
        data: [
          { x: 1, productA: 12, productB: 8 },
          { x: 2, productA: 15, productB: 11 },
          { x: 3, productA: 17, productB: 15 },
          { x: 4, productA: 16, productB: 18 },
          { x: 5, productA: 18, productB: 22 },
        ],
        config: {
          title: 'Monthly Profit (Thousands)',
          xLabel: 'Month',
          yLabel: 'Profit',
          xDomain: [1, 5],
          yDomain: [6, 24],
          showGrid: true,
          showLegend: true,
          dataKeys: ['productA', 'productB'],
        },
      },
    },
    metadata: baseMeta,
    tags: ['line', 'comparison'],
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
  {
    _id: 'static-graph-09',
    subject: 'math',
    difficulty: 'easy',
    difficultyScore: 4,
    content: {
      questionText:
        'The bar chart shows books sold by genre. Which genre sold the fewest books?',
      options: ['Mystery', 'Fantasy', 'Nonfiction', 'Science Fiction'],
      correctAnswer: 'B',
      explanation:
        'Fantasy has the smallest bar at around 22 books, less than any other genre shown.',
      graph: {
        type: 'bar',
        data: [
          { category: 'Mystery', books: 35 },
          { category: 'Fantasy', books: 22 },
          { category: 'Nonfiction', books: 31 },
          { category: 'Science Fiction', books: 28 },
        ],
        config: {
          title: 'Books Sold by Genre',
          xLabel: 'Genre',
          yLabel: 'Books Sold',
          showGrid: true,
          dataKeys: ['books'],
        },
      },
    },
    metadata: baseMeta,
    tags: ['bar chart', 'reading'],
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
  {
    _id: 'static-graph-10',
    subject: 'math',
    difficulty: 'medium',
    difficultyScore: 6,
    content: {
      questionText:
        'The pie chart shows budget allocations for a robotics team. If the total budget is $4,000, how much is allocated to hardware?',
      options: ['$1,200', '$1,400', '$1,600', '$1,800'],
      correctAnswer: 'C',
      explanation:
        'Hardware takes 40% of the budget. 40% of $4,000 is $1,600.',
      graph: {
        type: 'pie',
        data: [
          { name: 'Hardware', value: 40 },
          { name: 'Software', value: 25 },
          { name: 'Travel', value: 20 },
          { name: 'Marketing', value: 15 },
        ],
        config: {
          title: 'Robotics Team Budget (%)',
          showLegend: true,
        },
      },
    },
    metadata: baseMeta,
    tags: ['pie chart', 'percent'],
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
  {
    _id: 'static-graph-11',
    subject: 'math',
    difficulty: 'medium',
    difficultyScore: 5,
    content: {
      questionText:
        'The scatter plot displays outdoor temperature vs. ice cream sales. Which temperature best aligns with selling 175 cones?',
      options: ['68°F', '72°F', '78°F', '84°F'],
      correctAnswer: 'C',
      explanation:
        'The point near 175 cones corresponds to approximately 78°F on the scatter plot.',
      graph: {
        type: 'scatter',
        data: [
          { x: 65, y: 120 },
          { x: 68, y: 135 },
          { x: 72, y: 150 },
          { x: 75, y: 165 },
          { x: 78, y: 175 },
          { x: 82, y: 185 },
          { x: 85, y: 195 },
        ],
        config: {
          title: 'Temperature vs Ice Cream Sales',
          xLabel: 'Temperature (°F)',
          yLabel: 'Cones Sold',
          xDomain: [60, 90],
          yDomain: [100, 210],
          showGrid: true,
        },
      },
    },
    metadata: baseMeta,
    tags: ['scatter', 'correlation'],
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
  {
    _id: 'static-graph-12',
    subject: 'math',
    difficulty: 'hard',
    difficultyScore: 7,
    content: {
      questionText:
        'The sinusoidal graph represents h(t) = 3sin(t) + 2, modeling height of a buoy. What is the maximum height reached?',
      options: ['2 feet', '3 feet', '5 feet', '6 feet'],
      correctAnswer: 'C',
      explanation:
        'Amplitude is 3 with midline 2, so maximum is 2 + 3 = 5 feet.',
      graph: {
        type: 'line',
        data: [
          { x: 0, y: 2 },
          { x: 1, y: 4.5 },
          { x: 2, y: 5 },
          { x: 3, y: 4.5 },
          { x: 4, y: 2 },
          { x: 5, y: -0.5 },
          { x: 6, y: -1 },
          { x: 7, y: -0.5 },
          { x: 8, y: 2 },
        ],
        config: {
          title: 'Height of Buoy Over Time',
          xLabel: 'Time (seconds)',
          yLabel: 'Height (feet)',
          xDomain: [0, 8],
          yDomain: [-2, 6],
          showGrid: true,
          dataKeys: ['y'],
        },
      },
    },
    metadata: baseMeta,
    tags: ['trigonometry', 'graphs'],
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
  {
    _id: 'static-graph-13',
    subject: 'math',
    difficulty: 'medium',
    difficultyScore: 5,
    content: {
      questionText:
        'The area chart models cumulative savings over months. Approximately how much is saved after Month 6?',
      options: ['$1,050', '$1,200', '$1,350', '$1,500'],
      correctAnswer: 'B',
      explanation:
        'At month 6 the cumulative savings curve hits roughly $1,200.',
      graph: {
        type: 'area',
        data: [
          { x: 1, savings: 150 },
          { x: 2, savings: 320 },
          { x: 3, savings: 520 },
          { x: 4, savings: 750 },
          { x: 5, savings: 980 },
          { x: 6, savings: 1200 },
          { x: 7, savings: 1450 },
          { x: 8, savings: 1700 },
        ],
        config: {
          title: 'Cumulative Savings',
          xLabel: 'Month',
          yLabel: 'Savings ($)',
          xDomain: [1, 8],
          yDomain: [0, 1800],
          showGrid: true,
          dataKeys: ['savings'],
        },
      },
    },
    metadata: baseMeta,
    tags: ['area chart', 'finance'],
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
  {
    _id: 'static-graph-14',
    subject: 'math',
    difficulty: 'medium',
    difficultyScore: 5,
    content: {
      questionText:
        'The line graph displays distance traveled over time for a jogger. What is the average speed between 10 and 20 minutes?',
      options: ['0.4 miles/min', '0.5 miles/min', '0.6 miles/min', '0.8 miles/min'],
      correctAnswer: 'B',
      explanation:
        'Distance increases from 5 miles at 10 min to 10 miles at 20 min, so (10-5)/(20-10) = 0.5 miles per minute.',
      graph: {
        type: 'line',
        data: [
          { x: 0, y: 0 },
          { x: 5, y: 2.5 },
          { x: 10, y: 5 },
          { x: 15, y: 7.5 },
          { x: 20, y: 10 },
          { x: 25, y: 12.5 },
        ],
        config: {
          title: 'Distance vs Time',
          xLabel: 'Time (minutes)',
          yLabel: 'Distance (miles)',
          xDomain: [0, 25],
          yDomain: [0, 14],
          showGrid: true,
        },
      },
    },
    metadata: baseMeta,
    tags: ['rate', 'line graph'],
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
  {
    _id: 'static-graph-15',
    subject: 'math',
    difficulty: 'medium',
    difficultyScore: 6,
    content: {
      questionText:
        'A nutritionist tracked daily sugar intake shown in the bar chart. What is the median intake value?',
      options: ['28 grams', '30 grams', '32 grams', '34 grams'],
      correctAnswer: 'B',
      explanation:
        'Arranging the five bars (26, 28, 30, 32, 34), the middle value is 30 grams.',
      graph: {
        type: 'bar',
        data: [
          { category: 'Mon', grams: 26 },
          { category: 'Tue', grams: 28 },
          { category: 'Wed', grams: 30 },
          { category: 'Thu', grams: 32 },
          { category: 'Fri', grams: 34 },
        ],
        config: {
          title: 'Daily Sugar Intake',
          xLabel: 'Day',
          yLabel: 'Grams',
          showGrid: true,
          dataKeys: ['grams'],
        },
      },
    },
    metadata: baseMeta,
    tags: ['statistics', 'median'],
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
  {
    _id: 'static-graph-16',
    subject: 'math',
    difficulty: 'medium',
    difficultyScore: 5,
    content: {
      questionText:
        'The line graph compares water temperature cooling over time for two samples. Which sample reaches 40°C first?',
      options: ['Sample A', 'Sample B', 'Both at the same time', 'Neither reaches 40°C'],
      correctAnswer: 'B',
      explanation:
        'Sample B starts cooler and hits 40°C at around 8 minutes, while Sample A hits 40°C closer to 10 minutes.',
      graph: {
        type: 'line',
        data: [
          { x: 0, sampleA: 90, sampleB: 80 },
          { x: 2, sampleA: 75, sampleB: 65 },
          { x: 4, sampleA: 64, sampleB: 55 },
          { x: 6, sampleA: 52, sampleB: 45 },
          { x: 8, sampleA: 44, sampleB: 40 },
          { x: 10, sampleA: 38, sampleB: 35 },
        ],
        config: {
          title: 'Cooling Water Samples',
          xLabel: 'Time (minutes)',
          yLabel: 'Temperature (°C)',
          xDomain: [0, 10],
          yDomain: [30, 95],
          showGrid: true,
          showLegend: true,
          dataKeys: ['sampleA', 'sampleB'],
        },
      },
    },
    metadata: baseMeta,
    tags: ['line', 'comparison'],
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
  {
    _id: 'static-graph-17',
    subject: 'math',
    difficulty: 'easy',
    difficultyScore: 4,
    content: {
      questionText:
        'The rectangle shows a unit divided into 4 equal parts with one part shaded. What fraction of the whole is shaded?',
      options: ['1/4', '1/3', '1/2', '3/4'],
      correctAnswer: 'A',
      explanation: 'Only one of the four equal regions is shaded, so the shaded portion is 1 out of 4 parts, or 1/4.',
      graph: {
        type: 'fraction-rectangle',
        data: [],
        config: {
          title: 'Fraction Model',
          rectangleConfig: {
            rows: 1,
            cols: 4,
            shadedCells: [0],
            caption: 'Each cell represents 1/4 of the whole.',
          },
        },
      },
    },
    metadata: baseMeta,
    tags: ['fractions', 'visual model'],
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
  {
    _id: 'static-graph-18',
    subject: 'math',
    difficulty: 'easy',
    difficultyScore: 4,
    content: {
      questionText:
        'The rectangle below is divided into 8 equal sections. How much of the rectangle is unshaded?',
      options: ['3/8', '5/8', '1/2', '7/8'],
      correctAnswer: 'B',
      explanation: 'Three of the eight sections are shaded, leaving 5 out of 8 unshaded, which is 5/8.',
      graph: {
        type: 'fraction-rectangle',
        data: [],
        config: {
          title: 'Shaded vs Unshaded',
          rectangleConfig: {
            rows: 2,
            cols: 4,
            shadedCells: [0, 1, 2],
            caption: 'Shaded sections represent 3/8; the unshaded portion is 5/8.',
          },
        },
      },
    },
    metadata: baseMeta,
    tags: ['fractions', 'subtraction'],
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
  {
    _id: 'static-graph-19',
    subject: 'math',
    difficulty: 'medium',
    difficultyScore: 5,
    content: {
      questionText:
        'The model shows a rectangle partitioned into 6 equal parts with 4 shaded. Which expression matches the shaded portion?',
      options: ['2/3', '3/5', '4/6', '5/6'],
      correctAnswer: 'A',
      explanation:
        'Four out of the six parts are shaded, which simplifies to 4/6 = 2/3.',
      graph: {
        type: 'fraction-rectangle',
        data: [],
        config: {
          title: 'Equivalent Fractions',
          rectangleConfig: {
            rows: 2,
            cols: 3,
            shadedCells: [0, 1, 3, 4],
            caption: '4 shaded parts out of 6 total.',
          },
        },
      },
    },
    metadata: baseMeta,
    tags: ['fractions', 'equivalence'],
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
  {
    _id: 'static-graph-20',
    subject: 'math',
    difficulty: 'medium',
    difficultyScore: 5,
    content: {
      questionText:
        'The rectangle represents 1 whole pizza. If the shaded portion is eaten, what fraction remains?',
      options: ['1/5', '2/5', '3/5', '4/5'],
      correctAnswer: 'C',
      explanation:
        'Two of the five equal slices are shaded (eaten), so 3/5 of the pizza remains unshaded.',
      graph: {
        type: 'fraction-rectangle',
        data: [],
        config: {
          title: 'Pizza Model',
          rectangleConfig: {
            rows: 1,
            cols: 5,
            shadedCells: [0, 1],
            caption: 'Shaded = eaten, unshaded = remaining.',
          },
        },
      },
    },
    metadata: baseMeta,
    tags: ['fractions', 'word problems'],
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
  {
    _id: 'static-graph-21',
    subject: 'math',
    difficulty: 'medium',
    difficultyScore: 6,
    content: {
      questionText:
        'In quadrilateral ABCD, the interior angles at A, B, and C measure 92°, 110°, and 35° respectively, as shown. What is the measure of angle D (x°)?',
      options: ['111°', '123°', '135°', '143°'],
      correctAnswer: 'B',
      explanation:
        'The interior angles of any quadrilateral add up to 360°. Subtracting the known angles, x = 360° − (92° + 110° + 35°) = 123°.',
      graph: {
        type: 'polygon',
        config: {
          title: 'Quadrilateral ABCD',
          polygonConfig: {
            points: [
              { label: 'A', x: 15, y: 80 },
              { label: 'B', x: 82, y: 78 },
              { label: 'D', x: 70, y: 18 },
              { label: 'C', x: 25, y: 22 },
            ],
            pointLabelOffset: { x: -4, y: -2 },
            extraLines: [{ from: 0, to: 2 }],
            angleLabels: [
              { text: '92°', atVertex: 'A', radialOffset: 0.08 },
              { text: '110°', atVertex: 'B', radialOffset: 0.08 },
              { text: '35°', atVertex: 'C', radialOffset: 0.08 },
              { text: 'x°', atVertex: 'D', radialOffset: 0.08 },
            ],
            sideLabels: [
              { text: 'AB', onSide: ['A', 'B'], position: 0.5, offset: { y: 8 } },
              { text: 'BC', onSide: ['B', 'C'], position: 0.55, offset: { x: 8 }, preferInside: true },
              { text: 'CD', onSide: ['C', 'D'], position: 0.5, offset: { y: -6 }, preferInside: true },
              { text: 'DA', onSide: ['D', 'A'], position: 0.45, offset: { x: -10, y: 4 }, preferInside: true },
            ],
          },
        },
      },
    },
    metadata: baseMeta,
    tags: ['quadrilaterals', 'angle sum'],
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
  {
    _id: 'static-graph-22',
    subject: 'math',
    difficulty: 'medium',
    difficultyScore: 6,
    content: {
      questionText:
        'Right triangle ABC has a right angle at B. Side AB measures 9 units, and angle A is 35°. What is the length of the hypotenuse AC?',
      options: ['10.2', '11.0', '12.3', '13.4'],
      correctAnswer: 'B',
      explanation:
        'AB is adjacent to angle A, so cos(35°) = AB / AC. Thus AC = AB / cos(35°) ≈ 9 / 0.819 ≈ 11.0 units.',
      graph: {
        type: 'polygon',
        config: {
          title: 'Right Triangle ABC',
          polygonConfig: {
            points: [
              { label: 'A', x: 15, y: 80 },
              { label: 'B', x: 75, y: 80 },
              { label: 'C', x: 75, y: 20 },
            ],
            pointLabelOffset: { x: 2, y: -2 },
            angleLabels: [
              { text: '35°', atVertex: 'A', radialOffset: 0.08 },
              { text: '90°', atVertex: 'B', radialOffset: 0.08 },
            ],
            sideLabels: [
              { text: 'AB = 9', onSide: ['A', 'B'], position: 0.5, offset: { y: 8 } },
              { text: 'BC = ?', onSide: ['B', 'C'], position: 0.5, offset: { x: 6 }, preferInside: true },
              { text: 'AC = ?', onSide: ['A', 'C'], position: 0.45, offset: { x: -8, y: -2 }, preferInside: true },
            ],
            extraLines: [{ from: 0, to: 2 }],
          },
        },
      },
    },
    metadata: baseMeta,
    tags: ['trigonometry', 'cosine'],
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
  {
    _id: 'static-graph-23',
    subject: 'math',
    difficulty: 'medium',
    difficultyScore: 6,
    content: {
      questionText:
        'A wheelchair ramp makes a 28° angle with the ground and is 18 feet long. To the nearest tenth of a foot, how high does the ramp reach?',
      options: ['7.5 ft', '8.4 ft', '8.9 ft', '9.4 ft'],
      correctAnswer: 'B',
      explanation:
        'The height is the side opposite the 28° angle. Using sin(28°) = height / 18 gives height = 18 · sin(28°) ≈ 18 · 0.469 = 8.4 ft.',
      graph: {
        type: 'polygon',
        config: {
          title: 'Ramp Height Model',
          polygonConfig: {
            points: [
              { label: 'Ground', x: 15, y: 80, labelOffset: { x: 8, y: -2 } },
              { label: 'Base', x: 80, y: 80, labelOffset: { x: 2, y: -2 } },
              { label: 'Platform', x: 80, y: 28, labelOffset: { x: 2, y: -2 } },
            ],
            pointLabelOffset: { x: 0, y: -2 },
            angleLabels: [{ text: '28°', atVertex: 'Ground', radialOffset: 0.08 }],
            sideLabels: [
              { text: 'Ramp = 18 ft', onSide: ['Ground', 'Platform'], position: 0.5, offset: { y: -4 }, preferInside: true },
              {
                text: 'Height = ?',
                onSide: ['Base', 'Platform'],
                position: 0.6,
                align: 'start',
                offset: { x: 4 },
              },
            ],
            extraLines: [{ from: 0, to: 2 }],
          },
        },
      },
    },
    metadata: baseMeta,
    tags: ['trigonometry', 'sine'],
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
  },
];


