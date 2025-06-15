/********************************************************************************
 * Copyright (C) 2024 Design Agent Extension - Private Project.
 * All rights reserved. This code is proprietary and confidential.
 ********************************************************************************/

import { injectable } from '@theia/core/shared/inversify';

// Forward declaration to avoid circular dependency
export interface DesignEditorWidget {
    readonly id: string;
    addRectangleProgrammatically(x?: number, y?: number, width?: number, height?: number): Promise<string>;
    addTextProgrammatically(text?: string, x?: number, y?: number): Promise<string>;
    moveComponentProgrammatically(componentId: string, x: number, y: number): Promise<boolean>;
    deleteComponentProgrammatically(componentId: string): Promise<boolean>;
    getComponents(): readonly any[];
    getComponent(componentId: string): any | undefined;
}

@injectable()
export class DesignEditorService {
    private editorInstances = new Map<string, DesignEditorWidget>();

    public registerEditor(widget: DesignEditorWidget): void {
        this.editorInstances.set(widget.id, widget);
        console.log('🎨 Registered design editor:', widget.id);
    }

    public unregisterEditor(widgetId: string): void {
        this.editorInstances.delete(widgetId);
        console.log('🎨 Unregistered design editor:', widgetId);
    }

    public getActiveEditor(): DesignEditorWidget | undefined {
        // Return the first available editor for now
        // In future, could track which one is actually active/focused
        const editors = Array.from(this.editorInstances.values());
        return editors[0];
    }

    public getAllEditors(): DesignEditorWidget[] {
        return Array.from(this.editorInstances.values());
    }
} 