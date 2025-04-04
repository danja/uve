/**
 * ThreeView renders the 3D visualization of the conceptual model
 * @module view/threeView/threeView
 */

import * as THREE from 'three';
import log from 'loglevel';
import eventBus from '../../core/eventBus.js';
import config from '../../core/config.js';
import Controls from './components/controls.js';
import Sphere from './components/sphere.js';
import Pipe from './components/pipe.js';
import Port from './components/port.js';

// Added debugging
console.log('ThreeView module loading');

class ThreeView {
  /**
   * Create a ThreeView
   * @param {ConceptModel} conceptModel - Conceptual model
   * @param {HTMLElement} container - DOM element to render into
   */
  constructor(conceptModel, container) {
    console.log('ThreeView constructor', {
      conceptModel: conceptModel ? 'provided' : 'missing',
      container: container ? 'provided' : 'missing'
    });

    this.conceptModel = conceptModel;
    this.container = container;
    this.log = log.getLogger('ThreeView');

    // Component maps
    this.spheres = new Map(); // URI string -> Sphere
    this.pipes = new Map(); // URI string -> Pipe
    this.ports = new Map(); // URI string -> Port

    // Initialize THREE.js
    this.initThree();

    // Add event listeners
    window.addEventListener('resize', this.onResize.bind(this));

    // Subscribe to model changes
    eventBus.subscribe('concept-model-changed', (data) => {
      console.log('concept-model-changed event received in ThreeView', data);
      this.updateFromModel();
    });

    // Subscribe to object selection
    eventBus.subscribe('object-selected', this.onObjectSelected.bind(this));
    eventBus.subscribe('object-deselected', this.onObjectDeselected.bind(this));

    // Track navigation hierarchy
    this.navigationStack = [];
    this.currentClassUri = null;

    // Animation loop
    this.animate = this.animate.bind(this);
    this.clock = new THREE.Clock();
    this.animate();

    console.log('ThreeView construction complete');
  }

  /**
   * Initialize THREE.js renderer, scene, and camera
   */
  initThree() {
    console.log('Initializing Three.js');

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.container.appendChild(this.renderer.domElement);
    console.log('Renderer created and added to container');

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111133);
    console.log('Scene created with background color');

    // Add debug grid and axes to help with orientation
    const gridHelper = new THREE.GridHelper(20, 20);
    this.scene.add(gridHelper);
    console.log('Grid helper added');

    const axesHelper = new THREE.AxesHelper(5);
    this.scene.add(axesHelper);
    console.log('Axes helper added');

    // Add a simple sphere to verify rendering is working
    const debugSphere = new THREE.Mesh(
      new THREE.SphereGeometry(2, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    debugSphere.position.set(0, 0, 0);
    this.scene.add(debugSphere);
    console.log('Debug sphere added at origin (0,0,0)');

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      config.visualization.camera.fov,
      this.container.clientWidth / this.container.clientHeight,
      config.visualization.camera.near,
      config.visualization.camera.far
    );
    this.camera.position.set(
      config.visualization.camera.position.x,
      config.visualization.camera.position.y,
      config.visualization.camera.position.z
    );
    console.log('Camera created at position', this.camera.position);

    // Create controls
    console.log('Creating Controls');
    this.controls = new Controls(this.camera, this.renderer.domElement);
    console.log('Controls created');

    // Add lights
    this.addLights();

    // Create object groups
    this.spheresGroup = new THREE.Group();
    this.pipesGroup = new THREE.Group();
    this.scene.add(this.spheresGroup);
    this.scene.add(this.pipesGroup);
    console.log('Sphere and pipe groups added to scene');

    this.log.debug('THREE.js initialized');
    console.log('THREE.js initialization complete');
  }

  /**
   * Add lights to the scene
   */
  addLights() {
    console.log('Adding lights to scene');

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    // Add point lights
    const pointLight1 = new THREE.PointLight(0xffffff, 0.5);
    pointLight1.position.set(50, 50, 50);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffffff, 0.5);
    pointLight2.position.set(-50, -50, -50);
    this.scene.add(pointLight2);

    console.log('Lights added to scene');
  }

  /**
   * Update the view from the conceptual model
   */
  updateFromModel() {
    this.log.info('Updating ThreeView from conceptual model');
    console.log('Updating ThreeView from conceptual model');

    // Clear current visualization
    this.clearVisualization();

    // If we're showing a specific class's internals
    if (this.currentClassUri) {
      console.log('Rendering internals for class:', this.currentClassUri);
      this.renderClassInternals(this.currentClassUri);
    } else {
      // Render all top-level classes
      console.log('Rendering all top-level classes');
      this.renderClasses();

      // Render relationships between classes
      console.log('Rendering relationships between classes');
      this.renderRelationships();

      // Render interfaces on classes
      console.log('Rendering interfaces on classes');
      this.renderInterfaces();
    }

    console.log('ThreeView update complete');
  }

  /**
   * Clear the current visualization
   */
  clearVisualization() {
    console.log('Clearing visualization');

    // Dispose and clear spheres
    for (const sphere of this.spheres.values()) {
      sphere.dispose();
    }
    this.spheres.clear();

    // Dispose and clear pipes
    for (const pipe of this.pipes.values()) {
      pipe.dispose();
    }
    this.pipes.clear();

    // Dispose and clear ports
    for (const port of this.ports.values()) {
      port.dispose();
    }
    this.ports.clear();

    console.log('Visualization cleared');
  }

  /**
   * Render all classes in the conceptual model
   */
  renderClasses() {
    console.log('Rendering classes from conceptual model');
    console.log('Classes in model:', this.conceptModel.classes.size);

    for (const classEntity of this.conceptModel.classes.values()) {
      console.log('Rendering class:', classEntity.label);
      this.renderClass(classEntity);
    }

    console.log('Classes rendering complete');
  }

  /**
   * Render a single class entity
   * @param {ClassEntity} classEntity - Class entity to render
   * @returns {Sphere} The created sphere component
   */
  renderClass(classEntity) {
    const uriString = classEntity.uri.value;
    console.log('Rendering class:', classEntity.label, uriString);

    // Skip if we already have this class
    if (this.spheres.has(uriString)) {
      console.log('Class already rendered, skipping:', uriString);
      return this.spheres.get(uriString);
    }

    // Create sphere for the class
    try {
      console.log('Creating sphere for class:', classEntity.label);
      const sphere = new Sphere({
        classEntity,
        parent: this.spheresGroup
      });

      // Store the sphere
      this.spheres.set(uriString, sphere);

      this.log.debug(`Rendered class: ${classEntity.label} (${uriString})`);
      console.log(`Rendered class: ${classEntity.label} (${uriString})`);

      return sphere;
    } catch (error) {
      console.error('Error creating sphere for class:', classEntity.label, error);
      return null;
    }
  }

  /**
   * Render relationships between classes
   */
  renderRelationships() {
    console.log('Rendering relationships');
    console.log('Relationships in model:', this.conceptModel.relationships.size);

    for (const relationshipEntity of this.conceptModel.relationships.values()) {
      console.log('Rendering relationship:', relationshipEntity.label);
      this.renderRelationship(relationshipEntity);
    }

    console.log('Relationships rendering complete');
  }

  /**
   * Render a single relationship entity
   * @param {RelationshipEntity} relationshipEntity - Relationship entity to render
   * @returns {Pipe} The created pipe component
   */
  renderRelationship(relationshipEntity) {
    const uriString = relationshipEntity.uri.value;
    console.log('Rendering relationship:', relationshipEntity.label, uriString);

    // Skip if we already have this relationship
    if (this.pipes.has(uriString)) {
      console.log('Relationship already rendered, skipping:', uriString);
      return this.pipes.get(uriString);
    }

    const sourceUriString = relationshipEntity.sourceClassUri.value;
    const targetUriString = relationshipEntity.targetClassUri.value;

    console.log('Looking for spheres:', {
      source: sourceUriString,
      sourceSphere: this.spheres.has(sourceUriString),
      target: targetUriString,
      targetSphere: this.spheres.has(targetUriString)
    });

    // Try to find spheres with various URI patterns
    // Sometimes the URI can be slightly different (with or without trailing slash)
    const sourceSphere = this.findSphereByUri(sourceUriString);
    const targetSphere = this.findSphereByUri(targetUriString);

    // Skip if we don't have the source or target class
    if (!sourceSphere || !targetSphere) {
      this.log.warn(`Cannot render relationship ${uriString}: missing ` +
        (sourceSphere ? '' : 'source ') +
        (targetSphere ? '' : 'target'));
      console.warn(`Cannot render relationship ${uriString}: missing ` +
        (sourceSphere ? '' : 'source ') +
        (targetSphere ? '' : 'target'));
      return null;
    }

    // Create pipe for the relationship
    try {
      console.log('Creating pipe for relationship:', relationshipEntity.label,
        'from', sourceSphere.classEntity.label, 'to', targetSphere.classEntity.label);

      const pipe = new Pipe({
        relationshipEntity,
        sourceSphere,
        targetSphere,
        parent: this.pipesGroup
      });

      // Store the pipe
      this.pipes.set(uriString, pipe);

      this.log.debug(`Rendered relationship: ${relationshipEntity.label} (${uriString})`);
      console.log(`Rendered relationship: ${relationshipEntity.label} (${uriString})`);

      return pipe;
    } catch (error) {
      console.error('Error creating pipe for relationship:', relationshipEntity.label, error);
      return null;
    }
  }

  /**
   * Find a sphere by URI, trying different variations of the URI
   * @param {string} uri - URI to search for
   * @returns {Sphere|null} The found sphere or null
   */
  findSphereByUri(uri) {
    // Try exact match first
    if (this.spheres.has(uri)) {
      return this.spheres.get(uri);
    }

    // Try with/without trailing slash
    const altUri = uri.endsWith('/') ? uri.slice(0, -1) : uri + '/';
    if (this.spheres.has(altUri)) {
      return this.spheres.get(altUri);
    }

    // Try simpler version (just the local name)
    const localName = uri.split('/').pop().split('#').pop();

    // Look for a sphere that has this local name in its URI
    for (const [sphereUri, sphere] of this.spheres.entries()) {
      if (sphereUri.includes(localName)) {
        console.log(`Found sphere with similar URI: ${sphereUri} for ${uri}`);
        return sphere;
      }
    }

    // Print available sphere URIs for debugging
    if (this.spheres.size > 0) {
      console.log('Available sphere URIs:', Array.from(this.spheres.keys()));
    }

    return null;
  }

  /**
   * Render interfaces on classes
   */
  renderInterfaces() {
    console.log('Rendering interfaces');
    console.log('Interfaces in model:', this.conceptModel.interfaces.size);

    for (const interfaceEntity of this.conceptModel.interfaces.values()) {
      console.log('Rendering interface:', interfaceEntity.label);
      this.renderInterface(interfaceEntity);
    }

    console.log('Interfaces rendering complete');
  }

  /**
   * Render a single interface entity
   * @param {InterfaceEntity} interfaceEntity - Interface entity to render
   * @returns {Port} The created port component
   */
  renderInterface(interfaceEntity) {
    const uriString = interfaceEntity.uri.value;
    console.log('Rendering interface:', interfaceEntity.label, uriString);

    // Skip if we already have this interface
    if (this.ports.has(uriString)) {
      console.log('Interface already rendered, skipping:', uriString);
      return this.ports.get(uriString);
    }

    const classUriString = interfaceEntity.classUri.value;

    // Skip if we don't have the class
    if (!this.spheres.has(classUriString)) {
      this.log.warn(`Cannot render interface ${uriString}: missing class ${classUriString}`);
      console.warn(`Cannot render interface ${uriString}: missing class ${classUriString}`);
      return null;
    }

    // Get parent sphere
    const parentSphere = this.spheres.get(classUriString);

    // Create port for the interface
    try {
      console.log('Creating port for interface:', interfaceEntity.label);
      const port = new Port({
        interfaceEntity,
        parentSphere
      });

      // Store the port
      this.ports.set(uriString, port);

      this.log.debug(`Rendered interface: ${interfaceEntity.label} (${uriString})`);
      console.log(`Rendered interface: ${interfaceEntity.label} (${uriString})`);

      return port;
    } catch (error) {
      console.error('Error creating port for interface:', interfaceEntity.label, error);
      return null;
    }
  }

  /**
   * Render the internals of a class
   * @param {string} classUriString - URI of the class to render internals for
   */
  renderClassInternals(classUriString) {
    const classEntity = this.conceptModel.getClass(classUriString);

    if (!classEntity) {
      this.log.error(`Cannot render internals for unknown class ${classUriString}`);
      console.error(`Cannot render internals for unknown class ${classUriString}`);
      return;
    }

    this.log.info(`Rendering internals for class ${classEntity.label} (${classUriString})`);
    console.log(`Rendering internals for class ${classEntity.label} (${classUriString})`);

    // Render subclasses
    for (const subclassUri of classEntity.subclasses) {
      const subclassEntity = this.conceptModel.getClass(subclassUri.value);

      if (subclassEntity) {
        this.renderClass(subclassEntity);
      }
    }

    // Render relationships between subclasses
    for (const relationshipEntity of this.conceptModel.relationships.values()) {
      const sourceUriString = relationshipEntity.sourceClassUri.value;
      const targetUriString = relationshipEntity.targetClassUri.value;

      // Only render relationships between subclasses
      if (this.spheres.has(sourceUriString) && this.spheres.has(targetUriString)) {
        this.renderRelationship(relationshipEntity);
      }
    }

    // Render interfaces on subclasses
    for (const interfaceEntity of this.conceptModel.interfaces.values()) {
      const interfaceClassUriString = interfaceEntity.classUri.value;

      // Only render interfaces on subclasses
      if (this.spheres.has(interfaceClassUriString)) {
        this.renderInterface(interfaceEntity);
      }
    }

    console.log('Class internals rendering complete');
  }

  /**
   * Navigate into a class sphere to view its internals
   * @param {string} classUriString - URI of the class to enter
   */
  enterClass(classUriString) {
    const classEntity = this.conceptModel.getClass(classUriString);

    if (!classEntity) {
      this.log.error(`Cannot enter unknown class ${classUriString}`);
      console.error(`Cannot enter unknown class ${classUriString}`);
      return;
    }

    // Push current state to navigation stack
    this.navigationStack.push({
      classUri: this.currentClassUri,
      cameraPosition: this.camera.position.clone(),
      cameraRotation: this.camera.rotation.clone()
    });

    // Set current class
    this.currentClassUri = classUriString;

    // Reset camera position
    this.camera.position.set(0, 0, 15);
    this.camera.rotation.set(0, 0, 0);

    // Update view
    this.updateFromModel();

    this.log.info(`Entered class ${classEntity.label} (${classUriString})`);
    console.log(`Entered class ${classEntity.label} (${classUriString})`);
    eventBus.publish('class-entered', { classEntity });
  }

  /**
   * Navigate out of the current class
   */
  exitClass() {
    if (this.navigationStack.length === 0) {
      this.log.warn('Cannot exit class: navigation stack is empty');
      console.warn('Cannot exit class: navigation stack is empty');
      return;
    }

    // Pop state from navigation stack
    const state = this.navigationStack.pop();

    // Get the class we're exiting from
    const exitingClassEntity = this.conceptModel.getClass(this.currentClassUri);

    // Restore state
    this.currentClassUri = state.classUri;
    this.camera.position.copy(state.cameraPosition);
    this.camera.rotation.copy(state.cameraRotation);

    // Update view
    this.updateFromModel();

    this.log.info(`Exited class ${exitingClassEntity?.label || 'unknown'}`);
    console.log(`Exited class ${exitingClassEntity?.label || 'unknown'}`);
    eventBus.publish('class-exited', { classEntity: exitingClassEntity });
  }

  /**
   * Handle object selection
   * @param {Object} data - Selection data
   * @param {string} data.type - Object type (class, relationship, interface)
   * @param {string} data.uri - Object URI
   * @param {Object} data.entity - Object entity
   */
  onObjectSelected(data) {
    const { type, uri } = data;
    console.log('onObjectSelected:', type, uri);

    if (type === 'class') {
      const classEntity = this.conceptModel.getClass(uri);

      if (classEntity) {
        classEntity.isSelected = true;

        // Update sphere appearance
        const sphere = this.spheres.get(uri);
        if (sphere) {
          sphere.update();
        }
      }
    } else if (type === 'relationship') {
      const relationshipEntity = this.conceptModel.getRelationship(uri);

      if (relationshipEntity) {
        relationshipEntity.isSelected = true;

        // Update pipe appearance
        const pipe = this.pipes.get(uri);
        if (pipe) {
          pipe.update();
        }
      }
    } else if (type === 'interface') {
      const interfaceEntity = this.conceptModel.getInterface(uri);

      if (interfaceEntity) {
        interfaceEntity.isSelected = true;

        // Update port appearance
        const port = this.ports.get(uri);
        if (port) {
          port.update();
        }
      }
    }
  }

  /**
   * Handle object deselection
   * @param {Object} data - Deselection data
   * @param {string} data.type - Object type (class, relationship, interface)
   * @param {string} data.uri - Object URI
   */
  onObjectDeselected(data) {
    const { type, uri } = data;
    console.log('onObjectDeselected:', type, uri);

    if (type === 'class') {
      const classEntity = this.conceptModel.getClass(uri);

      if (classEntity) {
        classEntity.isSelected = false;

        // Update sphere appearance
        const sphere = this.spheres.get(uri);
        if (sphere) {
          sphere.update();
        }
      }
    } else if (type === 'relationship') {
      const relationshipEntity = this.conceptModel.getRelationship(uri);

      if (relationshipEntity) {
        relationshipEntity.isSelected = false;

        // Update pipe appearance
        const pipe = this.pipes.get(uri);
        if (pipe) {
          pipe.update();
        }
      }
    } else if (type === 'interface') {
      const interfaceEntity = this.conceptModel.getInterface(uri);

      if (interfaceEntity) {
        interfaceEntity.isSelected = false;

        // Update port appearance
        const port = this.ports.get(uri);
        if (port) {
          port.update();
        }
      }
    }
  }

  /**
   * Handle window resize
   */
  onResize() {
    // Update camera aspect ratio
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();

    // Update renderer size
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  /**
   * Animation loop
   */
  animate() {
    requestAnimationFrame(this.animate);

    // Get delta time
    const deltaTime = this.clock.getDelta();

    // Update controls
    this.controls.update(deltaTime, this.scene);

    // Render scene
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Clean up resources
   */
  dispose() {
    // Stop animation loop
    cancelAnimationFrame(this.animate);

    // Remove event listeners
    window.removeEventListener('resize', this.onResize);

    // Dispose of controls
    this.controls.dispose();

    // Dispose of components
    this.clearVisualization();

    // Dispose of THREE.js resources
    this.renderer.dispose();

    // Remove renderer from DOM
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

export default ThreeView;