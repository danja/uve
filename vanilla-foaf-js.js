/**
 * FOAF (Friend of a Friend) example implementation for UVE
 * Vanilla JavaScript version
 */

// Add to UVE namespace
window.UVE = window.UVE || {};

// FOAF example module
UVE.FOAF = {};

/**
 * Create a FOAF dataset with 5 friends
 * @returns {Object} Dataset containing FOAF data
 */
UVE.FOAF.createFOAFExample = function() {
  // Define people data
  const people = [
    {
      id: 'alice',
      label: 'Alice Smith',
      email: 'alice@example.org',
      interests: ['Semantic Web', 'Artificial Intelligence', 'Rock Climbing'],
      knows: ['bob', 'charlie', 'dave']
    },
    {
      id: 'bob',
      label: 'Bob Johnson',
      email: 'bob@example.org',
      interests: ['Machine Learning', 'Photography', 'Chess'],
      knows: ['alice', 'charlie', 'eve']
    },
    {
      id: 'charlie',
      label: 'Charlie Brown',
      email: 'charlie@example.org',
      interests: ['Data Science', 'Piano', 'Hiking'],
      knows: ['alice', 'bob', 'dave']
    },
    {
      id: 'dave',
      label: 'Dave Williams',
      email: 'dave@example.org',
      interests: ['Virtual Reality', 'Guitar', 'Mountain Biking'],
      knows: ['alice', 'charlie']
    },
    {
      id: 'eve',
      label: 'Eve Davis',
      email: 'eve@example.org',
      interests: ['Cryptography', 'Painting', 'Yoga'],
      knows: ['bob']
    }
  ];

  // Create a class for Person
  const personClass = {
    id: 'Person',
    label: 'Person',
    type: 'class',
    description: 'A person in the FOAF network',
    properties: ['name', 'email', 'knows', 'interests']
  };

  // Create relationship types
  const relationships = [];
  
  // Process people and create relationships
  people.forEach(person => {
    person.type = 'Person';
    person.uri = `http://example.org/people/${person.id}`;
    
    // Add knows relationships
    person.knows.forEach(friendId => {
      relationships.push({
        source: person.id,
        target: friendId,
        type: 'knows',
        label: 'knows'
      });
    });
  });
  
  return {
    classes: [personClass, ...people],
    relationships: relationships
  };
};

/**
 * Load the FOAF example into UVE
 * @param {UVE.UVEApp} app - UVE application instance
 */
UVE.FOAF.loadFOAFExample = function(app) {
  // Create the FOAF dataset
  const dataset = UVE.FOAF.createFOAFExample();
  
  // Load it into the model manager
  app.modelManager.loadData(dataset);
  
  // Create spheres for each person
  UVE.FOAF.createPersonSpheres(app, dataset);
  
  // Notify that data has been loaded
  app.eventBus.publish(new UVE.UVEEvent('rdf:loaded', {
    source: 'foaf-example',
    size: dataset.classes.length
  }));
};

/**
 * Create 3D spheres for people in the FOAF example
 * @param {UVE.UVEApp} app - UVE application instance
 * @param {Object} dataset - The FOAF dataset
 */
UVE.FOAF.createPersonSpheres = function(app, dataset) {
  // Filter for only person instances (not the class definition)
  const people = dataset.classes.filter(item => item.type === 'Person');
  
  // Color palette for spheres
  const colors = [0x3498db, 0xe74c3c, 0x2ecc71, 0xf39c12, 0x9b59b6];
  
  // Create a sphere for each person
  people.forEach((person, index) => {
    // Calculate position in a circle
    const angle = (index / people.length) * Math.PI * 2;
    const radius = 8;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    // Create geometry
    const geometry = new THREE.SphereGeometry(1.5, 32, 32);
    
    // Create material with unique color
    const material = new THREE.MeshStandardMaterial({
      color: colors[index % colors.length],
      transparent: true,
      opacity: 0.8,
      metalness: 0.2,
      roughness: 0.5
    });
    
    // Create mesh
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(x, 0, z);
    
    // Store metadata
    sphere.userData = {
      personId: person.id,
      name: person.label,
      email: person.email,
      interests: person.interests
    };
    
    // Add to scene
    app.scene.add(sphere);
    
    // Add label above the sphere
    UVE.FOAF.addPersonLabel(app, sphere, person.label);
  });
  
  // Create relationship lines
  UVE.FOAF.createRelationshipLines(app, dataset);
};

/**
 * Add a text label above a person sphere
 * @param {UVE.UVEApp} app - UVE application instance
 * @param {THREE.Mesh} sphere - The person's sphere
 * @param {string} name - Person's name
 */
UVE.FOAF.addPersonLabel = function(app, sphere, name) {
  // Create canvas for text
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 128;
  
  // Fill background
  context.fillStyle = 'rgba(255, 255, 255, 0.8)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add text
  context.font = 'bold 24px Arial';
  context.fillStyle = '#000000';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(name, canvas.width / 2, canvas.height / 2);
  
  // Create texture
  const texture = new THREE.CanvasTexture(canvas);
  
  // Create sprite material
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true
  });
  
  // Create sprite
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.5, 1.25, 1);
  sprite.position.y = 2.5; // Position above sphere
  
  // Add to sphere
  sphere.add(sprite);
};

/**
 * Create relationship lines between people
 * @param {UVE.UVEApp} app - UVE application instance
 * @param {Object} dataset - The FOAF dataset
 */
UVE.FOAF.createRelationshipLines = function(app, dataset) {
  // Find all sphere objects in the scene
  const spheres = {};
  app.scene.children.forEach(child => {
    if (child.type === 'Mesh' && child.geometry.type === 'SphereGeometry' && child.userData.personId) {
      spheres[child.userData.personId] = child;
    }
  });
  
  // Create a line for each relationship
  dataset.relationships.forEach(rel => {
    const sourceSphere = spheres[rel.source];
    const targetSphere = spheres[rel.target];
    
    if (sourceSphere && targetSphere) {
      // Create points for the line
      const sourcePos = sourceSphere.position.clone();
      const targetPos = targetSphere.position.clone();
      
      // Create geometry
      const geometry = new THREE.BufferGeometry().setFromPoints([sourcePos, targetPos]);
      
      // Create material
      const material = new THREE.LineBasicMaterial({
        color: 0x999999,
        linewidth: 1
      });
      
      // Create line
      const line = new THREE.Line(geometry, material);
      
      // Add to scene
      app.scene.add(line);
    }
  });
};
