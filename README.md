# UVE - Universal Virtual Environment

UVE is a 3D visualization system for conceptual spaces using Three.js and RDF/OWL models.

_Vibe Coding nonsense_

## Features

- Classes represented as interactive 3D spheres
- Relationships displayed as labeled pipes
- Interfaces appear as ports on sphere surfaces
- First-person navigation with mouse/arrow key controls
- Hierarchical visualization with nested spaces
- RDF/OWL model support using RDF-Ext and Grapoi libraries

## Project Architecture

UVE uses a Model-View pattern with pub-sub messaging:

- Common event bus in the model layer
- Many-to-one change event propagation
- Two main views: RDF graph and Three.js 3D visualization

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm

### Installation

1. Clone this repository:

   ```
   git clone https://github.com/yourusername/uve.git
   cd uve
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Start the development server:

   ```
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Development

### Project Structure

```
uve/
├── src/              # Source code
│   ├── core/         # Core components
│   ├── renderers/    # Visualization renderers
│   ├── views/        # View implementations
│   └── examples/     # Example implementations
├── tests/            # Unit tests
├── public/           # Static assets
└── docs/             # Documentation
```

### Running Tests

```
npm test
```

### Building for Production

```
npm run build
```

## Examples

The project includes a FOAF (Friend of a Friend) example with 5 friends that demonstrates the capabilities of UVE. To load this example, click the "Load FOAF Example" button in the UI.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
