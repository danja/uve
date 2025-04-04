/**
 * FOAF (Friend of a Friend) example data
 * Creates a set of 5 friends with relationships
 * @module examples/foafExample
 */

import rdf from 'rdf-ext';
import storageManager from '../util/storageManager.js';

// Add debugging
console.log('foafExample.js loading');

/**
 * Create a FOAF example dataset with 5 friends
 * @returns {Dataset} RDF dataset with FOAF data
 */
export function createFOAFExample() {
  console.log('Creating FOAF example dataset');
  const dataset = rdf.dataset();

  // Define namespaces
  const ns = {
    rdf: rdf.namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
    rdfs: rdf.namespace('http://www.w3.org/2000/01/rdf-schema#'),
    foaf: rdf.namespace('http://xmlns.com/foaf/0.1/'),
    xsd: rdf.namespace('http://www.w3.org/2001/XMLSchema#'),
    ex: rdf.namespace('http://example.org/'),
    uve: rdf.namespace('http://uve.example.org/ns#')
  };

  // Define FOAF classes
  dataset.add(rdf.quad(ns.foaf.Person, ns.rdf.type, ns.rdfs.Class));
  dataset.add(rdf.quad(ns.foaf.Person, ns.rdfs.label, rdf.literal('Person')));

  dataset.add(rdf.quad(ns.foaf.Group, ns.rdf.type, ns.rdfs.Class));
  dataset.add(rdf.quad(ns.foaf.Group, ns.rdfs.label, rdf.literal('Group')));

  dataset.add(rdf.quad(ns.foaf.Organization, ns.rdf.type, ns.rdfs.Class));
  dataset.add(rdf.quad(ns.foaf.Organization, ns.rdfs.label, rdf.literal('Organization')));

  // Add interface to Person
  dataset.add(rdf.quad(ns.ex.Identifiable, ns.rdf.type, ns.uve.Interface));
  dataset.add(rdf.quad(ns.ex.Identifiable, ns.rdfs.label, rdf.literal('Identifiable')));
  dataset.add(rdf.quad(ns.foaf.Person, ns.uve.hasInterface, ns.ex.Identifiable));

  // Add methods to the interface
  const getIdMethod = rdf.blankNode();
  dataset.add(rdf.quad(ns.ex.Identifiable, ns.uve.hasMethod, getIdMethod));
  dataset.add(rdf.quad(getIdMethod, ns.rdfs.label, rdf.literal('getId')));
  dataset.add(rdf.quad(getIdMethod, ns.uve.hasReturnType, rdf.literal('string')));

  // Add Social interface to Person
  dataset.add(rdf.quad(ns.ex.Social, ns.rdf.type, ns.uve.Interface));
  dataset.add(rdf.quad(ns.ex.Social, ns.rdfs.label, rdf.literal('Social')));
  dataset.add(rdf.quad(ns.foaf.Person, ns.uve.hasInterface, ns.ex.Social));

  // Add methods to the Social interface
  const addFriendMethod = rdf.blankNode();
  dataset.add(rdf.quad(ns.ex.Social, ns.uve.hasMethod, addFriendMethod));
  dataset.add(rdf.quad(addFriendMethod, ns.rdfs.label, rdf.literal('addFriend')));
  dataset.add(rdf.quad(addFriendMethod, ns.uve.hasReturnType, rdf.literal('void')));

  const friendParam = rdf.blankNode();
  dataset.add(rdf.quad(addFriendMethod, ns.uve.hasParameter, friendParam));
  dataset.add(rdf.quad(friendParam, ns.rdfs.label, rdf.literal('friend')));
  dataset.add(rdf.quad(friendParam, ns.uve.hasType, rdf.literal('Person')));

  // Define FOAF properties
  dataset.add(rdf.quad(ns.foaf.name, ns.rdf.type, ns.rdf.Property));
  dataset.add(rdf.quad(ns.foaf.name, ns.rdfs.label, rdf.literal('name')));
  dataset.add(rdf.quad(ns.foaf.name, ns.rdfs.domain, ns.foaf.Person));
  dataset.add(rdf.quad(ns.foaf.name, ns.rdfs.range, ns.xsd.string));

  dataset.add(rdf.quad(ns.foaf.mbox, ns.rdf.type, ns.rdf.Property));
  dataset.add(rdf.quad(ns.foaf.mbox, ns.rdfs.label, rdf.literal('email')));
  dataset.add(rdf.quad(ns.foaf.mbox, ns.rdfs.domain, ns.foaf.Person));
  dataset.add(rdf.quad(ns.foaf.mbox, ns.rdfs.range, ns.xsd.string));

  dataset.add(rdf.quad(ns.foaf.knows, ns.rdf.type, ns.rdf.Property));
  dataset.add(rdf.quad(ns.foaf.knows, ns.rdfs.label, rdf.literal('knows')));
  dataset.add(rdf.quad(ns.foaf.knows, ns.rdfs.domain, ns.foaf.Person));
  dataset.add(rdf.quad(ns.foaf.knows, ns.rdfs.range, ns.foaf.Person));

  dataset.add(rdf.quad(ns.foaf.member, ns.rdf.type, ns.rdf.Property));
  dataset.add(rdf.quad(ns.foaf.member, ns.rdfs.label, rdf.literal('member')));
  dataset.add(rdf.quad(ns.foaf.member, ns.rdfs.domain, ns.foaf.Group));
  dataset.add(rdf.quad(ns.foaf.member, ns.rdfs.range, ns.foaf.Person));

  // Create 5 friends
  const friends = [
    {
      uri: ns.ex('alice'),
      name: 'Alice',
      email: 'alice@example.org'
    },
    {
      uri: ns.ex('bob'),
      name: 'Bob',
      email: 'bob@example.org'
    },
    {
      uri: ns.ex('charlie'),
      name: 'Charlie',
      email: 'charlie@example.org'
    },
    {
      uri: ns.ex('diana'),
      name: 'Diana',
      email: 'diana@example.org'
    },
    {
      uri: ns.ex('eve'),
      name: 'Eve',
      email: 'eve@example.org'
    }
  ];

  // Add friend data to dataset
  friends.forEach(friend => {
    dataset.add(rdf.quad(friend.uri, ns.rdf.type, ns.foaf.Person));
    dataset.add(rdf.quad(friend.uri, ns.foaf.name, rdf.literal(friend.name)));
    dataset.add(rdf.quad(friend.uri, ns.foaf.mbox, rdf.literal(friend.email)));
  });

  // Create friendships (not all combinations, just some examples)
  // Alice knows Bob and Charlie
  dataset.add(rdf.quad(ns.ex('alice'), ns.foaf.knows, ns.ex('bob')));
  dataset.add(rdf.quad(ns.ex('alice'), ns.foaf.knows, ns.ex('charlie')));

  // Bob knows Alice and Diana
  dataset.add(rdf.quad(ns.ex('bob'), ns.foaf.knows, ns.ex('alice')));
  dataset.add(rdf.quad(ns.ex('bob'), ns.foaf.knows, ns.ex('diana')));

  // Charlie knows Alice and Eve
  dataset.add(rdf.quad(ns.ex('charlie'), ns.foaf.knows, ns.ex('alice')));
  dataset.add(rdf.quad(ns.ex('charlie'), ns.foaf.knows, ns.ex('eve')));

  // Diana knows Bob and Eve
  dataset.add(rdf.quad(ns.ex('diana'), ns.foaf.knows, ns.ex('bob')));
  dataset.add(rdf.quad(ns.ex('diana'), ns.foaf.knows, ns.ex('eve')));

  // Eve knows Charlie and Diana
  dataset.add(rdf.quad(ns.ex('eve'), ns.foaf.knows, ns.ex('charlie')));
  dataset.add(rdf.quad(ns.ex('eve'), ns.foaf.knows, ns.ex('diana')));

  // Create a group
  dataset.add(rdf.quad(ns.ex('friends-group'), ns.rdf.type, ns.foaf.Group));
  dataset.add(rdf.quad(ns.ex('friends-group'), ns.foaf.name, rdf.literal('Friends Group')));

  // Add all friends to the group
  friends.forEach(friend => {
    dataset.add(rdf.quad(ns.ex('friends-group'), ns.foaf.member, friend.uri));
  });

  // Save this dataset to storage for later retrieval
  saveFOAFExample(dataset);

  console.log(`FOAF example dataset created with ${dataset.size} triples`);
  return dataset;
}

/**
 * Save FOAF example dataset to storage
 * @param {Dataset} dataset - The dataset to save
 */
async function saveFOAFExample(dataset) {
  try {
    // Create a serializer for Turtle format
    const serializer = new rdf.formats.serializers.TurtleSerializer();
    const turtleData = await serializer.serialize(dataset);

    // Save to storage
    await storageManager.writeFile('examples/foaf.ttl', turtleData);
    console.log('FOAF example saved to storage');
  } catch (error) {
    console.error('Error saving FOAF example:', error);
  }
}

/**
 * Load FOAF example dataset from storage
 * @returns {Promise<Dataset>} The loaded dataset
 */
export async function loadFOAFExample() {
  console.log('Attempting to load FOAF example from storage');
  try {
    // Check if example exists in storage
    const exists = await storageManager.exists('examples/foaf.ttl');
    console.log('FOAF example exists in storage:', exists);

    if (exists) {
      // Load from storage
      const turtleData = await storageManager.readFile('examples/foaf.ttl', { encoding: 'utf8' });
      console.log('FOAF data loaded from storage, parsing...');

      // Parse the Turtle data
      const parser = new rdf.formats.parsers.TurtleParser();
      const dataset = await parser.parse(turtleData);
      console.log(`FOAF dataset parsed with ${dataset.size} triples`);
      return dataset;
    } else {
      // Create new example if not found
      console.log('FOAF example not found in storage, creating new one');
      return createFOAFExample();
    }
  } catch (error) {
    console.error('Error loading FOAF example:', error);
    // Fall back to creating a new example
    console.log('Falling back to creating a new FOAF example');
    return createFOAFExample();
  }
}

// Also provide a default export for backward compatibility
export default createFOAFExample;