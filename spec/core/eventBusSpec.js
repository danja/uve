/**
 * Tests for the EventBus module
 */

import eventBus from '../../src/core/eventBus.js';

describe('EventBus', () => {
  // Clear all subscribers before each test
  beforeEach(() => {
    eventBus.clear();
  });

  // Test subscribe and publish functionality
  it('should allow subscribing to events', () => {
    const callback = jasmine.createSpy('callback');
    eventBus.subscribe('test-event', callback);
    
    eventBus.publish('test-event', { data: 'test' });
    expect(callback).toHaveBeenCalledWith({ data: 'test' });
  });
  
  // Test multiple subscribers
  it('should call multiple subscribers for the same event', () => {
    const callback1 = jasmine.createSpy('callback1');
    const callback2 = jasmine.createSpy('callback2');
    
    eventBus.subscribe('test-event', callback1);
    eventBus.subscribe('test-event', callback2);
    
    eventBus.publish('test-event', { data: 'test' });
    
    expect(callback1).toHaveBeenCalledWith({ data: 'test' });
    expect(callback2).toHaveBeenCalledWith({ data: 'test' });
  });
  
  // Test unsubscribe functionality
  it('should allow unsubscribing from events', () => {
    const callback = jasmine.createSpy('callback');
    const unsubscribe = eventBus.subscribe('test-event', callback);
    
    // First publication should trigger callback
    eventBus.publish('test-event', { data: 'test1' });
    expect(callback).toHaveBeenCalledWith({ data: 'test1' });
    
    // Unsubscribe
    unsubscribe();
    
    // Reset call count
    callback.calls.reset();
    
    // Second publication should not trigger callback
    eventBus.publish('test-event', { data: 'test2' });
    expect(callback).not.toHaveBeenCalled();
  });
  
  // Test error handling in callbacks
  it('should handle errors in subscribers', () => {
    const goodCallback = jasmine.createSpy('goodCallback');
    const badCallback = jasmine.createSpy('badCallback').and.throwError('Test error');
    
    eventBus.subscribe('test-event', badCallback);
    eventBus.subscribe('test-event', goodCallback);
    
    // This should not throw, despite the error in badCallback
    expect(() => {
      eventBus.publish('test-event', { data: 'test' });
    }).not.toThrow();
    
    // The good callback should still be called
    expect(goodCallback).toHaveBeenCalledWith({ data: 'test' });
  });
  
  // Test clearing all subscribers
  it('should allow clearing all subscribers', () => {
    const callback1 = jasmine.createSpy('callback1');
    const callback2 = jasmine.createSpy('callback2');
    
    eventBus.subscribe('event1', callback1);
    eventBus.subscribe('event2', callback2);
    
    eventBus.clear();
    
    eventBus.publish('event1', { data: 'test' });
    eventBus.publish('event2', { data: 'test' });
    
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
  });
  
  // Test clearing specific event subscribers
  it('should allow clearing subscribers for a specific event', () => {
    const callback1 = jasmine.createSpy('callback1');
    const callback2 = jasmine.createSpy('callback2');
    
    eventBus.subscribe('event1', callback1);
    eventBus.subscribe('event2', callback2);
    
    eventBus.clear('event1');
    
    eventBus.publish('event1', { data: 'test' });
    eventBus.publish('event2', { data: 'test' });
    
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledWith({ data: 'test' });
  });
});
