
// Simple Markdown to Markmap Node parser
export interface MarkmapNode {
    content: string;
    children: MarkmapNode[];
    // Extra fields that Markmap might handle
    p?: any;
}

export function transformMarkdownToNode(markdown: string): MarkmapNode {
    const lines = markdown.split('\n').filter(l => l.trim().length > 0);

    const root: MarkmapNode = { content: 'root', children: [] };
    const stack: { node: MarkmapNode, level: number }[] = [{ node: root, level: 0 }];

    for (const line of lines) {
        const trimmed = line.trim();
        let level = 0;
        let content = '';

        // Detect heading level
        if (trimmed.startsWith('#')) {
            const match = trimmed.match(/^(#+)\s+(.*)/);
            if (match) {
                level = match[1].length;
                content = match[2];
            }
        }
        // Detect list item
        else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            level = stack[stack.length - 1].level + 1;
            content = trimmed.substring(2);
        } else {
            // General text - treat as 1 level deeper than last node
            level = stack[stack.length - 1].level + 1;
            content = trimmed;
        }

        const newNode: MarkmapNode = { content, children: [] };

        // Pop stack until we find the parent (level < current level)
        while (stack.length > 1 && stack[stack.length - 1].level >= level) {
            stack.pop();
        }

        const parent = stack[stack.length - 1].node;
        parent.children.push(newNode);
        stack.push({ node: newNode, level });
    }

    // Clean up artificial root
    if (root.children.length === 1) {
        return root.children[0];
    }

    if (root.children.length > 1) {
        root.content = "Mind Map";
        return root;
    }

    return { content: "Empty Map", children: [] };
}
