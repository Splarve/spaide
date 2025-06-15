import { injectable } from 'inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { FrontendApplication } from '@theia/core/lib/browser/frontend-application';

@injectable()
export class CustomUIApplicationContribution implements FrontendApplicationContribution {

    async onStart(app: FrontendApplication): Promise<void> {
        this.injectCustomCSS();
        this.setupDynamicEffects();
    }

    private injectCustomCSS(): void {
        const style = document.createElement('style');
        style.textContent = this.getCustomCSS();
        document.head.appendChild(style);
    }

    private getCustomCSS(): string {
        return `
            /* Modern Font Imports */
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@100;200;300;400;500;600;700;800&display=swap');
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap');

            /* Root Variables for Modern Theme */
            :root {
                --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                --secondary-gradient: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                --accent-gradient: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                --dark-gradient: linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%);
                --glass-background: rgba(255, 255, 255, 0.1);
                --neon-glow: 0 0 20px rgba(124, 58, 237, 0.5);
                --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.3);
                --border-radius: 12px;
                --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            /* Global Font Settings */
            body, .theia-ApplicationShell {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                font-weight: 400;
                font-size: 14px;
                line-height: 1.5;
                letter-spacing: -0.01em;
            }

            /* Code Editor Font */
            .monaco-editor, .monaco-editor .view-lines, .monaco-editor .margin-view-overlays {
                font-family: 'JetBrains Mono', 'Fira Code', monospace !important;
                font-weight: 400;
                font-size: 14px;
                line-height: 1.6;
                font-feature-settings: 'liga' 1, 'calt' 1;
            }

            /* Main Application Shell */
            .theia-ApplicationShell {
                background: var(--dark-gradient);
                backdrop-filter: blur(20px);
            }

            /* Activity Bar Styling */
            .theia-app-left .theia-app-sidebar {
                background: linear-gradient(180deg, #1e1e2e 0%, #16213e 100%);
                border-right: 1px solid rgba(124, 58, 237, 0.3);
                backdrop-filter: blur(15px);
                box-shadow: 4px 0 20px rgba(0, 0, 0, 0.2);
            }

            .theia-app-left .theia-app-sidebar .theia-ActivityBar .theia-activity-bar-item {
                border-radius: var(--border-radius);
                margin: 4px 8px;
                transition: var(--transition);
                position: relative;
                overflow: hidden;
            }

            .theia-app-left .theia-app-sidebar .theia-ActivityBar .theia-activity-bar-item:hover {
                background: rgba(124, 58, 237, 0.2);
                box-shadow: var(--neon-glow);
                transform: translateX(4px);
            }

            .theia-app-left .theia-app-sidebar .theia-ActivityBar .theia-activity-bar-item.theia-mod-active {
                background: var(--primary-gradient);
                box-shadow: var(--neon-glow);
                transform: translateX(6px);
            }

            /* Editor Area Styling */
            .theia-TabBar {
                background: rgba(15, 15, 25, 0.95);
                backdrop-filter: blur(20px);
                border-bottom: 1px solid rgba(124, 58, 237, 0.3);
                padding: 0 8px;
            }

            .theia-TabBar .theia-Tab {
                background: transparent;
                border: none;
                border-radius: var(--border-radius) var(--border-radius) 0 0;
                margin: 0 2px;
                padding: 8px 16px;
                transition: var(--transition);
                position: relative;
                overflow: hidden;
            }

            .theia-TabBar .theia-Tab:hover {
                background: rgba(124, 58, 237, 0.1);
                transform: translateY(-2px);
            }

            .theia-TabBar .theia-Tab.theia-mod-active {
                background: var(--primary-gradient);
                color: white;
                box-shadow: 0 -4px 20px rgba(124, 58, 237, 0.3);
            }

            /* Monaco Editor */
            .monaco-editor {
                background: rgba(10, 10, 15, 0.95) !important;
                border-radius: 0 0 var(--border-radius) var(--border-radius);
                box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.2);
            }

            .monaco-editor .current-line {
                background: rgba(124, 58, 237, 0.1) !important;
                border: none !important;
                box-shadow: 0 0 10px rgba(124, 58, 237, 0.2) !important;
            }

            /* Status Bar */
            .theia-statusBar {
                background: var(--primary-gradient);
                border-top: 1px solid rgba(124, 58, 237, 0.3);
                box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.2);
                backdrop-filter: blur(20px);
            }

            /* Scrollbar Styling */
            ::-webkit-scrollbar {
                width: 12px;
                height: 12px;
            }

            ::-webkit-scrollbar-track {
                background: rgba(26, 26, 46, 0.5);
                border-radius: 6px;
            }

            ::-webkit-scrollbar-thumb {
                background: var(--primary-gradient);
                border-radius: 6px;
                border: 2px solid rgba(26, 26, 46, 0.5);
            }

            ::-webkit-scrollbar-thumb:hover {
                background: var(--secondary-gradient);
                box-shadow: var(--neon-glow);
            }

            /* Animations */
            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }

            /* Explorer Tree Styling */
            .theia-TreeContainer {
                background: transparent;
                border-radius: var(--border-radius);
                margin: 8px;
            }

            .theia-TreeNode {
                border-radius: 8px;
                margin: 2px 8px;
                padding: 6px 12px;
                transition: var(--transition);
                position: relative;
                overflow: hidden;
            }

            .theia-TreeNode:hover {
                background: rgba(124, 58, 237, 0.15);
                box-shadow: 0 4px 12px rgba(124, 58, 237, 0.1);
                transform: translateX(4px);
            }

            .theia-TreeNode.theia-mod-selected {
                background: var(--primary-gradient);
                color: white;
                box-shadow: var(--neon-glow);
                font-weight: 500;
            }

            .theia-TreeNode.theia-mod-selected::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 3px;
                background: var(--accent-gradient);
                border-radius: 0 2px 2px 0;
            }

            /* File and Folder Icons */
            .theia-TreeNode .theia-icon {
                margin-right: 8px;
                filter: brightness(1.2);
            }

            .theia-TreeNode:hover .theia-icon {
                filter: brightness(1.5);
            }

            /* Sidebar Container */
            .theia-app-left .theia-app-sidebar .theia-sidebar-container {
                background: rgba(26, 26, 46, 0.95);
                backdrop-filter: blur(20px);
                border-radius: var(--border-radius);
                margin: 8px;
                box-shadow: var(--shadow-lg);
                border: 1px solid rgba(124, 58, 237, 0.2);
            }

            /* Panel Styling */
            .theia-app-bottom .theia-app-panel {
                background: rgba(15, 20, 25, 0.95);
                backdrop-filter: blur(20px);
                border-top: 1px solid rgba(124, 58, 237, 0.3);
                border-radius: var(--border-radius) var(--border-radius) 0 0;
                box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.2);
            }

            /* Menu Styling */
            .theia-menu {
                background: rgba(30, 30, 46, 0.95);
                backdrop-filter: blur(25px);
                border: 1px solid rgba(124, 58, 237, 0.3);
                border-radius: var(--border-radius);
                box-shadow: var(--shadow-lg);
                padding: 8px;
            }

            .theia-menu .theia-MenuItem {
                border-radius: 8px;
                margin: 2px 0;
                padding: 10px 16px;
                transition: var(--transition);
                position: relative;
                overflow: hidden;
            }

            .theia-menu .theia-MenuItem:hover {
                background: var(--primary-gradient);
                color: white;
                transform: translateX(6px);
                box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
            }

            .theia-menu .theia-MenuItem::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 0;
                background: var(--accent-gradient);
                transition: width 0.3s ease;
            }

            .theia-menu .theia-MenuItem:hover::before {
                width: 3px;
            }

            /* Button Styling */
            .theia-button {
                background: var(--primary-gradient);
                border: none;
                border-radius: var(--border-radius);
                padding: 10px 20px;
                color: white;
                font-weight: 600;
                font-size: 14px;
                transition: var(--transition);
                box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
                cursor: pointer;
                position: relative;
                overflow: hidden;
            }

            .theia-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(124, 58, 237, 0.4);
            }

            .theia-button:active {
                transform: translateY(0);
                box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
            }

            .theia-button::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                transition: left 0.5s;
            }

            .theia-button:hover::before {
                left: 100%;
            }

            /* Input Styling */
            .theia-input {
                background: rgba(30, 30, 46, 0.8);
                border: 1px solid rgba(124, 58, 237, 0.3);
                border-radius: var(--border-radius);
                padding: 10px 16px;
                color: #e2e8f0;
                font-size: 14px;
                transition: var(--transition);
                font-family: inherit;
            }

            .theia-input:focus {
                border-color: #7c3aed;
                box-shadow: var(--neon-glow);
                outline: none;
                background: rgba(30, 30, 46, 0.95);
            }

            .theia-input::placeholder {
                color: #94a3b8;
            }

            /* Dialog Styling */
            .theia-dialog-container {
                background: rgba(30, 30, 46, 0.95);
                backdrop-filter: blur(30px);
                border: 1px solid rgba(124, 58, 237, 0.3);
                border-radius: var(--border-radius);
                box-shadow: var(--shadow-lg);
                animation: dialogFadeIn 0.3s ease-out;
            }

            @keyframes dialogFadeIn {
                from {
                    opacity: 0;
                    transform: scale(0.9) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            /* Notification Styling */
            .theia-notification-center {
                background: rgba(30, 30, 46, 0.95);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(124, 58, 237, 0.3);
                border-radius: var(--border-radius);
                box-shadow: var(--shadow-lg);
            }

            .theia-notification {
                background: rgba(15, 20, 25, 0.9);
                border-left: 4px solid #7c3aed;
                border-radius: var(--border-radius);
                margin: 8px;
                padding: 12px 16px;
                animation: slideInNotification 0.3s ease-out;
                position: relative;
                overflow: hidden;
            }

            .theia-notification::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                bottom: 0;
                width: 4px;
                background: var(--accent-gradient);
                animation: notificationGlow 2s infinite;
            }

            @keyframes slideInNotification {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes notificationGlow {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }

            /* Welcome Screen */
            .theia-welcome-container {
                background: var(--dark-gradient);
                color: #e2e8f0;
                padding: 40px;
            }

            .theia-welcome-container h1 {
                background: var(--primary-gradient);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                font-size: 3em;
                font-weight: 800;
                margin-bottom: 20px;
            }

            /* Terminal Styling */
            .theia-terminal-container {
                background: rgba(10, 10, 15, 0.95);
                border-radius: var(--border-radius);
                box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(124, 58, 237, 0.2);
            }

            .xterm-cursor {
                background: #7c3aed !important;
                box-shadow: 0 0 10px rgba(124, 58, 237, 0.5) !important;
            }

            /* Context Menu */
            .monaco-menu {
                background: rgba(30, 30, 46, 0.95) !important;
                backdrop-filter: blur(20px);
                border: 1px solid rgba(124, 58, 237, 0.3) !important;
                border-radius: var(--border-radius) !important;
                box-shadow: var(--shadow-lg) !important;
                padding: 8px !important;
            }

            .monaco-menu .monaco-action-bar .action-item {
                border-radius: 6px;
                margin: 2px 4px;
                padding: 8px 12px;
                transition: var(--transition);
            }

            .monaco-menu .monaco-action-bar .action-item:hover {
                background: var(--primary-gradient) !important;
                color: white !important;
                transform: translateX(4px);
            }

            /* Loading and Progress */
            .theia-loading-indicator {
                background: var(--primary-gradient);
                animation: pulse 1.5s infinite;
                border-radius: 2px;
            }

            .theia-progress-bar {
                background: var(--primary-gradient);
                border-radius: 4px;
                box-shadow: var(--neon-glow);
                overflow: hidden;
                position: relative;
            }

            .theia-progress-bar::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
                animation: progressShimmer 2s infinite;
            }

            @keyframes progressShimmer {
                0% { left: -100%; }
                100% { left: 100%; }
            }

            /* Decorative Elements */
            .theia-app-left .theia-app-sidebar::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: var(--accent-gradient);
                z-index: 1000;
                border-radius: 0 0 var(--border-radius) var(--border-radius);
            }

            .theia-statusBar::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: var(--accent-gradient);
            }

            /* Tab active indicator */
            .theia-TabBar .theia-Tab.theia-mod-active::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: var(--accent-gradient);
                border-radius: 2px 2px 0 0;
                animation: tabGlow 2s infinite;
            }

            @keyframes tabGlow {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
        `;
    }

    private setupDynamicEffects(): void {
        // Add interactive hover effects
        document.addEventListener('mousemove', (e) => {
            const elements = document.querySelectorAll('.theia-activity-bar-item, .theia-Tab');
            elements.forEach(el => {
                const rect = el.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
                    (el as HTMLElement).style.setProperty('--mouse-x', `${x}px`);
                    (el as HTMLElement).style.setProperty('--mouse-y', `${y}px`);
                }
            });
        });
    }
} 