/**
 * Main UVE application entry point
 * @module app
 */

import log from 'loglevel';
import eventBus from './core/eventBus.js';
import config from './core/config.js';
import RDFModel from './model/rdfModel.js';
import ConceptModel from './model/conceptModel.js';
import ThreeView from './view/threeView/threeView.js';
import RDFFileView from './view/rdfView/rdfFileView.js';
import createFOAFExample from './examples/foafExample.js';

/**
 * Main application class
 */
class App {
  /**
   * Create UVE application
   */
  constructor() {
    // Configure logging
    log.setLevel(config.system.logLevel);
    this.log = log.getLogger('App');
    
    // Initialize model
    this.initModel();
    
    // Initialize views
    this.initViews();
    
    // Load example data
    this.loadExampleData();
    
    // Subscribe to events
    this.setupEvents();
    
    this.log.info('UVE application initialized');
  }
  
  /**
   * Initialize the data model
   */
  initModel() {
    this.log.debug('Initializing model');
    
    // Create RDF model
    this.rdfModel = new RDFModel();
    
    // Create concept model
    this.conceptModel = new ConceptModel(this.rdfModel);
  }
  
  /**
   * Initialize the views
   */
  initViews() {
    this.log.debug('Initializing views');
    
    // Find view containers
    const threeViewContainer = document.getElementById('three-view-container');
    const rdfViewContainer = document.getElementById('rdf-view-container');
    
    if (!threeViewContainer || !rdfViewContainer) {
      this.log.error('View containers not found in DOM');
      throw new Error('View containers not found');
    }
    
    // Create Three.js view
    this.threeView = new ThreeView(this.conceptModel, threeViewContainer);
    
    // Create RDF file view
    this.rdfView = new RDFFileView(this.rdfModel, rdfViewContainer);
  }
  
  /**
   * Load example data
   */
  loadExampleData() {
    this.log.info('Loading example FOAF data');
    
    try {
      // Create FOAF example dataset
      const dataset = createFOAFExample();
      
      // Add to RDF model
      this.rdfModel.dataset.deleteMatches();
      this.rdfModel.dataset.addAll(dataset);
      
      // Notify of change
      eventBus.publish('rdf-model-changed', { source: 'example' });
      
      this.log.info(`Loaded ${dataset.size} triples from FOAF example`);
    } catch (error) {
      this.log.error('Failed to load example data:', error);
    }
  }
  
  /**
   * Set up event handlers
   */
  setupEvents() {
    // Handle class enter/exit
    eventBus.subscribe('object-selected', data => {
      if (data.type === 'class' && data.entity.subclasses.length > 0) {
        // If the class has subclasses, show an "Enter Class" button
        this.showEnterClassButton(data.uri, data.entity.label);
      } else {
        this.hideEnterClassButton();
      }
    });
    
    eventBus.subscribe('object-deselected', () => {
      this.hideEnterClassButton();
    });
    
    // Create and add enter class button to DOM (hidden initially)
    this.enterClassButton = document.createElement('button');
    this.enterClassButton.id = 'enter-class-button';
    this.enterClassButton.className = 'enter-class-button hidden';
    this.enterClassButton.textContent = 'Enter Class';
    document.body.appendChild(this.enterClassButton);
    
    // Create and add exit class button to DOM (hidden initially)
    this.exitClassButton = document.createElement('button');
    this.exitClassButton.id = 'exit-class-button';
    this.exitClassButton.className = 'exit-class-button hidden';
    this.exitClassButton.textContent = 'Exit Class';
    this.exitClassButton.addEventListener('click', () => {
      this.threeView.exitClass();
      this.exitClassButton.classList.add('hidden');
    });
    document.body.appendChild(this.exitClassButton);
  }
  
  /**
   * Show the enter class button for a specific class
   * @param {string} classUri - URI of the class
   * @param {string} label - Label of the class
   */
  showEnterClassButton(classUri, label) {
    this.enterClassButton.textContent = `Enter ${label}`;
    this.enterClassButton.classList.remove('hidden');
    
    // Remove any existing click event
    const newButton = this.enterClassButton.cloneNode(true);
    this.enterClassButton.parentNode.replaceChild(newButton, this.enterClassButton);
    this.enterClassButton = newButton;
    
    // Add click event for this specific class
    this.enterClassButton.addEventListener('click', () => {
      this.threeView.enterClass(classUri);
      this.enterClassButton.classList.add('hidden');
      this.exitClassButton.classList.remove('hidden');
    });
  }
  
  /**
   * Hide the enter class button
   */
  hideEnterClassButton() {
    this.enterClassButton.classList.add('hidden');
  }
}

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});

export default App;
