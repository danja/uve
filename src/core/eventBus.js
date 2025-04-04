/**
 * Central event bus for pub-sub messaging in UVE
 * Enables loose coupling between components
 * @module core/eventBus
 */

import log from 'loglevel';

class EventBus {
  /**
   * Create a new EventBus
   */
  constructor() {
    this.events = {};
    this.log = log.getLogger('EventBus');
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name to subscribe to
   * @param {Function} callback - Function to call when event is published
   * @returns {Function} Unsubscribe function
   */
  subscribe(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    
    this.events[event].push(callback);
    this.log.debug(`Subscribed to ${event}, total subscribers: ${this.events[event].length}`);
    
    // Return unsubscribe function
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
      this.log.debug(`Unsubscribed from ${event}, remaining subscribers: ${this.events[event].length}`);
    };
  }

  /**
   * Publish an event
   * @param {string} event - Event name to publish
   * @param {any} data - Data to pass to subscribers
   */
  publish(event, data) {
    if (!this.events[event]) {
      this.log.debug(`No subscribers for ${event}`);
      return;
    }
    
    this.log.debug(`Publishing ${event} to ${this.events[event].length} subscribers`);
    this.events[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        this.log.error(`Error in subscriber callback for ${event}:`, error);
      }
    });
  }

  /**
   * Remove all subscribers for an event
   * @param {string} event - Event name to clear
   */
  clear(event) {
    if (event) {
      delete this.events[event];
      this.log.debug(`Cleared all subscribers for ${event}`);
    } else {
      this.events = {};
      this.log.debug('Cleared all subscribers for all events');
    }
  }
}

// Export a singleton instance
const eventBus = new EventBus();
export default eventBus;
