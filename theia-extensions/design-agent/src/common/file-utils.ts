/********************************************************************************
 * Copyright (C) 2024 Design Agent Extension - Private Project.
 * All rights reserved. This code is proprietary and confidential.
 ********************************************************************************/

export interface Component {
    id: string;
    type: 'rectangle' | 'text';
    text: string | null;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface DesignData {
    components: Component[];
}

export const DEFAULT_DESIGN_DATA: DesignData = {
    components: []
};

export const DESIGN_FILE_PATH = '.agent/design/design.json';