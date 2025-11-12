# Graph and Math Rendering Implementation Plan

## Executive Summary

This document outlines the implementation strategy for two critical features:
1. **Graph Rendering**: Display mathematical graphs (line, bar, scatter, etc.) in SAT questions
2. **Math Notation**: Render LaTeX mathematical expressions in the AI coach chat interface

## 1. Graph Types Used in SAT Math Questions

Based on research, SAT math questions commonly include:

### Core Graph Types
1. **Line Graphs** - Trends over time, linear/non-linear functions
2. **Bar Charts** - Comparing discrete categories
3. **Scatter Plots** - Relationships between two variables, correlation
4. **Histograms** - Frequency distributions
5. **Pie Charts** - Proportions and percentages
6. **Box-and-Whisker Plots** - Statistical distributions, quartiles, outliers

### Mathematical Function Graphs
7. **Linear Functions** - `y = mx + b` on coordinate planes
8. **Quadratic Functions** - Parabolas, `y = ax² + bx + c`
9. **Exponential Functions** - Growth/decay curves
10. **Polynomial Functions** - Higher-degree curves
11. **Piecewise Functions** - Combined function graphs
12. **Systems of Equations** - Multiple lines/curves on same plane

## 2. Technology Stack Recommendations

### For Graph Rendering: **Recharts** ✅
**NPM Package**: `recharts`
**Version**: Latest (3.3.0+)

**Why Recharts?**
- ✅ Built specifically for React (declarative components)
- ✅ TypeScript support out of the box
- ✅ Covers all SAT graph types we need
- ✅ Lightweight and performant
- ✅ SVG-based (scales perfectly)
- ✅ Responsive and customizable
- ✅ Active maintenance and good documentation
- ✅ No D3.js knowledge required

**Available Chart Types**:
- `LineChart` - Linear, quadratic, polynomial functions
- `BarChart` - Bar graphs
- `ScatterChart` - Scatter plots with correlations
- `AreaChart` - Area under curves
- `PieChart` - Pie charts
- `ComposedChart` - Multiple chart types combined

### For Math Notation: **react-markdown + KaTeX** ✅
**NPM Packages**:
- `react-markdown` - Markdown parser for React
- `remark-math` - Parse math syntax in markdown
- `rehype-katex` - Render math using KaTeX
- `katex` - Fast LaTeX math renderer

**Why This Stack?**
- ✅ KaTeX is significantly faster than MathJax
- ✅ No external dependencies (runs offline)
- ✅ Print-quality rendering
- ✅ Seamless integration with markdown
- ✅ Supports inline `$...$` and display `$$...$$` math
- ✅ Perfect for chat interfaces
- ✅ React-markdown handles all formatting needs

## 3. AI Integration Strategy

### How AI Will Generate Graphs

The AI (GPT-4o-mini) will generate structured data that our frontend can render. Two approaches:

#### Approach A: **Data-Only Generation** (RECOMMENDED)
AI generates just the data, frontend uses predefined templates.

**AI Output Example**:
```json
{
  "graphType": "LineChart",
  "data": [
    { "x": -5, "y": 25 },
    { "x": -4, "y": 16 },
    { "x": -3, "y": 9 },
    { "x": -2, "y": 4 },
    { "x": -1, "y": 1 },
    { "x": 0, "y": 0 },
    { "x": 1, "y": 1 },
    { "x": 2, "y": 4 },
    { "x": 3, "y": 9 },
    { "x": 4, "y": 16 },
    { "x": 5, "y": 25 }
  ],
  "config": {
    "xLabel": "x",
    "yLabel": "y = x²",
    "title": "Quadratic Function",
    "domain": { "x": [-5, 5], "y": [0, 30] }
  }
}
```

#### Approach B: **Formula-Based Generation** (ADVANCED)
AI provides mathematical formula, frontend calculates points.

**AI Output Example**:
```json
{
  "graphType": "function",
  "formula": "x^2",
  "range": { "xMin": -5, "xMax": 5, "step": 0.5 },
  "config": {
    "xLabel": "x",
    "yLabel": "y",
    "title": "y = x²"
  }
}
```

**Recommendation**: Start with **Approach A** for simplicity and reliability.

### Question Schema Extension

Update question schema to include optional graph data:

```typescript
interface QuestionContent {
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  
  // NEW: Optional graph data
  graph?: {
    type: 'line' | 'bar' | 'scatter' | 'histogram' | 'pie' | 'function';
    data: Array<Record<string, number | string>>;
    config: {
      title?: string;
      xLabel?: string;
      yLabel?: string;
      xDomain?: [number, number];
      yDomain?: [number, number];
      width?: number;
      height?: number;
    };
  };
}
```

### AI Prompt Strategy

**System Prompt Addition**:
```
When generating questions that involve graphs or data visualization:

1. Include a "graph" object with the question
2. Choose appropriate graph type: line, bar, scatter, histogram, pie
3. Generate realistic data points (10-20 points for functions, fewer for discrete data)
4. Ensure data makes mathematical sense
5. Include axis labels and reasonable domains

Example for quadratic function question:
{
  "graph": {
    "type": "line",
    "data": [{"x": -3, "y": 9}, {"x": -2, "y": 4}, ...],
    "config": {
      "xLabel": "x",
      "yLabel": "y",
      "title": "y = x²",
      "xDomain": [-5, 5],
      "yDomain": [0, 30]
    }
  }
}
```

## 4. Implementation Plan

### Phase 1: Setup Dependencies ✅

**Install Required Packages**:
```bash
cd packages/frontend
npm install recharts react-markdown remark-math rehype-katex katex
npm install --save-dev @types/katex
```

**Estimated Time**: 15 minutes

---

### Phase 2: Create Graph Component 📊

**File**: `packages/frontend/src/components/GraphRenderer.tsx`

**Features**:
- Accept graph data from question
- Render appropriate Recharts component based on type
- Handle responsive sizing
- Error boundaries for malformed data
- Fallback UI if graph fails to render

**Component Structure**:
```typescript
interface GraphData {
  type: 'line' | 'bar' | 'scatter' | 'histogram' | 'pie' | 'function';
  data: Array<Record<string, any>>;
  config: GraphConfig;
}

interface GraphConfig {
  title?: string;
  xLabel?: string;
  yLabel?: string;
  xDomain?: [number, number];
  yDomain?: [number, number];
  width?: number;
  height?: number;
}

export const GraphRenderer: React.FC<{ graphData: GraphData }> = ({ graphData }) => {
  // Render appropriate chart based on graphData.type
}
```

**Estimated Time**: 3-4 hours

---

### Phase 3: Create Math Markdown Component 📐

**File**: `packages/frontend/src/components/MathMarkdown.tsx`

**Features**:
- Render markdown with LaTeX math
- Support inline math: `$E = mc^2$`
- Support display math: `$$\int_{-\infty}^{\infty} e^{-x^2} dx$$`
- Custom styling for chat interface
- Syntax highlighting for code blocks

**Component Structure**:
```typescript
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export const MathMarkdown: React.FC<{ content: string }> = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
    >
      {content}
    </ReactMarkdown>
  );
};
```

**Estimated Time**: 2-3 hours

---

### Phase 4: Update Question Panel 🎯

**File**: `packages/frontend/src/components/QuestionPanel.tsx`

**Changes**:
- Import and integrate `GraphRenderer`
- Display graph below question text if present
- Ensure responsive layout (graph doesn't overflow)
- Add loading states for graph rendering

**Estimated Time**: 2 hours

---

### Phase 5: Update Chat Panel 💬

**File**: `packages/frontend/src/components/ChatPanel.tsx`

**Changes**:
- Replace plain text rendering with `MathMarkdown` component
- Style math expressions appropriately
- Ensure LaTeX renders correctly in both user and AI messages
- Handle edge cases (malformed LaTeX)

**Estimated Time**: 2 hours

---

### Phase 6: Update AI Backend Prompts 🤖

**Files**:
- `packages/ai-backend/src/services/promptService.ts`
- `packages/ai-backend/src/services/questionGenerationService.ts`

**Changes**:
1. Add graph generation instructions to question prompts
2. Update response parsing to extract graph data
3. Validate graph data structure
4. Add examples of graph-enabled questions

**Example Prompt Addition**:
```typescript
const GRAPH_GENERATION_INSTRUCTIONS = `
When the question requires visual representation, include a "graph" object:

For function graphs:
{
  "graph": {
    "type": "line",
    "data": [{"x": -3, "y": 9}, {"x": -2, "y": 4}, ...],
    "config": {"xLabel": "x", "yLabel": "y", "title": "Function Graph"}
  }
}

For data analysis:
{
  "graph": {
    "type": "bar",
    "data": [{"category": "A", "value": 25}, ...],
    "config": {"xLabel": "Category", "yLabel": "Frequency"}
  }
}
`;
```

**Estimated Time**: 3-4 hours

---

### Phase 7: Update Shared Types 📝

**File**: `packages/frontend/src/types/question.ts` (or create shared package)

**Add**:
```typescript
export interface GraphData {
  type: 'line' | 'bar' | 'scatter' | 'histogram' | 'pie' | 'function';
  data: Array<Record<string, number | string>>;
  config: {
    title?: string;
    xLabel?: string;
    yLabel?: string;
    xDomain?: [number, number];
    yDomain?: [number, number];
    width?: number;
    height?: number;
  };
}

export interface QuestionContent {
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  graph?: GraphData; // NEW
}
```

**Estimated Time**: 1 hour

---

### Phase 8: Update Database Schema 🗄️

**File**: `packages/db-backend/src/models/Question.ts`

**Changes**:
- Add optional `graph` field to Question schema
- Ensure MongoDB can store graph data
- Update validators

```typescript
const questionSchema = new Schema({
  // ... existing fields ...
  content: {
    questionText: String,
    options: [String],
    correctAnswer: String,
    explanation: String,
    graph: {
      type: {
        type: String,
        enum: ['line', 'bar', 'scatter', 'histogram', 'pie', 'function']
      },
      data: Schema.Types.Mixed,
      config: Schema.Types.Mixed
    }
  }
});
```

**Estimated Time**: 1-2 hours

---

### Phase 9: Update Chat Backend for Math Rendering 💬

**File**: `packages/ai-backend/src/services/chatService.ts`

**Changes**:
- Instruct AI to use LaTeX notation in responses
- Add system prompt: "Use LaTeX for mathematical expressions. Inline: $...$, Display: $$...$$"
- Test that AI generates proper LaTeX syntax

**Estimated Time**: 1-2 hours

---

### Phase 10: Testing & Refinement 🧪

**Test Cases**:
1. ✅ Questions with line graphs (linear, quadratic functions)
2. ✅ Questions with bar charts (data analysis)
3. ✅ Questions with scatter plots (correlation)
4. ✅ Questions without graphs (ensure backward compatibility)
5. ✅ Chat messages with inline math `$x^2$`
6. ✅ Chat messages with display math `$$\frac{a}{b}$$`
7. ✅ Chat messages with complex equations
8. ✅ Edge cases: malformed graph data, invalid LaTeX

**Manual Testing**:
- Generate question with graph via AI
- Verify graph renders correctly
- Chat about the question, verify math notation works
- Test on mobile/tablet layouts

**Estimated Time**: 4-5 hours

---

## 5. Total Time Estimate

| Phase | Time |
|-------|------|
| Phase 1: Dependencies | 15 min |
| Phase 2: Graph Component | 3-4 hours |
| Phase 3: Math Markdown | 2-3 hours |
| Phase 4: Question Panel | 2 hours |
| Phase 5: Chat Panel | 2 hours |
| Phase 6: AI Prompts | 3-4 hours |
| Phase 7: Types | 1 hour |
| Phase 8: Database | 1-2 hours |
| Phase 9: Chat Backend | 1-2 hours |
| Phase 10: Testing | 4-5 hours |
| **TOTAL** | **19-26 hours** |

## 6. Example Implementations

### Example 1: Graph Renderer Component

```tsx
import React from 'react';
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface GraphData {
  type: 'line' | 'bar' | 'scatter';
  data: Array<Record<string, any>>;
  config: {
    title?: string;
    xLabel?: string;
    yLabel?: string;
    xDomain?: [number, number];
    yDomain?: [number, number];
  };
}

export const GraphRenderer: React.FC<{ graphData: GraphData }> = ({ graphData }) => {
  const { type, data, config } = graphData;

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 20, right: 30, left: 20, bottom: 20 }
    };

    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="x" 
              label={{ value: config.xLabel, position: 'insideBottom', offset: -5 }}
              domain={config.xDomain}
            />
            <YAxis 
              dataKey="y"
              label={{ value: config.yLabel, angle: -90, position: 'insideLeft' }}
              domain={config.yDomain}
            />
            <Tooltip />
            <Line type="monotone" dataKey="y" stroke="#8884d8" strokeWidth={2} />
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" label={{ value: config.xLabel, position: 'insideBottom', offset: -5 }} />
            <YAxis label={{ value: config.yLabel, angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        );

      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number" 
              dataKey="x" 
              label={{ value: config.xLabel, position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              type="number"
              dataKey="y"
              label={{ value: config.yLabel, angle: -90, position: 'insideLeft' }}
            />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={data} fill="#8884d8" />
          </ScatterChart>
        );

      default:
        return <p>Unsupported graph type</p>;
    }
  };

  return (
    <div className="graph-container my-4 p-4 border rounded">
      {config.title && <h3 className="text-center mb-4">{config.title}</h3>}
      <ResponsiveContainer width="100%" height={400}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};
```

### Example 2: Math Markdown Component

```tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MathMarkdownProps {
  content: string;
  className?: string;
}

export const MathMarkdown: React.FC<MathMarkdownProps> = ({ content, className }) => {
  return (
    <div className={`math-markdown ${className || ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Customize rendering if needed
          p: ({ children }) => <p className="mb-2">{children}</p>,
          code: ({ inline, children, ...props }) => {
            return inline ? (
              <code className="bg-gray-100 px-1 rounded" {...props}>
                {children}
              </code>
            ) : (
              <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
                <code {...props}>{children}</code>
              </pre>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
```

### Example 3: Updated Chat Panel

```tsx
import React from 'react';
import { MathMarkdown } from './MathMarkdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const ChatPanel: React.FC<{ messages: Message[] }> = ({ messages }) => {
  return (
    <div className="chat-panel">
      {messages.map((message, index) => (
        <div 
          key={index}
          className={`message ${message.role === 'user' ? 'user-message' : 'ai-message'}`}
        >
          <MathMarkdown content={message.content} />
        </div>
      ))}
    </div>
  );
};
```

### Example 4: AI Prompt for Math Notation

```typescript
const CHAT_SYSTEM_PROMPT = `
You are an SAT tutor helping students understand math questions.

IMPORTANT: Use LaTeX notation for all mathematical expressions:
- Inline math: Use $...$ for inline expressions (e.g., "The equation $x^2 + 2x + 1 = 0$ has...")
- Display math: Use $$...$$ for centered equations (e.g., "$$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$")

Common LaTeX examples:
- Fractions: $\\frac{a}{b}$
- Square root: $\\sqrt{x}$
- Exponents: $x^2$, $e^{-x}$
- Subscripts: $x_1$
- Greek letters: $\\pi$, $\\theta$, $\\alpha$
- Integrals: $\\int_{a}^{b} f(x) dx$
- Summation: $\\sum_{i=1}^{n} i$

Example response:
"Great! Let's break down the problem step by step. We have a rectangle, and we know two key things:

1. The length of the rectangle is twice its width.
2. The perimeter of the rectangle is 48 inches.

**Understanding the Perimeter:**
The perimeter $P$ of a rectangle can be calculated using the formula:

$$P = 2 \\times (\\text{length} + \\text{width})$$

This means we add the length and the width together and then multiply by 2 because there are two lengths and two widths in a rectangle."
`;
```

## 7. CSS Considerations

### KaTeX CSS Import

**Add to main CSS or component**:
```css
/* In packages/frontend/src/index.css or App.css */
@import 'katex/dist/katex.min.css';

/* Custom styling for math in chat */
.math-markdown .katex {
  font-size: 1.1em;
}

.math-markdown .katex-display {
  margin: 1rem 0;
  overflow-x: auto;
  overflow-y: hidden;
}
```

### Graph Container Styling

```css
.graph-container {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
}

.graph-container h3 {
  color: #333;
  font-size: 1.1rem;
  font-weight: 600;
}

/* Responsive handling */
@media (max-width: 768px) {
  .graph-container {
    padding: 0.5rem;
  }
}
```

## 8. Potential Challenges & Solutions

### Challenge 1: AI Generating Invalid Graph Data
**Solution**: 
- Implement strict validation on frontend
- Show fallback "Graph unavailable" message
- Log errors for debugging
- Provide clear examples in AI prompts

### Challenge 2: LaTeX Rendering Performance
**Solution**:
- KaTeX is already fast (renders in <1ms typically)
- Memoize MathMarkdown component
- Only re-render when content changes

### Challenge 3: Graph Data Size
**Solution**:
- Limit data points (10-20 for functions, 5-10 for bar charts)
- AI should generate smart sampling
- Don't store massive datasets

### Challenge 4: Mobile Graph Display
**Solution**:
- Use ResponsiveContainer from Recharts
- Test on various screen sizes
- Consider horizontal scrolling for complex graphs

### Challenge 5: Complex Mathematical Notation
**Solution**:
- KaTeX supports 99% of LaTeX math commands
- Provide AI with common LaTeX patterns
- Test with complex SAT-level formulas

## 9. Future Enhancements

### Phase 2 Features (Future):
1. **Interactive Graphs**
   - Students can plot points
   - Drag sliders to modify functions
   - Zoom/pan functionality

2. **Graph Generation from Formulas**
   - AI provides formula: `y = 2x + 3`
   - Frontend calculates and plots points
   - Support for advanced functions

3. **3D Graphs** (if SAT introduces them)
   - Use Recharts or Three.js
   - Rotate/zoom capabilities

4. **Geometric Diagrams**
   - Triangles, circles, polygons
   - Consider adding D3.js or Canvas-based rendering
   - Label angles, sides, etc.

5. **Statistical Plots**
   - Box plots
   - Violin plots
   - Heat maps

## 10. Success Criteria

### Graph Rendering
- ✅ AI can generate questions with graphs
- ✅ Graphs render correctly in QuestionPanel
- ✅ All SAT graph types supported
- ✅ Responsive on all screen sizes
- ✅ No performance issues with graph rendering
- ✅ Error handling for malformed data

### Math Notation
- ✅ LaTeX renders correctly in chat
- ✅ Both inline and display math work
- ✅ No visual glitches or layout breaks
- ✅ Fast rendering (<100ms)
- ✅ AI consistently uses LaTeX notation
- ✅ Complex formulas render correctly

## 11. Next Steps

1. **Review this plan** with stakeholders
2. **Get approval** on technology choices
3. **Install dependencies** (Phase 1)
4. **Start implementation** following phases sequentially
5. **Test incrementally** after each phase
6. **Document progress** in memory bank

---

## Appendix A: Package Versions

```json
{
  "dependencies": {
    "recharts": "^3.3.0",
    "react-markdown": "^9.0.0",
    "remark-math": "^6.0.0",
    "rehype-katex": "^7.0.0",
    "katex": "^0.16.25"
  },
  "devDependencies": {
    "@types/katex": "^0.16.7"
  }
}
```

## Appendix B: Useful Resources

- **Recharts Documentation**: https://recharts.org/
- **react-markdown Guide**: https://github.com/remarkjs/react-markdown
- **KaTeX Documentation**: https://katex.org/
- **SAT Math Content**: https://satsuite.collegeboard.org/sat/whats-on-the-test/math
- **LaTeX Math Symbols**: https://katex.org/docs/supported.html

---

**Document Version**: 1.0
**Last Updated**: November 12, 2024
**Author**: AI Development Team

