import { ContainerModule } from 'inversify';
import { ColorContribution } from '@theia/core/lib/browser/color-application-contribution';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { CustomThemeContribution } from './custom-theme-contribution';
import { CustomUIApplicationContribution } from './custom-ui-application-contribution';

export default new ContainerModule(bind => {
    bind(ColorContribution).to(CustomThemeContribution).inSingletonScope();
    bind(FrontendApplicationContribution).to(CustomUIApplicationContribution).inSingletonScope();
}); 