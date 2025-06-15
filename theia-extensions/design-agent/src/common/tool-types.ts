/********************************************************************************
 * Copyright (C) 2024 Design Agent Extension - Private Project.
 * All rights reserved. This code is proprietary and confidential.
 ********************************************************************************/

/**
 * Base interface for all tool parameters
 */
export interface ToolParameters {
    [key: string]: any;
}

/**
 * Base interface for all tool results
 */
export interface ToolResult {
    success: boolean;
    message: string;
    data?: any;
    error?: string;
}

/**
 * Tool execution context - provides access to the environment
 */
export interface ToolContext {
    workspaceRoot?: string;
    activeEditorId?: string;
    userId?: string;
    sessionId?: string;
}

/**
 * JSON Schema definition for tool parameters
 */
export interface ToolParameterSchema {
    type: string;
    description?: string;
    required?: boolean;
    default?: any;
    enum?: any[];
    properties?: { [key: string]: ToolParameterSchema };
    items?: ToolParameterSchema;
}

/**
 * Tool metadata and definition
 */
export interface ToolDefinition {
    id: string;
    name: string;
    description: string;
    category: string;
    version: string;
    parameters: { [key: string]: ToolParameterSchema };
    requiredParameters: string[];
    examples?: ToolExample[];
}

/**
 * Example usage of a tool
 */
export interface ToolExample {
    description: string;
    parameters: ToolParameters;
    expectedResult?: Partial<ToolResult>;
}

/**
 * Main tool interface that all tools must implement
 */
export interface DesignTool {
    /**
     * Tool metadata
     */
    readonly definition: ToolDefinition;

    /**
     * Execute the tool with given parameters
     */
    execute(parameters: ToolParameters, context: ToolContext): Promise<ToolResult>;

    /**
     * Validate parameters before execution
     */
    validateParameters(parameters: ToolParameters): ToolValidationResult;

    /**
     * Check if the tool is available in the current context
     */
    isAvailable(context: ToolContext): boolean;
}

/**
 * Tool parameter validation result
 */
export interface ToolValidationResult {
    valid: boolean;
    errors: string[];
    warnings?: string[];
}

/**
 * Tool registry interface
 */
export interface ToolRegistry {
    /**
     * Register a new tool
     */
    registerTool(tool: DesignTool): void;

    /**
     * Unregister a tool
     */
    unregisterTool(toolId: string): void;

    /**
     * Get a specific tool by ID
     */
    getTool(toolId: string): DesignTool | undefined;

    /**
     * Get all registered tools
     */
    getAllTools(): DesignTool[];

    /**
     * Get tools by category
     */
    getToolsByCategory(category: string): DesignTool[];

    /**
     * Get available tools for current context
     */
    getAvailableTools(context: ToolContext): DesignTool[];

    /**
     * Execute a tool by ID
     */
    executeTool(toolId: string, parameters: ToolParameters, context: ToolContext): Promise<ToolResult>;
}

/**
 * Tool categories
 */
export enum ToolCategory {
    CANVAS_MANIPULATION = 'canvas-manipulation',
    COMPONENT_CREATION = 'component-creation',
    COMPONENT_MODIFICATION = 'component-modification',
    COMPONENT_QUERY = 'component-query',
    LAYOUT = 'layout',
    STYLING = 'styling',
    FILE_OPERATIONS = 'file-operations'
}

/**
 * Common parameter types for design tools
 */
export interface PositionParameters {
    x: number;
    y: number;
}

export interface SizeParameters {
    width: number;
    height: number;
}

export interface ComponentParameters {
    componentId: string;
}

export interface TextParameters {
    text: string;
}

/**
 * Common result types for design tools
 */
export interface ComponentCreationResult extends ToolResult {
    data: {
        componentId: string;
        component: any; // Will be Component from file-utils.ts
    };
}

export interface ComponentModificationResult extends ToolResult {
    data: {
        componentId: string;
        previousState: any;
        newState: any;
    };
}

export interface ComponentQueryResult extends ToolResult {
    data: {
        components: any[]; // Will be Component[] from file-utils.ts
        count: number;
    };
} 