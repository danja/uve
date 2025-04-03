/**
 * @fileoverview FOAF (Friend of a Friend) example implementation for UVE
 * @module examples/foaf
 */

/**
 * Create a FOAF dataset with 5 friends
 * @param {Object} rdf - RDF-Ext instance
 * @returns {Object} RDF-Ext dataset containing FOAF data
 */
export function createFOAFExample(rdf) {
  // Create namespaces
  const ns = {
    foaf: rdf.namespace('http://xmlns.com/foaf/0.1/'),
    rdf: rdf.namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
    rdfs: rdf.namespace('http://www.w3.org/2000/01/rdf-schema#'),
    owl: rdf.namespace('http://www.w3.org/2002/07/owl#'),
    xsd: rdf.namespace('http://www.w3.org/2001/XMLSchema#'),
    ex: rdf.namespace('http://example.org/people/')
  };

  // Define people data
  const people = [
    {
      id: 'alice',
      name: 'Alice Smith',
      email: 'alice@example.org',
      interests: ['Semantic Web', 'Artificial Intelligence', 'Rock Climbing'],
      knows: ['bob', 'charlie', 'dave']
    },
    {
      id: 'bob',
      name: 'Bob Johnson',
      email: 'bob@example.org',
      interests: ['Machine Learning', 'Photography', 'Chess'],
      knows: ['alice', 'charlie', 'eve']
    },
    {
      id: 'charlie',
      name: 'Charlie Brown',
      email: 'charlie@example.org',
      interests: ['Data Science', 'Piano', 'Hiking'],
      knows: ['alice', 'bob', 'dave']
    },
    {
      id: 'dave',
      name: 'Dave Williams',
      email: 'dave@example.org',
      interests: ['Virtual Reality', 'Guitar', 'Mountain Biking'],
      knows: ['alice', 'charlie']
    },
    {
      id: 'eve',
      name: 'Eve Davis',
      email: 'eve@example.org',
      interests: ['Cryptography', 'Painting', 'Yoga'],
      knows: ['bob']
    }
  ];

  // Create a Grapoi object for building our dataset
  const g = rdf.grapoi({ term: ns.foaf.Person });

  // Add class definitions
  g.addOut(ns.rdf.type, ns.rdfs.Class)
    .addOut(ns.rdfs.label, rdf.literal('Person'))
    .addOut(ns.rdfs.comment, rdf.literal('A person.'));

  // Add property definitions
  g.node(ns.foaf.name)
    .addOut(ns.rdf.type, ns.rdf.Property)
    .addOut(ns.rdfs.label, rdf.literal('name'))
    .addOut(ns.rdfs.comment, rdf.literal('A person\'s full name'))
    .addOut(ns.rdfs.domain, ns.foaf.Person)
    .addOut(ns.rdfs.range, ns.xsd.string);

  g.node(ns.foaf.mbox)
    .addOut(ns.rdf.type, ns.rdf.Property)
    .addOut(ns.rdfs.label, rdf.literal('email'))
    .addOut(ns.rdfs.comment, rdf.literal('A personal mailbox'))
    .addOut(ns.rdfs.domain, ns.foaf.Person)
    .addOut(ns.rdfs.range, ns.rdfs.Resource);

  g.node(ns.foaf.interest)
    .addOut(ns.rdf.type, ns.rdf.Property)
    .addOut(ns.rdfs.label, rdf.literal('interest'))
    .addOut(ns.rdfs.comment, rdf.literal('A topic of interest'))
    .addOut(ns.rdfs.domain, ns.foaf.Person)
    .addOut(ns.rdfs.range, ns.rdfs.Resource);

  g.node(ns.foaf.knows)
    .addOut(ns.rdf.type, ns.rdf.Property)
    .addOut(ns.rdfs.label, rdf.literal('knows'))
    .addOut(ns.rdfs.comment, rdf.literal('A person known by this person'))
    .addOut(ns.rdfs.domain, ns.foaf.Person)
    .addOut(ns.rdfs.range, ns.foaf.Person);

  // Add people data
  people.forEach(person => {
    // Create person node
    const personNode = g.node(ns.ex(person.id));
    
    // Add basic properties
    personNode
      .addOut(ns.rdf.type, ns.foaf.Person)
      .addOut(ns.foaf.name, rdf.literal(person.name))
      .addOut(ns.foaf.mbox, rdf.namedNode(`mailto:${person.email}`));
    
    // Add interests
    person.interests.forEach(interest => {
      const interestId = interest.toLowerCase().replace(/\s+/g, '-');
      personNode.addOut(ns.foaf.interest, ns.ex(`interest/${interestId}`));
      
      // Define interest as a topic
      g.node(ns.ex(`interest/${interestId}`))
        .addOut(ns.rdf.type, ns.foaf.Topic)
        .addOut(ns.rdfs.label, rdf.literal(interest));
    });
    
    // Add knows relationships (will be added later to avoid undefined nodes)
    person.knows.forEach(friend => {
      personNode.addOut(ns.foaf.knows, ns.ex(friend));
    });
  });

  // Return the dataset
  return g.dataset;
}

/**
 * Create a FOAF example and load it into UVE
 * @param {Object} uve - UVE application instance
 * @param {Object} rdf - RDF-Ext instance
 */
export function loadFOAFExample(uve, rdf) {
  // Create the FOAF dataset
  const dataset = createFOAFExample(rdf);
  
  // Set the dataset in the model manager
  uve.modelManager.setDataset(dataset);
  
  // Notify that data is loaded
  uve.eventBus.publish({
    type: 'rdf:loaded',
    data: {
      source: 'foaf-example',
      size: dataset.size
    }
  });
}

/**
 * Save the FOAF example to a Turtle file
 * @param {Object} rdf - RDF-Ext instance
 * @returns {Promise<string>} Promise resolving to the Turtle text
 */
export async function saveFOAFExampleToTurtle(rdf) {
  // Create the FOAF dataset
  const dataset = createFOAFExample(rdf);
  
  // Convert to Turtle
  const serializer = rdf.formats.serializers.get('text/turtle');
  
  return new Promise((resolve, reject) => {
    let turtleText = '';
    const output = new rdf.StreamSink({
      write: (chunk) => {
        turtleText += chunk;
      }
    });
    
    serializer.import(dataset.toStream())
      .pipe(output)
      .on('end', () => resolve(turtleText))
      .on('error', reject);
  });
}

/**
 * Create a 3D visualization for the FOAF data
 * @param {Object} uve - UVE application instance
 * @param {HTMLElement} container - DOM container for rendering
 */
export function visualizeFOAF(uve, container) {
  // Initialize UVE with the container
  uve.initialize(container);
  
  // Load the FOAF example
  loadFOAFExample(uve, uve.rdf);
}
