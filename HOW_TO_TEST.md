# 🧪 How to Test Graph & Math Features

## Prerequisites
- All dependencies installed (`npm install` in each package)
- MongoDB running (local or Atlas)
- OpenAI API key configured

---

## Testing in 5 Minutes ⚡

### Step 1: Start All Servers (3 terminals)

**Terminal 1 - Database Backend:**
```bash
cd packages/db-backend
npm run dev
```
✅ Wait for: `Server running on http://localhost:3001`

**Terminal 2 - AI Backend:**
```bash
cd packages/ai-backend
npm run dev
```
✅ Wait for: `Server running on http://localhost:3002`

**Terminal 3 - Frontend:**
```bash
cd packages/frontend
npm run dev
```
✅ Wait for: `Local: http://localhost:5173/`

---

### Step 2: Generate Question with Graph via AI ✨

**Method A: Using curl (Easiest!)**

Open a 4th terminal:

```bash
curl -X POST http://localhost:3002/api/v1/questions/generate \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "math",
    "difficulty": "medium",
    "topic": "quadratic functions - show the graph of a parabola"
  }'
```

✅ Look for a `"graph"` field in the response!

**Method B: Via the Frontend**

1. Open http://localhost:5173
2. Log in as admin (if you have admin access)
3. Generate a new question with topic: **"quadratic functions with graph"**

**Method C: Manual Test Data (if AI doesn't include graph)**

If the AI doesn't automatically include a graph, you can create test data:

```bash
node test-graph-question.js
```

**💡 Pro Tip:** Add phrases like "show the graph", "include a chart", or "with visualization" to the topic to encourage the AI to generate graph data!

---

### Step 3: View the Graph 📊

1. Open your browser: **http://localhost:5173**

2. **Sign up** or **Log in** with an account

3. Click **"Study"** in the navigation

4. You should see the test question with:
   - Question text about a quadratic function
   - **A BEAUTIFUL INTERACTIVE GRAPH** showing a parabola
   - Four answer options (A, B, C, D)

5. **Test the graph:**
   - ✅ Hover over the line to see tooltips with exact values
   - ✅ Check that axes are labeled (x and f(x))
   - ✅ Verify the title shows "Graph of f(x) = x² - 2x"
   - ✅ Grid lines should be visible
   - ✅ The parabola should open upward with vertex at (1, -1)

---

### Step 4: Test Math Notation 📐

While on the Study page, in the **AI Coach chat panel** on the right:

1. Type: **"Explain the quadratic formula"**

2. Press **Send** or hit Enter

3. ✅ The AI should respond with beautifully formatted math:

   > The quadratic formula is used to solve equations like $ax^2 + bx + c = 0$:
   > 
   > $$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

4. **What to verify:**
   - ✅ Math is NOT plain text (not "x = (-b +/- sqrt(b^2 - 4ac)) / 2a")
   - ✅ Fraction bar displays properly
   - ✅ Square root symbol shows correctly
   - ✅ Plus-minus symbol (±) renders
   - ✅ Subscripts and superscripts work

---

### Step 5: Test More Math Examples 🔢

Try these prompts in the chat:

**Test 1:** "What is the Pythagorean theorem?"
- ✅ Should show: $a^2 + b^2 = c^2$

**Test 2:** "Explain the distance formula"
- ✅ Should show: $d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$

**Test 3:** "What is the area of a circle?"
- ✅ Should show: $A = \pi r^2$

**Test 4:** "How do you calculate slope?"
- ✅ Should show: $m = \frac{y_2 - y_1}{x_2 - x_1}$

---

## 🎯 Quick Verification Checklist

### Graph Rendering ✅
- [ ] Graph displays below question text
- [ ] Parabola shape is correct (U-shaped opening upward)
- [ ] Tooltips appear on hover
- [ ] Axes have labels
- [ ] Grid lines are visible
- [ ] Graph is responsive (try resizing browser)
- [ ] No console errors (press F12 to check)

### Math Notation ✅
- [ ] LaTeX renders in chat responses
- [ ] Fractions display correctly
- [ ] Roots and radicals show properly
- [ ] Greek letters appear (π, θ, etc.)
- [ ] Inline math ($...$) works in sentences
- [ ] Display math ($$...$$) is centered
- [ ] No layout breaks or overflow

---

## 🐛 Troubleshooting

### "Graph not showing"

**Check 1:** Browser console (F12 → Console tab)
- Look for errors related to GraphRenderer or Recharts

**Check 2:** Verify question has graph data
```bash
# Open MongoDB shell
mongosh
use satcoach
db.questions.findOne({ "content.graph": { $exists: true } })
```

**Check 3:** Ensure GraphRenderer is imported
- File: `packages/frontend/src/components/QuestionPanel.tsx`
- Should have: `import { GraphRenderer } from './GraphRenderer';`

### "Math not rendering"

**Check 1:** Verify KaTeX CSS is loaded
- File: `packages/frontend/src/styles/index.css`
- Should have: `@import 'katex/dist/katex.min.css';`

**Check 2:** Check MathMarkdown component
- File: `packages/frontend/src/components/ChatPanel.tsx`
- Should have: `import { MathMarkdown } from './MathMarkdown';`

**Check 3:** AI backend is running
```bash
curl http://localhost:3002/health
# Should return: {"status":"ok"}
```

### "Build errors"

```bash
# Reinstall dependencies
cd packages/frontend
rm -rf node_modules
npm install

# Check build
npm run build
```

### "Database connection error"

**Check your .env file:**
```bash
cat packages/db-backend/.env
```

Should have:
```
MONGODB_URI=mongodb://localhost:27017/satcoach
# or
MONGODB_URI=mongodb+srv://...
```

---

## 📱 Mobile Testing

### Test on Different Screen Sizes:

1. **Desktop (1200px+):**
   - Graph should be full width
   - Math should be readable
   - Chat panel side-by-side

2. **Tablet (768px):**
   - Graph should scale down
   - Everything still interactive

3. **Mobile (375px):**
   - Graph should be compact but usable
   - Math should not overflow
   - Chat panel may stack vertically

**How to test:**
- Press F12 in browser
- Click device toolbar icon
- Select different device sizes
- Or just resize your browser window

---

## 🎨 Visual Confirmation

### Expected UI:

```
┌────────────────────────────────────────────┐
│  Question Panel                            │
│  ──────────────────────────────────────    │
│                                            │
│  The graph below shows a quadratic         │
│  function f(x) = x² - 2x...                │
│                                            │
│  ┌──────────────────────────────────┐     │
│  │  Graph of f(x) = x² - 2x         │     │
│  │                                  │     │
│  │       10 ┤                ╱      │     │
│  │          │              ╱        │     │
│  │        5 ┤            ╱          │     │
│  │          │          ╱            │     │
│  │  f(x) 0 ┤        ╱              │     │
│  │          │      ╱                │     │
│  │       -1 ┤    •──────            │     │
│  │          │  ╱                    │     │
│  │          └──────────────────────  │     │
│  │            -2   0   2   4        │     │
│  │                  x                │     │
│  └──────────────────────────────────┘     │
│                                            │
│  A. (0, 0)                                 │
│  B. (1, -1)    ← Correct                   │
│  C. (-1, 3)                                │
│  D. (2, 0)                                 │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│  AI Coach                                  │
│  ──────────────────────────────────────    │
│                                            │
│  You: Explain the quadratic formula        │
│                                            │
│  AI: The quadratic formula is:             │
│                                            │
│       x = -b ± √(b² - 4ac)                 │
│           ─────────────────                │
│                 2a                         │
│                                            │
│  [BEAUTIFULLY RENDERED LATEX MATH]         │
└────────────────────────────────────────────┘
```

---

## 🚀 Advanced Testing

### Test Different Graph Types

Create questions with different graph types:

**Bar Chart:**
```javascript
graph: {
  type: 'bar',
  data: [
    { category: 'A', value: 25 },
    { category: 'B', value: 40 }
  ],
  config: { title: 'Bar Chart Example' }
}
```

**Scatter Plot:**
```javascript
graph: {
  type: 'scatter',
  data: [
    { x: 1, y: 2 },
    { x: 2, y: 4 }
  ],
  config: { title: 'Correlation' }
}
```

**Pie Chart:**
```javascript
graph: {
  type: 'pie',
  data: [
    { name: 'A', value: 45 },
    { name: 'B', value: 30 }
  ],
  config: { title: 'Distribution' }
}
```

### Test Complex LaTeX

Try these in chat:
- "Show me integration notation"
- "What is summation?"
- "Explain matrices"
- "Show me the binomial theorem"

---

## ✅ Success Criteria

If all of these work, the features are fully functional:

- [x] Graph displays in question
- [x] Graph is interactive (tooltips)
- [x] Math renders in chat
- [x] LaTeX formatting is correct
- [x] Responsive on different screen sizes
- [x] No console errors
- [x] No build errors
- [x] AI consistently uses LaTeX
- [x] Old questions (without graphs) still work

---

## 📞 Need Help?

1. **Check the comprehensive docs:**
   - `docs/GRAPH_MATH_IMPLEMENTATION_COMPLETE.md`
   - `TEST_GRAPH_MATH_FEATURES.md`

2. **Check browser console (F12)** for error messages

3. **Verify all servers are running:**
   ```bash
   curl http://localhost:3001/health  # DB Backend
   curl http://localhost:3002/health  # AI Backend
   curl http://localhost:5173         # Frontend
   ```

4. **Check component files:**
   - `packages/frontend/src/components/GraphRenderer.tsx`
   - `packages/frontend/src/components/MathMarkdown.tsx`

---

## 🎉 That's It!

If you see the graph and math rendering correctly, **everything is working!**

The features are production-ready and can be used immediately.

---

**Happy Testing! 🚀**

