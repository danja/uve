/**
 * First-person controls for navigating the 3D space
 * @module view/threeView/controls
 */

import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import config from '../../../core/config.js';
import eventBus from '../../../core/eventBus.js';

class Controls {
  /**
   * Create first-person controls
   * @param {THREE.Camera} camera - THREE.js camera
   * @param {HTMLElement} domElement - DOM element for pointer lock
   */
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    
    // Create controls
    this.controls = new PointerLockControls(camera, domElement);
    
    // Set up movement
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.moveUp = false;
    this.moveDown = false;
    
    // Set up movement speed
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.movementSpeed = config.visualization.controls.movementSpeed;
    
    // Set up keyboard event handlers
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    
    // Set up click handler for locking controls
    this.onClick = this.onClick.bind(this);
    
    // Lock/unlock handler
    this.onLockChange = this.onLockChange.bind(this);
    
    // Set up event listeners
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    this.domElement.addEventListener('click', this.onClick);
    document.addEventListener('pointerlockchange', this.onLockChange);
    
    // Raycast for interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    // Setup mouse move handler for raycasting
    this.onMouseMove = this.onMouseMove.bind(this);
    document.addEventListener('mousemove', this.onMouseMove);
    
    // Track intersection objects
    this.intersectedObject = null;
    
    // Click handling for object interaction
    this.onObjectClick = this.onObjectClick.bind(this);
    document.addEventListener('click', this.onObjectClick);
    
    // Keep track of selected object
    this.selectedObject = null;
  }
  
  /**
   * Handle key down events
   * @param {KeyboardEvent} event - Key down event
   */
  onKeyDown(event) {
    // Only handle events when controls are locked
    if (!this.controls.isLocked) return;
    
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.moveForward = true;
        break;
        
      case 'ArrowLeft':
      case 'KeyA':
        this.moveLeft = true;
        break;
        
      case 'ArrowDown':
      case 'KeyS':
        this.moveBackward = true;
        break;
        
      case 'ArrowRight':
      case 'KeyD':
        this.moveRight = true;
        break;
        
      case 'KeyQ':
        this.moveDown = true;
        break;
        
      case 'KeyE':
        this.moveUp = true;
        break;
    }
  }
  
  /**
   * Handle key up events
   * @param {KeyboardEvent} event - Key up event
   */
  onKeyUp(event) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.moveForward = false;
        break;
        
      case 'ArrowLeft':
      case 'KeyA':
        this.moveLeft = false;
        break;
        
      case 'ArrowDown':
      case 'KeyS':
        this.moveBackward = false;
        break;
        
      case 'ArrowRight':
      case 'KeyD':
        this.moveRight = false;
        break;
        
      case 'KeyQ':
        this.moveDown = false;
        break;
        
      case 'KeyE':
        this.moveUp = false;
        break;
    }
  }
  
  /**
   * Handle click events for locking controls
   */
  onClick() {
    if (!this.controls.isLocked) {
      this.controls.lock();
    }
  }
  
  /**
   * Handle pointer lock change
   */
  onLockChange() {
    if (document.pointerLockElement === this.domElement) {
      eventBus.publish('controls-locked', true);
    } else {
      eventBus.publish('controls-locked', false);
    }
  }
  
  /**
   * Handle mouse move events for raycasting
   * @param {MouseEvent} event - Mouse move event
   */
  onMouseMove(event) {
    // Only perform raycasting when controls are not locked
    if (this.controls.isLocked) return;
    
    // Calculate mouse position in normalized device coordinates
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }
  
  /**
   * Handle click events for object interaction
   * @param {MouseEvent} event - Click event
   */
  onObjectClick(event) {
    // Only handle clicks when controls are not locked
    if (this.controls.isLocked) return;
    
    // If we have an intersected object, handle the click
    if (this.intersectedObject) {
      const userData = this.intersectedObject.userData;
      
      // Clear previous selection if any
      if (this.selectedObject) {
        // Publish deselection event
        eventBus.publish('object-deselected', {
          type: this.selectedObject.userData.type,
          uri: this.selectedObject.userData.uri
        });
        
        this.selectedObject = null;
      }
      
      // Set new selection
      this.selectedObject = this.intersectedObject;
      
      // Publish selection event
      eventBus.publish('object-selected', {
        type: userData.type,
        uri: userData.uri,
        entity: userData.entity
      });
    } else {
      // Click on empty space - clear selection
      if (this.selectedObject) {
        // Publish deselection event
        eventBus.publish('object-deselected', {
          type: this.selectedObject.userData.type,
          uri: this.selectedObject.userData.uri
        });
        
        this.selectedObject = null;
      }
    }
  }
  
  /**
   * Update controls for the current frame
   * @param {number} deltaTime - Time since last frame in seconds
   * @param {THREE.Scene} scene - THREE.js scene
   */
  update(deltaTime, scene) {
    // Update movement if controls are locked
    if (this.controls.isLocked) {
      // Calculate velocity based on current movement direction
      this.velocity.x -= this.velocity.x * 10.0 * deltaTime;
      this.velocity.z -= this.velocity.z * 10.0 * deltaTime;
      this.velocity.y -= this.velocity.y * 10.0 * deltaTime;
      
      this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
      this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
      this.direction.y = Number(this.moveUp) - Number(this.moveDown);
      this.direction.normalize();
      
      if (this.moveForward || this.moveBackward) {
        this.velocity.z -= this.direction.z * this.movementSpeed * deltaTime;
      }
      
      if (this.moveLeft || this.moveRight) {
        this.velocity.x -= this.direction.x * this.movementSpeed * deltaTime;
      }
      
      if (this.moveUp || this.moveDown) {
        this.velocity.y += this.direction.y * this.movementSpeed * deltaTime;
      }
      
      // Move the camera
      this.controls.moveRight(-this.velocity.x);
      this.controls.moveForward(-this.velocity.z);
      this.camera.position.y += this.velocity.y;
    } else {
      // Perform raycasting for hover effects
      this.raycaster.setFromCamera(this.mouse, this.camera);
      
      // Find intersections
      const intersects = this.raycaster.intersectObjects(scene.children, true);
      
      // Reset intersected object
      if (this.intersectedObject) {
        // Handle hover out
        eventBus.publish('object-hover', {
          type: 'out',
          object: this.intersectedObject
        });
        
        this.intersectedObject = null;
      }
      
      // Set new intersected object
      if (intersects.length > 0) {
        let found = false;
        
        // Find the first object with userData.type
        for (let i = 0; i < intersects.length; i++) {
          const object = intersects[i].object;
          
          if (object.userData && object.userData.type) {
            this.intersectedObject = object;
            found = true;
            
            // Handle hover in
            eventBus.publish('object-hover', {
              type: 'in',
              object: this.intersectedObject
            });
            
            break;
          }
        }
        
        // Update cursor style
        document.body.style.cursor = found ? 'pointer' : 'auto';
      } else {
        // Reset cursor style
        document.body.style.cursor = 'auto';
      }
    }
  }
  
  /**
   * Clean up event listeners
   */
  dispose() {
    // Remove event listeners
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    this.domElement.removeEventListener('click', this.onClick);
    document.removeEventListener('pointerlockchange', this.onLockChange);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('click', this.onObjectClick);
    
    // Dispose controls
    this.controls.dispose();
  }
}

export default Controls;
