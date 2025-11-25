/**
 * ANSI to HTML Converter
 * Converts ANSI escape codes to HTML/CSS for terminal output rendering
 */

interface AnsiStyle {
    color?: string;
    backgroundColor?: string;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
}

const ANSI_COLORS: Record<number, string> = {
    // Standard colors (30-37 foreground, 40-47 background)
    30: '#000000', // Black
    31: '#CD3131', // Red
    32: '#0DBC79', // Green
    33: '#E5E510', // Yellow
    34: '#2472C8', // Blue
    35: '#BC3FBC', // Magenta
    36: '#11A8CD', // Cyan
    37: '#E5E5E5', // White

    // Bright colors (90-97 foreground, 100-107 background)
    90: '#666666', // Bright Black (Gray)
    91: '#F14C4C', // Bright Red
    92: '#23D18B', // Bright Green
    93: '#F5F543', // Bright Yellow
    94: '#3B8EEA', // Bright Blue
    95: '#D670D6', // Bright Magenta
    96: '#29B8DB', // Bright Cyan
    97: '#FFFFFF', // Bright White
};

/**
 * Parse ANSI escape codes and convert to styled HTML elements
 */
export function ansiToHtml(text: string): React.ReactNode[] {
    const elements: React.ReactNode[] = [];
    let currentStyle: AnsiStyle = {};
    let keyCounter = 0;

    // Regex to match ANSI escape sequences
    const ansiRegex = /\x1B\[([0-9;]*)m/g;
    let match;
    let lastIndex = 0;

    while ((match = ansiRegex.exec(text)) !== null) {
        // Add text before this escape code
        if (match.index > lastIndex) {
            const textContent = text.substring(lastIndex, match.index);
            if (textContent) {
                if (Object.keys(currentStyle).length > 0) {
                    elements.push(
                        <span key={`ansi-${keyCounter++}`} style={currentStyle}>
                            {textContent}
                        </span>
                    );
                } else {
                    elements.push(textContent);
                }
            }
        }

        // Parse the escape code
        const codes = match[1].split(';').map(Number);
        currentStyle = applyAnsiCodes(currentStyle, codes);

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        const textContent = text.substring(lastIndex);
        if (textContent) {
            if (Object.keys(currentStyle).length > 0) {
                elements.push(
                    <span key={`ansi-${keyCounter++}`} style={currentStyle}>
                        {textContent}
                    </span>
                );
            } else {
                elements.push(textContent);
            }
        }
    }

    return elements.length > 0 ? elements : [text];
}

/**
 * Apply ANSI codes to current style
 */
function applyAnsiCodes(currentStyle: AnsiStyle, codes: number[]): AnsiStyle {
    const newStyle = { ...currentStyle };

    for (const code of codes) {
        if (code === 0) {
            // Reset all styles
            return {};
        } else if (code === 1) {
            // Bold
            newStyle.fontWeight = 'bold';
        } else if (code === 2) {
            // Dim (use lighter font weight)
            newStyle.fontWeight = '300';
        } else if (code === 3) {
            // Italic
            newStyle.fontStyle = 'italic';
        } else if (code === 4) {
            // Underline
            newStyle.textDecoration = 'underline';
        } else if (code === 7) {
            // Reverse (swap fg and bg)
            const tempColor = newStyle.color;
            newStyle.color = newStyle.backgroundColor;
            newStyle.backgroundColor = tempColor;
        } else if (code === 22) {
            // Normal intensity
            delete newStyle.fontWeight;
        } else if (code === 23) {
            // Not italic
            delete newStyle.fontStyle;
        } else if (code === 24) {
            // Not underlined
            delete newStyle.textDecoration;
        } else if (code >= 30 && code <= 37) {
            // Foreground color
            newStyle.color = ANSI_COLORS[code];
        } else if (code >= 40 && code <= 47) {
            // Background color
            newStyle.backgroundColor = ANSI_COLORS[code - 10];
        } else if (code >= 90 && code <= 97) {
            // Bright foreground color
            newStyle.color = ANSI_COLORS[code];
        } else if (code >= 100 && code <= 107) {
            // Bright background color
            newStyle.backgroundColor = ANSI_COLORS[code - 10];
        } else if (code === 39) {
            // Default foreground color
            delete newStyle.color;
        } else if (code === 49) {
            // Default background color
            delete newStyle.backgroundColor;
        }
    }

    return newStyle;
}

/**
 * Strip ANSI escape codes from text
 */
export function stripAnsi(text: string): string {
    return text.replace(/\x1B\[[0-9;]*m/g, '');
}

/**
 * Check if text contains ANSI codes
 */
export function hasAnsiCodes(text: string): boolean {
    return /\x1B\[[0-9;]*m/.test(text);
}

/**
 * Convert ANSI text to plain HTML string (for non-React contexts)
 */
export function ansiToHtmlString(text: string): string {
    const elements = ansiToHtml(text);

    return elements
        .map((el) => {
            if (typeof el === 'string') {
                return el;
            }
            // This is a simplified version - in real React context, use the full component
            return text;
        })
        .join('');
}
