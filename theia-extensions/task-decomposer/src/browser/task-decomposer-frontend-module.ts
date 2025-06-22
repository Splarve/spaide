import { ContainerModule } from '@theia/core/shared/inversify';
import { ChatAgent } from '@theia/ai-chat/lib/common';
import { Agent } from '@theia/ai-core/lib/common';
import { TaskDecomposerChatAgent } from './task-decomposer-chat-agent';

/**
 * Frontend (browser) DI module for the Task Decomposer extension.
 */
export default new ContainerModule(bind => {
    // Register chat agent in the IoC container
    bind(TaskDecomposerChatAgent).toSelf().inSingletonScope();
    bind(Agent).toService(TaskDecomposerChatAgent);
    bind(ChatAgent).toService(TaskDecomposerChatAgent);
}); 