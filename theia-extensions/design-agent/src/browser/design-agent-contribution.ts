/********************************************************************************
 * Copyright (C) 2024 Design Agent Extension - Private Project.
 * All rights reserved. This code is proprietary and confidential.
 ********************************************************************************/

import { injectable, inject } from '@theia/core/shared/inversify';
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
import { DesignData, DEFAULT_DESIGN_DATA, DESIGN_FILE_PATH } from '../common/file-utils';

export namespace DesignAgentCommands {
    export const OPEN_VIEWER: Command = {
        id: 'designAgent.openViewer',
        label: 'Open Design Viewer'
    };

    export const OPEN_EDITOR: Command = {
        id: 'designAgent.openEditor',
        label: 'Open Design Editor'
    };
}

@injectable()
export class DesignViewerWidget extends BaseWidget {
    static readonly ID = 'design-viewer';
    static readonly LABEL = 'Design Viewer';

    constructor() {
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
                <h2>🎨 Design Viewer</h2>
                <canvas id="viewer-canvas" width="800" height="600" 
                        style="border: 1px solid #444; background: white; display: block; margin-top: 10px;"></canvas>
            </div>
        `;
        this.setupCanvas();
    }

    private setupCanvas(): void {
        const canvas = this.node.querySelector('#viewer-canvas') as HTMLCanvasElement;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.font = '14px Arial';
                ctx.strokeRect(50, 50, 100, 60);
                ctx.strokeText('Sample Text', 200, 100);
            }
        }
    }
}

@injectable()
export class DesignEditorWidget extends BaseWidget {
    static readonly ID = 'design-editor';
    static readonly LABEL = 'Design Editor';

    constructor() {
        super();
        this.id = DesignEditorWidget.ID;
        this.title.label = DesignEditorWidget.LABEL;
        this.title.closable = true;
        this.addClass('design-editor-widget');
    }

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
    }

    private setupCanvas(): void {
        const canvas = this.node.querySelector('#editor-canvas') as HTMLCanvasElement;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.font = '14px Arial';
                ctx.strokeRect(50, 50, 100, 60);
                ctx.strokeText('Sample Text', 200, 100);
            }
        }
    }

    private setupEventListeners(): void {
        const addRectBtn = this.node.querySelector('#add-rectangle') as HTMLButtonElement;
        const addTextBtn = this.node.querySelector('#add-text') as HTMLButtonElement;

        if (addRectBtn) {
            addRectBtn.addEventListener('click', () => {
                console.log('Add rectangle clicked');
            });
        }

        if (addTextBtn) {
            addTextBtn.addEventListener('click', () => {
                console.log('Add text clicked');
            });
        }
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

    private readonly onDesignDataChangedEmitter = new Emitter<DesignData>();
    readonly onDesignDataChanged = this.onDesignDataChangedEmitter.event;

    constructor() {
        console.log('🎨 Design Agent Extension loaded successfully!');
    }

    registerCommands(registry: CommandRegistry): void {
        console.log('🎨 Registering Design Agent commands...');
        registry.registerCommand(DesignAgentCommands.OPEN_VIEWER, {
            execute: () => this.openViewer()
        });

        registry.registerCommand(DesignAgentCommands.OPEN_EDITOR, {
            execute: () => this.openEditor()
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
    }

    private async openViewer(): Promise<void> {
        console.log('🎨 Opening Design Viewer...');
        try {
            await this.ensureDesignFileExists();
            const widget = new DesignViewerWidget();
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
            const widget = new DesignEditorWidget();
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
}