/**
 * UVE core architecture implementation
 * Vanilla JavaScript version
 */

// Create a namespace for UVE
window.UVE = window.UVE || {};

// Base class for all UVE event types
UVE.UVEEvent = class {
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
};

// Event bus for UVE system-wide messaging
UVE.EventBus = class {
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
};

// Base class for all model objects
UVE.ModelObject = class {
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
     */
    set(key, value) {
        const oldValue = this.get(key);
        this.properties.set(key, value);

        this.eventBus.publish(new UVE.UVEEvent('model:property:change', {
            modelId: this.id,
            property: key,
            oldValue,
            newValue: value
        }));
    }
};

// Simple RDF Model Manager (placeholder implementation)
UVE.RDFModelManager = class {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.classMap = new Map();
    }

    loadData(data) {
        // In a real implementation, this would parse RDF data
        // For now, we'll just store it directly

        if (data.classes) {
            data.classes.forEach(classData => {
                const modelObj = new UVE.ModelObject(this.eventBus, classData.id);
                Object.entries(classData).forEach(([key, value]) => {
                    modelObj.set(key, value);
                });

                this.classMap.set(classData.id, modelObj);
            });

            // Notify that classes have been loaded
            this.eventBus.publish(new UVE.UVEEvent('rdf:classes:extracted', {
                count: this.classMap.size,
                modelManager: this
            }));
        }
    }

    getClasses() {
        return Array.from(this.classMap.values());
    }
};

// Main UVE application
UVE.UVEApp = class {
    /**
     * Create the UVE application
     * @param {Object} config - Configuration options
     */
    constructor(config = {}) {
        this.config = config;
        this.eventBus = new UVE.EventBus();
        this.three = config.three || THREE;
        this.modelManager = new UVE.RDFModelManager(this.eventBus);
        this.views = [];
        this.objects = new Map();
    }

    /**
     * Initialize the application
     * @param {HTMLElement} container - DOM container for Three.js
     */
    initialize(container) {
        // Create scene
        this.scene = new this.three.Scene();
        this.scene.background = new this.three.Color(0xf0f0f0);

        // Create camera
        this.camera = new this.three.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.z = 10;

        // Create renderer
        this.renderer = new this.three.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(this.renderer.domElement);

        // Add orbit controls - using the globally available OrbitControls
        this.controls = new OrbitControls(
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

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        };

        animate();

        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = container.clientWidth / container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(container.clientWidth, container.clientHeight);
        });
    }

    /**
     * Clear all objects from the scene
     */
    clearScene() {
        // Remove all spheres and lines (but keep lights and camera)
        for (let i = this.scene.children.length - 1; i >= 0; i--) {
            const obj = this.scene.children[i];
            if (obj.type === 'Mesh' || obj.type === 'Line' || obj.type === 'Sprite') {
                this.scene.remove(obj);
            }
        }
        this.objects.clear();
    }
};