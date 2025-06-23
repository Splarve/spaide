import { ContainerModule } from '@theia/core/shared/inversify';
import { ChatAgent } from '@theia/ai-chat/lib/common';
import { Agent } from '@theia/ai-core/lib/common';
import { TaskDecomposerChatAgent } from './task-decomposer-chat-agent';
import { 
    TreeProps, 
    WidgetFactory, 
    TreeModel, 
    defaultTreeProps,
    createTreeContainer,
    CompositeTreeNode,
    SelectableTreeNode
} from '@theia/core/lib/browser';
import { TaskDecompositionWidget } from './task-decomposition-widget';
import { DecompositionStore } from './decomposition-store';
import { TaskDecompositionFrontendContribution } from './task-decomposition-frontend-contribution';
import { CommandContribution, MenuContribution } from '@theia/core/lib/common';

/**
 * Frontend (browser) DI module for the Task Decomposer extension.
 */
export default new ContainerModule(bind => {
    // Register chat agent in the IoC container
    bind(TaskDecomposerChatAgent).toSelf().inSingletonScope();
    bind(Agent).toService(TaskDecomposerChatAgent);
    bind(ChatAgent).toService(TaskDecomposerChatAgent);

    // Store
    bind(DecompositionStore).toSelf().inSingletonScope();

    // Tree model & widget
    const treeProps: TreeProps = {
        ...defaultTreeProps,
        contextMenuPath: [],
        virtualized: false,
        search: true,
        globalSelection: true
    };
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: TaskDecompositionWidget.ID,
        createWidget: () => {
            const child = createTreeContainer(ctx.container, treeProps);
            child.bind(DecompositionStore).toConstantValue(ctx.container.get(DecompositionStore));
            child.bind(TaskDecompositionWidget).toSelf();
            
            // Get services
            const store = ctx.container.get(DecompositionStore);
            const widget = child.get(TaskDecompositionWidget);
            const model = child.get(TreeModel) as any; // Cast to bypass type checking
            
            // Helper function to create tree nodes
            const createTreeNode = (data: any, parent: CompositeTreeNode | undefined): CompositeTreeNode & SelectableTreeNode => {
                const node: CompositeTreeNode & SelectableTreeNode = {
                    id: data.id,
                    name: data.label,
                    parent,
                    selected: false,
                    label: data.label,
                    description: data.label,
                    icon: 'codicon-circle-small',
                    expanded: true,
                    children: [],
                    visible: true
                } as CompositeTreeNode & SelectableTreeNode;
                if (data.children && data.children.length > 0) {
                    node.children = data.children.map((child: any) => createTreeNode(child, node));
                }
                return node;
            };
            
            // Function to update tree
            const updateTree = () => {
                const rootData = store.getRoot();
                if (rootData) {
                    console.log('🌲 Updating tree with:', rootData);
                    model.root = createTreeNode(rootData, undefined);
                } else {
                    console.log('🌲 No data, empty tree');
                    model.root = undefined;
                }
            };
            
            // Initial update and listen for changes
            updateTree();
            store.onDidChange(updateTree);
            
            return widget;
        }
    })).inSingletonScope();

    // Contribution
    bind(TaskDecompositionFrontendContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(TaskDecompositionFrontendContribution);
    bind(MenuContribution).toService(TaskDecompositionFrontendContribution);
}); 