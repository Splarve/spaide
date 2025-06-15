/********************************************************************************
 * Copyright (C) 2024 Design Agent Extension - Private Project.
 * All rights reserved. This code is proprietary and confidential.
 ********************************************************************************/

import { 
    DesignTool, 
    ToolDefinition, 
    ToolParameters, 
    ToolContext, 
    ToolResult, 
    ToolValidationResult 
} from '../../common/tool-types';

/**
 * Abstract base class for all design tools
 * Provides common functionality and enforces the tool interface
 */
export abstract class BaseDesignTool implements DesignTool {
    public abstract readonly definition: ToolDefinition;

    /**
     * Execute the tool - must be implemented by subclasses
     */
    public abstract execute(parameters: ToolParameters, context: ToolContext): Promise<ToolResult>;

    /**
     * Validate parameters against the tool's schema
     * Default implementation provides basic validation
     */
    public validateParameters(parameters: ToolParameters): ToolValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check required parameters
        for (const requiredParam of this.definition.requiredParameters) {
            if (!(requiredParam in parameters) || parameters[requiredParam] === undefined || parameters[requiredParam] === null) {
                errors.push(`Missing required parameter: ${requiredParam}`);
            }
        }

        // Check parameter types and constraints
        for (const [paramName, paramSchema] of Object.entries(this.definition.parameters)) {
            const value = parameters[paramName];
            
            // Skip validation if parameter is not provided and not required
            if (value === undefined || value === null) {
                if (this.definition.requiredParameters.includes(paramName)) {
                    // Already handled above
                    continue;
                } else {
                    continue;
                }
            }

            // Type validation
            const typeValid = this.validateParameterType(value, paramSchema.type);
            if (!typeValid) {
                errors.push(`Parameter '${paramName}' has invalid type. Expected: ${paramSchema.type}, got: ${typeof value}`);
            }

            // Enum validation
            if (paramSchema.enum && !paramSchema.enum.includes(value)) {
                errors.push(`Parameter '${paramName}' must be one of: ${paramSchema.enum.join(', ')}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Check if the tool is available in the current context
     * Default implementation returns true - override for context-specific availability
     */
    public isAvailable(context: ToolContext): boolean {
        return true;
    }

    /**
     * Helper method to create a success result
     */
    protected createSuccessResult(message: string, data?: any): ToolResult {
        return {
            success: true,
            message,
            data
        };
    }

    /**
     * Helper method to create an error result
     */
    protected createErrorResult(message: string, error?: string): ToolResult {
        return {
            success: false,
            message,
            error
        };
    }

    /**
     * Helper method to validate a single parameter type
     */
    private validateParameterType(value: any, expectedType: string): boolean {
        switch (expectedType) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number' && !isNaN(value);
            case 'integer':
                return typeof value === 'number' && Number.isInteger(value);
            case 'boolean':
                return typeof value === 'boolean';
            case 'array':
                return Array.isArray(value);
            case 'object':
                return typeof value === 'object' && value !== null && !Array.isArray(value);
            default:
                // For custom types, just check it's not null/undefined
                return value !== null && value !== undefined;
        }
    }

    /**
     * Helper method to get parameter with default value
     */
    protected getParameterWithDefault<T>(parameters: ToolParameters, paramName: string, defaultValue: T): T {
        const value = parameters[paramName];
        return value !== undefined && value !== null ? value : defaultValue;
    }

    /**
     * Helper method to log tool execution
     */
    protected logExecution(message: string, data?: any): void {
        const prefix = `🔧 [${this.definition.name}]`;
        if (data) {
            console.log(prefix, message, data);
        } else {
            console.log(prefix, message);
        }
    }

    /**
     * Helper method to log tool errors
     */
    protected logError(message: string, error?: any): void {
        const prefix = `❌ [${this.definition.name}]`;
        if (error) {
            console.error(prefix, message, error);
        } else {
            console.error(prefix, message);
        }
    }
} 