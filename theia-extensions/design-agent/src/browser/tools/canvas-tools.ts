/********************************************************************************
 * Copyright (C) 2024 Design Agent Extension - Private Project.
 * All rights reserved. This code is proprietary and confidential.
 ********************************************************************************/

import { injectable, inject } from '@theia/core/shared/inversify';
import { BaseDesignTool } from './base-tool';
import { DesignEditorService } from '../services/design-editor-service';
import { 
    ToolDefinition, 
    ToolParameters, 
    ToolContext, 
    ToolResult, 
    ToolCategory,
    ComponentCreationResult,
    ComponentModificationResult,
    ComponentQueryResult
} from '../../common/tool-types';

/**
 * Tool to add a rectangle to the canvas
 */
@injectable()
export class AddRectangleTool extends BaseDesignTool {
    public readonly definition: ToolDefinition = {
        id: 'canvas.add-rectangle',
        name: 'Add Rectangle',
        description: 'Add a new rectangle component to the design canvas',
        category: ToolCategory.COMPONENT_CREATION,
        version: '1.0.0',
        parameters: {
            x: {
                type: 'number',
                description: 'X coordinate for the rectangle (default: auto-positioned)',
                required: false
            },
            y: {
                type: 'number', 
                description: 'Y coordinate for the rectangle (default: auto-positioned)',
                required: false
            },
            width: {
                type: 'number',
                description: 'Width of the rectangle (default: 100)',
                required: false,
                default: 100
            },
            height: {
                type: 'number',
                description: 'Height of the rectangle (default: 60)',
                required: false,
                default: 60
            }
        },
        requiredParameters: [],
        examples: [
            {
                description: 'Add a rectangle with default size at default position',
                parameters: {},
                expectedResult: { success: true, message: 'Rectangle added successfully' }
            },
            {
                description: 'Add a rectangle at specific position',
                parameters: { x: 100, y: 50 },
                expectedResult: { success: true, message: 'Rectangle added successfully' }
            },
            {
                description: 'Add a custom-sized rectangle',
                parameters: { x: 200, y: 100, width: 150, height: 80 },
                expectedResult: { success: true, message: 'Rectangle added successfully' }
            }
        ]
    };

    constructor(
        @inject(DesignEditorService) private readonly editorService: DesignEditorService
    ) {
        super();
    }

    public async execute(parameters: ToolParameters, context: ToolContext): Promise<ToolResult> {
        this.logExecution('Adding rectangle', parameters);

        // Get active editor
        const editor = this.editorService.getActiveEditor();
        if (!editor) {
            return this.createErrorResult(
                'No active design editor found',
                'Please open the Design Editor first'
            );
        }

        try {
            // Extract parameters with defaults
            const x = this.getParameterWithDefault(parameters, 'x', undefined);
            const y = this.getParameterWithDefault(parameters, 'y', undefined);
            const width = this.getParameterWithDefault(parameters, 'width', 100);
            const height = this.getParameterWithDefault(parameters, 'height', 60);

            // Add rectangle using the editor's API
            const componentId = await editor.addRectangleProgrammatically(x, y, width, height);
            
            // Get the created component for the result
            const component = editor.getComponent(componentId);

            const result: ComponentCreationResult = {
                success: true,
                message: `Rectangle added successfully with ID: ${componentId}`,
                data: {
                    componentId,
                    component
                }
            };

            this.logExecution('Rectangle added successfully', { componentId, component });
            return result;

        } catch (error) {
            this.logError('Failed to add rectangle', error);
            return this.createErrorResult(
                'Failed to add rectangle to canvas',
                error instanceof Error ? error.message : String(error)
            );
        }
    }

    public isAvailable(context: ToolContext): boolean {
        // Tool is available if there's an active editor
        return this.editorService.getActiveEditor() !== undefined;
    }
}

/**
 * Tool to add text to the canvas
 */
@injectable()
export class AddTextTool extends BaseDesignTool {
    public readonly definition: ToolDefinition = {
        id: 'canvas.add-text',
        name: 'Add Text',
        description: 'Add a new text component to the design canvas',
        category: ToolCategory.COMPONENT_CREATION,
        version: '1.0.0',
        parameters: {
            text: {
                type: 'string',
                description: 'The text content to display',
                required: false,
                default: 'Sample Text'
            },
            x: {
                type: 'number',
                description: 'X coordinate for the text (default: auto-positioned)',
                required: false
            },
            y: {
                type: 'number',
                description: 'Y coordinate for the text (default: auto-positioned)',
                required: false
            }
        },
        requiredParameters: [],
        examples: [
            {
                description: 'Add text with default content and position',
                parameters: {},
                expectedResult: { success: true, message: 'Text added successfully' }
            },
            {
                description: 'Add custom text at specific position',
                parameters: { text: 'Hello World', x: 150, y: 75 },
                expectedResult: { success: true, message: 'Text added successfully' }
            }
        ]
    };

    constructor(
        @inject(DesignEditorService) private readonly editorService: DesignEditorService
    ) {
        super();
    }

    public async execute(parameters: ToolParameters, context: ToolContext): Promise<ToolResult> {
        this.logExecution('Adding text', parameters);

        // Get active editor
        const editor = this.editorService.getActiveEditor();
        if (!editor) {
            return this.createErrorResult(
                'No active design editor found',
                'Please open the Design Editor first'
            );
        }

        try {
            // Extract parameters with defaults
            const text = this.getParameterWithDefault(parameters, 'text', 'Sample Text');
            const x = this.getParameterWithDefault(parameters, 'x', undefined);
            const y = this.getParameterWithDefault(parameters, 'y', undefined);

            // Add text using the editor's API
            const componentId = await editor.addTextProgrammatically(text, x, y);
            
            // Get the created component for the result
            const component = editor.getComponent(componentId);

            const result: ComponentCreationResult = {
                success: true,
                message: `Text added successfully with ID: ${componentId}`,
                data: {
                    componentId,
                    component
                }
            };

            this.logExecution('Text added successfully', { componentId, component });
            return result;

        } catch (error) {
            this.logError('Failed to add text', error);
            return this.createErrorResult(
                'Failed to add text to canvas',
                error instanceof Error ? error.message : String(error)
            );
        }
    }

    public isAvailable(context: ToolContext): boolean {
        // Tool is available if there's an active editor
        return this.editorService.getActiveEditor() !== undefined;
    }
}

/**
 * Tool to move a component on the canvas
 */
@injectable()
export class MoveComponentTool extends BaseDesignTool {
    public readonly definition: ToolDefinition = {
        id: 'canvas.move-component',
        name: 'Move Component',
        description: 'Move an existing component to a new position on the canvas',
        category: ToolCategory.COMPONENT_MODIFICATION,
        version: '1.0.0',
        parameters: {
            componentId: {
                type: 'string',
                description: 'ID of the component to move',
                required: true
            },
            x: {
                type: 'number',
                description: 'New X coordinate for the component',
                required: true
            },
            y: {
                type: 'number',
                description: 'New Y coordinate for the component',
                required: true
            }
        },
        requiredParameters: ['componentId', 'x', 'y'],
        examples: [
            {
                description: 'Move component to new position',
                parameters: { componentId: 'rect-1', x: 200, y: 150 },
                expectedResult: { success: true, message: 'Component moved successfully' }
            }
        ]
    };

    constructor(
        @inject(DesignEditorService) private readonly editorService: DesignEditorService
    ) {
        super();
    }

    public async execute(parameters: ToolParameters, context: ToolContext): Promise<ToolResult> {
        this.logExecution('Moving component', parameters);

        // Get active editor
        const editor = this.editorService.getActiveEditor();
        if (!editor) {
            return this.createErrorResult(
                'No active design editor found',
                'Please open the Design Editor first'
            );
        }

        try {
            const componentId = parameters.componentId as string;
            const x = parameters.x as number;
            const y = parameters.y as number;

            // Get component state before move
            const previousState = editor.getComponent(componentId);
            if (!previousState) {
                return this.createErrorResult(
                    `Component not found: ${componentId}`,
                    'The specified component does not exist on the canvas'
                );
            }

            // Move component using the editor's API
            const success = await editor.moveComponentProgrammatically(componentId, x, y);
            
            if (!success) {
                return this.createErrorResult(
                    'Failed to move component',
                    'Component move operation failed'
                );
            }

            // Get component state after move
            const newState = editor.getComponent(componentId);

            const result: ComponentModificationResult = {
                success: true,
                message: `Component ${componentId} moved to (${x}, ${y})`,
                data: {
                    componentId,
                    previousState,
                    newState
                }
            };

            this.logExecution('Component moved successfully', { componentId, from: { x: previousState.x, y: previousState.y }, to: { x, y } });
            return result;

        } catch (error) {
            this.logError('Failed to move component', error);
            return this.createErrorResult(
                'Failed to move component',
                error instanceof Error ? error.message : String(error)
            );
        }
    }

    public isAvailable(context: ToolContext): boolean {
        return this.editorService.getActiveEditor() !== undefined;
    }
}

/**
 * Tool to get information about all components on the canvas
 */
@injectable()
export class GetComponentsTool extends BaseDesignTool {
    public readonly definition: ToolDefinition = {
        id: 'canvas.get-components',
        name: 'Get Components',
        description: 'Retrieve information about all components currently on the canvas',
        category: ToolCategory.COMPONENT_QUERY,
        version: '1.0.0',
        parameters: {},
        requiredParameters: [],
        examples: [
            {
                description: 'Get all components on the canvas',
                parameters: {},
                expectedResult: { success: true, message: 'Components retrieved successfully' }
            }
        ]
    };

    constructor(
        @inject(DesignEditorService) private readonly editorService: DesignEditorService
    ) {
        super();
    }

    public async execute(parameters: ToolParameters, context: ToolContext): Promise<ToolResult> {
        this.logExecution('Getting all components');

        // Get active editor
        const editor = this.editorService.getActiveEditor();
        if (!editor) {
            return this.createErrorResult(
                'No active design editor found',
                'Please open the Design Editor first'
            );
        }

        try {
            const components = editor.getComponents();

            const result: ComponentQueryResult = {
                success: true,
                message: `Found ${components.length} components on canvas`,
                data: {
                    components: [...components], // Convert readonly array to regular array
                    count: components.length
                }
            };

            this.logExecution('Components retrieved successfully', { count: components.length });
            return result;

        } catch (error) {
            this.logError('Failed to get components', error);
            return this.createErrorResult(
                'Failed to retrieve components',
                error instanceof Error ? error.message : String(error)
            );
        }
    }

    public isAvailable(context: ToolContext): boolean {
        return this.editorService.getActiveEditor() !== undefined;
    }
} 