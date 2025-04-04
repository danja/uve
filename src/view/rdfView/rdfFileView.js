/**
 * RDFFileView provides a view for RDF data in Turtle syntax
 * @module view/rdfView/rdfFileView
 */

import log from 'loglevel';
import formatsPretty from '@rdfjs/formats/pretty.js';
import rdf from 'rdf-ext';
import eventBus from '../../core/eventBus.js';
import storageManager from '../../util/storageManager.js';

class RDFFileView {
  /**
   * Create a new RDFFileView
   * @param {RDFModel} rdfModel - RDF data model
   * @param {HTMLElement} container - DOM element to render into
   */
  constructor(rdfModel, container) {
    this.rdfModel = rdfModel;
    this.container = container;
    this.log = log.getLogger('RDFFileView');

    // Setup pretty formatters
    this.prettyRdf = rdf.clone();
    this.prettyRdf.formats.import(formatsPretty);

    // Create editor elements
    this.createEditor();

    // Subscribe to RDF model changes
    eventBus.subscribe('rdf-model-changed', data => this.updateView(data));
  }

  /**
   * Create the editor elements
   */
  createEditor() {
    // Create toolbar
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'rdf-view-toolbar';
    this.container.appendChild(this.toolbar);

    // Create load button
    this.loadButton = document.createElement('button');
    this.loadButton.textContent = 'Load';
    this.loadButton.addEventListener('click', () => this.loadFromFile());
    this.toolbar.appendChild(this.loadButton);

    // Create save button
    this.saveButton = document.createElement('button');
    this.saveButton.textContent = 'Save';
    this.saveButton.addEventListener('click', () => this.saveToFile());
    this.toolbar.appendChild(this.saveButton);

    // Create format selector
    this.formatSelector = document.createElement('select');

    const formats = [
      { value: 'text/turtle', label: 'Turtle' },
      { value: 'application/n-triples', label: 'N-Triples' },
      { value: 'application/n-quads', label: 'N-Quads' },
      { value: 'application/trig', label: 'TriG' },
      { value: 'application/ld+json', label: 'JSON-LD' }
    ];

    formats.forEach(format => {
      const option = document.createElement('option');
      option.value = format.value;
      option.textContent = format.label;
      this.formatSelector.appendChild(option);
    });

    this.formatSelector.addEventListener('change', () => this.updateView());
    this.toolbar.appendChild(this.formatSelector);

    // Create editor element
    this.editor = document.createElement('textarea');
    this.editor.className = 'rdf-view-editor';
    this.editor.spellcheck = false;
    this.container.appendChild(this.editor);

    // Create status bar
    this.statusBar = document.createElement('div');
    this.statusBar.className = 'rdf-view-status';
    this.container.appendChild(this.statusBar);

    // Apply button - to apply changes from editor to model
    this.applyButton = document.createElement('button');
    this.applyButton.textContent = 'Apply Changes';
    this.applyButton.addEventListener('click', () => this.applyChanges());
    this.statusBar.appendChild(this.applyButton);

    // Triple count
    this.tripleCount = document.createElement('span');
    this.tripleCount.className = 'rdf-view-count';
    this.statusBar.appendChild(this.tripleCount);
  }

  /**
   * Update the view with the current RDF model
   * @param {Object} [data] - Change data from event
   */
  async updateView(data) {
    this.log.debug('Updating RDF view', data);

    try {
      // Get selected format
      const format = this.formatSelector.value;

      // Serialize dataset to text
      const serialized = await this.prettyRdf.io.dataset.toText(format, this.rdfModel.dataset);

      // Update editor
      this.editor.value = serialized;

      // Update triple count
      this.tripleCount.textContent = `${this.rdfModel.dataset.size} triples`;
    } catch (error) {
      this.log.error('Error updating RDF view:', error);
      this.showError('Error updating view: ' + error.message);
    }
  }

  /**
   * Apply changes from editor to model
   */
  async applyChanges() {
    try {
      // Get text from editor
      const text = this.editor.value;

      // Get selected format
      const format = this.formatSelector.value;

      // Parse text to dataset
      const dataset = await this.prettyRdf.io.dataset.fromText(format, text);

      // Clear existing dataset and add new triples
      this.rdfModel.dataset.deleteMatches();
      this.rdfModel.dataset.addAll(dataset);

      // Notify change
      eventBus.publish('rdf-model-changed', { source: 'editor' });

      this.log.info(`Applied changes: ${dataset.size} triples`);
      this.showSuccess(`Applied ${dataset.size} triples`);
    } catch (error) {
      this.log.error('Error applying changes:', error);
      this.showError('Error applying changes: ' + error.message);
    }
  }

  /**
   * Load RDF data from a file
   */
  loadFromFile() {
    // Create file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.ttl,.nt,.nq,.trig,.jsonld,.json';

    // Handle file selection
    fileInput.addEventListener('change', async event => {
      const file = event.target.files[0];

      if (!file) return;

      try {
        // Determine format from file extension
        const format = this.getFormatFromFileName(file.name);

        // Read file content
        const text = await this.readFileAsText(file);

        // Parse text to dataset
        const dataset = await this.prettyRdf.io.dataset.fromText(format, text);

        // Store in localStorage for persistence
        const storageId = `rdf-file-${file.name}`;
        await storageManager.writeFile(storageId, text);

        // Clear existing dataset and add new triples
        this.rdfModel.dataset.deleteMatches();
        this.rdfModel.dataset.addAll(dataset);

        // Notify change
        eventBus.publish('rdf-model-changed', { source: 'file', path: file.name });

        this.log.info(`Loaded ${dataset.size} triples from ${file.name}`);
        this.showSuccess(`Loaded ${dataset.size} triples from ${file.name}`);

        // Select matching format in dropdown
        for (let i = 0; i < this.formatSelector.options.length; i++) {
          if (this.formatSelector.options[i].value === format) {
            this.formatSelector.selectedIndex = i;
            break;
          }
        }
      } catch (error) {
        this.log.error(`Error loading file ${file.name}:`, error);
        this.showError(`Error loading file: ${error.message}`);
      }
    });

    // Trigger file selection
    fileInput.click();
  }

  /**
   * Save RDF data to a file
   */
  async saveToFile() {
    try {
      // Get selected format
      const format = this.formatSelector.value;

      // Get file extension for the format
      const extension = this.getFileExtensionForFormat(format);

      // Serialize dataset to text
      const serialized = await this.prettyRdf.io.dataset.toText(format, this.rdfModel.dataset);

      // Store in storage manager
      const filename = `model${extension}`;
      const storageId = `rdf-file-${filename}`;
      await storageManager.writeFile(storageId, serialized);

      // For browser download, create a blob URL
      const blob = new Blob([serialized], { type: format });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);

      this.log.info(`Saved ${this.rdfModel.dataset.size} triples to ${filename}`);
      this.showSuccess(`Saved ${this.rdfModel.dataset.size} triples to ${filename}`);
    } catch (error) {
      this.log.error('Error saving file:', error);
      this.showError('Error saving file: ' + error.message);
    }
  }

  /**
   * Read a file as text
   * @param {File} file - File to read
   * @returns {Promise<string>} File contents as text
   */
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = event => {
        resolve(event.target.result);
      };

      reader.onerror = error => {
        reject(error);
      };

      reader.readAsText(file);
    });
  }

  /**
   * Get format from file name
   * @param {string} fileName - File name
   * @returns {string} MIME type for the file
   */
  getFormatFromFileName(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();

    const formatMap = {
      ttl: 'text/turtle',
      nt: 'application/n-triples',
      nq: 'application/n-quads',
      trig: 'application/trig',
      jsonld: 'application/ld+json',
      json: 'application/ld+json'
    };

    return formatMap[extension] || 'text/turtle';
  }

  /**
   * Get file extension for format
   * @param {string} format - MIME type
   * @returns {string} File extension for the format
   */
  getFileExtensionForFormat(format) {
    const extensionMap = {
      'text/turtle': '.ttl',
      'application/n-triples': '.nt',
      'application/n-quads': '.nq',
      'application/trig': '.trig',
      'application/ld+json': '.jsonld'
    };

    return extensionMap[format] || '.ttl';
  }

  /**
   * Show a success message
   * @param {string} message - Success message
   */
  showSuccess(message) {
    this.statusBar.className = 'rdf-view-status success';
    this.statusBar.setAttribute('data-message', message);

    // Reset after 3 seconds
    setTimeout(() => {
      this.statusBar.className = 'rdf-view-status';
    }, 3000);
  }

  /**
   * Show an error message
   * @param {string} message - Error message
   */
  showError(message) {
    this.statusBar.className = 'rdf-view-status error';
    this.statusBar.setAttribute('data-message', message);

    // Reset after 5 seconds
    setTimeout(() => {
      this.statusBar.className = 'rdf-view-status';
    }, 5000);
  }
}

export default RDFFileView;