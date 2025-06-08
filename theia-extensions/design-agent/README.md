# Design Agent Extension

A specialized design agent extension for Theia IDE that provides canvas-based design tools and AI-powered assistance.

## 🏗️ Architecture

### Canvas System
- **DesignViewerWidget**: Read-only canvas for viewing designs
- **DesignEditorWidget**: Interactive canvas with programmatic API for agent control
- **DesignEditorService**: Service to manage and track editor widget instances

### Tool System
The extension implements a standardized tool architecture that separates AI reasoning from tool execution:

```
AI Agent (Future) → Tool Registry → Specific Tools → Canvas API
```

#### Core Components
- **`ToolDefinition`**: Metadata and schema for each tool
- **`DesignTool`**: Interface that all tools must implement
- **`BaseDesignTool`**: Abstract base class with common functionality
- **`DesignToolRegistry`**: Central registry for tool discovery and execution

#### Current Tools
- **`AddRectangleTool`** (`canvas.add-rectangle`): Add rectangles to canvas
- **`AddTextTool`** (`canvas.add-text`): Add text components to canvas  
- **`MoveComponentTool`** (`canvas.move-component`): Move existing components
- **`GetComponentsTool`** (`canvas.get-components`): Query current canvas state

## 🔧 Tool Interface Standard

Every tool follows this standardized pattern:

```typescript
@injectable()
export class MyTool extends BaseDesignTool {
    public readonly definition: ToolDefinition = {
        id: 'category.tool-name',
        name: 'Human Readable Name',
        description: 'What this tool does',
        category: ToolCategory.COMPONENT_CREATION,
        version: '1.0.0',
        parameters: {
            // JSON Schema for parameters
        },
        requiredParameters: ['param1'],
        examples: [
            // Usage examples
        ]
    };

    public async execute(parameters: ToolParameters, context: ToolContext): Promise<ToolResult> {
        // Tool implementation
    }
}
```

## 🧪 Testing

Use the "Test Design Tools" command from the View menu to verify the tool system works:
1. Opens Design Editor if needed
2. Tests adding rectangles and text
3. Tests querying components
4. Logs all results to console

## 🎯 Next Steps

1. **AI Agent Integration**: Connect to Theia's AI chat system
2. **Enhanced Tools**: Add more sophisticated design operations
3. **Tool Categories**: Implement layout, styling, and file operation tools
4. **Agent Rules**: Define design agent behavior and constraints

## 📁 File Structure

```
src/
├── browser/
│   ├── design-agent-contribution.ts     # Main extension logic
│   ├── design-agent-frontend-module.ts  # DI container setup
│   └── tools/
│       ├── base-tool.ts                 # Abstract tool base class
│       ├── tool-registry.ts             # Tool registry implementation
│       └── canvas-tools.ts              # Canvas manipulation tools
├── common/
│   ├── file-utils.ts                    # Design data types
│   └── tool-types.ts                    # Tool interface definitions
```

## 🚀 Usage

1. Open Design Editor: `View > Open Design Editor`
2. Test tools: `View > Test Design Tools`
3. Use programmatic API or tools for automation
4. Canvas saves automatically to `.agent/design/design.json`

## Features

### 🎨 Design Viewer (Read-Only)
- Opens a read-only canvas view of wireframe components
- Displays rectangles and text elements from the design JSON file
- Auto-refreshes when the design file changes externally

### ✏️ Design Editor (Interactive)
- Interactive canvas for creating and editing wireframe components
- Add rectangles and text elements with buttons
- Click and drag to move components around the canvas
- Select components and press Delete to remove them
- Changes are automatically saved to the design file

## Commands

- **Open Design Viewer**: `designAgent.openViewer`
- **Open Design Editor**: `designAgent.openEditor`

Both commands are available in the View menu.

## Development

```bash
# Build the extension
yarn build
``` 