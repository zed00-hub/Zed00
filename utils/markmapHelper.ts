
// Simple Markdown to Markmap Node parser
export interface MarkmapNode {
    content: string;
    children: MarkmapNode[];
    p?: any;
}

export function transformMarkdownToNode(markdown: string): MarkmapNode {
    if (!markdown) return { content: "Empty Map", children: [] };

    // Cleanup markdown
    const cleanMarkdown = markdown
        .replace(/^```markdown\n?/, '')
        .replace(/```$/, '')
        .trim();

    const lines = cleanMarkdown.split('\n').filter(l => l.trim().length > 0);

    if (lines.length === 0) {
        return { content: "Empty Map", children: [] };
    }

    const root: MarkmapNode = { content: 'Mind Map', children: [] };
    const stack: { node: MarkmapNode, level: number }[] = [{ node: root, level: 0 }];

    for (const line of lines) {
        const trimmed = line.trim();
        let level = 1;
        let content = trimmed;

        // Detect headings
        if (trimmed.startsWith('#')) {
            const match = trimmed.match(/^(#+)\s+(.*)/);
            if (match) {
                level = match[1].length;
                content = match[2];
            }
        }
        // Detect bullet points
        else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            // Find level of last heading and go +1
            const lastHeading = [...stack].reverse().find(s => s.level > 0 && s.level < 10);
            level = (lastHeading ? lastHeading.level : 1) + 1;
            content = trimmed.substring(2);
        }
        else {
            // General text
            const lastNode = stack[stack.length - 1];
            level = lastNode.level + 1;
        }

        const newNode: MarkmapNode = { content, children: [] };

        // Pop until we find a parent with level < current level
        while (stack.length > 1 && stack[stack.length - 1].level >= level) {
            stack.pop();
        }

        const parent = stack[stack.length - 1].node;
        parent.children.push(newNode);
        stack.push({ node: newNode, level });
    }

    // If we only have one top-level child of the artificial root, use that
    if (root.children.length === 1) {
        return root.children[0];
    }

    return root;
}
