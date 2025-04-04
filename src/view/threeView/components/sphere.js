/**
 * Sphere component for representing classes
 * @module view/threeView/components/sphere
 */

import * as THREE from 'three';
import config from '../../../core/config.js';

class Sphere {
  /**
   * Create a new Sphere component
   * @param {Object} params - Parameters
   * @param {ClassEntity} params.classEntity - Class entity to represent
   * @param {THREE.Group} params.parent - Parent group to add sphere to
   */
  constructor({ classEntity, parent }) {
    this.classEntity = classEntity;
    this.parent = parent;
    this.ports = new Map(); // URI string -> Port
    
    // Create geometry
    const radius = classEntity.radius || config.visualization.sphere.defaultRadius;
    this.geometry = new THREE.SphereGeometry(
      radius,
      config.visualization.sphere.segments,
      config.visualization.sphere.segments
    );
    
    // Create material
    this.material = new THREE.MeshPhongMaterial({
      color: config.visualization.sphere.defaultColor,
      transparent: true,
      opacity: config.visualization.sphere.opacity,
      shininess: 30
    });
    
    // Create mesh
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.set(
      classEntity.position.x || 0,
      classEntity.position.y || 0,
      classEntity.position.z || 0
    );
    
    // Add metadata to mesh
    this.mesh.userData = {
      type: 'class',
      uri: classEntity.uri.value,
      label: classEntity.label,
      entity: classEntity
    };
    
    // Create label
    this.createLabel();
    
    // Add to parent
    this.parent.add(this.mesh);
  }
  
  /**
   * Create a text label for the sphere
   */
  createLabel() {
    // Create a canvas for the texture
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;
    
    // Draw background
    context.fillStyle = 'rgba(50, 50, 50, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw border
    context.strokeStyle = 'white';
    context.lineWidth = 2;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    
    // Draw text
    context.font = '24px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(this.classEntity.label, canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create sprite material
    const material = new THREE.SpriteMaterial({ map: texture });
    
    // Create sprite
    this.label = new THREE.Sprite(material);
    this.label.scale.set(5, 2.5, 1);
    
    // Position above sphere
    const yOffset = this.classEntity.radius + 2;
    this.label.position.set(0, yOffset, 0);
    
    // Add label to mesh
    this.mesh.add(this.label);
  }
  
  /**
   * Update the position and appearance of the sphere
   */
  update() {
    // Update position
    this.mesh.position.set(
      this.classEntity.position.x,
      this.classEntity.position.y,
      this.classEntity.position.z
    );
    
    // Update appearance based on selection state
    if (this.classEntity.isSelected) {
      this.material.color.setHex(config.visualization.sphere.selectedColor);
      this.material.opacity = 1.0;
    } else {
      this.material.color.setHex(config.visualization.sphere.defaultColor);
      this.material.opacity = config.visualization.sphere.opacity;
    }
  }
  
  /**
   * Add a port to this sphere
   * @param {Port} port - Port component to add
   */
  addPort(port) {
    const uriString = port.interfaceEntity.uri.value;
    this.ports.set(uriString, port);
  }
  
  /**
   * Get world position of the sphere
   * @returns {THREE.Vector3} World position
   */
  getWorldPosition() {
    const position = new THREE.Vector3();
    this.mesh.getWorldPosition(position);
    return position;
  }
  
  /**
   * Get the radius of the sphere
   * @returns {number} Sphere radius
   */
  getRadius() {
    return this.classEntity.radius;
  }
  
  /**
   * Show the sphere
   */
  show() {
    this.mesh.visible = true;
  }
  
  /**
   * Hide the sphere
   */
  hide() {
    this.mesh.visible = false;
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    // Remove from parent
    if (this.parent && this.mesh.parent === this.parent) {
      this.parent.remove(this.mesh);
    }
    
    // Dispose of geometry and material
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
    
    // Clean up sprite
    if (this.label) {
      if (this.label.material.map) this.label.material.map.dispose();
      if (this.label.material) this.label.material.dispose();
    }
  }
}

export default Sphere;
