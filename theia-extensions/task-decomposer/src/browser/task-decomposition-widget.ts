import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { BaseWidget, Message } from '@theia/core/lib/browser';
import { nls } from '@theia/core';
import { DecompositionStore } from './decomposition-store';
import { DecompositionNode } from './decomposition-model';

interface TaskNode {
    id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    category?: string;
    status?: 'todo' | 'doing' | 'done';
    isRoot?: boolean;
}

interface Connection {
    from: string;
    to: string;
}

interface Viewport {
    x: number;
    y: number;
    zoom: number;
}

@injectable()
export class TaskDecompositionWidget extends BaseWidget {
    static readonly ID = 'task-decomposition-view';
    static readonly LABEL = nls.localizeByDefault('Task Decomposition');

    @inject(DecompositionStore)
    protected readonly store!: DecompositionStore;

    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;
    private nodes: TaskNode[] = [];
    private connections: Connection[] = [];
    private selectedNode: TaskNode | null = null;
    private draggedNode: TaskNode | null = null;
    private dragOffset = { x: 0, y: 0 };
    private viewport: Viewport = { x: 0, y: 0, zoom: 1 };
    private isPanning = false;
    private panStart = { x: 0, y: 0 };
    private editingNode: TaskNode | null = null;
    private editInput: HTMLInputElement | null = null;

    constructor() {
        super();
        this.id = TaskDecompositionWidget.ID;
        this.title.label = TaskDecompositionWidget.LABEL;
        this.title.caption = TaskDecompositionWidget.LABEL;
        this.title.iconClass = 'codicon-graph';
        this.title.closable = true;
        this.addClass('theia-task-editor');
        this.node.tabIndex = 0;
    }

    @postConstruct()
    protected init(): void {
        this.store.onDidChange(() => this.loadFromStore());
        this.setupEditor();
        this.loadFromStore();
    }

    protected onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        this.node.focus();
    }

    protected onUpdateRequest(msg: Message): void {
        super.onUpdateRequest(msg);
        this.render();
    }

    protected setupEditor(): void {
        this.node.innerHTML = `
            <style>
                .task-editor-container {
                    height: 100%;
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    background: var(--theia-editor-background);
                    color: var(--theia-editor-foreground);
                    overflow: hidden;
                    position: relative;
                }
                .task-editor-toolbar {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    border-bottom: 1px solid var(--theia-border-color1);
                    background: var(--theia-panel-background);
                    flex-shrink: 0;
                    z-index: 10;
                }
                .task-editor-toolbar h3 {
                    margin: 0;
                    font-size: 14px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .task-editor-canvas-container {
                    flex: 1;
                    position: relative;
                    overflow: hidden;
                    min-height: 0;
                    width: 100%;
                }
                .task-editor-canvas {
                    cursor: default;
                    background: var(--theia-editor-background);
                    display: block;
                    width: 100%;
                    height: 100%;
                }
                .task-editor-button {
                    padding: 6px 12px;
                    background: var(--theia-button-background);
                    color: var(--theia-button-foreground);
                    border: 1px solid var(--theia-border-color1);
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .task-editor-button:hover {
                    background: var(--theia-button-hoverBackground);
                }
                .task-editor-empty {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    text-align: center;
                    opacity: 0.6;
                    pointer-events: none;
                }
                .inline-editor {
                    position: absolute;
                    z-index: 100;
                    background: white;
                    border: 2px solid #007ACC;
                    border-radius: 4px;
                    padding: 4px 8px;
                    font-size: 14px;
                    font-family: sans-serif;
                    outline: none;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                }
            </style>
            <div class="task-editor-container">
                <div class="task-editor-toolbar">
                    <h3><i class="codicon codicon-graph"></i> Task Editor</h3>
                    <button class="task-editor-button add-task-btn">
                        <i class="codicon codicon-add"></i> Add Task
                    </button>
                    <button class="task-editor-button delete-task-btn">
                        <i class="codicon codicon-trash"></i> Delete
                    </button>
                    <button class="task-editor-button save-btn">
                        <i class="codicon codicon-save"></i> Save
                    </button>
                    <span style="margin-left: auto; font-size: 12px; opacity: 0.7;">
                        Drag to pan • Double-click to edit • Right-click for options
                    </span>
                </div>
                <div class="task-editor-canvas-container">
                    <canvas class="task-editor-canvas"></canvas>
                    <div class="task-editor-empty" style="display: none;">
                        <i class="codicon codicon-graph" style="font-size: 48px; margin-bottom: 12px; display: block;"></i>
                        <h3>No Tasks</h3>
                        <p>Use <code>@Decomposer</code> in chat or click "Add Task"</p>
                    </div>
                </div>
            </div>
        `;

        this.canvas = this.node.querySelector('.task-editor-canvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        
        this.setupEventHandlers();
        this.resizeCanvas();
    }

    protected setupEventHandlers(): void {
        const resizeObserver = new ResizeObserver(() => this.resizeCanvas());
        resizeObserver.observe(this.node.querySelector('.task-editor-canvas-container')!);

        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));
        this.canvas.addEventListener('contextmenu', (e) => this.onContextMenu(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));

        this.node.querySelector('.add-task-btn')?.addEventListener('click', () => this.addTask());
        this.node.querySelector('.delete-task-btn')?.addEventListener('click', () => this.deleteSelectedTask());
        this.node.querySelector('.save-btn')?.addEventListener('click', () => this.saveToStore());

        // Keyboard shortcuts
        this.node.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.selectedNode && !this.editingNode) {
                this.deleteSelectedTask();
            } else if (e.key === 'Enter' && this.selectedNode && !this.editingNode) {
                this.startInlineEdit(this.selectedNode);
            } else if (e.key === 'Escape' && this.editingNode) {
                this.cancelInlineEdit();
            } else if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveToStore();
            }
        });

        // Click outside to cancel editing
        this.node.addEventListener('click', (e) => {
            if (this.editingNode && !e.target || (e.target as HTMLElement).className !== 'inline-editor') {
                this.finishInlineEdit();
            }
        });
    }

    protected resizeCanvas(): void {
        const container = this.node.querySelector('.task-editor-canvas-container') as HTMLElement;
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        this.ctx.scale(dpr, dpr);
        this.render();
    }

    protected getMousePos(e: MouseEvent): { x: number, y: number } {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - this.viewport.x) / this.viewport.zoom,
            y: (e.clientY - rect.top - this.viewport.y) / this.viewport.zoom
        };
    }

    protected getScreenPos(worldX: number, worldY: number): { x: number, y: number } {
        return {
            x: worldX * this.viewport.zoom + this.viewport.x,
            y: worldY * this.viewport.zoom + this.viewport.y
        };
    }

    protected getNodeAt(x: number, y: number): TaskNode | null {
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const node = this.nodes[i];
            if (x >= node.x && x <= node.x + node.width &&
                y >= node.y && y <= node.y + node.height) {
                return node;
            }
        }
        return null;
    }

    protected onMouseDown(e: MouseEvent): void {
        if (this.editingNode) {
            this.finishInlineEdit();
            return;
        }

        const pos = this.getMousePos(e);
        const node = this.getNodeAt(pos.x, pos.y);
        
        if (node) {
            this.selectedNode = node;
            this.draggedNode = node;
            this.dragOffset = {
                x: pos.x - node.x,
                y: pos.y - node.y
            };
        } else {
            this.selectedNode = null;
            this.isPanning = true;
            this.panStart = { x: e.clientX - this.viewport.x, y: e.clientY - this.viewport.y };
        }
        this.render();
    }

    protected onMouseMove(e: MouseEvent): void {
        if (this.draggedNode) {
            const pos = this.getMousePos(e);
            this.draggedNode.x = pos.x - this.dragOffset.x;
            this.draggedNode.y = pos.y - this.dragOffset.y;
            this.render();
        } else if (this.isPanning) {
            this.viewport.x = e.clientX - this.panStart.x;
            this.viewport.y = e.clientY - this.panStart.y;
            this.render();
        }
    }

    protected onMouseUp(e: MouseEvent): void {
        this.draggedNode = null;
        this.isPanning = false;
    }

    protected onWheel(e: WheelEvent): void {
        e.preventDefault();
        const zoomFactor = 1.1;

        if (e.deltaY < 0) {
            this.viewport.zoom *= zoomFactor;
        } else {
            this.viewport.zoom /= zoomFactor;
        }

        this.viewport.zoom = Math.max(0.1, Math.min(3, this.viewport.zoom));
        this.render();
    }

    protected onDoubleClick(e: MouseEvent): void {
        const pos = this.getMousePos(e);
        const node = this.getNodeAt(pos.x, pos.y);
        if (node) {
            this.startInlineEdit(node);
        }
    }

    protected onContextMenu(e: MouseEvent): void {
        e.preventDefault();
        const pos = this.getMousePos(e);
        const node = this.getNodeAt(pos.x, pos.y);
        
        if (node) {
            this.selectedNode = node;
            this.render();
            
            const action = confirm(`Edit "${node.label}"?\n\nOK = Edit\nCancel = Delete`);
            if (action) {
                this.startInlineEdit(node);
            } else {
                this.deleteSelectedTask();
            }
        }
    }

    protected startInlineEdit(node: TaskNode): void {
        if (this.editingNode) {
            this.finishInlineEdit();
        }

        this.editingNode = node;
        const screenPos = this.getScreenPos(node.x, node.y);
        
        this.editInput = document.createElement('input');
        this.editInput.type = 'text';
        this.editInput.value = node.label;
        this.editInput.className = 'inline-editor';
        this.editInput.style.left = `${screenPos.x}px`;
        this.editInput.style.top = `${screenPos.y}px`;
        this.editInput.style.width = `${node.width * this.viewport.zoom}px`;
        this.editInput.style.height = `${node.height * this.viewport.zoom}px`;

        this.editInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.finishInlineEdit();
            } else if (e.key === 'Escape') {
                this.cancelInlineEdit();
            }
            e.stopPropagation();
        });

        this.editInput.addEventListener('blur', () => {
            this.finishInlineEdit();
        });

        this.node.appendChild(this.editInput);
        this.editInput.focus();
        this.editInput.select();
    }

    protected finishInlineEdit(): void {
        if (this.editInput && this.editingNode) {
            const newLabel = this.editInput.value.trim();
            if (newLabel) {
                this.editingNode.label = newLabel;
                this.updateNodeSize(this.editingNode);
            }
            this.cancelInlineEdit();
            this.render();
        }
    }

    protected cancelInlineEdit(): void {
        if (this.editInput) {
            this.editInput.remove();
            this.editInput = null;
        }
        this.editingNode = null;
    }

    protected addTask(): void {
        const label = prompt('New task:');
        if (label && label.trim()) {
            const node: TaskNode = {
                id: 'task_' + Date.now(),
                label: label.trim(),
                x: 100 + Math.random() * 200,
                y: 100 + Math.random() * 200,
                width: 0,
                height: 0,
                category: 'code',
                status: 'todo'
            };
            this.updateNodeSize(node);
            this.nodes.push(node);
            this.selectedNode = node;
            
            // Reapply auto-layout when adding tasks
            this.applyAutoLayout();
            this.updateEmptyState();
            this.render();
        }
    }

    protected deleteSelectedTask(): void {
        if (this.selectedNode) {
            const index = this.nodes.indexOf(this.selectedNode);
            if (index !== -1) {
                this.nodes.splice(index, 1);
                this.connections = this.connections.filter(c => 
                    c.from !== this.selectedNode!.id && c.to !== this.selectedNode!.id);
                this.selectedNode = null;
                this.updateEmptyState();
                this.render();
            }
        }
    }

    protected updateNodeSize(node: TaskNode): void {
        this.ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        const metrics = this.ctx.measureText(node.label);
        node.width = Math.max(120, metrics.width + 24);
        node.height = 40;
    }

    protected loadFromStore(): void {
        const root = this.store.getRoot();
        if (!root) {
            this.nodes = [];
            this.connections = [];
            this.updateEmptyState();
            this.render();
            return;
        }

        this.nodes = [];
        this.connections = [];

        // Add root node (positioned by auto-layout)
        const rootNode: TaskNode = {
            id: root.id,
            label: root.label,
            x: 0, // Will be set by auto-layout
            y: 0, // Will be set by auto-layout
            width: 0,
            height: 0,
            isRoot: true,
            category: root.category,
            status: root.status
        };
        this.updateNodeSize(rootNode);
        this.nodes.push(rootNode);

        // Add child nodes (positioned by auto-layout)
        if (root.children) {
            root.children.forEach((child, index) => {
                const childNode: TaskNode = {
                    id: child.id,
                    label: child.label,
                    x: 0, // Will be set by auto-layout
                    y: 0, // Will be set by auto-layout
                    width: 0,
                    height: 0,
                    category: child.category,
                    status: child.status
                };
                this.updateNodeSize(childNode);
                this.nodes.push(childNode);
                
                this.connections.push({
                    from: root.id,
                    to: child.id
                });
            });
        }

        // Apply auto-layout
        this.applyAutoLayout();
        this.updateEmptyState();
        this.render();
    }

    protected applyAutoLayout(): void {
        if (this.nodes.length === 0) return;

        const rootNode = this.nodes.find(n => n.isRoot);
        const childNodes = this.nodes.filter(n => !n.isRoot);
        
        if (!rootNode) return;

        const canvasRect = this.canvas.getBoundingClientRect();
        const margin = 40;
        const verticalSpacing = 100;
        
        // Position root node at top center
        rootNode.x = (canvasRect.width / 2) - (rootNode.width / 2) - this.viewport.x;
        rootNode.y = margin - this.viewport.y;

        if (childNodes.length === 0) return;

        // Calculate total width needed for all child nodes
        const totalChildWidth = childNodes.reduce((sum, node) => sum + node.width, 0);
        const minSpacing = 20;
        const totalSpacingWidth = (childNodes.length - 1) * minSpacing;
        const totalRequiredWidth = totalChildWidth + totalSpacingWidth;
        
        // Calculate available width and adjust spacing
        const availableWidth = canvasRect.width - (2 * margin);
        let actualSpacing = minSpacing;
        
        if (totalRequiredWidth < availableWidth) {
            // If we have extra space, distribute it evenly
            const extraSpace = availableWidth - totalRequiredWidth;
            actualSpacing = minSpacing + (extraSpace / (childNodes.length - 1 || 1));
        }

        // Position child nodes in a row below the root
        let currentX = margin - this.viewport.x;
        const childY = rootNode.y + rootNode.height + verticalSpacing;

        // If nodes don't fit, start from a calculated center position
        if (totalRequiredWidth > availableWidth) {
            currentX = (canvasRect.width / 2) - (totalRequiredWidth / 2) - this.viewport.x;
            actualSpacing = minSpacing; // Use minimum spacing when cramped
        }

        childNodes.forEach((node, index) => {
            node.x = currentX;
            node.y = childY;
            currentX += node.width + actualSpacing;
        });

        // Center the root node over the child nodes if needed
        if (childNodes.length > 0) {
            const firstChild = childNodes[0];
            const lastChild = childNodes[childNodes.length - 1];
            const childrenCenterX = (firstChild.x + (lastChild.x + lastChild.width)) / 2;
            rootNode.x = childrenCenterX - (rootNode.width / 2);
        }
    }

    protected saveToStore(): void {
        if (this.nodes.length === 0) return;

        const rootNode = this.nodes.find(n => n.isRoot);
        if (!rootNode) return;

        const children: DecompositionNode[] = this.nodes
            .filter(n => !n.isRoot)
            .map(n => ({
                id: n.id,
                label: n.label,
                category: n.category,
                status: n.status
            }));

        const decomposition: DecompositionNode = {
            id: rootNode.id,
            label: rootNode.label,
            category: rootNode.category,
            status: rootNode.status,
            children
        };

        this.store.setDecomposition(decomposition);
    }

    protected updateEmptyState(): void {
        const emptyEl = this.node.querySelector('.task-editor-empty') as HTMLElement;
        emptyEl.style.display = this.nodes.length === 0 ? 'block' : 'none';
    }

    protected render(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save the current transform
        this.ctx.save();
        
        // Apply viewport transformation
        this.ctx.translate(this.viewport.x, this.viewport.y);
        this.ctx.scale(this.viewport.zoom, this.viewport.zoom);
        
        // Draw connections
        this.connections.forEach(conn => {
            const fromNode = this.nodes.find(n => n.id === conn.from);
            const toNode = this.nodes.find(n => n.id === conn.to);
            
            if (fromNode && toNode) {
                this.ctx.strokeStyle = '#666';
                this.ctx.lineWidth = 2 / this.viewport.zoom;
                this.ctx.beginPath();
                this.ctx.moveTo(fromNode.x + fromNode.width / 2, fromNode.y + fromNode.height);
                this.ctx.lineTo(toNode.x + toNode.width / 2, toNode.y);
                this.ctx.stroke();

                const arrowSize = 8 / this.viewport.zoom;
                const toX = toNode.x + toNode.width / 2;
                const toY = toNode.y;
                this.ctx.fillStyle = '#666';
                this.ctx.beginPath();
                this.ctx.moveTo(toX, toY);
                this.ctx.lineTo(toX - arrowSize, toY - arrowSize);
                this.ctx.lineTo(toX + arrowSize, toY - arrowSize);
                this.ctx.closePath();
                this.ctx.fill();
            }
        });
        
        // Draw nodes
        this.nodes.forEach(node => {
            const isSelected = node === this.selectedNode;
            
            // Category-based colors
            let fillColor = '#f0f0f0';
            let textColor = '#333';
            
            if (node.isRoot) {
                fillColor = '#007ACC';
                textColor = '#fff';
            } else {
                switch (node.category) {
                    case 'code':
                        fillColor = '#e1f5fe';
                        break;
                    case 'design':
                        fillColor = '#f3e5f5';
                        break;
                    case 'research':
                        fillColor = '#fff3e0';
                        break;
                    case 'test':
                        fillColor = '#e8f5e8';
                        break;
                    case 'deploy':
                        fillColor = '#fce4ec';
                        break;
                    default:
                        fillColor = '#f0f0f0';
                }
            }
            
            this.ctx.fillStyle = fillColor;
            this.ctx.strokeStyle = isSelected ? '#ff6b00' : '#333';
            this.ctx.lineWidth = (isSelected ? 3 : 1) / this.viewport.zoom;
            
            // Add shadow for depth
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
            this.ctx.shadowBlur = 4 / this.viewport.zoom;
            this.ctx.shadowOffsetX = 2 / this.viewport.zoom;
            this.ctx.shadowOffsetY = 2 / this.viewport.zoom;
            
            this.ctx.fillRect(node.x, node.y, node.width, node.height);
            
            // Reset shadow for stroke
            this.ctx.shadowColor = 'transparent';
            this.ctx.strokeRect(node.x, node.y, node.width, node.height);

            // Text
            this.ctx.fillStyle = textColor;
            const fontSize = node.isRoot ? 14 : 12;
            this.ctx.font = `${node.isRoot ? 'bold' : 'normal'} ${fontSize}px sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // Truncate long text
            let displayText = node.label;
            const maxWidth = node.width - 16;
            if (this.ctx.measureText(displayText).width > maxWidth) {
                while (this.ctx.measureText(displayText + '...').width > maxWidth && displayText.length > 0) {
                    displayText = displayText.slice(0, -1);
                }
                displayText += '...';
            }
            
            // Save context and reset transform for text rendering
            this.ctx.save();
            this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
            this.ctx.translate(this.viewport.x, this.viewport.y); // Apply only translation
            
            this.ctx.fillText(
                displayText,
                (node.x + node.width / 2) * this.viewport.zoom,
                (node.y + node.height / 2) * this.viewport.zoom
            );
            
            this.ctx.restore(); // Restore previous transform

            // Status indicator
            if (node.status && !node.isRoot) {
                const statusColors = {
                    'todo': '#gray',
                    'doing': '#ff9800',
                    'done': '#4caf50'
                };
                
                this.ctx.fillStyle = statusColors[node.status];
                this.ctx.beginPath();
                this.ctx.arc(node.x + node.width - 8, node.y + 8, 4 / this.viewport.zoom, 0, 2 * Math.PI);
                this.ctx.fill();
            }

            // Category icon (top-left)
            if (!node.isRoot && node.category) {
                const iconMap: { [key: string]: string } = {
                    'code': '{}',
                    'design': '🎨',
                    'research': '🔍',
                    'test': '✓',
                    'deploy': '🚀'
                };
                
                // Save context and reset transform for icon rendering
                this.ctx.save();
                this.ctx.setTransform(1, 0, 0, 1, 0, 0);
                this.ctx.translate(this.viewport.x, this.viewport.y);
                
                this.ctx.fillStyle = '#666';
                this.ctx.font = '10px sans-serif';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(
                    iconMap[node.category] || '•',
                    (node.x + 4) * this.viewport.zoom,
                    (node.y + 12) * this.viewport.zoom
                );
                
                this.ctx.restore();
            }
        });
        
        // Restore the transform
        this.ctx.restore();
    }
} 