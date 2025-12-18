
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
            // List items are considered +1 level from the last heading context
            // But for simplicity, let's look at indentation or just treat as child of current top
            const headingMatch = stack.findLast(s => s.node.content !== 'root'); // Find last real node
            const lastLevel = stack[stack.length - 1].level;

            // If previous was heading # (level 1), list item is level 2
            // If previous was list item (but we don't track its level explicitly as heading), 
            // we need a robust way.
            // Let's rely on standard markdown structure from Gemini: Headings define structure.

            // Heuristic: If we are inside an item, a bullet is a child?
            // For this specific purpose, we assume Gemini outputs:
            // # Title
            // ## Section
            // - Item

            // Calculate level based on '#' count, but for '-' it's hard.
            // Let's assume '-' is always child of the last headings.

            level = 999; // Arbitrary high level to be child of whatever is there? 
            // No, that breaks stack logic.

            // Let's assume list item is 1 level deeper than the current stack top
            level = stack[stack.length - 1].level + 1;
            content = trimmed.substring(2);
        } else {
            continue;
        }

        const newNode: MarkmapNode = { content, children: [] };

        // Pop stack until we find the parent (level < current level)
        while (stack.length > 1 && stack[stack.length - 1].level >= level) {
            stack.pop();
        }

        const parent = stack[stack.length - 1].node;
        if (!parent.children) parent.children = [];
        parent.children.push(newNode);

        stack.push({ node: newNode, level });
    }

    // Remove the artificial 'root' if possible, or return it
    if (root.children && root.children.length === 1) {
        return root.children[0];
    }

    // If multiple top-level nodes, keep the artificial root but rename it
    if (root.children && root.children.length > 0) {
        root.content = "Mind Map";
        return root;
    }

    return { content: "Empty Map", children: [] };
}
