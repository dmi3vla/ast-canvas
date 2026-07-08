// Enhanced Markdown Renderer for Canvas
// Renders parsed markdown tokens to HTML5 Canvas with syntax highlighting

export class MarkdownRenderer {
    constructor() {
        this.themes = {
            dark: {
                background: '#2d2d2d',
                text: '#cccccc',
                header: '#4fc3f7',
                subheader: '#66bb6a',
                emphasis: '#ffb74d',
                code: '#f48fb1',
                codeBackground: '#3c3c3c',
                link: '#64b5f6',
                quote: '#ba68c8',
                quoteBar: '#ab47bc',
                listMarker: '#81c784',
                hr: '#616161',
                tableBorder: '#555555',
                tableHeader: '#4fc3f7'
            },
            light: {
                background: '#ffffff',
                text: '#333333',
                header: '#1976d2',
                subheader: '#388e3c',
                emphasis: '#f57c00',
                code: '#c2185b',
                codeBackground: '#f5f5f5',
                link: '#1976d2',
                quote: '#7b1fa2',
                quoteBar: '#7b1fa2',
                listMarker: '#4caf50',
                hr: '#e0e0e0',
                tableBorder: '#e0e0e0',
                tableHeader: '#1976d2'
            }
        };
        this.currentTheme = this.themes.dark;
    }

    setTheme(themeName) {
        this.currentTheme = this.themes[themeName] || this.themes.dark;
    }

    render(ctx, tokens, x, y, maxWidth, maxHeight) {
        ctx.save();
        
        const fontSize = 12;
        const lineHeight = fontSize * 1.4;
        let currentY = y;
        let isInCodeBlock = false;
        let codeBlockContent = [];
        
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            
            // Check if we've exceeded the available height
            if (currentY - y > maxHeight - lineHeight) {
                // Draw "..." to indicate more content
                ctx.fillStyle = this.currentTheme.text;
                ctx.font = `${fontSize}px Consolas, monospace`;
                ctx.fillText('...', x, currentY);
                break;
            }
            
            // Handle code blocks specially
            if (token.type === 'code_block_start') {
                isInCodeBlock = true;
                codeBlockContent = [];
                continue;
            }
            
            if (isInCodeBlock) {
                if (token.raw.trim() === '```') {
                    // End of code block, render it
                    currentY = this.renderCodeBlock(ctx, codeBlockContent, x, currentY, maxWidth, fontSize);
                    isInCodeBlock = false;
                    codeBlockContent = [];
                } else {
                    codeBlockContent.push(token.raw);
                }
                continue;
            }
            
            // Render individual tokens
            switch (token.type) {
                case 'header':
                    currentY = this.renderHeader(ctx, token, x, currentY, maxWidth);
                    break;
                    
                case 'paragraph':
                    if (!token.isEmpty) {
                        currentY = this.renderParagraph(ctx, token, x, currentY, maxWidth, fontSize);
                    } else {
                        currentY += lineHeight * 0.5;
                    }
                    break;
                    
                case 'list_item':
                    currentY = this.renderListItem(ctx, token, x, currentY, maxWidth, fontSize);
                    break;
                    
                case 'blockquote':
                    currentY = this.renderBlockquote(ctx, token, x, currentY, maxWidth, fontSize);
                    break;
                    
                case 'hr':
                    currentY = this.renderHorizontalRule(ctx, x, currentY, maxWidth);
                    break;
                    
                case 'table_row':
                    currentY = this.renderTableRow(ctx, token, x, currentY, maxWidth, fontSize);
                    break;
                    
                default:
                    currentY += lineHeight;
            }
        }
        
        ctx.restore();
        return currentY - y; // Return total height used
    }
    
    renderHeader(ctx, token, x, y, maxWidth) {
        const baseFontSize = 12;
        const headerSizes = [24, 20, 18, 16, 14, 12];
        const fontSize = headerSizes[token.level - 1] || baseFontSize;
        const lineHeight = fontSize * 1.3;
        
        ctx.fillStyle = token.level <= 2 ? this.currentTheme.header : this.currentTheme.subheader;
        ctx.font = `bold ${fontSize}px Segoe UI, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // Word wrap for long headers
        const words = token.content.split(' ');
        const lines = this.wrapText(ctx, words, maxWidth - 10);
        
        lines.forEach((line, index) => {
            ctx.fillText(line, x, y + (index * lineHeight));
        });
        
        return y + (lines.length * lineHeight) + (lineHeight * 0.3);
    }
    
    renderParagraph(ctx, token, x, y, maxWidth, fontSize) {
        const lineHeight = fontSize * 1.4;
        
        if (token.inlineElements && token.inlineElements.length > 0) {
            return this.renderInlineElements(ctx, token.inlineElements, x, y, maxWidth, fontSize);
        } else {
            // Simple paragraph
            ctx.fillStyle = this.currentTheme.text;
            ctx.font = `${fontSize}px Segoe UI, sans-serif`;
            
            const words = token.content.split(' ');
            const lines = this.wrapText(ctx, words, maxWidth - 10);
            
            lines.forEach((line, index) => {
                ctx.fillText(line, x, y + (index * lineHeight));
            });
            
            return y + (lines.length * lineHeight) + (lineHeight * 0.2);
        }
    }
    
    renderInlineElements(ctx, elements, x, y, maxWidth, fontSize) {
        const lineHeight = fontSize * 1.4;
        let currentX = x;
        let currentY = y;
        
        ctx.textBaseline = 'top';
        
        elements.forEach(element => {
            let text = element.content || '';
            let font = `${fontSize}px Segoe UI, sans-serif`;
            let color = this.currentTheme.text;
            
            switch (element.type) {
                case 'bold':
                    font = `bold ${fontSize}px Segoe UI, sans-serif`;
                    break;
                    
                case 'italic':
                    font = `italic ${fontSize}px Segoe UI, sans-serif`;
                    break;
                    
                case 'code':
                    font = `${fontSize}px Consolas, monospace`;
                    color = this.currentTheme.code;
                    // Draw background for inline code
                    const textWidth = ctx.measureText(text).width;
                    ctx.fillStyle = this.currentTheme.codeBackground;
                    ctx.fillRect(currentX - 2, currentY - 2, textWidth + 4, lineHeight);
                    break;
                    
                case 'link':
                    color = this.currentTheme.link;
                    text = element.content;
                    break;
                    
                case 'strikethrough':
                    color = this.currentTheme.text;
                    // TODO: Add strikethrough line
                    break;
                    
                case 'text':
                default:
                    // Normal text
                    break;
            }
            
            ctx.font = font;
            ctx.fillStyle = color;
            
            // Handle text wrapping
            const words = text.split(' ');
            words.forEach((word, index) => {
                const wordWidth = ctx.measureText(word + ' ').width;
                
                if (currentX + wordWidth > x + maxWidth && currentX > x) {
                    // Wrap to next line
                    currentX = x;
                    currentY += lineHeight;
                }
                
                ctx.fillText(word + (index < words.length - 1 ? ' ' : ''), currentX, currentY);
                currentX += wordWidth;
            });
        });
        
        return currentY + lineHeight + (lineHeight * 0.2);
    }
    
    renderListItem(ctx, token, x, y, maxWidth, fontSize) {
        const lineHeight = fontSize * 1.4;
        const indentSize = 20;
        const itemX = x + (token.indent || 0) + indentSize;
        
        // Draw marker
        ctx.fillStyle = this.currentTheme.listMarker;
        ctx.font = `${fontSize}px Segoe UI, sans-serif`;
        
        const marker = token.listType === 'ordered' ? token.marker : '•';
        ctx.fillText(marker, x + (token.indent || 0), y);
        
        // Draw content
        ctx.fillStyle = this.currentTheme.text;
        const words = token.content.split(' ');
        const lines = this.wrapText(ctx, words, maxWidth - itemX);
        
        lines.forEach((line, index) => {
            ctx.fillText(line, itemX, y + (index * lineHeight));
        });
        
        return y + (lines.length * lineHeight) + (lineHeight * 0.1);
    }
    
    renderBlockquote(ctx, token, x, y, maxWidth, fontSize) {
        const lineHeight = fontSize * 1.4;
        const quoteX = x + 20;
        const barWidth = 4;
        
        // Draw quote bar
        ctx.fillStyle = this.currentTheme.quoteBar;
        ctx.fillRect(x + 5, y, barWidth, lineHeight);
        
        // Draw content
        ctx.fillStyle = this.currentTheme.quote;
        ctx.font = `italic ${fontSize}px Segoe UI, sans-serif`;
        
        const words = token.content.split(' ');
        const lines = this.wrapText(ctx, words, maxWidth - quoteX);
        
        lines.forEach((line, index) => {
            ctx.fillText(line, quoteX, y + (index * lineHeight));
            // Extend quote bar for multiple lines
            if (index > 0) {
                ctx.fillStyle = this.currentTheme.quoteBar;
                ctx.fillRect(x + 5, y + (index * lineHeight), barWidth, lineHeight);
                ctx.fillStyle = this.currentTheme.quote;
            }
        });
        
        return y + (lines.length * lineHeight) + (lineHeight * 0.2);
    }
    
    renderCodeBlock(ctx, lines, x, y, maxWidth, fontSize) {
        const lineHeight = fontSize * 1.2;
        const padding = 8;
        const blockHeight = (lines.length * lineHeight) + (padding * 2);
        
        // Draw background
        ctx.fillStyle = this.currentTheme.codeBackground;
        ctx.fillRect(x, y, maxWidth, blockHeight);
        
        // Draw code content
        ctx.fillStyle = this.currentTheme.code;
        ctx.font = `${fontSize}px Consolas, monospace`;
        
        lines.forEach((line, index) => {
            ctx.fillText(line, x + padding, y + padding + (index * lineHeight));
        });
        
        return y + blockHeight + lineHeight * 0.3;
    }
    
    renderHorizontalRule(ctx, x, y, maxWidth) {
        const lineHeight = 16;
        
        ctx.strokeStyle = this.currentTheme.hr;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + lineHeight / 2);
        ctx.lineTo(x + maxWidth - 10, y + lineHeight / 2);
        ctx.stroke();
        
        return y + lineHeight;
    }
    
    renderTableRow(ctx, token, x, y, maxWidth, fontSize) {
        const lineHeight = fontSize * 1.4;
        const cellPadding = 8;
        const cellWidth = (maxWidth - 20) / token.cells.length;
        
        ctx.fillStyle = this.currentTheme.text;
        ctx.font = `${fontSize}px Segoe UI, sans-serif`;
        ctx.strokeStyle = this.currentTheme.tableBorder;
        ctx.lineWidth = 1;
        
        token.cells.forEach((cell, index) => {
            const cellX = x + (index * cellWidth);
            
            // Draw cell border
            ctx.strokeRect(cellX, y, cellWidth, lineHeight);
            
            // Draw cell content
            ctx.fillText(
                this.truncateText(ctx, cell, cellWidth - (cellPadding * 2)),
                cellX + cellPadding,
                y + (lineHeight - fontSize) / 2
            );
        });
        
        return y + lineHeight;
    }
    
    // Utility methods
    wrapText(ctx, words, maxWidth) {
        const lines = [];
        let currentLine = '';
        
        words.forEach(word => {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const testWidth = ctx.measureText(testLine).width;
            
            if (testWidth > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines.length > 0 ? lines : [''];
    }
    
    truncateText(ctx, text, maxWidth) {
        const ellipsis = '...';
        let truncated = text;
        
        while (ctx.measureText(truncated).width > maxWidth && truncated.length > 0) {
            truncated = truncated.slice(0, -1);
        }
        
        if (truncated.length < text.length) {
            while (ctx.measureText(truncated + ellipsis).width > maxWidth && truncated.length > 0) {
                truncated = truncated.slice(0, -1);
            }
            truncated += ellipsis;
        }
        
        return truncated;
    }
}

// Convenience function for rendering markdown content
export async function renderMarkdownToCanvas(ctx, content, x, y, maxWidth, maxHeight, theme = 'dark') {
    const { parseMarkdown } = await import('./markdownParser.js');
    
    const tokens = parseMarkdown(content);
    const renderer = new MarkdownRenderer();
    renderer.setTheme(theme);
    
    return renderer.render(ctx, tokens, x, y, maxWidth, maxHeight);
}