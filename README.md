# UVE - Universal Virtual Environment

A 3D visualization of conceptual space using Three.js and RDF/OWL models.

## Overview

UVE renders conceptual space in 3D, where:
- Classes are represented as spheres
- Relationships between classes are visualized as labeled pipes
- Interfaces appear as ports on sphere surfaces
- Navigation uses first-person camera with mouse/arrow key controls
- Hierarchical visualization with nested spaces (entering a class sphere reveals its subclasses)

The data model is represented using RDF/OWL models and accessed via RDF-Ext and Grapoi libraries.

## Features

- 3D visualization of class hierarchies
- Interactive navigation through conceptual space
- RDF data editing with live visualization updates
- Support for various RDF formats (Turtle, N-Triples, JSON-LD, etc.)
- FOAF vocabulary example with 5 friends

## Architecture

UVE follows a Model-View architecture with pub-sub messaging:
- **Core**: EventBus for pub-sub messaging and configuration
- **Model**: RDF dataset management and conceptual model transformation
- **Views**: Three.js 3D visualization and RDF file editing
- **Utilities**: Helper functions for various tasks

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/uve.git
   cd uve
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Run the development server
   ```
   npm run dev
   ```

4. Open your browser at `http://localhost:5173`

### Building for Production

```
npm run build
```

The built files will be in the `dist` directory.

## Usage

### Navigation

- Click on the 3D view to enable navigation mode
- Use WASD or arrow keys to move
- Use Q/E to move up/down
- Move the mouse to look around
- Press ESC to exit navigation mode

### Interaction

- Click on objects to select them
- Click "Enter Class" to navigate into a class sphere
- Click "Exit Class" to navigate back out
- Use the RDF view to edit the data model

## Development

### Code Structure

```
src/
├── core/               # Core system components
│   ├── eventBus.js     # Pub-sub messaging system
│   └── config.js       # System configuration
├── model/              # Data model components
│   ├── rdfModel.js     # RDF dataset management
│   ├── conceptModel.js # Conceptual model transformation
│   └── entityTypes/    # Domain entity definitions
├── view/               # View components
│   ├── rdfView/        # RDF editing view
│   └── threeView/      # Three.js visualization
├── examples/           # Example data models
│   └── foafExample.js  # FOAF example with 5 friends
├── util/               # Utility functions
│   └── idGenerator.js  # Unique ID generation
└── styles/             # CSS styles
    └── main.css        # Main styling
```

### Testing

Run the tests with:

```
npm test
```

## License

[MIT](LICENSE)
