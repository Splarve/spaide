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
    private static readonly SYSTEM_PROMPT_TEXT = `CORE DIRECTIVE
1. Persona
You are an expert AI system architect and project manager specializing in Hierarchical Task Network (HTN) planning. Your core competency is decomposing large, ambiguous user goals into a precise, structured, and machine-readable plan of executable sub-tasks for a team of autonomous AI agents. You are rigorous, logical, and meticulous.

2. Primary Goal
Your primary goal is to take a user's request and decompose it into a detailed, hierarchical plan represented as a dependency graph of tasks. This plan must be complete, logical, and immediately usable by an automated execution engine.

3. Absolute Constraints
You MUST ONLY respond with a single, valid, and syntactically correct JSON object.

You MUST NOT under any circumstances include any commentary, explanations, apologies, or any other text outside of the final JSON object.

The JSON output MUST strictly adhere to the schema provided in the "OUTPUT SCHEMA" section. Do not add, remove, or modify any keys from this schema.

Start your response immediately with { and end it with }.

DECOMPOSITION METHODOLOGY
1. Core Concepts (Hierarchical Task Network - HTN)
You will decompose the user's goal into a hierarchy of COMPOUND and PRIMITIVE tasks.

A COMPOUND task is an abstract goal that is too complex to be executed directly and MUST be broken down further into more granular sub-tasks (e.g., "Implement user authentication").

A PRIMITIVE task is an atomic, executable unit of work that requires no further decomposition.

2. The Primitive Task Test (Stopping Condition)
This is the most critical rule. Before you classify a task as PRIMITIVE, you MUST verify it meets ALL of the following criteria:

Actionable: It represents a single, concrete action (e.g., "create file," "write function," "run test," "call API").

Self-Contained: It can be accomplished by a single, non-branching block of code or a single tool/API call.

Unambiguous: Its description is precise, and all necessary parameters for its execution are either specified directly or can be derived from the outputs of its declared dependencies. It does not require implicit decision-making or human clarification to be executed.

If a task fails this test, it MUST be classified as COMPOUND and decomposed further.

3. Dependency Graph Logic
Each task in the plan must have a unique task_id.

The plan forms a directed acyclic graph (DAG). A task's dependencies array should list the task_ids of any other tasks that MUST be completed before it can start.

A task can only depend on its siblings or the siblings of its ancestors. Circular dependencies are forbidden.

The ultimate goal is to produce a plan where the leaf nodes of the hierarchy are all PRIMITIVE tasks.

INTERACTIVE CLARIFICATION PROTOCOL
1. Ambiguity Detection
If the user's request is vague, ambiguous, incomplete, or requires you to make significant assumptions about key details (e.g., specific technologies, file paths, business logic), you MUST NOT proceed with decomposition. Making assumptions leads to incorrect plans.

2. Clarification Procedure
If ambiguity is detected:

Set the status field in the root of the JSON object to CLARIFICATION_NEEDED.

Populate the questions_for_user array with a list of specific, targeted, and numbered questions.

These questions should be designed to elicit the exact information needed to remove the ambiguity and create a precise plan.

Do NOT generate any tasks in the plan array. The plan array MUST be empty.

OUTPUT SCHEMA
Your entire output MUST be a single JSON object conforming to this exact structure.

{
  "status": "SUCCESS | CLARIFICATION_NEEDED",
  "plan_summary": "A one-sentence summary of the overall goal of the plan.",
  "plan": [
    {
      "task_id": 1,
      "parent_id": null,
      "description": "Description of the main top-level task.",
      "task_type": "COMPOUND",
      "dependencies": [],
      "parameters": {},
      "rationale": "Initial thoughts on why this top-level task is structured this way."
    },
    {
      "task_id": 2,
      "parent_id": 1,
      "description": "Description of the first sub-task.",
      "task_type": "COMPOUND | PRIMITIVE",
      "dependencies": [],
      "parameters": {
        "param_name": "value"
      },
      "rationale": "Chain-of-Thought reasoning for why this sub-task is necessary and how it contributes to the parent task."
    },
    {
      "task_id": 3,
      "parent_id": 1,
      "description": "Description of the second sub-task that depends on the first.",
      "task_type": "PRIMITIVE",
      "dependencies": [2],
      "parameters": {
        "file_path": "/src/services/auth.service.ts",
        "content_from_task": 2
      },
      "rationale": "This task depends on the completion of task 2. It will use the output from task 2 as part of its input."
    }
  ],
  "questions_for_user": []
}`;

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
            console.log('🔍 Raw LLM response:', text);
            
            const json = JSON.parse(text);
            console.log('📊 Parsed JSON:', json);
            
            if (json.status === 'CLARIFICATION_NEEDED') {
                console.log('❓ LLM needs clarification');
                // Handle clarification case - could show questions to user
                const clarificationMessage = json.questions_for_user?.length > 0 
                    ? json.questions_for_user.join('\n') 
                    : 'The request needs clarification. Please provide more specific details.';
                
                this.store.setDecomposition({
                    id: 'clarification',
                    label: 'Clarification Needed',
                    children: [{
                        id: 'questions',
                        label: clarificationMessage,
                        category: 'research'
                    }]
                });
                return;
            }
            
            if (json.status === 'SUCCESS' && json.plan && Array.isArray(json.plan)) {
                console.log('✅ Successfully parsed HTN plan');
                
                // Convert HTN plan to our visual tree structure
                const rootTask = json.plan.find((task: any) => task.parent_id === null);
                const childTasks = json.plan.filter((task: any) => task.parent_id !== null);
                
                if (!rootTask) {
                    console.error('❌ No root task found in plan');
                    return;
                }
                
                // Map task types to visual categories
                const mapTaskTypeToCategory = (taskType: string): string => {
                    switch (taskType.toLowerCase()) {
                        case 'primitive':
                            return 'code'; // Primitive tasks are typically executable code
                        case 'compound':
                            return 'design'; // Compound tasks are higher-level planning
                        default:
                            return 'code';
                    }
                };
                
                // Create child nodes from HTN tasks
                const nodes = childTasks.map((task: any) => ({
                    id: `task_${task.task_id}`,
                    label: task.description,
                    category: mapTaskTypeToCategory(task.task_type),
                    // Add HTN-specific metadata
                    taskType: task.task_type,
                    dependencies: task.dependencies || [],
                    parameters: task.parameters || {},
                    rationale: task.rationale
                }));
                
                // Use plan_summary as root title, with fallback
                const rootLabel = json.plan_summary || rootTask.description || 'HTN Plan';
                
                console.log('🏷️ Using root label:', rootLabel);
                console.log('📋 Created nodes:', nodes.length);
                
                this.store.setDecomposition({ 
                    id: 'root', 
                    label: rootLabel, 
                    children: nodes 
                });
            } else {
                console.error('❌ Invalid response format - missing status or plan');
            }
        } catch (err) {
            console.error('❌ Error in onResponseComplete:', err);
            
            // Fallback: try to handle old format for backward compatibility
            try {
                const json = JSON.parse(request.response.response.asString?.() ?? '');
                if (json && Array.isArray(json.subtasks)) {
                    console.log('🔄 Falling back to old format parsing');
                    const nodes = json.subtasks.map((task: any, idx: number) => ({
                        id: 'n' + idx,
                        label: typeof task === 'string' ? task : task.label,
                        category: typeof task === 'object' ? task.category : 'code'
                    }));
                    
                    const rootLabel = json.title || 'Task';
                    this.store.setDecomposition({ 
                        id: 'root', 
                        label: rootLabel, 
                        children: nodes 
                    });
                }
            } catch (fallbackErr) {
                console.error('❌ Fallback parsing also failed:', fallbackErr);
            }
        }
        return super.onResponseComplete(request);
    }
} 