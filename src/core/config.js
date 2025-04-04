/**
 * System configuration for UVE
 * Contains default settings and constants
 * @module core/config
 */

const config = {
  // RDF Configuration
  rdf: {
    defaultNamespaces: {
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      owl: 'http://www.w3.org/2002/07/owl#',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
      foaf: 'http://xmlns.com/foaf/0.1/',
      uve: 'http://uve.example.org/ns#'
    },
    // RDF types for the UVE model
    types: {
      class: 'http://www.w3.org/2000/01/rdf-schema#Class',
      property: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Property',
      interface: 'http://uve.example.org/ns#Interface',
      subClassOf: 'http://www.w3.org/2000/01/rdf-schema#subClassOf'
    }
  },

  // Storage Configuration
  storage: {
    // Storage type: 'fs' or 'sparql'
    type: 'fs',

    // Filesystem storage settings
    basePath: '',

    // SPARQL storage settings
    endpoint: 'http://localhost:3030/uve/sparql',
    graphUri: 'http://uve.example.org/graph/main',
    prefix: 'http://uve.example.org/resource/',
    headers: {
      // Additional headers for SPARQL requests if needed
    }
  },

  // Visualization Configuration
  visualization: {
    // Class sphere settings
    sphere: {
      defaultRadius: 5,
      minRadius: 2,
      maxRadius: 10,
      defaultColor: 0x6495ED, // Cornflower blue
      selectedColor: 0xFFD700, // Gold
      opacity: 0.7,
      segments: 32
    },

    // Relationship pipe settings
    pipe: {
      defaultRadius: 0.3,
      defaultColor: 0x4682B4, // Steel blue
      selectedColor: 0xFFA500, // Orange
      segments: 8
    },

    // Interface port settings
    port: {
      defaultRadius: 0.5,
      defaultColor: 0x32CD32, // Lime green
      selectedColor: 0xFF4500, // Orange red
      segments: 16
    },

    // Camera settings
    camera: {
      fov: 75,
      near: 0.1,
      far: 1000,
      position: { x: 0, y: 0, z: 15 }
    },

    // Controls
    controls: {
      movementSpeed: 0.5,
      lookSpeed: 0.1
    }
  },

  // System settings
  system: {
    logLevel: 'info', // Possible values: trace, debug, info, warn, error
    defaultFile: 'model.ttl'
  }
};

export default config;