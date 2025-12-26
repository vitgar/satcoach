import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// Configure remark-math to handle single dollar signs for inline math
const remarkMathOptions = {
  singleDollarTextMath: true,
};

// Configure KaTeX to handle errors gracefully
const rehypeKatexOptions = {
  throwOnError: false,
  errorColor: '#cc0000',
  strict: false,
};

interface MathMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Preprocess content to normalize different math notations to standard LaTeX
 * Handles:
 * - \(inline math\) -> $inline math$
 * - \[display math\] -> $$display math$$
 * - Plain text like x^2 or f(x) when not already in math mode
 */
const preprocessMathContent = (content: string): string => {
  let processed = content;
  
  // Convert \( ... \) to $ ... $ (inline math)
  // Use non-greedy match to handle multiple instances
  processed = processed.replace(/\\\((.+?)\\\)/g, (_, math) => `$${math}$`);
  
  // Convert \[ ... \] to $$ ... $$ (display math)
  processed = processed.replace(/\\\[(.+?)\\\]/gs, (_, math) => `$$${math}$$`);
  
  // Convert common patterns that should be math but aren't wrapped
  // Only convert if not already inside $ delimiters
  
  // Handle expressions like "x^2", "a^2", "x^{2}" when not already in math mode
  // Use negative lookbehind/lookahead to avoid already-wrapped content
  processed = processed.replace(/(?<!\$)(\b[a-zA-Z]\^\d+)(?!\$)/g, (_, expr) => `$${expr}$`);
  processed = processed.replace(/(?<!\$)(\b[a-zA-Z]\^\{[^}]+\})(?!\$)/g, (_, expr) => `$${expr}$`);
  
  return processed;
};

/**
 * MathMarkdown Component
 * 
 * Renders markdown content with LaTeX math support using KaTeX.
 * 
 * Supports:
 * - Inline math: $x^2 + y^2 = z^2$
 * - Display math: $$\frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$
 * - LaTeX delimiters: \(inline\) and \[display\]
 * - Standard markdown: **bold**, *italic*, lists, etc.
 * - Code blocks with syntax highlighting
 * 
 * @example
 * <MathMarkdown content="The equation $E = mc^2$ is famous." />
 */
export const MathMarkdown: React.FC<MathMarkdownProps> = ({ content, className = '' }) => {
  // Preprocess content to normalize math notation
  const processedContent = preprocessMathContent(content);
  return (
    <div className={`math-markdown ${className}`}>
      <ReactMarkdown
        remarkPlugins={[[remarkMath, remarkMathOptions]]}
        rehypePlugins={[[rehypeKatex, rehypeKatexOptions]]}
        components={{
          // Paragraph styling
          p: ({ children }) => (
            <p className="mb-3 leading-relaxed text-gray-800">{children}</p>
          ),
          
          // Headings
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-3 text-gray-900">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mb-2 text-gray-900">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mb-2 text-gray-900">{children}</h3>
          ),
          
          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-3 space-y-1 text-gray-800">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-3 space-y-1 text-gray-800">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="ml-4">{children}</li>
          ),
          
          // Code blocks and inline code
          code: ({ inline, className, children, ...props }: any) => {
            if (inline) {
              return (
                <code
                  className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            
            return (
              <pre className="bg-gray-100 rounded-lg p-4 overflow-x-auto mb-3">
                <code className="text-sm font-mono text-gray-800" {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary-500 pl-4 py-2 mb-3 italic text-gray-700 bg-gray-50 rounded-r">
              {children}
            </blockquote>
          ),
          
          // Links
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 underline"
            >
              {children}
            </a>
          ),
          
          // Strong and emphasis
          strong: ({ children }) => (
            <strong className="font-bold text-gray-900">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),
          
          // Horizontal rule
          hr: () => (
            <hr className="my-4 border-t border-gray-300" />
          ),
          
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto mb-3">
              <table className="min-w-full border-collapse border border-gray-300">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-100">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody>{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="border-b border-gray-300">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left font-semibold text-gray-900 border border-gray-300">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-gray-800 border border-gray-300">
              {children}
            </td>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

// Export a memoized version for performance
export default React.memo(MathMarkdown);

