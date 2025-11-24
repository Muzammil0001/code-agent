import { CodeBlock } from './CodeBlock';

// Custom components for react-markdown
export const markdownComponents = {
    // Custom code block rendering
    code({ node, className, children, ...props }: any) {
        const match = /language-(\w+)/.exec(className || '');
        const codeString = String(children).replace(/\n$/, '');

        // If there's a language match, it's a code block, otherwise it's inline
        return match ? (
            <CodeBlock code={codeString} language={match[1]} />
        ) : (
            <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-blue-400 text-sm font-mono" {...props}>
                {children}
            </code>
        );
    },

    // Headings
    h1: ({ children }: any) => (
        <h1 className="text-2xl font-bold text-zinc-100 mt-6 mb-4">{children}</h1>
    ),
    h2: ({ children }: any) => (
        <h2 className="text-xl font-bold text-zinc-100 mt-5 mb-3">{children}</h2>
    ),
    h3: ({ children }: any) => (
        <h3 className="text-lg font-semibold text-zinc-200 mt-4 mb-2">{children}</h3>
    ),

    // Paragraphs
    p: ({ children }: any) => (
        <p className="text-zinc-100 leading-relaxed mb-4 last:mb-0 break-words">{children}</p>
    ),

    // Lists
    ul: ({ children }: any) => (
        <ul className="list-disc list-inside space-y-1 text-zinc-100 mb-4">{children}</ul>
    ),
    ol: ({ children }: any) => (
        <ol className="list-decimal list-inside space-y-1 text-zinc-100 mb-4">{children}</ol>
    ),
    li: ({ children }: any) => (
        <li className="text-zinc-100 leading-relaxed">{children}</li>
    ),

    // Strong/Bold
    strong: ({ children }: any) => (
        <strong className="font-bold text-white">{children}</strong>
    ),

    // Em/Italic
    em: ({ children }: any) => (
        <em className="italic text-zinc-200">{children}</em>
    ),

    // Links
    a: ({ href, children }: any) => (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
        >
            {children}
        </a>
    ),

    // Blockquote
    blockquote: ({ children }: any) => (
        <blockquote className="border-l-4 border-blue-500 pl-4 italic text-zinc-300 my-4">
            {children}
        </blockquote>
    ),

    // Tables
    table: ({ children }: any) => (
        <div className="overflow-x-auto my-4">
            <table className="min-w-full border border-zinc-700 rounded-lg overflow-hidden">
                {children}
            </table>
        </div>
    ),
    thead: ({ children }: any) => (
        <thead className="bg-zinc-800">{children}</thead>
    ),
    tbody: ({ children }: any) => (
        <tbody className="divide-y divide-zinc-700">{children}</tbody>
    ),
    tr: ({ children }: any) => (
        <tr className="hover:bg-zinc-800/50">{children}</tr>
    ),
    th: ({ children }: any) => (
        <th className="px-4 py-2 text-left text-sm font-semibold text-zinc-200">
            {children}
        </th>
    ),
    td: ({ children }: any) => (
        <td className="px-4 py-2 text-sm text-zinc-300">{children}</td>
    ),

    // Horizontal rule
    hr: () => <hr className="border-zinc-700 my-6" />,
};
