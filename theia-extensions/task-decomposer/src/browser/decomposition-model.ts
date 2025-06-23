export interface DecompositionNode {
    id: string;              // Unique identifier
    label: string;           // Display label
    category?: string;       // Optional routing category (code, design, etc.)
    status?: 'todo' | 'doing' | 'done';
    children?: DecompositionNode[];
} 