/**
 * @fileoverview Three.js renderer for class spheres in UVE
 * @module uve/renderers/class-sphere
 */

/**
 * Class responsible for rendering RDF classes as 3D spheres
 */
export class ClassSphereRenderer {
  /**
   * Create a new ClassSphereRenderer
   * @param {Object} three - Three.js instance
   * @param {Object} eventBus - UVE event bus
   */
  constructor(three, eventBus) {
    this.three = three;
    this.eventBus = eventBus;
    this.classes = new Map();
    this.spheres = new Map();
    this.scene = null;
    this.selectedClass = null;
    this.hoveredClass = null;
    
    // Material properties
    this.defaultMaterial = {
      color: 0x3498db,
      opacity: 0.8,
      transparent: true,
      metalness: 0.2,
      roughness: 0.5
    };
    
    this.selectedMaterial = {
      color: 0xf39c12,
      opacity: 0.9,
      transparent: true,
      metalness: 0.3,
      roughness: 0.4,
      emissive: 0x996600
    };
    
    this.hoveredMaterial = {
      color: 0x2ecc71,
      opacity: 0.9,
      transparent: true,
      metalness: 0.3,
      roughness: 0.4
    };
    
    // Subscribe to events
    this.subscribeToEvents();
  }
  
  /**
   * Set the Three.js scene to render into
   * @param {Object} scene - Three.js scene
   */
  setScene(scene) {
    this.scene = scene;
  }
  
  /**
   * Subscribe to relevant UVE events
   * @private
   */
  subscribeToEvents() {
    this.eventBus.subscribe('rdf:classes:extracted', this.handleClassesExtracted.bind(this));
    this.eventBus.subscribe('class:select', this.handleClassSelected.bind(this));
    this.eventBus.subscribe('class:hover', this.handleClassHovered.bind(this));
    this.eventBus.subscribe('camera:move', this.handleCameraMove.bind(this));
  }
  
  /**
   * Handle class extraction event
   * @param {Object} event - Event object
   * @private
   */
  handleClassesExtracted(event) {
    // Clear existing spheres
    this.clear();
    
    // Store new class data
    const newClasses = event.data.classes;
    
    // Render the classes
    this.renderClasses(newClasses);
  }
  
  /**
   * Handle class selection event
   * @param {Object} event - Event object
   * @private
   */
  handleClassSelected(event) {
    const classId = event.data.classId;
    
    // Update selected class
    this.selectedClass = classId;
    
    // Update materials
    this.updateMaterials();
    
    // Optionally expand the class to show internals
    if (event.data.expand) {
      this.expandClass(classId);
    }
  }
  
  /**
   * Handle class hover event
   * @param {Object} event - Event object
   * @private
   */
  handleClassHovered(event) {
    const classId = event.data.classId;
    
    // Update hovered class
    this.hoveredClass = classId;
    
    // Update materials
    this.updateMaterials();
  }
  
  /**
   * Handle camera movement
   * @param {Object} event - Event object
   * @private
   */
  handleCameraMove(event) {
    // Update labels to face camera
    if (event.data.position) {
      this.updateLabels(event.data.position);
    }
  }
  
  /**
   * Clear all spheres from the scene
   */
  clear() {
    // Remove all spheres from the scene
    this.spheres.forEach(sphere => {
      this.scene.remove(sphere);
    });
    
    // Clear internal maps
    this.spheres.clear();
    this.classes.clear();
  }
  
  /**
   * Render a collection of classes as spheres
   * @param {Array<Object>} classes - Class objects
   */
  renderClasses(classes) {
    if (!this.scene) {
      console.error('Scene not set for ClassSphereRenderer');
      return;
    }
    
    // Store class data
    classes.forEach(classObj => {
      this.classes.set(classObj.id, classObj);
    });
    
    // Calculate layout
    const positions = this.calculateLayout(classes);
    
    // Create spheres for each class
    classes.forEach((classObj, index) => {
      const sphere = this.createClassSphere(classObj, positions[index]);
      this.scene.add(sphere);
      this.spheres.set(classObj.id, sphere);
    });
    
    // Create relationship lines
    this.createRelationships();
  }
  
  /**
   * Calculate positions for a collection of class spheres
   * @param {Array<Object>} classes - Class objects
   * @returns {Array<Object>} 3D positions for each class
   * @private
   */
  calculateLayout(classes) {
    const positions = [];
    const count = classes.length;
    
    // If there's only one class, put it at the center
    if (count === 1) {
      positions.push({ x: 0, y: 0, z: 0 });
      return positions;
    }
    
    // Simple spiral layout - can be replaced with force-directed layout for more complex graphs
    const radiusScale = Math.sqrt(count) * 2;
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = radiusScale * (1 + (i % 3) * 0.3);
      const height = ((i % 5) - 2) * 2;
      
      positions.push({
        x: Math.cos(angle) * radius,
        y: height,
        z: Math.sin(angle) * radius
      });
    }
    
    return positions;
  }
  
  /**
   * Create a sphere representing a class
   * @param {Object} classObj - Class object
   * @param {Object} position - 3D position
   * @returns {Object} Three.js mesh
   * @private
   */
  createClassSphere(classObj, position) {
    // Calculate sphere size based on class properties
    const properties = Object.keys(classObj.properties || {}).length;
    const radius = 1 + Math.min(Math.sqrt(properties) * 0.2, 1);
    
    // Create geometry
    const geometry = new this.three.SphereGeometry(radius, 32, 32);
    
    // Create material
    const material = new this.three.MeshStandardMaterial(this.defaultMaterial);
    
    // Create mesh
    const sphere = new this.three.Mesh(geometry, material);
    
    // Set position
    sphere.position.set(position.x, position.y, position.z);
    
    // Store metadata
    sphere.userData = {
      classId: classObj.id,
      className: classObj.get('label') || classObj.id,
      uri: classObj.get('uri') || classObj.id,
      properties: properties
    };
    
    // Add label
    this.addLabel(sphere, classObj);
    
    // Add interface ports if applicable
    this.addInterfacePorts(sphere, classObj);
    
    return sphere;
  }
  
  /**
   * Add a text label to a sphere
   * @param {Object} sphere - Three.js mesh
   * @param {Object} classObj - Class object
   * @private
   */
  addLabel(sphere, classObj) {
    // Get class name
    const name = classObj.get('label') || classObj.id;
    
    // Create dynamic canvas for the label
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;
    
    // Draw background
    context.fillStyle = 'rgba(255, 255, 255, 0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw text
    context.font = 'bold 24px Arial';
    context.fillStyle = '#000000';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(name, canvas.width / 2, canvas.height / 2);
    
    // Create texture
    const texture = new this.three.CanvasTexture(canvas);
    
    // Create sprite material
    const material = new this.three.SpriteMaterial({
      map: texture,
      transparent: true
    });
    
    // Create sprite
    const sprite = new this.three.Sprite(material);
    sprite.scale.set(2.5, 1.25, 1);
    sprite.position.y = sphere.geometry.parameters.radius + 0.5;
    
    // Add to sphere
    sphere.add(sprite);
    
    // Store for later updates
    sphere.userData.label = sprite;
  }
  
  /**
   * Add interface ports to a sphere
   * @param {Object} sphere - Three.js mesh
   * @param {Object} classObj - Class object
   * @private
   */
  addInterfacePorts(sphere, classObj) {
    // Get interfaces implemented by this class
    const interfaces = classObj.get('interfaces') || [];
    
    if (interfaces.length === 0) {
      return;
    }
    
    const radius = sphere.geometry.parameters.radius;
    const ports = [];
    
    // Create a port for each interface
    interfaces.forEach((interfaceId, index) => {
      // Calculate position on sphere surface
      const phi = Math.acos(-1 + (2 * index) / interfaces.length);
      const theta = Math.sqrt(interfaces.length * Math.PI) * phi;
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      // Create port geometry
      const portGeometry = new this.three.SphereGeometry(0.2, 16, 16);
      const portMaterial = new this.three.MeshStandardMaterial({
        color: 0xe74c3c,
        emissive: 0x7b0000,
        metalness: 0.5,
        roughness: 0.2
      });
      
      // Create port mesh
      const port = new this.three.Mesh(portGeometry, portMaterial);
      port.position.set(x, y, z);
      
      // Store metadata
      port.userData = {
        interfaceId: interfaceId,
        name: interfaceId.split(/[#\/]/).pop()
      };
      
      // Add to sphere
      sphere.add(port);
      ports.push(port);
    });
    
    // Store for later updates
    sphere.userData.ports = ports;
  }
  
  /**
   * Create relationship lines between classes
   * @private
   */
  createRelationships() {
    // For each class, check for relationships with other classes
    this.classes.forEach((sourceClass, sourceId) => {
      const sourceParents = sourceClass.get('parents') || [];
      const sourceImplements = sourceClass.get('implements') || [];
      
      // Add parent relationships (inheritance)
      sourceParents.forEach(parentId => {
        const parentSphere = this.spheres.get(parentId);
        const sourceSphere = this.spheres.get(sourceId);
        
        if (parentSphere && sourceSphere) {
          this.createRelationshipLine(sourceSphere, parentSphere, {
            type: 'inherits',
            color: 0x3498db,
            dashed: false,
            label: 'extends'
          });
        }
      });
      
      // Add interface implementation relationships
      sourceImplements.forEach(interfaceId => {
        const interfaceSphere = this.spheres.get(interfaceId);
        const sourceSphere = this.spheres.get(sourceId);
        
        if (interfaceSphere && sourceSphere) {
          this.createRelationshipLine(sourceSphere, interfaceSphere, {
            type: 'implements',
            color: 0xe74c3c,
            dashed: true,
            label: 'implements'
          });
        }
      });
      
      // Add other relationships (e.g., associations, dependencies)
      const relationships = sourceClass.get('relationships') || [];
      
      relationships.forEach(rel => {
        const targetSphere = this.spheres.get(rel.targetId);
        const sourceSphere = this.spheres.get(sourceId);
        
        if (targetSphere && sourceSphere) {
          this.createRelationshipLine(sourceSphere, targetSphere, {
            type: rel.type,
            color: 0x2ecc71,
            dashed: false,
            label: rel.name || rel.type
          });
        }
      });
    });
  }
  
  /**
   * Create a line representing a relationship between two spheres
   * @param {Object} source - Source sphere
   * @param {Object} target - Target sphere
   * @param {Object} options - Relationship options
   * @private
   */
  createRelationshipLine(source, target, options) {
    // Create a curve between the spheres
    const sourceRadius = source.geometry.parameters.radius;
    const targetRadius = target.geometry.parameters.radius;
    
    // Calculate start and end points (on sphere surfaces)
    const direction = new this.three.Vector3().subVectors(target.position, source.position).normalize();
    
    const start = new this.three.Vector3().copy(source.position).add(
      direction.clone().multiplyScalar(sourceRadius)
    );
    
    const end = new this.three.Vector3().copy(target.position).add(
      direction.clone().multiplyScalar(-targetRadius)
    );
    
    // Create points for curve with a slight arc
    const midPoint = new this.three.Vector3().lerpVectors(start, end, 0.5);
    const normal = new this.three.Vector3().crossVectors(
      new this.three.Vector3(0, 1, 0),
      direction
    ).normalize();
    
    // Add slight curve based on relationship type
    midPoint.add(normal.multiplyScalar(2));
    
    // Create a quadratic bezier curve
    const curve = new this.three.QuadraticBezierCurve3(start, midPoint, end);
    
    // Create geometry with curve
    const points = curve.getPoints(20);
    const geometry = new this.three.BufferGeometry().setFromPoints(points);
    
    // Create material
    let material;
    if (options.dashed) {
      material = new this.three.LineDashedMaterial({
        color: options.color,
        linewidth: 2,
        dashSize: 0.5,
        gapSize: 0.3
      });
    } else {
      material = new this.three.LineBasicMaterial({
        color: options.color,
        linewidth: 2
      });
    }
    
    // Create line
    const line = new this.three.Line(geometry, material);
    
    // Set line properties
    if (options.dashed) {
      line.computeLineDistances();
    }
    
    // Add relationship metadata
    line.userData = {
      type: options.type,
      sourceId: source.userData.classId,
      targetId: target.userData.classId,
      label: options.label
    };
    
    // Add label for the relationship
    this.addRelationshipLabel(line, options.label, midPoint);
    
    // Add to scene
    this.scene.add(line);
    
    // Store for later reference
    if (!source.userData.relationships) {
      source.userData.relationships = [];
    }
    source.userData.relationships.push(line);
  }
  
  /**
   * Add a label to a relationship line
   * @param {Object} line - Three.js line
   * @param {string} text - Label text
   * @param {Object} position - 3D position
   * @private
   */
  addRelationshipLabel(line, text, position) {
    // Create dynamic canvas for the label
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 64;
    
    // Draw background
    context.fillStyle = 'rgba(255, 255, 255, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw text
    context.font = '16px Arial';
    context.fillStyle = '#000000';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Create texture
    const texture = new this.three.CanvasTexture(canvas);
    
    // Create sprite material
    const material = new this.three.SpriteMaterial({
      map: texture,
      transparent: true
    });
    
    // Create sprite
    const sprite = new this.three.Sprite(material);
    sprite.scale.set(1.5, 0.75, 1);
    sprite.position.copy(position);
    
    // Add to scene
    this.scene.add(sprite);
    
    // Store for later updates
    line.userData.label = sprite;
  }
  
  /**
   * Update all sphere materials based on selection/hover state
   * @private
   */
  updateMaterials() {
    this.spheres.forEach((sphere, classId) => {
      let materialProps;
      
      if (classId === this.selectedClass) {
        materialProps = this.selectedMaterial;
      } else if (classId === this.hoveredClass) {
        materialProps = this.hoveredMaterial;
      } else {
        materialProps = this.defaultMaterial;
      }
      
      // Apply material properties
      Object.assign(sphere.material, materialProps);
      
      // Update emissive intensity for selected class
      if (classId === this.selectedClass) {
        sphere.material.emissiveIntensity = 0.5;
      } else {
        sphere.material.emissiveIntensity = 0;
      }
    });
  }
  
  /**
   * Update label orientations to face the camera
   * @param {Object} cameraPosition - Camera position
   * @private
   */
  updateLabels(cameraPosition) {
    this.spheres.forEach(sphere => {
      // Update class label
      if (sphere.userData.label) {
        sphere.userData.label.lookAt(cameraPosition);
      }
      
      // Update relationship labels
      if (sphere.userData.relationships) {
        sphere.userData.relationships.forEach(rel => {
          if (rel.userData.label) {
            rel.userData.label.lookAt(cameraPosition);
          }
        });
      }
    });
  }
  
  /**
   * Expand a class to show its internal structure
   * @param {string} classId - Class ID to expand
   * @private
   */
  expandClass(classId) {
    const sphere = this.spheres.get(classId);
    if (!sphere) {
      return;
    }
    
    // Publish event for expanding a class
    this.eventBus.publish({
      type: 'class:expand',
      data: {
        classId,
        position: sphere.position.clone(),
        radius: sphere.geometry.parameters.radius
      }
    });
  }
}
