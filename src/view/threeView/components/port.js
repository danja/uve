/**
 * Port component for representing interfaces on classes
 * @module view/threeView/components/port
 */

import * as THREE from 'three';
import config from '../../../core/config.js';

class Port {
  /**
   * Create a new Port component
   * @param {Object} params - Parameters
   * @param {InterfaceEntity} params.interfaceEntity - Interface entity to represent
   * @param {Sphere} params.parentSphere - Parent sphere this port belongs to
   */
  constructor({ interfaceEntity, parentSphere }) {
    this.interfaceEntity = interfaceEntity;
    this.parentSphere = parentSphere;
    
    // Get port radius from config
    this.radius = config.visualization.port.defaultRadius;
    
    // Create geometry
    this.geometry = new THREE.SphereGeometry(
      this.radius,
      config.visualization.port.segments,
      config.visualization.port.segments
    );
    
    // Create material
    this.material = new THREE.MeshPhongMaterial({
      color: config.visualization.port.defaultColor,
      shininess: 50
    });
    
    // Create mesh
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    
    // Position port on parent sphere
    this.updatePosition();
    
    // Add metadata to mesh
    this.mesh.userData = {
      type: 'interface',
      uri: this.interfaceEntity.uri.value,
      label: this.interfaceEntity.label,
      entity: this.interfaceEntity
    };
    
    // Create label
    this.createLabel();
    
    // Add to parent sphere
    this.parentSphere.mesh.add(this.mesh);
    
    // Register with parent sphere
    this.parentSphere.addPort(this);
  }
  
  /**
   * Create a text label for the port
   */
  createLabel() {
    // Create a canvas for the texture
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 64;
    
    // Draw background
    context.fillStyle = 'rgba(50, 50, 50, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw border
    context.strokeStyle = 'white';
    context.lineWidth = 2;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    
    // Draw text
    context.font = '12px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(this.interfaceEntity.label, canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create sprite material
    const material = new THREE.SpriteMaterial({ map: texture });
    
    // Create sprite
    this.label = new THREE.Sprite(material);
    this.label.scale.set(2, 1, 1);
    
    // Position relative to port
    this.label.position.set(0, 1, 0);
    
    // Add label to mesh
    this.mesh.add(this.label);
  }
  
  /**
   * Update the position of the port on the parent sphere
   */
  updatePosition() {
    // Calculate position in spherical coordinates
    const sphereRadius = this.parentSphere.getRadius();
    const { phi, theta } = this.interfaceEntity.position;
    
    // Convert to Cartesian coordinates
    const x = sphereRadius * Math.sin(theta) * Math.cos(phi);
    const y = sphereRadius * Math.sin(theta) * Math.sin(phi);
    const z = sphereRadius * Math.cos(theta);
    
    // Set position
    this.mesh.position.set(x, y, z);
  }
  
  /**
   * Update the appearance of the port
   */
  update() {
    // Update position on sphere
    this.updatePosition();
    
    // Update appearance based on selection state
    if (this.interfaceEntity.isSelected) {
      this.material.color.setHex(config.visualization.port.selectedColor);
    } else {
      this.material.color.setHex(config.visualization.port.defaultColor);
    }
    
    // Update visibility
    this.mesh.visible = this.interfaceEntity.isVisible;
    if (this.label) {
      this.label.visible = this.interfaceEntity.isVisible;
    }
  }
  
  /**
   * Get world position of the port
   * @returns {THREE.Vector3} World position
   */
  getWorldPosition() {
    const position = new THREE.Vector3();
    this.mesh.getWorldPosition(position);
    return position;
  }
  
  /**
   * Show detailed information about the interface
   * @param {HTMLElement} infoPanel - DOM element to display information in
   */
  showDetails(infoPanel) {
    // Clear existing content
    infoPanel.innerHTML = '';
    
    // Create header
    const header = document.createElement('h3');
    header.textContent = this.interfaceEntity.label;
    infoPanel.appendChild(header);
    
    // Create interface type
    const type = document.createElement('p');
    type.textContent = `Interface URI: ${this.interfaceEntity.uri.value}`;
    infoPanel.appendChild(type);
    
    // Create methods section
    const methodsHeader = document.createElement('h4');
    methodsHeader.textContent = 'Methods:';
    infoPanel.appendChild(methodsHeader);
    
    if (this.interfaceEntity.methods.length === 0) {
      const noMethods = document.createElement('p');
      noMethods.textContent = 'No methods defined.';
      infoPanel.appendChild(noMethods);
    } else {
      const methodsList = document.createElement('ul');
      
      this.interfaceEntity.methods.forEach(method => {
        const methodItem = document.createElement('li');
        
        // Format method signature
        let signature = `${method.returnType} ${method.name}(`;
        
        if (method.parameters.length > 0) {
          signature += method.parameters.map(param => `${param.type} ${param.name}`).join(', ');
        }
        
        signature += ')';
        
        methodItem.textContent = signature;
        methodsList.appendChild(methodItem);
      });
      
      infoPanel.appendChild(methodsList);
    }
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    // Remove from parent
    if (this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
    
    // Dispose of geometry and material
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
    
    // Clean up label
    if (this.label) {
      if (this.label.material.map) this.label.material.map.dispose();
      if (this.label.material) this.label.material.dispose();
    }
  }
}

export default Port;
