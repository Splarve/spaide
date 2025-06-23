import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { TreeWidget, TreeProps, TreeModel, ContextMenuRenderer } from '@theia/core/lib/browser';
import { nls } from '@theia/core';

@injectable()
export class TaskDecompositionWidget extends TreeWidget {
    static readonly ID = 'task-decomposition-view';
    static readonly LABEL = nls.localizeByDefault('Task Decomposition');

    constructor(
        @inject(TreeProps) readonly props: TreeProps,
        @inject(TreeModel) readonly model: TreeModel,
        @inject(ContextMenuRenderer) readonly contextMenuRenderer: ContextMenuRenderer
    ) {
        console.log('🌳 TaskDecompositionWidget constructor called');
        super(props, model, contextMenuRenderer);
        this.id = TaskDecompositionWidget.ID;
        this.title.label = TaskDecompositionWidget.LABEL;
        this.title.caption = TaskDecompositionWidget.LABEL;
        this.title.iconClass = 'codicon-list-tree';
        this.addClass('theia-task-decomposition-view');
        console.log('🌳 TaskDecompositionWidget initialized with model:', model);
    }

    @postConstruct()
    protected init(): void {
        console.log('🌳 TaskDecompositionWidget init called');
        super.init();
        console.log('🌳 TaskDecompositionWidget init completed');
    }

    protected onUpdateRequest(msg: any): void {
        try {
            // Ensure model exists before updating
            if (!this.model || !this.model.root) {
                console.log('🌳 Model or root not ready, skipping update');
                return;
            }
            super.onUpdateRequest(msg);
        } catch (error) {
            console.error('🌳 Error during update:', error);
            // Skip update instead of crashing
        }
    }
} 