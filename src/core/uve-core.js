/**
 * @fileoverview UVE core architecture implementation
 * @module uve/core
 */

/**
 * Base class for all UVE event types
 * @class UVEEvent
 */
export class UVEEvent {
  /**
   * Create a new UVE event
   * @param {string} type - The event type
   * @param {Object} data - Event data
   */
  constructor(type, data = {}) {
    this.type = type;
    this.data = data;
    this.timestamp = Date.now();
  }
}

/**
 * Event bus for UVE system-wide messaging
 * @class EventBus
 */
export class EventBus {
  constructor() {
    this.subscribers = new Map();
  }

  /**
   * Subscribe to events of a specific type
   * @param {string} eventType - Type of event to subscribe to
   * @param {Function} callback - Function to call when event occurs
   * @returns {Function} Unsubscribe function
   */
  subscribe(eventType, callback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    
    this.subscribers.get(eventType).add(callback);
    
    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(eventType);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(eventType);
        }
      }
    };
  }

  /**
   * Publish an event to all subscribers
   * @param {UVEEvent} event - The event to publish
   */
  publish(event) {
    const subs = this.subscribers.get(event.type);
    if (subs) {
      subs.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in event handler for ${event.type}:`, error);
        }
      });
    }
  }
}

/**
 * Base class for all model objects
 * @class ModelObject
 */
export class ModelObject {
  /**
   * Create a new model object
   * @param {EventBus} eventBus - The system event bus
   * @param {string} id - Unique identifier for this object
   */
  constructor(eventBus, id) {
    this.eventBus = eventBus;
    this.id = id;
    this.properties = new Map();
  }

  /**
   * Get a property value
   * @param {string} key - Property name
   * @param {*} defaultValue - Default value if property doesn't exist
   * @returns {*} Property value
   */
  get(key, defaultValue = null) {
    return this.properties.has(key) ? this.properties.get(key) : defaultValue;
  }

  /**
   * Set a property value and notify subscribers
   * @param {string} key - Property name
   * @param {*} value - Property value
   * @fires ModelPropertyChangeEvent
   */
  set(key, value) {
    const oldValue = this.get(key);
    this.properties.set(key, value);
    
    this.eventBus.publish(new UVEEvent('model:property:change', {
      modelId: this.id,
      property: key,
      oldValue,
      newValue: value
    }));
  }
}

/**
 * RDF Model Manager for loading and manipulating RDF data
 * @class RDFModelManager
 */
export class RDFModelManager {
  /**
   * Create a new RDF Model Manager
   * @param {EventBus} eventBus - The system event bus
   * @param {Object} rdf - RDF-Ext instance
   */
  constructor(eventBus, rdf) {
    this.eventBus = eventBus;
    this.rdf = rdf;
    this.dataset = rdf.dataset();
    this.classMap = new Map();
    
    // Subscribe to relevant events
    this.eventBus.subscribe('rdf:load', this.handleLoad.bind(this));
  }

  /**
   * Handle RDF load events
   * @param {UVEEvent} event - Load event
   * @private
   */
  handleLoad(event) {
    const { url, format } = event.data;
    this.loadFromUrl(url, format);
  }

  /**
   * Load RDF data from a URL
   * @param {string} url - URL to load from
   * @param {string} format - RDF format (e.g., 'text/turtle')
   * @returns {Promise<void>}
   */
  async loadFromUrl(url, format = 'text/turtle') {
    try {
      const dataset = await this.rdf.io.dataset.fromURL(url);
      this.setDataset(dataset);
      
      this.eventBus.publish(new UVEEvent('rdf:loaded', {
        source: url,
        size: dataset.size
      }));
    } catch (error) {
      this.eventBus.publish(new UVEEvent('rdf:error', {
        source: url,
        error: error.message
      }));
    }
  }

  /**
   * Set the current dataset
   * @param {Object} dataset - RDF-Ext dataset
   */
  setDataset(dataset) {
    this.dataset = dataset;
    this.extractClasses();
  }

  /**
   * Extract class definitions from the dataset
   * @private
   */
  extractClasses() {
    const ns = {
      rdf: this.rdf.namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
      rdfs: this.rdf.namespace('http://www.w3.org/2000/01/rdf-schema#'),
      owl: this.rdf.namespace('http://www.w3.org/2002/07/owl#')
    };
    
    // Find all classes (instances of rdfs:Class or owl:Class)
    const classes = this.rdf.grapoi({ dataset: this.dataset })
      .has(ns.rdf.type, ns.rdfs.Class)
      .addUnion()
      .has(ns.rdf.type, ns.owl.Class)
      .distinct()
      .terms;
    
    // Clear existing class map
    this.classMap.clear();
    
    // Process each class
    classes.forEach(classTerm => {
      const classId = classTerm.value;
      const label = this.getLabel(classTerm);
      
      // Get parent classes
      const parents = this.rdf.grapoi({ dataset: this.dataset, term: classTerm })
        .out(ns.rdfs.subClassOf)
        .terms;
      
      // Create class model object
      const classObj = new ModelObject(this.eventBus, classId);
      classObj.set('label', label);
      classObj.set('uri', classId);
      classObj.set('parents', parents.map(p => p.value));
      
      this.classMap.set(classId, classObj);
    });
    
    // Notify that classes have been extracted
    this.eventBus.publish(new UVEEvent('rdf:classes:extracted', {
      count: this.classMap.size
    }));
  }

  /**
   * Get a readable label for an RDF term
   * @param {Object} term - RDF-Ext term
   * @returns {string} Label
   * @private
   */
  getLabel(term) {
    const ns = {
      rdfs: this.rdf.namespace('http://www.w3.org/2000/01/rdf-schema#')
    };
    
    // Try to get rdfs:label
    const labels = this.rdf.grapoi({ dataset: this.dataset, term })
      .out(ns.rdfs.label)
      .values;
    
    if (labels.length > 0) {
      return labels[0];
    }
    
    // Fallback to the local part of the URI
    const uri = term.value;
    const localName = uri.split(/[#/]/).pop();
    
    return localName;
  }

  /**
   * Get all class definitions
   * @returns {Array<ModelObject>} Class definitions
   */
  getClasses() {
    return Array.from(this.classMap.values());
  }
}

/**
 * View base class
 * @class View
 */
export class View {
  /**
   * Create a new view
   * @param {EventBus} eventBus - The system event bus
   * @param {string} id - View identifier
   */
  constructor(eventBus, id) {
    this.eventBus = eventBus;
    this.id = id;
    this.subscriptions = [];
  }

  /**
   * Initialize the view
   * @returns {void}
   */
  initialize() {
    // To be implemented by subclasses
  }

  /**
   * Subscribe to an event
   * @param {string} eventType - Type of event
   * @param {Function} callback - Callback function
   * @protected
   */
  subscribeToEvent(eventType, callback) {
    const unsubscribe = this.eventBus.subscribe(eventType, callback);
    this.subscriptions.push(unsubscribe);
  }

  /**
   * Clean up all subscriptions
   */
  dispose() {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];
  }
}

/**
 * Three.js view for 3D visualization
 * @class ThreeJsView
 * @extends View
 */
export class ThreeJsView extends View {
  /**
   * Create a new Three.js view
   * @param {EventBus} eventBus - The system event bus
   * @param {Object} three - Three.js instance
   * @param {HTMLElement} container - DOM container for the renderer
   */
  constructor(eventBus, three, container) {
    super(eventBus, 'three-js-view');
    this.three = three;
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.classObjects = new Map();
  }

  /**
   * Initialize the Three.js scene
   * @override
   */
  initialize() {
    // Create scene
    this.scene = new this.three.Scene();
    this.scene.background = new this.three.Color(0xf0f0f0);
    
    // Create camera
    this.camera = new this.three.PerspectiveCamera(
      75, 
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.z = 10;
    
    // Create renderer
    this.renderer = new this.three.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.container.appendChild(this.renderer.domElement);
    
    // Add orbit controls
    this.controls = new this.three.OrbitControls(
      this.camera,
      this.renderer.domElement
    );
    this.controls.enableDamping = true;
    
    // Add ambient light
    const ambientLight = new this.three.AmbientLight(0x404040);
    this.scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new this.three.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);
    
    // Subscribe to relevant events
    this.subscribeToEvent('rdf:classes:extracted', this.handleClassesExtracted.bind(this));
    
    // Start animation loop
    this.animate();
    
    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  /**
   * Handle window resize events
   * @private
   */
  handleResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  /**
   * Animation loop
   * @private
   */
  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Handle classes extracted event
   * @param {UVEEvent} event - Classes extracted event
   * @private
   */
  handleClassesExtracted(event) {
    // Get classes from the model
    const modelManager = event.data.modelManager;
    const classes = modelManager.getClasses();
    
    // Clear existing class objects
    this.classObjects.forEach(obj => this.scene.remove(obj));
    this.classObjects.clear();
    
    // Create spheres for each class
    classes.forEach((classObj, index) => {
      const sphere = this.createClassSphere(classObj, index, classes.length);
      this.scene.add(sphere);
      this.classObjects.set(classObj.id, sphere);
    });
    
    // TODO: Create relationship pipes between classes
  }

  /**
   * Create a sphere representing a class
   * @param {ModelObject} classObj - Class model object
   * @param {number} index - Index of the class
   * @param {number} total - Total number of classes
   * @returns {Object} Three.js mesh
   * @private
   */
  createClassSphere(classObj, index, total) {
    // Create geometry
    const geometry = new this.three.SphereGeometry(1, 32, 32);
    
    // Create material with unique color based on index
    const hue = index / total;
    const material = new this.three.MeshStandardMaterial({
      color: new this.three.Color().setHSL(hue, 0.7, 0.6),
      transparent: true,
      opacity: 0.8
    });
    
    // Create mesh
    const sphere = new this.three.Mesh(geometry, material);
    
    // Position in a circle layout
    const angle = (index / total) * Math.PI * 2;
    const radius = Math.max(5, total * 0.5);
    sphere.position.x = Math.cos(angle) * radius;
    sphere.position.y = Math.sin(angle) * radius;
    
    // Store reference to class data
    sphere.userData = {
      classId: classObj.id,
      label: classObj.get('label'),
      uri: classObj.get('uri')
    };
    
    // Create label
    this.addClassLabel(sphere, classObj.get('label'));
    
    return sphere;
  }

  /**
   * Add a text label to a class sphere
   * @param {Object} sphere - Three.js mesh
   * @param {string} label - Label text
   * @private
   */
  addClassLabel(sphere, label) {
    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;
    
    // Draw text
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = 'Bold 24px Arial';
    context.textAlign = 'center';
    context.fillStyle = '#000000';
    context.fillText(label, canvas.width / 2, canvas.height / 2);
    
    // Create sprite texture
    const texture = new this.three.CanvasTexture(canvas);
    
    // Create sprite material
    const material = new this.three.SpriteMaterial({
      map: texture,
      transparent: true
    });
    
    // Create sprite
    const sprite = new this.three.Sprite(material);
    sprite.scale.set(2, 1, 1);
    sprite.position.y = 1.5;
    
    // Add to sphere
    sphere.add(sprite);
  }
}

/**
 * Main UVE application
 * @class UVEApp
 */
export class UVEApp {
  /**
   * Create the UVE application
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = config;
    this.eventBus = new EventBus();
    this.rdf = config.rdf;
    this.three = config.three;
    
    this.modelManager = new RDFModelManager(this.eventBus, this.rdf);
    this.views = [];
  }

  /**
   * Initialize the application
   * @param {HTMLElement} container - DOM container for Three.js
   */
  initialize(container) {
    // Create the Three.js view
    const threeView = new ThreeJsView(this.eventBus, this.three, container);
    threeView.initialize();
    this.views.push(threeView);
    
    // Load initial data if provided
    if (this.config.initialUrl) {
      this.eventBus.publish(new UVEEvent('rdf:load', {
        url: this.config.initialUrl,
        format: this.config.initialFormat || 'text/turtle'
      }));
    }
  }

  /**
   * Clean up and dispose resources
   */
  dispose() {
    this.views.forEach(view => view.dispose());
    this.views = [];
  }
}
