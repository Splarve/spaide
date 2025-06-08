/********************************************************************************
 * Copyright (C) 2024 Design Agent Extension - Private Project.
 * All rights reserved. This code is proprietary and confidential.
 ********************************************************************************/

import { ContainerModule } from '@theia/core/shared/inversify';
import { CommandContribution, MenuContribution } from '@theia/core/lib/common';
import { DesignAgentContribution, DesignViewerWidget, DesignEditorWidget } from './design-agent-contribution';
import { DesignEditorService } from './services/design-editor-service';
import { DesignToolRegistry } from './tools/tool-registry';

export default new ContainerModule(bind => {
    // Core services
    bind(DesignEditorService).toSelf().inSingletonScope();
    bind(DesignToolRegistry).toSelf().inSingletonScope();
    
    // Main contribution
    bind(DesignAgentContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(DesignAgentContribution);
    bind(MenuContribution).toService(DesignAgentContribution);

    // Widgets
    bind(DesignViewerWidget).toSelf();
    bind(DesignEditorWidget).toSelf();
});