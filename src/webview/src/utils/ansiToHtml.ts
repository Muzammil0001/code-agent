/**
 * ANSI escape code utilities
 * Convert ANSI color codes to HTML formatting
 */

// ANSI color code regex
const ANSI_REGEX = /\x1b\[[0-9;]*m/g;

// ANSI to HTML color mapping
const ANSI_COLORS: Record<string, string> = {
    // Reset
    '0': 'reset',

    // Regular colors
    '30': '#000000', // Black
    '31': '#ef4444', // Red
    '32': '#22c55e', // Green
    '33': '#eab308', // Yellow
    '34': '#3b82f6', // Blue
    '35': '#a855f7', // Magenta
    '36': '#06b6d4', // Cyan
    '37': '#d1d5db', // White

    // Bright colors
    '90': '#6b7280', // Bright Black (Gray)
    '91': '#f87171', // Bright Red
    '92': '#4ade80', // Bright Green
    '93': '#fbbf24', // Bright Yellow
    '94': '#60a5fa', // Bright Blue
    '95': '#c084fc', // Bright Magenta
    '96': '#22d3ee', // Bright Cyan
    '97': '#f3f4f6', // Bright White
};

/**
 * Strip all ANSI escape codes from a string
 */
export function stripAnsi(text: string): string {
    return text.replace(ANSI_REGEX, '');
}

/**
 * Convert ANSI escape codes to HTML with inline styles
 */
export function ansiToHtml(text: string): string {
    let result = '';
    let lastIndex = 0;
    let currentColor = '';
    let isBold = false;

    const matches = text.matchAll(/\x1b\[([0-9;]*)m/g);

    for (const match of matches) {
        // Add text before this escape code
        const textBefore = text.slice(lastIndex, match.index);
        if (textBefore) {
            result += formatText(textBefore, currentColor, isBold);
        }

        // Parse escape code
        const codes = match[1].split(';').filter(c => c);

        for (const code of codes) {
            if (code === '0') {
                // Reset
                currentColor = '';
                isBold = false;
            } else if (code === '1') {
                // Bold
                isBold = true;
            } else if (ANSI_COLORS[code]) {
                // Color code
                currentColor = ANSI_COLORS[code];
            }
        }

        lastIndex = (match.index || 0) + match[0].length;
    }

    // Add remaining text
    const remainingText = text.slice(lastIndex);
    if (remainingText) {
        result += formatText(remainingText, currentColor, isBold);
    }

    return result || text;
}

/**
 * Format text with color and bold styling
 */
function formatText(text: string, color: string, bold: boolean): string {
    if (!color && !bold) {
        return escapeHtml(text);
    }

    const styles: string[] = [];

    if (color && color !== 'reset') {
        styles.push(`color: ${color}`);
    }

    if (bold) {
        styles.push('font-weight: 600');
    }

    const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
    return `<span${styleAttr}>${escapeHtml(text)}</span>`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Check if text contains ANSI codes
 */
export function hasAnsiCodes(text: string): boolean {
    return ANSI_REGEX.test(text);
}
