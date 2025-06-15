import { injectable } from 'inversify';
import { ColorContribution } from '@theia/core/lib/browser/color-application-contribution';
import { ColorRegistry } from '@theia/core/lib/browser/color-registry';

@injectable()
export class CustomThemeContribution implements ColorContribution {

    registerColors(colors: ColorRegistry): void {
        // Modern Dark Theme Colors
        colors.register(
            // Background colors with gradient support
            {
                id: 'editor.background',
                defaults: {
                    dark: '#0a0a0f',
                    light: '#ffffff',
                    hcDark: '#000000',
                    hcLight: '#ffffff'
                },
                description: 'Editor background color'
            },
            {
                id: 'sideBar.background',
                defaults: {
                    dark: '#1a1a2e',
                    light: '#f8f9fa',
                    hcDark: '#000000',
                    hcLight: '#ffffff'
                },
                description: 'Sidebar background color'
            },
            {
                id: 'activityBar.background',
                defaults: {
                    dark: '#16213e',
                    light: '#e9ecef',
                    hcDark: '#000000',
                    hcLight: '#ffffff'
                },
                description: 'Activity bar background color'
            },
            {
                id: 'panel.background',
                defaults: {
                    dark: '#0f1419',
                    light: '#f8f9fa',
                    hcDark: '#000000',
                    hcLight: '#ffffff'
                },
                description: 'Panel background color'
            },
            {
                id: 'statusBar.background',
                defaults: {
                    dark: '#2d1b69',
                    light: '#6c757d',
                    hcDark: '#000000',
                    hcLight: '#ffffff'
                },
                description: 'Status bar background color'
            },
            // Accent colors
            {
                id: 'focusBorder',
                defaults: {
                    dark: '#7c3aed',
                    light: '#6366f1',
                    hcDark: '#f38ba8',
                    hcLight: '#0969da'
                },
                description: 'Focus border color'
            },
            {
                id: 'selection.background',
                defaults: {
                    dark: '#7c3aed40',
                    light: '#6366f140',
                    hcDark: '#f38ba840',
                    hcLight: '#0969da40'
                },
                description: 'Selection background color'
            },
            // Text colors
            {
                id: 'foreground',
                defaults: {
                    dark: '#e2e8f0',
                    light: '#1e293b',
                    hcDark: '#ffffff',
                    hcLight: '#000000'
                },
                description: 'Foreground text color'
            },
            {
                id: 'descriptionForeground',
                defaults: {
                    dark: '#94a3b8',
                    light: '#64748b',
                    hcDark: '#cccccc',
                    hcLight: '#666666'
                },
                description: 'Description text color'
            },
            // Menu and dropdown colors
            {
                id: 'menu.background',
                defaults: {
                    dark: '#1e1e2e',
                    light: '#ffffff',
                    hcDark: '#000000',
                    hcLight: '#ffffff'
                },
                description: 'Menu background color'
            },
            {
                id: 'menu.selectionBackground',
                defaults: {
                    dark: '#7c3aed20',
                    light: '#6366f120',
                    hcDark: '#f38ba820',
                    hcLight: '#0969da20'
                },
                description: 'Menu selection background color'
            },
            // Button colors
            {
                id: 'button.background',
                defaults: {
                    dark: '#7c3aed',
                    light: '#6366f1',
                    hcDark: '#f38ba8',
                    hcLight: '#0969da'
                },
                description: 'Button background color'
            },
            {
                id: 'button.hoverBackground',
                defaults: {
                    dark: '#8b5cf6',
                    light: '#7c3aed',
                    hcDark: '#f5c2e7',
                    hcLight: '#218bff'
                },
                description: 'Button hover background color'
            },
            // Input colors
            {
                id: 'input.background',
                defaults: {
                    dark: '#1e1e2e',
                    light: '#ffffff',
                    hcDark: '#000000',
                    hcLight: '#ffffff'
                },
                description: 'Input background color'
            },
            {
                id: 'input.border',
                defaults: {
                    dark: '#45475a',
                    light: '#d1d5db',
                    hcDark: '#f38ba8',
                    hcLight: '#0969da'
                },
                description: 'Input border color'
            },
            // Tab colors
            {
                id: 'tab.activeBackground',
                defaults: {
                    dark: '#0a0a0f',
                    light: '#ffffff',
                    hcDark: '#000000',
                    hcLight: '#ffffff'
                },
                description: 'Active tab background color'
            },
            {
                id: 'tab.inactiveBackground',
                defaults: {
                    dark: '#1a1a2e',
                    light: '#f1f5f9',
                    hcDark: '#000000',
                    hcLight: '#ffffff'
                },
                description: 'Inactive tab background color'
            },
            {
                id: 'tab.border',
                defaults: {
                    dark: '#7c3aed',
                    light: '#6366f1',
                    hcDark: '#f38ba8',
                    hcLight: '#0969da'
                },
                description: 'Tab border color'
            }
        );
    }
} 