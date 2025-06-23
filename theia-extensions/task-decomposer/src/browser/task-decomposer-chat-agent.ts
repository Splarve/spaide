import { injectable } from '@theia/core/shared/inversify';
import { AbstractStreamParsingChatAgent } from '@theia/ai-chat/lib/common/chat-agents';
import { LanguageModelRequirement } from '@theia/ai-core/lib/common';
import { nls } from '@theia/core';
import { SystemMessageDescription } from '@theia/ai-chat/lib/common/chat-agents';
import { inject } from '@theia/core/shared/inversify';
import { DecompositionStore } from './decomposition-store';

export const TaskDecomposerAgentId = 'Decomposer';

/**
 * A minimal chat agent that listens to the `@decomposer` mention and returns
 * a decomposition of the provided task description using the configured LLM.
 */
@injectable()
export class TaskDecomposerChatAgent extends AbstractStreamParsingChatAgent {
    /** Mention handle used in the chat (`@decomposer`). */
    id: string = TaskDecomposerAgentId;

    /** Human-friendly name shown in the UI and the `@` handle used in chat. */
    name = TaskDecomposerAgentId;

    /**
     * This MVP uses the default local chat model the workspace is already
     * configured with. If another model is preferred, change the identifier.
     */
    languageModelRequirements: LanguageModelRequirement[] = [
        {
            purpose: 'chat',
            // `local/default` is a placeholder alias that resolves to the
            // workspace's default local model (Phi-3, Llama-3, etc.).
            identifier: 'local/default'
        }
    ];

    /** The default model purpose when streaming. */
    @inject(DecompositionStore)
    protected readonly store!: import('./decomposition-store').DecompositionStore;

    protected defaultLanguageModelPurpose: string = 'chat';

    /** Short description displayed in the agent selection dropdown. */
    description = nls.localize(
        'task-decomposer/ai/chat/description',
        'Breaks a large task into smaller subtasks.'
    );

    /** The system prompt text injected into every request. */
    private static readonly SYSTEM_PROMPT_TEXT = `You are a task decomposition assistant. Given a high-level task from the user, break it down into 3-10 concise, ordered subtasks.

RESPONSE FORMAT (strict):
{"subtasks": ["<step 1>", "<step 2>" ...]}

Rules:
1. Respond with a SINGLE line of pure JSON. No markdown, no code fences, no explanations.
2. Use double quotes (\") for all strings.
3. Do NOT include any additional keys in the object.
4. Each subtask must be actionable and start with a verb.`;

    /**
     * Provide the system message description directly, bypassing PromptService,
     * so we are independent from prompt registration.
     */
    protected async getSystemMessageDescription(): Promise<SystemMessageDescription | undefined> {
        return { text: TaskDecomposerChatAgent.SYSTEM_PROMPT_TEXT } as SystemMessageDescription;
    }

    protected async onResponseComplete(request: any): Promise<void> {
        try {
            const text = request.response.response.asString?.() ?? '';
            const json = JSON.parse(text);
            if (json && Array.isArray(json.subtasks)) {
                const nodes = json.subtasks.map((label: string, idx: number) => ({ id: 'n' + idx, label })) as any;
                this.store.setDecomposition({ id: 'root', label: 'Task', children: nodes });
            }
        } catch (err) {
            // ignore parse errors for now
        }
        return super.onResponseComplete(request);
    }
} 