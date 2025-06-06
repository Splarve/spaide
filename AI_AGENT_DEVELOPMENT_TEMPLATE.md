# Theia AI Agent Development Template

This document serves as a comprehensive template and reference for developing custom AI agents in Theia IDE using the Theia AI framework.

## 🏗️ Project Context

**Current Setup:**
- Theia IDE with full AI integration (version 1.62.1)
- All Theia AI packages already installed and configured
- Extensions work across browser, electron, and docker deployments
- Located in `/Users/eakyuz/spaide` workspace

**AI Packages Available:**
- `@theia/ai-core` - Core AI framework
- `@theia/ai-chat` - Chat functionality  
- `@theia/ai-chat-ui` - Chat user interface
- `@theia/ai-anthropic`, `@theia/ai-openai`, `@theia/ai-ollama` - LLM providers
- `@theia/ai-mcp` - Model Context Protocol support
- And more...

## 📊 Domain Model: Task & Node Management System

### Core Interfaces

```typescript
// TaskDefinition – Represents a single task
export interface TaskDefinition {
  id: string;
  title: string;
  description: string;
  inputs: IO[];
  outputs: IO[];
  parameters?: Record<string, any>;
  dependsOn?: string[]; // references other TaskDefinition ids
  node?: string;        // reference to a NodeDefinition id
}

// IO – Represents an input or output artifact
export interface IO {
  id: string;
  type: string;              // e.g. "signal-trace", "report", "result-data"
  format?: string;           // optional, e.g. "markdown", "json"
  source?: string;           // e.g. another task ID or data provider
  [meta: string]: any;       // open for additional domain-specific info
}

// NodeDefinition – Represents a node where tasks may be assigned
export interface NodeDefinition {
  id: string;
  label?: string;             // Human-readable name
  type: string;               // e.g. "compute", "simulator", "test-bench"
  capabilities?: string[];    // Describes what kinds of tasks it can support
  location?: string;          // e.g. rack ID, IP, zone, etc.
  meta?: Record<string, any>; // Open metadata
}
```

### Example Data Files

**task-definitions/generate-report.json:**
```json
{
  "id": "generate-report",
  "title": "Generate Analysis Report",
  "description": "Processes cleaned results and outputs a report.",
  "inputs": [
    { "id": "cleaned-results", "type": "result-data", "source": "clean-results" }
  ],
  "outputs": [
    { "id": "summary-report", "type": "report", "format": "markdown" }
  ],
  "parameters": {
    "includeGraphs": true
  },
  "dependsOn": ["clean-results"],
  "node": "compute-node-a"
}
```

**nodes/compute-node-a.json:**
```json
{
  "id": "compute-node-a",
  "label": "Compute Node A",
  "type": "compute",
  "capabilities": ["reporting", "aggregation"],
  "location": "lab-3-rack-7"
}
```

## 🛠️ Required Tool Functions

### Task Functions
1. `listTasks(): TaskDefinition[]` - Returns all task definitions
2. `getTask(id: string): TaskDefinition | undefined` - Find task by ID
3. `updateTask(id: string, changes: Partial<TaskDefinition>): TaskDefinition` - Update task
4. `createTask(task: TaskDefinition): void` - Create new task
5. `deleteTask(id: string): void` - Delete task
6. `getTasksByNode(nodeId: string): TaskDefinition[]` - Tasks by node
7. `findTasksByIOType(ioType: string, direction: 'input' | 'output'): TaskDefinition[]` - Tasks by IO type
8. `getUpstreamTasks(id: string): TaskDefinition[]` - Get dependencies
9. `getDownstreamTasks(id: string): TaskDefinition[]` - Get dependents

### Node Functions
10. `listNodes(): NodeDefinition[]` - All nodes
11. `getNode(id: string): NodeDefinition | undefined` - Node by ID
12. `createNode(node: NodeDefinition): void` - Create node
13. `updateNode(id: string, changes: Partial<NodeDefinition>): NodeDefinition` - Update node
14. `deleteNode(id: string): void` - Delete node

## 📝 Agent Development Patterns

### 1. Basic Chat Agent Structure

```typescript
import { LanguageModelRequirement } from '@theia/ai-core/lib/common';
import { injectable } from '@theia/core/shared/inversify';
import { AbstractStreamParsingChatAgent } from '@theia/ai-chat/lib/common/chat-agents';
import { nls } from '@theia/core';

export const FlowChatAgentId = 'Flow';

@injectable()
export class FlowChatAgent extends AbstractStreamParsingChatAgent {
    id: string = FlowChatAgentId;
    name = FlowChatAgentId;
    
    languageModelRequirements: LanguageModelRequirement[] = [{
        purpose: 'chat',
        identifier: 'openai/gpt-4o',
    }];
    
    protected defaultLanguageModelPurpose: string = 'chat';
    
    override description = nls.localize('flow/ai/chat/description', 
        'Domain-specific assistant for managing tasks and nodes...');
    
    override promptTemplates = [flowTemplate];
    protected override systemPromptId: string = flowTemplate.id;
}
```

### 2. Prompt Template with Tool Functions

```typescript
import { PromptTemplate } from '@theia/ai-core/lib/common';

export const flowTemplate: PromptTemplate = {
    id: 'flow-system',
    template: `You are a Flow assistant for managing tasks and nodes.

Use these functions to interact with the workspace:
~{listTasks}
~{getTask}
~{createTask}
~{updateTask}
~{deleteTask}
~{listNodes}
~{getNode}
~{createNode}

Current Context:
{{contextDetails}}
`
};
```

### 3. Tool Function Implementation Pattern

```typescript
import { ToolProvider, ToolRequest } from '@theia/ai-core';
import { injectable, inject } from '@theia/core/shared/inversify';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { WorkspaceService } from '@theia/workspace/lib/browser';

@injectable()
export class ListTasksFunction implements ToolProvider {
    static ID = 'listTasks';

    @inject(FileService)
    protected readonly fileService: FileService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    getTool(): ToolRequest {
        return {
            id: ListTasksFunction.ID,
            name: 'listTasks',
            description: 'Returns all task definitions in the workspace',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            },
            handler: () => this.listTasks()
        };
    }

    private async listTasks(): Promise<TaskDefinition[]> {
        // Implementation here - read task-definitions/*.json files
        // Return parsed TaskDefinition objects
    }
}
```

### 4. Registration in Frontend Module

```typescript
import { ContainerModule } from '@theia/core/shared/inversify';
import { ChatAgent } from '@theia/ai-chat/lib/common';
import { Agent, bindToolProvider } from '@theia/ai-core/lib/common';
import { FlowChatAgent } from './flow-chat-agent';
import { ListTasksFunction } from './list-tasks-function';

export default new ContainerModule((bind) => {
    // Register the chat agent
    bind(FlowChatAgent).toSelf().inSingletonScope();
    bind(Agent).toService(FlowChatAgent);
    bind(ChatAgent).toService(FlowChatAgent);
    
    // Register tool functions
    bindToolProvider(ListTasksFunction, bind);
    // ... bind other tool functions
});
```

## 🎯 Development Guidelines

### Tool Function Best Practices
1. **Full JSON Schema**: Always specify complete parameter schemas
2. **Workspace Boundaries**: Ensure all file operations stay within workspace
3. **Error Handling**: Return meaningful error messages as JSON
4. **Type Safety**: Use proper TypeScript interfaces
5. **Async Operations**: Handle file I/O properly with async/await

### Agent Design Considerations
1. **Single vs Multiple Agents**: Consider whether one "Flow" agent or specialized agents
2. **Tool Function Scope**: Balance between comprehensive and focused functionality
3. **User Experience**: Design for natural language interaction
4. **Context Management**: Leverage Theia AI's context system effectively

### Extension Structure
```
theia-extensions/
└── flow-ai-assistant/
    ├── package.json
    ├── src/
    │   ├── browser/
    │   │   ├── flow-frontend-module.ts
    │   │   ├── agents/
    │   │   │   └── flow-chat-agent.ts
    │   │   ├── tools/
    │   │   │   ├── task-functions.ts
    │   │   │   └── node-functions.ts
    │   │   └── data-model/
    │   │       └── flow-interfaces.ts
    │   └── common/
    └── tsconfig.json
```

## 🔧 Required Dependencies

Add to package.json:
```json
{
  "dependencies": {
    "@theia/ai-core": "1.61.0",
    "@theia/ai-chat": "1.61.0", 
    "@theia/ai-chat-ui": "1.61.0",
    "@theia/ai-openai": "1.61.0"
  }
}
```

## 💡 Usage Examples

### Chat Interactions
- `@Flow list all tasks`
- `@Flow create a new task for data processing`
- `@Flow show me tasks assigned to compute-node-a`
- `@Flow analyze dependencies for task generate-report`

### Tool Function Usage in Prompts
```typescript
// In system prompt:
`Use ~{listTasks} to see all available tasks
Use ~{getTask} with an ID to get specific task details
Use ~{createTask} to create new tasks based on user requirements`
```

## 🚀 Next Steps Template

When developing new agents:

1. **Define the domain model** (interfaces, data structures)
2. **Identify required tool functions** (CRUD operations, analysis functions)
3. **Design the agent personality** (system prompt, capabilities)
4. **Implement tool functions** (with proper JSON schemas)
5. **Create the chat agent** (extending AbstractStreamParsingChatAgent)
6. **Register everything** (in frontend module)
7. **Test and iterate** (refine prompts and functionality)

---

**Note**: This template is based on Theia AI framework patterns and the task/node management domain. Adapt the specifics to your particular use case while following these established patterns. 