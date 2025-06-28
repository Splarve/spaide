import { ContainerModule } from '@theia/core/shared/inversify';
import { ChatAgent } from '@theia/ai-chat/lib/common';
import { Agent } from '@theia/ai-core/lib/common';
import { TaskDecomposerChatAgent } from './task-decomposer-chat-agent';
import { WidgetFactory } from '@theia/core/lib/browser';
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

    // Widget factory
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: TaskDecompositionWidget.ID,
        createWidget: () => {
            const child = ctx.container.createChild();
            child.bind(DecompositionStore).toConstantValue(ctx.container.get(DecompositionStore));
            child.bind(TaskDecompositionWidget).toSelf();
            return child.get(TaskDecompositionWidget);
        }
    })).inSingletonScope();

    // Contribution
    bind(TaskDecompositionFrontendContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(TaskDecompositionFrontendContribution);
    bind(MenuContribution).toService(TaskDecompositionFrontendContribution);
}); 