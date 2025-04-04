/**
 * Main application for UVE
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Import UVE components
import './uve-core.js';
import './foaf-example.js';

// Make THREE and OrbitControls available globally
window.THREE = THREE;
window.OrbitControls = OrbitControls;

document.addEventListener('DOMContentLoaded', function () {
    // Get container element
    const container = document.getElementById('container');

    // Create UVE application
    const app = new UVE.UVEApp({
        three: THREE // Pass Three.js instance
    });

    // Initialize the application
    app.initialize(container);

    // Set up button to load FOAF example
    const loadFOAFButton = document.getElementById('loadFOAF');
    loadFOAFButton.addEventListener('click', function () {
        UVE.FOAF.loadFOAFExample(app);
    });

    // Load FOAF example automatically
    UVE.FOAF.loadFOAFExample(app);

    // Log a message to console
    console.log('UVE application initialized');
});