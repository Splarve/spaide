/********************************************************************************
 * Copyright (C) 2024 Design Agent Extension - Private Project.
 * All rights reserved. This code is proprietary and confidential.
 ********************************************************************************/

import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { Command, CommandContribution, CommandRegistry } from '@theia/core/lib/common/command';
import { MenuContribution, MenuModelRegistry } from '@theia/core/lib/common/menu';
import { CommonMenus } from '@theia/core/lib/browser/common-frontend-contribution';
import { BaseWidget } from '@theia/core/lib/browser/widgets/widget';
import { Message } from '@theia/core/lib/browser/widgets';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { URI } from '@theia/core/lib/common/uri';
import { Emitter } from '@theia/core/lib/common/event';
import { BinaryBuffer } from '@theia/core/lib/common/buffer';
import { ApplicationShell } from '@theia/core/lib/browser/shell/application-shell';
import { DesignData, DEFAULT_DESIGN_DATA, DESIGN_FILE_PATH, Component } from '../common/file-utils';
import { DesignToolRegistry } from './tools/tool-registry';
import { AddRectangleTool, AddTextTool, MoveComponentTool, GetComponentsTool } from './tools/canvas-tools';
import { DesignEditorService, DesignEditorWidget as IDesignEditorWidget } from './services/design-editor-service';

export namespace DesignAgentCommands {
    export const OPEN_VIEWER: Command = {
        id: 'designAgent.openViewer',
        label: 'Open Design Viewer'
    };

    export const OPEN_EDITOR: Command = {
        id: 'designAgent.openEditor',
        label: 'Open Design Editor'
    };

    export const TEST_TOOLS: Command = {
        id: 'designAgent.testTools',
        label: 'Test Design Tools'
    };
}

@injectable()
export class DesignViewerWidget extends BaseWidget {
    static readonly ID = 'design-viewer';
    static readonly LABEL = 'Design Viewer';

    private components: Component[] = [];
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;

    constructor(
        protected readonly workspaceService: WorkspaceService,
        protected readonly fileService: FileService
    ) {
        super();
        this.id = DesignViewerWidget.ID;
        this.title.label = DesignViewerWidget.LABEL;
        this.title.closable = true;
        this.addClass('design-viewer-widget');
    }

    protected onAfterAttach(msg: Message): void {
        super.onAfterAttach(msg);
        this.node.innerHTML = `
            <div style="padding: 20px; background: #1e1e1e; color: #fff; height: 100%;">
                <h2>🎨 Design Viewer (Read-Only)</h2>
                <div style="font-size: 12px; color: #ccc; margin-bottom: 10px;">
                    📖 Viewing design from .agent/design/design.json
                </div>
                <canvas id="viewer-canvas" width="800" height="600" 
                        style="border: 1px solid #444; background: white; display: block; margin-top: 10px;"></canvas>
            </div>
        `;
        this.setupCanvas();
        this.loadDesign();
    }

    private setupCanvas(): void {
        this.canvas = this.node.querySelector('#viewer-canvas') as HTMLCanvasElement;
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.redrawCanvas();
        }
    }

    private redrawCanvas(): void {
        if (!this.ctx || !this.canvas) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.components.length === 0) {
            // Show message when no components
            this.ctx.fillStyle = '#666';
            this.ctx.font = '16px Arial';
            this.ctx.fillText('No design components found', 50, 100);
            this.ctx.font = '14px Arial';
            this.ctx.fillText('Create some components in the Design Editor first!', 50, 130);
            return;
        }

        // Draw components (read-only, no selection highlighting)
        this.components.forEach(comp => {
            this.ctx!.strokeStyle = 'black';
            this.ctx!.lineWidth = 1;
            this.ctx!.font = '14px Arial';

            if (comp.type === 'rectangle') {
                this.ctx!.strokeRect(comp.x, comp.y, comp.width, comp.height);
            } else if (comp.type === 'text') {
                this.ctx!.fillStyle = 'black';
                this.ctx!.fillText(comp.text || '', comp.x, comp.y + 15);
            }
        });
    }

    private async loadDesign(): Promise<void> {
        try {
            const workspaceRoot = await this.getWorkspaceRoot();
            if (!workspaceRoot) {
                console.log('🎨 Viewer: No workspace root found');
                this.redrawCanvas();
                return;
            }

            const designFileUri = workspaceRoot.resolve(DESIGN_FILE_PATH);
            const fileData = await this.fileService.readFile(designFileUri);
            const designData: DesignData = JSON.parse(fileData.value.toString());
            
            this.components = designData.components || [];
            this.redrawCanvas();
            console.log('🎨 Viewer: Loaded design with', this.components.length, 'components');
        } catch (error) {
            console.log('🎨 Viewer: No design file found, showing empty canvas');
            this.components = [];
            this.redrawCanvas();
        }
    }

    private async getWorkspaceRoot(): Promise<URI | undefined> {
        if (!this.workspaceService) {
            console.error('🎨 Viewer: WorkspaceService is undefined!');
            return undefined;
        }
        const workspaceRoots = await this.workspaceService.roots;
        return workspaceRoots[0]?.resource;
    }
}

@injectable()
export class DesignEditorWidget extends BaseWidget implements IDesignEditorWidget {
    static readonly ID = 'design-editor';
    static readonly LABEL = 'Design Editor';

    private components: Component[] = [];
    private selectedComponent: Component | null = null;
    private isDragging = false;
    private dragOffset = { x: 0, y: 0 };
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private nextId = 1;

    constructor(
        protected readonly workspaceService: WorkspaceService,
        protected readonly fileService: FileService,
        protected readonly editorService: DesignEditorService
    ) {
        super();
        this.id = DesignEditorWidget.ID;
        this.title.label = DesignEditorWidget.LABEL;
        this.title.closable = true;
        this.addClass('design-editor-widget');
    }

    // ============== PUBLIC API FOR PROGRAMMATIC CONTROL ==============
    
    /**
     * Programmatically add a rectangle to the canvas
     */
    public async addRectangleProgrammatically(x?: number, y?: number, width?: number, height?: number): Promise<string> {
        const newRect: Component = {
            id: `rect-${this.nextId++}`,
            type: 'rectangle',
            text: null,
            x: x ?? (50 + (this.components.length * 20)),
            y: y ?? (50 + (this.components.length * 20)),
            width: width ?? 100,
            height: height ?? 60
        };
        this.components.push(newRect);
        this.redrawCanvas();
        await this.saveDesign();
        console.log('🎨 Programmatically added rectangle:', newRect.id);
        return newRect.id;
    }

    /**
     * Programmatically add text to the canvas
     */
    public async addTextProgrammatically(text?: string, x?: number, y?: number): Promise<string> {
        const newText: Component = {
            id: `text-${this.nextId++}`,
            type: 'text',
            text: text ?? 'Sample Text',
            x: x ?? (200 + (this.components.length * 20)),
            y: y ?? (100 + (this.components.length * 20)),
            width: 100,
            height: 20
        };
        this.components.push(newText);
        this.redrawCanvas();
        await this.saveDesign();
        console.log('🎨 Programmatically added text:', newText.id);
        return newText.id;
    }

    /**
     * Programmatically move a component
     */
    public async moveComponentProgrammatically(componentId: string, x: number, y: number): Promise<boolean> {
        const component = this.components.find(c => c.id === componentId);
        if (!component) {
            console.warn('🎨 Component not found:', componentId);
            return false;
        }
        
        component.x = x;
        component.y = y;
        this.redrawCanvas();
        await this.saveDesign();
        console.log('🎨 Moved component:', componentId, 'to', x, y);
        return true;
    }

    /**
     * Programmatically delete a component
     */
    public async deleteComponentProgrammatically(componentId: string): Promise<boolean> {
        const index = this.components.findIndex(c => c.id === componentId);
        if (index === -1) {
            console.warn('🎨 Component not found:', componentId);
            return false;
        }
        
        this.components.splice(index, 1);
        if (this.selectedComponent?.id === componentId) {
            this.selectedComponent = null;
        }
        this.redrawCanvas();
        await this.saveDesign();
        console.log('🎨 Deleted component:', componentId);
        return true;
    }

    /**
     * Get all components (read-only)
     */
    public getComponents(): readonly Component[] {
        return [...this.components];
    }

    /**
     * Get specific component by ID
     */
    public getComponent(componentId: string): Component | undefined {
        return this.components.find(c => c.id === componentId);
    }

    // ============== END PUBLIC API ==============

    protected onAfterAttach(msg: Message): void {
        super.onAfterAttach(msg);
        this.node.innerHTML = `
            <div style="padding: 20px; background: #1e1e1e; color: #fff; height: 100%;">
                <h2>✏️ Design Editor</h2>
                <div style="margin-bottom: 10px; display: flex; gap: 10px;">
                    <button id="add-rectangle" style="padding: 8px 16px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        ➕ Add Rectangle
                    </button>
                    <button id="add-text" style="padding: 8px 16px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        📝 Add Text
                    </button>
                </div>
                <canvas id="editor-canvas" width="800" height="600" 
                        style="border: 1px solid #444; background: white; cursor: crosshair; display: block; margin-top: 10px;"></canvas>
                <div style="font-size: 12px; color: #ccc; margin-top: 10px;">
                    💡 Click and drag to move components • Select and press Delete to remove • Changes auto-save
                </div>
            </div>
        `;
        this.setupCanvas();
        this.setupEventListeners();
        this.loadDesign();
        
        // Register with the service
        this.editorService.registerEditor(this);
    }

    protected onBeforeDetach(msg: Message): void {
        // Unregister from the service
        this.editorService.unregisterEditor(this.id);
        super.onBeforeDetach(msg);
    }

    private setupCanvas(): void {
        this.canvas = this.node.querySelector('#editor-canvas') as HTMLCanvasElement;
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.setupCanvasEventListeners();
            this.redrawCanvas();
        }
    }

    private setupEventListeners(): void {
        const addRectBtn = this.node.querySelector('#add-rectangle') as HTMLButtonElement;
        const addTextBtn = this.node.querySelector('#add-text') as HTMLButtonElement;

        if (addRectBtn) {
            addRectBtn.addEventListener('click', () => {
                this.addRectangle();
            });
        }

        if (addTextBtn) {
            addTextBtn.addEventListener('click', () => {
                this.addText();
            });
        }

        // Keyboard event for delete
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.selectedComponent) {
                this.deleteSelected();
            }
        });
    }

    private setupCanvasEventListeners(): void {
        if (!this.canvas) return;

        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas!.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Find clicked component
            const clicked = this.findComponentAt(x, y);
            if (clicked) {
                this.selectedComponent = clicked;
                this.isDragging = true;
                this.dragOffset.x = x - clicked.x;
                this.dragOffset.y = y - clicked.y;
                this.redrawCanvas();
            } else {
                this.selectedComponent = null;
                this.redrawCanvas();
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging && this.selectedComponent) {
                const rect = this.canvas!.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                this.selectedComponent.x = x - this.dragOffset.x;
                this.selectedComponent.y = y - this.dragOffset.y;
                this.redrawCanvas();
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.saveDesign();
            }
        });
    }

    private addRectangle(): void {
        const newRect: Component = {
            id: `rect-${this.nextId++}`,
            type: 'rectangle',
            text: null,
            x: 50 + (this.components.length * 20),
            y: 50 + (this.components.length * 20),
            width: 100,
            height: 60
        };
        this.components.push(newRect);
        this.redrawCanvas();
        this.saveDesign();
        console.log('🎨 Added rectangle:', newRect.id);
    }

    private addText(): void {
        const newText: Component = {
            id: `text-${this.nextId++}`,
            type: 'text',
            text: 'Sample Text',
            x: 200 + (this.components.length * 20),
            y: 100 + (this.components.length * 20),
            width: 100,
            height: 20
        };
        this.components.push(newText);
        this.redrawCanvas();
        this.saveDesign();
        console.log('🎨 Added text:', newText.id);
    }

    private deleteSelected(): void {
        if (this.selectedComponent) {
            const index = this.components.findIndex(c => c.id === this.selectedComponent!.id);
            if (index !== -1) {
                console.log('🎨 Deleted component:', this.selectedComponent.id);
                this.components.splice(index, 1);
                this.selectedComponent = null;
                this.redrawCanvas();
                this.saveDesign();
            }
        }
    }

    private findComponentAt(x: number, y: number): Component | null {
        // Check in reverse order to find topmost component
        for (let i = this.components.length - 1; i >= 0; i--) {
            const comp = this.components[i];
            if (x >= comp.x && x <= comp.x + comp.width &&
                y >= comp.y && y <= comp.y + comp.height) {
                return comp;
            }
        }
        return null;
    }

    private redrawCanvas(): void {
        if (!this.ctx || !this.canvas) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw components
        this.components.forEach(comp => {
            this.ctx!.strokeStyle = comp === this.selectedComponent ? '#007acc' : 'black';
            this.ctx!.lineWidth = comp === this.selectedComponent ? 2 : 1;
            this.ctx!.font = '14px Arial';

            if (comp.type === 'rectangle') {
                this.ctx!.strokeRect(comp.x, comp.y, comp.width, comp.height);
                if (comp === this.selectedComponent) {
                    this.ctx!.fillStyle = 'rgba(0, 122, 204, 0.1)';
                    this.ctx!.fillRect(comp.x, comp.y, comp.width, comp.height);
                }
            } else if (comp.type === 'text') {
                this.ctx!.fillStyle = 'black';
                this.ctx!.fillText(comp.text || '', comp.x, comp.y + 15);
                if (comp === this.selectedComponent) {
                    this.ctx!.strokeRect(comp.x - 2, comp.y - 2, comp.width + 4, comp.height + 4);
                }
            }
        });
    }

    private async loadDesign(): Promise<void> {
        try {
            const workspaceRoot = await this.getWorkspaceRoot();
            if (!workspaceRoot) return;

            const designFileUri = workspaceRoot.resolve(DESIGN_FILE_PATH);
            const fileData = await this.fileService.readFile(designFileUri);
            const designData: DesignData = JSON.parse(fileData.value.toString());
            
            this.components = designData.components || [];
            this.nextId = Math.max(...this.components.map(c => parseInt(c.id.split('-')[1]) || 0), 0) + 1;
            this.redrawCanvas();
            console.log('🎨 Loaded design with', this.components.length, 'components');
        } catch (error) {
            console.log('🎨 No existing design file, starting with empty canvas');
            this.components = [];
            this.redrawCanvas();
        }
    }

    private async saveDesign(): Promise<void> {
        try {
            // Temporary workaround - save to console for now to test the rest of the logic
            const designData: DesignData = { components: this.components };
            console.log('🎨 Would save design:', JSON.stringify(designData, undefined, 2));
            
            // Try the original approach but with better error handling
            const workspaceRoot = await this.getWorkspaceRoot();
            if (!workspaceRoot) {
                console.error('🎨 No workspace root found - saving to console only');
                return;
            }

            const designFileUri = workspaceRoot.resolve(DESIGN_FILE_PATH);
            const designDirUri = designFileUri.parent;

            // Ensure directory exists
            try {
                await this.fileService.resolve(designDirUri);
            } catch {
                // Directory doesn't exist, create it
                await this.fileService.createFolder(designDirUri);
                console.log('🎨 Created design directory:', designDirUri.toString());
            }

            const content = BinaryBuffer.fromString(JSON.stringify(designData, undefined, 2));
            
            await this.fileService.writeFile(designFileUri, content);
            console.log('🎨 Saved design with', this.components.length, 'components to:', designFileUri.toString());
        } catch (error) {
            console.error('🎨 Error saving design:', error);
        }
    }

    private async getWorkspaceRoot(): Promise<URI | undefined> {
        console.log('🎨 Debug - workspaceService:', this.workspaceService);
        if (!this.workspaceService) {
            console.error('🎨 WorkspaceService is undefined!');
            return undefined;
        }
        const workspaceRoots = await this.workspaceService.roots;
        console.log('🎨 Debug - workspaceRoots:', workspaceRoots);
        return workspaceRoots[0]?.resource;
    }
}



@injectable()
export class DesignAgentContribution implements CommandContribution, MenuContribution {

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(FileService)
    protected readonly fileService: FileService;

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    @inject(DesignEditorService)
    protected readonly editorService: DesignEditorService;

    @inject(DesignToolRegistry)
    protected readonly toolRegistry: DesignToolRegistry;

    private readonly onDesignDataChangedEmitter = new Emitter<DesignData>();
    readonly onDesignDataChanged = this.onDesignDataChangedEmitter.event;

    constructor() {
        console.log('🎨 Design Agent Extension loaded successfully!');
    }

    @postConstruct()
    protected initializeTools(): void {
        console.log('🔧 Initializing design tools...');
        
        // Create and register tools directly to avoid circular dependency
        const addRectangleTool = new AddRectangleTool(this.editorService);
        const addTextTool = new AddTextTool(this.editorService);
        const moveComponentTool = new MoveComponentTool(this.editorService);
        const getComponentsTool = new GetComponentsTool(this.editorService);
        
        this.toolRegistry.registerTool(addRectangleTool);
        this.toolRegistry.registerTool(addTextTool);
        this.toolRegistry.registerTool(moveComponentTool);
        this.toolRegistry.registerTool(getComponentsTool);

        // Log registry status
        const status = this.toolRegistry.getRegistryStatus();
        console.log('🔧 Tool registry initialized:', status);
    }

    registerCommands(registry: CommandRegistry): void {
        console.log('🎨 Registering Design Agent commands...');
        registry.registerCommand(DesignAgentCommands.OPEN_VIEWER, {
            execute: () => this.openViewer()
        });

        registry.registerCommand(DesignAgentCommands.OPEN_EDITOR, {
            execute: () => this.openEditor()
        });

        registry.registerCommand(DesignAgentCommands.TEST_TOOLS, {
            execute: () => this.testTools()
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        console.log('🎨 Registering Design Agent menus...');
        menus.registerMenuAction(CommonMenus.VIEW, {
            commandId: DesignAgentCommands.OPEN_VIEWER.id,
            label: DesignAgentCommands.OPEN_VIEWER.label,
            order: '9_design_agent'
        });

        menus.registerMenuAction(CommonMenus.VIEW, {
            commandId: DesignAgentCommands.OPEN_EDITOR.id,
            label: DesignAgentCommands.OPEN_EDITOR.label,
            order: '9_design_agent'
        });

        menus.registerMenuAction(CommonMenus.VIEW, {
            commandId: DesignAgentCommands.TEST_TOOLS.id,
            label: DesignAgentCommands.TEST_TOOLS.label,
            order: '9_design_agent'
        });
    }

    private async openViewer(): Promise<void> {
        console.log('🎨 Opening Design Viewer...');
        try {
            await this.ensureDesignFileExists();
            const widget = new DesignViewerWidget(this.workspaceService, this.fileService);
            this.shell.addWidget(widget, { area: 'main' });
            this.shell.activateWidget(widget.id);
            console.log('🎨 Design Viewer opened successfully');
        } catch (error) {
            console.error('🎨 Error opening Design Viewer:', error);
        }
    }

    private async openEditor(): Promise<void> {
        console.log('🎨 Opening Design Editor...');
        try {
            await this.ensureDesignFileExists();
            const widget = new DesignEditorWidget(this.workspaceService, this.fileService, this.editorService);
            this.shell.addWidget(widget, { area: 'main' });
            this.shell.activateWidget(widget.id);
            console.log('🎨 Design Editor opened successfully');
        } catch (error) {
            console.error('🎨 Error opening Design Editor:', error);
        }
    }

    private async ensureDesignFileExists(): Promise<void> {
        const workspaceRoot = await this.getWorkspaceRoot();
        if (!workspaceRoot) {
            throw new Error('No workspace root found');
        }

        const designFileUri = workspaceRoot.resolve(DESIGN_FILE_PATH);
        const designDirUri = designFileUri.parent;

        try {
            await this.fileService.resolve(designFileUri);
        } catch {
            // File doesn't exist, create it
            try {
                await this.fileService.resolve(designDirUri);
            } catch {
                // Directory doesn't exist, create it
                await this.fileService.createFolder(designDirUri);
            }

            const content = BinaryBuffer.fromString(JSON.stringify(DEFAULT_DESIGN_DATA, undefined, 2));
            await this.fileService.writeFile(designFileUri, content);
        }
    }

    private async getWorkspaceRoot(): Promise<URI | undefined> {
        const workspaceRoots = await this.workspaceService.roots;
        return workspaceRoots[0]?.resource;
    }

    private async testTools(): Promise<void> {
        console.log('🧪 Testing design tools...');
        
        try {
            // Test getting available tools
            const context = { workspaceRoot: (await this.getWorkspaceRoot())?.toString() };
            const availableTools = this.toolRegistry.getAvailableTools(context);
            console.log('🧪 Available tools:', availableTools.map(t => t.definition.name));

            // Test tool execution if editor is available
            const editor = this.editorService.getActiveEditor();
            if (!editor) {
                console.log('🧪 No active editor - opening editor first...');
                await this.openEditor();
                // Wait a bit for editor to initialize
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Test adding a rectangle
            const rectResult = await this.toolRegistry.executeTool(
                'canvas.add-rectangle', 
                { x: 300, y: 200, width: 120, height: 80 }, 
                context
            );
            console.log('🧪 Add rectangle result:', rectResult);

            // Test adding text
            const textResult = await this.toolRegistry.executeTool(
                'canvas.add-text',
                { text: 'Test Tool', x: 400, y: 300 },
                context
            );
            console.log('🧪 Add text result:', textResult);

            // Test getting components
            const componentsResult = await this.toolRegistry.executeTool(
                'canvas.get-components',
                {},
                context
            );
            console.log('🧪 Get components result:', componentsResult);

            console.log('🧪 Tool testing completed successfully!');

        } catch (error) {
            console.error('🧪 Tool testing failed:', error);
        }
    }
}