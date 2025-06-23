import { injectable, inject } from '@theia/core/shared/inversify';
import { TreeImpl, CompositeTreeNode, TreeNode, SelectableTreeNode } from '@theia/core/lib/browser';
import { Emitter, Event } from '@theia/core/lib/common';
import { postConstruct } from '@theia/core/shared/inversify';
import { DecompositionStore } from './decomposition-store';
import { DecompositionNode } from './decomposition-model';

@injectable()
export class TaskDecompositionTreeModel extends TreeImpl {
    @inject(DecompositionStore)
    protected readonly store!: DecompositionStore;

    protected readonly onSelectionChangedEmitter = new Emitter<readonly Readonly<SelectableTreeNode>[]>();
    readonly onSelectionChanged: Event<readonly Readonly<SelectableTreeNode>[]> = this.onSelectionChangedEmitter.event;

    protected readonly onExpansionChangedEmitter = new Emitter<Readonly<TreeNode>>();
    readonly onExpansionChanged: Event<Readonly<TreeNode>> = this.onExpansionChangedEmitter.event;

    // Selection state
    protected _selectedNodes: SelectableTreeNode[] = [];
    
    get selectedNodes(): readonly SelectableTreeNode[] {
        return this._selectedNodes;
    }
    
    selectNode(node: Readonly<SelectableTreeNode>): void {
        if (!this._selectedNodes.includes(node as SelectableTreeNode)) {
            this._selectedNodes.push(node as SelectableTreeNode);
            this.onSelectionChangedEmitter.fire(this._selectedNodes);
        }
    }
    
    deselectNode(node: Readonly<SelectableTreeNode>): void {
        const index = this._selectedNodes.indexOf(node as SelectableTreeNode);
        if (index !== -1) {
            this._selectedNodes.splice(index, 1);
            this.onSelectionChangedEmitter.fire(this._selectedNodes);
        }
    }

    @postConstruct()
    initialize(): void {
        console.log('🌲 TaskDecompositionTreeModel initialize called');
        // Initialize with empty root immediately to prevent rendering errors
        this.root = {
            id: 'loading-root',
            parent: undefined,
            children: [],
            expanded: true,
            selected: false
        } as CompositeTreeNode & SelectableTreeNode;
        
        // listen for changes
        this.store.onDidChange(() => this.updateRoot());
        this.updateRoot();
        console.log('🌲 TaskDecompositionTreeModel initialized');
    }

    protected updateRoot(): void {
        console.log('🌲 updateRoot called');
        const rootData = this.store.getRoot();
        console.log('🌲 rootData from store:', rootData);
        if (!rootData) {
            console.log('🌲 No root data, setting root to undefined');
            // Create an empty root node to prevent rendering errors
            this.root = {
                id: 'empty-root',
                parent: undefined,
                children: [],
                expanded: true,
                selected: false
            } as CompositeTreeNode & SelectableTreeNode;
            this.onChangedEmitter.fire(undefined);
            return;
        }
        console.log('🌲 Creating tree node from root data');
        this.root = this.toTreeNode(rootData, undefined);
        console.log('🌲 Created root node:', this.root);
        console.log('🌲 Root has children:', (this.root as CompositeTreeNode)?.children?.length || 0);
        this.onChangedEmitter.fire(undefined);
        console.log('🌲 Root updated, tree node created');
    }

    protected toTreeNode(data: DecompositionNode, parent: CompositeTreeNode | undefined): TreeNode {
        const id = data.id;
        const node: CompositeTreeNode & SelectableTreeNode = {
            id,
            parent,
            selected: false,
            label: data.label,
            icon: this.toIcon(data),
            expanded: true,
            children: []
        } as any;
        if (data.children && data.children.length > 0) {
            node.children = data.children.map(child => this.toTreeNode(child, node) as TreeNode);
        } else {
            node.children = [];
        }
        return node;
    }

    protected toIcon(data: DecompositionNode): string | undefined {
        switch (data.category) {
            case 'code': return 'codicon-symbol-method';
            case 'design': return 'codicon-layout';
            case 'research': return 'codicon-search';
            case 'test': return 'codicon-pass';
            default: return 'codicon-circle-small';
        }
    }
} 