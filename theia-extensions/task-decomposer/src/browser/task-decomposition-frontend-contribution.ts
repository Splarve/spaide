import { injectable, inject } from '@theia/core/shared/inversify';
import { ApplicationShell, WidgetManager } from '@theia/core/lib/browser';
import { CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry, Command } from '@theia/core/lib/common';
import { CommonMenus } from '@theia/core/lib/browser';
import { TaskDecompositionWidget } from './task-decomposition-widget';

// Command to open the Task Decomposition view
export const TaskDecompositionCommands = {
    OPEN_VIEW: <Command>{
        id: 'taskDecomposition.openView',
        label: 'Show Task Decomposition'
    }
};

@injectable()
export class TaskDecompositionFrontendContribution implements CommandContribution, MenuContribution {

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    @inject(WidgetManager)
    protected readonly widgetManager: WidgetManager;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(TaskDecompositionCommands.OPEN_VIEW, {
            execute: () => this.openView()
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(CommonMenus.VIEW, {
            commandId: TaskDecompositionCommands.OPEN_VIEW.id,
            label: TaskDecompositionCommands.OPEN_VIEW.label,
            order: '9_task_decomposition'
        });
    }

    private async openView(): Promise<void> {
        console.log('🔧 Opening Task Decomposition view...');
        try {
            const widget = await this.widgetManager.getOrCreateWidget<TaskDecompositionWidget>(TaskDecompositionWidget.ID);
            console.log('🔧 Widget created:', widget);

            if (!widget.isAttached) {
                // Add to the main area by default
                console.log('🔧 Attaching widget to main area');
                this.shell.addWidget(widget, { area: 'main' });
            }

            console.log('🔧 Activating widget');
            this.shell.activateWidget(widget.id);
            console.log('🔧 Task Decomposition view opened successfully');
        } catch (error) {
            console.error('🔧 Error opening Task Decomposition view:', error);
        }
    }
} 