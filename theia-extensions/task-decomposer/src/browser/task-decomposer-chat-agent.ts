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

    /** Chat context variables for conversation state management */
    variables: string[] = [
        'clarificationContext',
        'originalRequest', 
        'pendingQuestions',
        'conversationHistory'
    ];

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

CONTEXT VARIABLES
The following context variables provide important conversation state:

{{clarificationContext}} - Contains clarification state and pending questions if user is in a clarification flow
{{originalRequest}} - The user's original decomposition request when in clarification mode
{{pendingQuestions}} - List of pending clarification questions that need answers
{{conversationHistory}} - Recent conversation history for context

CLARIFICATION FOLLOW-UP HANDLING
When clarificationContext indicates the user is providing answers to clarification questions:

1. Use the originalRequest AND the user's current message (which contains answers) to create a complete decomposition
2. Set status to SUCCESS 
3. Generate the full plan based on both the original request and the clarification answers
4. Do NOT ask for more clarification unless absolutely necessary

When the user provides clarification answers, treat their message as responses to the pending questions and proceed with decomposition.

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

    /** 
     * Resolve context variables for dynamic prompt injection
     * This method is called by Theia AI when processing prompt templates
     */
    protected async resolveVariable(name: string, request: any): Promise<string> {
        console.log(`🔧 Resolving variable: ${name}`);
        
        try {
            switch (name) {
                case 'clarificationContext':
                    return await this.getClarificationContext(request);
                case 'originalRequest':
                    return await this.getOriginalRequest(request);
                case 'pendingQuestions':
                    return await this.getPendingQuestions(request);
                case 'conversationHistory':
                    return await this.getConversationHistory(request);
                default:
                    console.log(`⚠️ Unknown variable: ${name}`);
                    return '';
            }
        } catch (error) {
            console.error(`❌ Error resolving variable ${name}:`, error);
            return '';
        }
    }

    private async getClarificationContext(request: any): Promise<string> {
        const session = this.getSession(request);
        if (!session) {
            console.log('📭 No session available for clarificationContext');
            return '';
        }
        
        const state = session.getVariable?.('clarificationState');
        console.log(`🔍 Clarification state: ${state}`);
        
        if (state === 'waiting_for_answers') {
            const originalRequest = session.getVariable?.('originalRequest') || '';
            const pendingQuestions = session.getVariable?.('pendingQuestions') || '[]';
            
            const context = `CLARIFICATION_CONTEXT:
Original Request: ${originalRequest}
Pending Questions: ${pendingQuestions}
Status: User is currently providing answers to clarification questions. Use both the original request and their current answers to create the decomposition.`;
            
            console.log('✅ Built clarification context');
            return context;
        }
        
        return '';
    }

    private async getOriginalRequest(request: any): Promise<string> {
        const session = this.getSession(request);
        const originalRequest = session?.getVariable?.('originalRequest') || '';
        console.log(`📝 Original request: ${originalRequest ? 'Found' : 'Not found'}`);
        return originalRequest;
    }

    private async getPendingQuestions(request: any): Promise<string> {
        const session = this.getSession(request);
        const questions = session?.getVariable?.('pendingQuestions') || '[]';
        
        try {
            const parsed = JSON.parse(questions);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const formatted = parsed.map((q: any, idx: number) => {
                    const questionText = q.prompt || q.question || q;
                    return `${idx + 1}. ${questionText}`;
                }).join('\n');
                
                console.log(`❓ Found ${parsed.length} pending questions`);
                return `PENDING_CLARIFICATION_QUESTIONS:\n${formatted}`;
            }
        } catch (e) {
            console.warn('Could not parse pending questions:', e);
        }
        
        return '';
    }

    private async getConversationHistory(request: any): Promise<string> {
        const session = this.getSession(request);
        if (!session?.getAllMessages) {
            console.log('📭 No message history available');
            return '';
        }
        
        try {
            const messages = session.getAllMessages();
            const history = messages
                .filter((msg: any) => msg.participant?.id === 'user' || msg.participant?.id === this.id)
                .slice(-5) // Last 5 exchanges
                .map((msg: any) => {
                    const sender = msg.participant?.id === 'user' ? 'User' : 'Decomposer';
                    const text = msg.text || msg.content || '';
                    return `${sender}: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`;
                })
                .join('\n');
            
            if (history) {
                console.log(`📚 Found conversation history with ${messages.length} messages`);
                return `RECENT_CONVERSATION:\n${history}`;
            }
        } catch (e) {
            console.warn('Could not retrieve conversation history:', e);
        }
        
        return '';
    }

    /** 
     * Helper to safely get session from different request types
     */
    private getSession(request: any): any {
        // Handle different request formats from Theia AI
        if (request?.session) return request.session;
        if (request?.request?.session) return request.request.session;
        if (request?.context?.session) return request.context.session;
        
        console.warn('No session found in request object');
        return null;
    }

    /** 
     * Handle response completion with proper Theia AI context management
     */
    protected async onResponseComplete(request: any): Promise<void> {
        try {
            const text = request.response.response.asString?.() ?? '';
            console.log('🔍 Raw LLM response:', text);
            
            const json = JSON.parse(text);
            console.log('📊 Parsed JSON:', json);
            
            // Check if LLM needs clarification
            if (json.status && json.status.includes('CLARIFICATION_NEEDED')) {
                console.log('❓ LLM needs clarification - storing context and waiting for input');
                
                // Store clarification context in session
                this.storeClarificationContext(request, json);
                
                // Add clarification suggestions to help user
                this.addClarificationSuggestions(request);
                
                // Set response to wait for input (Theia AI pattern)
                request.response.addProgressMessage({ 
                    content: 'Please provide the requested clarification...', 
                    show: 'whileIncomplete' 
                });
                request.response.waitForInput();
                return;
            }
            
            // Handle successful HTN plan
            if (json.plan && Array.isArray(json.plan) && json.plan.length > 0) {
                console.log('✅ Successfully parsed HTN plan');
                
                // Clear any clarification context since we got a successful plan
                this.clearClarificationContext(request);
                
                // Process the decomposition for visual editor
                this.processDecomposition(json);
                return;
            }
            
            console.error('❌ Invalid HTN response format');
            
        } catch (err) {
            console.error('❌ Error parsing HTN response:', err);
            this.handleFallbackParsing(request);
        }
        
        return super.onResponseComplete(request);
    }

    /** 
     * Store clarification context in session for persistence
     */
    private storeClarificationContext(request: any, clarificationData: any): void {
        const session = request?.session;
        if (!session) return;
        
        // Extract original request from the current message
        const originalRequest = this.extractUserMessageFromRequest(request);
        
        session.setVariable?.('originalRequest', originalRequest);
        session.setVariable?.('pendingQuestions', JSON.stringify(clarificationData.questions_for_user || []));
        session.setVariable?.('clarificationState', 'waiting_for_answers');
        
        console.log('📝 Stored clarification context:', {
            originalRequest,
            questionsCount: clarificationData.questions_for_user?.length || 0
        });
    }

    /** 
     * Clear clarification context when no longer needed
     */
    private clearClarificationContext(request: any): void {
        const session = request?.session;
        if (!session) return;
        
        session.setVariable?.('originalRequest', '');
        session.setVariable?.('pendingQuestions', '[]');
        session.setVariable?.('clarificationState', '');
        
        console.log('🧹 Cleared clarification context');
    }

    /** 
     * Add chat suggestions to guide user during clarification
     */
    private addClarificationSuggestions(request: any): void {
        const session = request?.session;
        if (!session?.setSuggestions) return;
        
        session.setSuggestions([
            {
                kind: 'callback',
                callback: () => this.provideClarificationGuidance(session),
                content: '[Get help with these questions](_callback)'
            },
            {
                kind: 'callback', 
                callback: () => this.proceedWithPartialInfo(session),
                content: '[Proceed with available information](_callback)'
            }
        ]);
    }

    /** 
     * Provide clarification guidance to user
     */
    private provideClarificationGuidance(session: any): void {
        const questions = session.getVariable?.('pendingQuestions') || '[]';
        const originalRequest = session.getVariable?.('originalRequest') || '';
        
        console.log('💡 Clarification guidance:');
        console.log(`Original request: ${originalRequest}`);
        console.log('Please answer the questions above to get a more accurate task decomposition.');
        
        try {
            const parsed = JSON.parse(questions);
            if (Array.isArray(parsed)) {
                console.log(`You have ${parsed.length} questions to answer.`);
                parsed.forEach((q: any, idx: number) => {
                    console.log(`${idx + 1}. ${q.prompt || q.question || q}`);
                });
            }
        } catch (e) {
            console.log('Questions:', questions);
        }
        
        console.log('\n💬 Just type your answers in a normal message - I\'ll automatically combine them with your original request!');
    }

    /** 
     * Proceed with partial information if user chooses
     */
    private proceedWithPartialInfo(session: any): void {
        console.log('⚡ Proceeding with available information...');
        
        const originalRequest = session.getVariable?.('originalRequest') || '';
        if (originalRequest) {
            console.log('🔄 I\'ll create a decomposition based on the original request and reasonable assumptions.');
            console.log(`Original request: ${originalRequest}`);
            
            // Clear clarification state so next request proceeds without waiting
            session.setVariable?.('clarificationState', '');
            
            console.log('✅ Ready! Send your original request again with @decomposer to get a decomposition.');
        } else {
            console.log('❌ No original request found. Please start a new decomposition request.');
        }
    }

    /** 
     * Get available tool functions for this agent
     */
    protected getToolFunctions(): any[] {
        return [
            {
                name: 'storeClarificationContext',
                description: 'Store clarification context for follow-up',
                handler: this.handleStoreClarification.bind(this)
            },
            {
                name: 'retrieveContext',
                description: 'Retrieve stored conversation context',
                handler: this.handleRetrieveContext.bind(this)
            },
            {
                name: 'clearContext',
                description: 'Clear stored clarification context',
                handler: this.handleClearContext.bind(this)
            }
        ];
    }

    /** 
     * Tool function: Store clarification context
     */
    private async handleStoreClarification(params: any): Promise<string> {
        console.log('🔧 Tool: storeClarificationContext called', params);
        // This would be called by the LLM if needed
        return 'Clarification context stored successfully';
    }

    /** 
     * Tool function: Retrieve context
     */
    private async handleRetrieveContext(params: any): Promise<string> {
        console.log('🔧 Tool: retrieveContext called', params);
        // This would be called by the LLM to get context
        return 'Context retrieved successfully';
    }

    /** 
     * Tool function: Clear context
     */
    private async handleClearContext(params: any): Promise<string> {
        console.log('🔧 Tool: clearContext called', params);
        // This would be called by the LLM to clear context
        return 'Context cleared successfully';
    }

    /** 
     * Process successful decomposition for visual editor
     */
    private processDecomposition(json: any): void {
        // Find the root task
        const rootTask = json.plan.find((task: any) => task.parent_id === null);
        
        // Flatten the HTN structure to simple format for visual editor
        const childTasks = json.plan.filter((task: any) => task.parent_id !== null);
        
        console.log('🌳 Root task:', rootTask?.description);
        console.log('📋 Child tasks:', childTasks.length);
        
        // Map HTN tasks to simple visual format
        const nodes = childTasks.map((task: any) => ({
            id: `task_${task.task_id}`,
            label: task.description,
            // Map task types to visual categories  
            category: task.task_type === 'PRIMITIVE' ? 'code' : 'design',
            // Keep HTN metadata for future use
            taskType: task.task_type,
            dependencies: task.dependencies || [],
            parameters: task.parameters || {},
            rationale: task.rationale
        }));
        
        // Use plan_summary as root title
        const rootLabel = json.plan_summary || rootTask?.description || 'HTN Plan';
        
        console.log('🏷️ Using root label:', rootLabel);
        console.log('📋 Created nodes:', nodes.length);
        
        this.store.setDecomposition({ 
            id: 'root', 
            label: rootLabel, 
            children: nodes 
        });
    }

    /** 
     * Handle fallback parsing for backward compatibility
     */
    private handleFallbackParsing(request: any): void {
        try {
            const text = request.response.response.asString?.() ?? '';
            const json = JSON.parse(text);
            
            if (json && Array.isArray(json.subtasks)) {
                console.log('🔄 Falling back to old simple format parsing');
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

    /** 
     * Extract user message from request for context storage
     */
    private extractUserMessageFromRequest(request: any): string {
        // Try various ways to extract the user message from the request
        if (typeof request === 'string') return request;
        if (request?.request?.message) return request.request.message;
        if (request?.message) return request.message;
        if (request?.text) return request.text;
        if (request?.content) return request.content;
        return String(request);
    }
} 