# Design Agent Extension

A minimal wireframe canvas viewer/editor Theia extension for proof-of-concept design work.

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