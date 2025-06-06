/********************************************************************************
 * Copyright (C) 2024 Design Agent Extension - Private Project.
 * All rights reserved. This code is proprietary and confidential.
 ********************************************************************************/

import { ContainerModule } from '@theia/core/shared/inversify';
import { CommandContribution, MenuContribution } from '@theia/core/lib/common';
import { DesignAgentContribution, DesignViewerWidget, DesignEditorWidget } from './design-agent-contribution';

export default new ContainerModule(bind => {
    bind(DesignAgentContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(DesignAgentContribution);
    bind(MenuContribution).toService(DesignAgentContribution);

    bind(DesignViewerWidget).toSelf();
    bind(DesignEditorWidget).toSelf();
});