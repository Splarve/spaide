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

IMPORTANT: Your JSON response will be processed programmatically. The chat interface will display appropriate natural language messages to the user automatically based on your JSON output. Do NOT include conversational text - only the structured JSON response.

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
     * Provide the system message with variable resolution
     */
    protected async getSystemMessageDescription(): Promise<SystemMessageDescription | undefined> {
        return { text: TaskDecomposerChatAgent.SYSTEM_PROMPT_TEXT } as SystemMessageDescription;
    }

    /**
     * Override to inject context variables into the system prompt
     */
    protected async getSystemMessage(request: any): Promise<any> {
        console.log('🔧 Getting system message with context variables');
        
        // Get base system message
        const baseMessage = await this.getSystemMessageDescription();
        if (!baseMessage?.text) return baseMessage;
        
        // Resolve all variables
        let processedText = baseMessage.text;
        
        for (const variableName of this.variables) {
            const variableValue = await this.resolveVariable(variableName, request);
            const placeholder = `{{${variableName}}}`;
            
            console.log(`🔧 Replacing ${placeholder} with: ${variableValue ? 'content found' : 'empty'}`);
            processedText = processedText.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), variableValue);
        }
        
        console.log('✅ System message with variables resolved');
        
        return {
            ...baseMessage,
            text: processedText
        };
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
        
        console.log('🔍 Session methods available:', {
            hasGetVariable: !!session.getVariable,
            hasSetVariable: !!session.setVariable
        });
        
        const state = session.getVariable?.('clarificationState');
        console.log(`🔍 Clarification state: "${state}"`);
        
        if (state === 'waiting_for_answers') {
            const originalRequest = session.getVariable?.('originalRequest') || '';
            const pendingQuestions = session.getVariable?.('pendingQuestions') || '[]';
            
            console.log('🔍 Context variables found:', {
                originalRequest: originalRequest ? `"${originalRequest.substring(0, 50)}..."` : 'empty',
                pendingQuestions: pendingQuestions !== '[]' ? 'found' : 'empty'
            });
            
            const context = `CLARIFICATION_CONTEXT:
Original Request: ${originalRequest}
Pending Questions: ${pendingQuestions}
Status: User is currently providing answers to clarification questions. Use both the original request and their current answers to create the decomposition.`;
            
            console.log('✅ Built clarification context');
            return context;
        }
        
        console.log('⚪ No clarification context needed (state not waiting_for_answers)');
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
        if (request?.session) {
            console.log('✅ Found session in request.session');
            return request.session;
        }
        if (request?.request?.session) {
            console.log('✅ Found session in request.request.session');
            return request.request.session;
        }
        if (request?.context?.session) {
            console.log('✅ Found session in request.context.session');
            return request.context.session;
        }
        
        // Check for response object that might have session
        if (request?.response?.session) {
            console.log('✅ Found session in request.response.session');
            return request.response.session;
        }
        
        // Check for chat request model
        if (request?.chatRequestModel?.session) {
            console.log('✅ Found session in request.chatRequestModel.session');
            return request.chatRequestModel.session;
        }
        
        console.warn('❌ No session found in request object:', Object.keys(request || {}));
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
                console.log('❓ LLM needs clarification - displaying natural language questions');
                
                // Store clarification context in session
                this.storeClarificationContext(request, json);
                
                // Replace the JSON response with natural language questions for chat
                this.displayClarificationQuestions(request, json);
                
                // Add clarification suggestions to help user
                this.addClarificationSuggestions(request);
                
                // Set response to wait for input (Theia AI pattern)
                request.response.waitForInput();
                return;
            }
            
            // Handle successful HTN plan
            if (json.plan && Array.isArray(json.plan) && json.plan.length > 0) {
                console.log('✅ Successfully parsed HTN plan');
                
                // Clear any clarification context since we got a successful plan
                this.clearClarificationContext(request);
                
                // Process the decomposition for visual editor (JSON goes here)
                this.processDecomposition(json);
                
                // Replace JSON response with natural language success message for chat
                this.displaySuccessMessage(request, json);
                return;
            }
            
            console.error('❌ Invalid HTN response format');
            this.displayErrorMessage(request, 'I couldn\'t create a valid task decomposition. Please try rephrasing your request.');
            
        } catch (err) {
            console.error('❌ Error parsing HTN response:', err);
            
            // Try fallback parsing
            if (this.tryFallbackParsing(request)) {
                return;
            }
            
            // If all parsing fails, show error message
            this.displayErrorMessage(request, 'I encountered an error processing your request. Please try again.');
        }
        
        return super.onResponseComplete(request);
    }

    /** 
     * Display clarification questions in natural language in the chat
     */
    private displayClarificationQuestions(request: any, json: any): void {
        const questions = json.questions_for_user || [];
        
        let chatMessage = 'I need some clarification to create an accurate task decomposition:\n\n';
        
        questions.forEach((q: any, idx: number) => {
            const questionText = q.prompt || q.question || q;
            const questionType = q.type || '';
            
            chatMessage += `**${idx + 1}. ${questionText}**`;
            if (questionType) {
                chatMessage += ` *(${questionType})*`;
            }
            chatMessage += '\n\n';
        });
        
        chatMessage += 'Please provide your answers, and I\'ll create the task decomposition for you.';
        
        // Replace the response content with natural language
        this.setResponseContent(request, chatMessage);
        
        console.log('💬 Displayed clarification questions in chat');
    }

    /** 
     * Display success message in chat after processing decomposition
     */
    private displaySuccessMessage(request: any, json: any): void {
        const taskCount = json.plan ? json.plan.filter((task: any) => task.parent_id !== null).length : 0;
        const planSummary = json.plan_summary || 'task decomposition';
        
        let chatMessage = `✅ **Task decomposition complete!**\n\n`;
        chatMessage += `I've created a structured plan for: *${planSummary}*\n\n`;
        chatMessage += `📋 **${taskCount} tasks** have been organized in the visual editor.\n\n`;
        chatMessage += `You can now view, edit, and interact with your task breakdown in the decomposition panel.`;
        
        // Replace the response content with natural language
        this.setResponseContent(request, chatMessage);
        
        console.log('✅ Displayed success message in chat');
    }

    /** 
     * Display error message in chat
     */
    private displayErrorMessage(request: any, message: string): void {
        const chatMessage = `❌ ${message}`;
        this.setResponseContent(request, chatMessage);
        console.log('❌ Displayed error message in chat');
    }

    /** 
     * Helper to replace response content for chat display
     */
    private setResponseContent(request: any, content: string): void {
        if (request.response) {
            // Clear any existing response content
            request.response.clear?.();
            
            // Add the new natural language content
            request.response.addProgressMessage({
                content,
                show: 'always'
            });
            
            // Mark response as complete
            request.response.complete();
        }
    }

    /** 
     * Try fallback parsing for backward compatibility
     */
    private tryFallbackParsing(request: any): boolean {
        try {
            const text = request.response.response.asString?.() ?? '';
            const json = JSON.parse(text);
            
            if (json && Array.isArray(json.subtasks)) {
                console.log('🔄 Using fallback format parsing');
                
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
                
                // Show success message for fallback format
                this.displaySuccessMessage(request, {
                    plan_summary: rootLabel,
                    plan: nodes.map(() => ({ parent_id: null })) // Fake structure for counting
                });
                
                return true;
            }
        } catch (fallbackErr) {
            console.error('❌ Fallback parsing also failed:', fallbackErr);
        }
        
        return false;
    }

    /** 
     * Store clarification context in session for persistence
     */
    private storeClarificationContext(request: any, clarificationData: any): void {
        const session = this.getSession(request);
        if (!session) return;
        
        // Extract original request from the current message
        const originalRequest = this.extractUserMessageFromRequest(request);
        
        // Only store if we don't already have an original request (don't overwrite)
        const existingRequest = session.getVariable?.('originalRequest');
        if (!existingRequest) {
            session.setVariable?.('originalRequest', originalRequest);
            console.log('📝 Stored NEW original request:', originalRequest);
        } else {
            console.log('📝 Keeping existing original request:', existingRequest);
        }
        
        session.setVariable?.('pendingQuestions', JSON.stringify(clarificationData.questions_for_user || []));
        session.setVariable?.('clarificationState', 'waiting_for_answers');
        
        console.log('📝 Stored clarification context:', {
            originalRequest: session.getVariable?.('originalRequest'),
            questionsCount: clarificationData.questions_for_user?.length || 0
        });
    }

    /** 
     * Clear clarification context when no longer needed
     */
    private clearClarificationContext(request: any): void {
        const session = this.getSession(request);
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
        const session = this.getSession(request);
        if (!session?.setSuggestions) {
            console.warn('No setSuggestions method available on session');
            return;
        }
        
        console.log('🔗 Adding clarification suggestions');
        
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
        
        // Debug session state
        console.log('🔍 Session debug:', {
            hasGetVariable: !!session?.getVariable,
            hasSetVariable: !!session?.setVariable
        });
        
        const originalRequest = session?.getVariable?.('originalRequest') || '';
        const clarificationState = session?.getVariable?.('clarificationState') || '';
        const pendingQuestions = session?.getVariable?.('pendingQuestions') || '';
        
        console.log('🔍 Session variables:', {
            originalRequest: originalRequest ? 'Found' : 'Not found',
            clarificationState,
            pendingQuestions: pendingQuestions ? 'Found' : 'Not found'
        });
        
        if (originalRequest && originalRequest !== 'Unknown request') {
            console.log('🔄 I\'ll create a decomposition based on the original request and reasonable assumptions.');
            console.log(`Original request: ${originalRequest}`);
            
            // Clear clarification state so next request proceeds without waiting
            session?.setVariable?.('clarificationState', '');
            
            console.log('✅ Ready! Send your original request again with @decomposer to get a decomposition.');
        } else {
            console.log('❌ No original request found. Please start a new decomposition request.');
            console.log('💡 Try sending a new message like "@decomposer [your task description]"');
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
     * Extract user message from request for context storage
     */
    private extractUserMessageFromRequest(request: any): string {
        // Try various ways to extract the user message from the request
        if (typeof request === 'string') return request;
        
        // Check nested request object first (most common in Theia AI)
        if (request?.request?.text) return request.request.text;
        if (request?.request?.message) return request.request.message;
        if (request?.request?.content) return request.request.content;
        
        // Check direct properties
        if (request?.text) return request.text;
        if (request?.message) return request.message;
        if (request?.content) return request.content;
        
        // Check parts array for text content
        if (request?.parts && Array.isArray(request.parts)) {
            for (const part of request.parts) {
                if (part?.text) return part.text;
                if (part?.content) return part.content;
            }
        }
        
        console.warn('Could not extract user message from request:', request);
        return 'Unknown request';
    }
} 