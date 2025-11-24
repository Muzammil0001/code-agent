/**
 * Detects the likely programming language from a code snippet.
 * Uses broad heuristics for common languages and defaults to plaintext.
 */
export function detectLanguage(snippet: string): string {
    const trimmed = snippet.trim();

    // If snippet contains obvious JSON
    if (/^\{[\s\S]*\}$/.test(trimmed) || /^\[[\s\S]*\]$/.test(trimmed)) {
        try {
            JSON.parse(trimmed);
            return 'json';
        } catch { }
    }

    // Heuristic detection: keywords for common languages
    const patterns: { [lang: string]: RegExp } = {
        typescript: /\b(interface|type|enum|namespace|as\s+\w+|:\s*\w+(\[\])?)\b/,
        javascript: /\b(const|let|var|function|=>|async|await|import|export|require)\b/,
        python: /\b(def|class|import|from|elif|lambda|yield|async def|__init__|self)\b/,
        java: /\b(public|private|protected|static|void|class|extends|implements|package)\b/,
        csharp: /\b(using|namespace|public|private|static|void|class|struct|interface|var)\b/,
        go: /\b(package|func|import|type|struct|interface|go|defer|chan)\b/,
        rust: /\b(fn|let|mut|impl|trait|struct|enum|pub|use|mod)\b/,
        sql: /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|FROM|WHERE|JOIN|GROUP BY|ORDER BY)\b/i,
        html: /<\/?[a-z][\s\S]*>/i,
        css: /[.#]?[\w-]+\s*\{[\s\S]*:[^:]+;[\s\S]*\}/,
        yaml: /^[\w-]+:\s*.+$/m,
        dockerfile: /^(FROM|RUN|CMD|LABEL|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|ARG)\b/m,
        bash: /^#!\/bin\/(bash|sh)|\b(echo|cd|ls|mkdir|rm|chmod|grep|awk|sed)\b/,
    };

    for (const lang in patterns) {
        if (patterns[lang].test(trimmed)) return lang;
    }

    return 'plaintext';
}

/**
 * Determines if a text block looks like code.
 */
function isLikelyCode(text: string): boolean {
    const trimmed = text.trim();
    if (trimmed.length < 5) return false;

    // Any line ending with semicolon, braces, or typical code symbols
    return /[{};=<>]/.test(trimmed) || /function|class|def|import|export|return/.test(trimmed);
}

/**
 * Remove common AI boilerplate from the text.
 */
// function removeBoilerplate(text: string): string {
//     const patterns = [
//         /^(Here's|Here is|Below is|Here are)\s+(the|a|an|some)?\s*(code|solution|implementation|example|function|script|snippet)[:\s]*/im,
//         /^As an AI(,|\s).*/im,
//         /^Sure[,!]\s+(here('s| is)|I can|let me).*/im,
//         /^(Certainly|Absolutely|Of course)[,!]\s*.*/im,
//         /^Let me (help|show|provide|create|write).*/im,
//         /^I('ll| will) (help|show|provide|create|write).*/im,
//         /^Explanation:\s*/im,
//         /^Output:\s*/im,
//         /^Result:\s*/im,
//     ];
//     let cleaned = text;
//     for (const pattern of patterns) cleaned = cleaned.replace(pattern, '');
//     return cleaned.trim();
// }

/**
 * Formats raw LLM output into markdown with code fences.
 */
export function formatLLMMessage(text: string): string {
    if (!text || typeof text !== 'string') return '';

    // Fix unbalanced fences
    const fenceMatches = text.match(/```/g);
    if (fenceMatches && fenceMatches.length % 2 === 1) {
        text += '\n```';
    }

    // Split text by existing code fences
    const parts = text.split(/(```[\s\S]*?```)/g);

    for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 1) continue; // already fenced
        const part = parts[i];
        if (isLikelyCode(part)) {
            const lang = detectLanguage(part);
            parts[i] = `\`\`\`${lang}\n${part.trim()}\n\`\`\``;
        }
    }

    text = parts.join('');

    // Remove accidental bullet prefixes in code blocks
    text = text.replace(/```(\w+)?\n([-•*]\s+)/g, '```$1\n');

    // Limit consecutive newlines
    text = text.replace(/\n{3,}/g, '\n\n');

    return text.trim();
}
