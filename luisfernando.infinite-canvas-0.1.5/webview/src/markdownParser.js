// Enhanced Markdown Parser for VS Code Extension
// Based on the web reference but adapted for canvas rendering

export class MarkdownParser {
    constructor() {
        this.tokens = [];
        this.currentIndex = 0;
    }

    parse(markdown) {
        if (!markdown) return [];
        
        // Split into lines and process
        const lines = markdown.split('\n');
        const tokens = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const token = this.parseLine(line, i);
            if (token) {
                tokens.push(token);
            }
        }
        
        return tokens;
    }
    
    parseLine(line, lineNumber) {
        // Handle empty lines
        if (line.trim() === '') {
            return {
                type: 'paragraph',
                content: '',
                raw: line,
                lineNumber,
                isEmpty: true
            };
        }
        
        // Headers (# ## ###)
        const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headerMatch) {
            return {
                type: 'header',
                level: headerMatch[1].length,
                content: headerMatch[2].trim(),
                raw: line,
                lineNumber
            };
        }
        
        // Code blocks (```)
        if (line.trim().startsWith('```')) {
            const language = line.trim().substring(3).trim();
            return {
                type: 'code_block_start',
                language: language || 'text',
                raw: line,
                lineNumber
            };
        }
        
        // Unordered lists (- * +)
        const unorderedListMatch = line.match(/^(\s*)([-*+])\s+(.+)$/);
        if (unorderedListMatch) {
            return {
                type: 'list_item',
                listType: 'unordered',
                indent: unorderedListMatch[1].length,
                marker: unorderedListMatch[2],
                content: unorderedListMatch[3],
                raw: line,
                lineNumber
            };
        }
        
        // Ordered lists (1. 2. etc.)
        const orderedListMatch = line.match(/^(\s*)(\d+\.)\s+(.+)$/);
        if (orderedListMatch) {
            return {
                type: 'list_item',
                listType: 'ordered',
                indent: orderedListMatch[1].length,
                marker: orderedListMatch[2],
                content: orderedListMatch[3],
                raw: line,
                lineNumber
            };
        }
        
        // Blockquotes (>)
        const blockquoteMatch = line.match(/^>\s*(.*)$/);
        if (blockquoteMatch) {
            return {
                type: 'blockquote',
                content: blockquoteMatch[1],
                raw: line,
                lineNumber
            };
        }
        
        // Horizontal rules (--- ***)
        if (line.match(/^(\*{3,}|-{3,}|_{3,})$/)) {
            return {
                type: 'hr',
                raw: line,
                lineNumber
            };
        }
        
        // Table detection (|)
        if (line.includes('|')) {
            const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
            if (cells.length > 1) {
                return {
                    type: 'table_row',
                    cells: cells,
                    raw: line,
                    lineNumber
                };
            }
        }
        
        // Default to paragraph
        return {
            type: 'paragraph',
            content: line,
            inlineElements: this.parseInlineElements(line),
            raw: line,
            lineNumber
        };
    }
    
    parseInlineElements(text) {
        const elements = [];
        let current = 0;
        
        // Regex patterns for inline elements
        const patterns = [
            { type: 'bold', regex: /\*\*(.*?)\*\*/g },
            { type: 'italic', regex: /\*(.*?)\*/g },
            { type: 'code', regex: /`([^`]+)`/g },
            { type: 'link', regex: /\[([^\]]+)\]\(([^)]+)\)/g },
            { type: 'image', regex: /!\[([^\]]*)\]\(([^)]+)\)/g },
            { type: 'strikethrough', regex: /~~(.*?)~~/g }
        ];
        
        const matches = [];
        
        // Find all matches
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.regex.exec(text)) !== null) {
                matches.push({
                    type: pattern.type,
                    start: match.index,
                    end: match.index + match[0].length,
                    content: match[1],
                    url: match[2], // For links and images
                    raw: match[0]
                });
            }
        });
        
        // Sort matches by position
        matches.sort((a, b) => a.start - b.start);
        
        // Build elements array with text and inline elements
        let lastEnd = 0;
        
        matches.forEach(match => {
            // Add plain text before this match
            if (match.start > lastEnd) {
                elements.push({
                    type: 'text',
                    content: text.substring(lastEnd, match.start)
                });
            }
            
            // Add the matched element
            elements.push(match);
            lastEnd = match.end;
        });
        
        // Add remaining text
        if (lastEnd < text.length) {
            elements.push({
                type: 'text',
                content: text.substring(lastEnd)
            });
        }
        
        return elements;
    }
    
    // Calculate approximate height needed for rendered markdown
    calculateHeight(tokens, maxWidth, fontSize = 12) {
        let totalHeight = 0;
        const lineHeight = fontSize * 1.4;
        
        tokens.forEach(token => {
            switch (token.type) {
                case 'header':
                    const headerSize = Math.max(fontSize + (6 - token.level) * 2, fontSize);
                    totalHeight += headerSize * 1.6;
                    break;
                    
                case 'paragraph':
                    if (token.isEmpty) {
                        totalHeight += lineHeight * 0.5;
                    } else {
                        // Estimate wrapped lines
                        const estimatedLines = Math.ceil(token.content.length * 8 / maxWidth);
                        totalHeight += Math.max(1, estimatedLines) * lineHeight;
                    }
                    break;
                    
                case 'list_item':
                    const listLines = Math.ceil(token.content.length * 8 / (maxWidth - 20));
                    totalHeight += Math.max(1, listLines) * lineHeight;
                    break;
                    
                case 'blockquote':
                    const quoteLines = Math.ceil(token.content.length * 8 / (maxWidth - 30));
                    totalHeight += Math.max(1, quoteLines) * lineHeight;
                    break;
                    
                case 'code_block_start':
                    totalHeight += lineHeight * 0.5; // Just the marker
                    break;
                    
                case 'hr':
                    totalHeight += lineHeight;
                    break;
                    
                case 'table_row':
                    totalHeight += lineHeight * 1.2;
                    break;
                    
                default:
                    totalHeight += lineHeight;
            }
        });
        
        return Math.max(totalHeight, lineHeight);
    }
    
    // Extract plain text for search/preview
    extractPlainText(tokens) {
        let text = '';
        
        tokens.forEach(token => {
            switch (token.type) {
                case 'header':
                case 'paragraph':
                case 'blockquote':
                    text += token.content + '\n';
                    break;
                    
                case 'list_item':
                    text += '• ' + token.content + '\n';
                    break;
                    
                case 'table_row':
                    text += token.cells.join(' | ') + '\n';
                    break;
            }
        });
        
        return text.trim();
    }
    
    // Get a preview snippet
    getPreview(tokens, maxLength = 200) {
        const plainText = this.extractPlainText(tokens);
        if (plainText.length <= maxLength) {
            return plainText;
        }
        return plainText.substring(0, maxLength - 3) + '...';
    }
}

// Utility functions
export function calculateMarkdownHeight(content, maxWidth, fontSize = 12) {
    const parser = new MarkdownParser();
    const tokens = parser.parse(content);
    return parser.calculateHeight(tokens, maxWidth, fontSize);
}

export function getMarkdownPreview(content, maxLength = 200) {
    const parser = new MarkdownParser();
    const tokens = parser.parse(content);
    return parser.getPreview(tokens, maxLength);
}

export function parseMarkdown(content) {
    const parser = new MarkdownParser();
    return parser.parse(content);
}