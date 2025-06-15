/********************************************************************************
 * Copyright (C) 2024 Design Agent Extension - Private Project.
 * All rights reserved. This code is proprietary and confidential.
 ********************************************************************************/

import { injectable } from '@theia/core/shared/inversify';
import { 
    DesignTool, 
    ToolRegistry, 
    ToolParameters, 
    ToolContext, 
    ToolResult 
} from '../../common/tool-types';

@injectable()
export class DesignToolRegistry implements ToolRegistry {
    private tools = new Map<string, DesignTool>();

    public registerTool(tool: DesignTool): void {
        const toolId = tool.definition.id;
        
        if (this.tools.has(toolId)) {
            console.warn(`🔧 Tool with ID '${toolId}' is already registered. Overwriting...`);
        }
        
        this.tools.set(toolId, tool);
        console.log(`🔧 Registered tool: ${tool.definition.name} (${toolId}) - ${tool.definition.category}`);
    }

    public unregisterTool(toolId: string): void {
        const tool = this.tools.get(toolId);
        if (tool) {
            this.tools.delete(toolId);
            console.log(`🔧 Unregistered tool: ${tool.definition.name} (${toolId})`);
        } else {
            console.warn(`🔧 Attempted to unregister unknown tool: ${toolId}`);
        }
    }

    public getTool(toolId: string): DesignTool | undefined {
        return this.tools.get(toolId);
    }

    public getAllTools(): DesignTool[] {
        return Array.from(this.tools.values());
    }

    public getToolsByCategory(category: string): DesignTool[] {
        return this.getAllTools().filter(tool => tool.definition.category === category);
    }

    public getAvailableTools(context: ToolContext): DesignTool[] {
        return this.getAllTools().filter(tool => tool.isAvailable(context));
    }

    public async executeTool(toolId: string, parameters: ToolParameters, context: ToolContext): Promise<ToolResult> {
        const tool = this.getTool(toolId);
        
        if (!tool) {
            return {
                success: false,
                message: `Tool not found: ${toolId}`,
                error: `No tool registered with ID '${toolId}'`
            };
        }

        // Check if tool is available in current context
        if (!tool.isAvailable(context)) {
            return {
                success: false,
                message: `Tool not available: ${tool.definition.name}`,
                error: `Tool '${toolId}' is not available in the current context`
            };
        }

        // Validate parameters
        const validation = tool.validateParameters(parameters);
        if (!validation.valid) {
            return {
                success: false,
                message: `Invalid parameters for tool: ${tool.definition.name}`,
                error: `Parameter validation failed: ${validation.errors.join(', ')}`
            };
        }

        try {
            console.log(`🔧 Executing tool: ${tool.definition.name} with parameters:`, parameters);
            const result = await tool.execute(parameters, context);
            console.log(`🔧 Tool execution result:`, result);
            return result;
        } catch (error) {
            console.error(`🔧 Tool execution failed for ${tool.definition.name}:`, error);
            return {
                success: false,
                message: `Tool execution failed: ${tool.definition.name}`,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Get tool definitions in a format suitable for AI agents
     * This returns just the metadata needed for the agent to understand available tools
     */
    public getToolDefinitionsForAgent(context: ToolContext): Array<{
        id: string;
        name: string;
        description: string;
        category: string;
        parameters: any;
        examples?: any[];
    }> {
        return this.getAvailableTools(context).map(tool => ({
            id: tool.definition.id,
            name: tool.definition.name,
            description: tool.definition.description,
            category: tool.definition.category,
            parameters: tool.definition.parameters,
            examples: tool.definition.examples
        }));
    }

    /**
     * Get a summary of all registered tools for debugging
     */
    public getRegistryStatus(): {
        totalTools: number;
        toolsByCategory: { [category: string]: number };
        toolIds: string[];
    } {
        const tools = this.getAllTools();
        const toolsByCategory: { [category: string]: number } = {};
        
        tools.forEach(tool => {
            const category = tool.definition.category;
            toolsByCategory[category] = (toolsByCategory[category] || 0) + 1;
        });

        return {
            totalTools: tools.length,
            toolsByCategory,
            toolIds: tools.map(t => t.definition.id)
        };
    }
} 