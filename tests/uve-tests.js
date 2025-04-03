/**
 * @fileoverview Unit tests for UVE core components
 */

import { EventBus, UVEEvent, ModelObject, RDFModelManager } from '../src/core.js';

describe('EventBus', () => {
  let eventBus;
  
  beforeEach(() => {
    eventBus = new EventBus();
  });
  
  it('should allow subscribing to events', () => {
    const callback = jasmine.createSpy('callback');
    
    eventBus.subscribe('test-event', callback);
    eventBus.publish(new UVEEvent('test-event', { value: 'test' }));
    
    expect(callback).toHaveBeenCalled();
    expect(callback.calls.first().args[0].type).toBe('test-event');
    expect(callback.calls.first().args[0].data.value).toBe('test');
  });
  
  it('should allow unsubscribing from events', () => {
    const callback = jasmine.createSpy('callback');
    
    const unsubscribe = eventBus.subscribe('test-event', callback);
    unsubscribe();
    eventBus.publish(new UVEEvent('test-event'));
    
    expect(callback).not.toHaveBeenCalled();
  });
  
  it('should handle multiple subscribers for the same event', () => {
    const callback1 = jasmine.createSpy('callback1');
    const callback2 = jasmine.createSpy('callback2');
    
    eventBus.subscribe('test-event', callback1);
    eventBus.subscribe('test-event', callback2);
    eventBus.publish(new UVEEvent('test-event'));
    
    expect(callback1).toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
  });
  
  it('should only notify subscribers of the matching event type', () => {
    const callback1 = jasmine.createSpy('callback1');
    const callback2 = jasmine.createSpy('callback2');
    
    eventBus.subscribe('event1', callback1);
    eventBus.subscribe('event2', callback2);
    eventBus.publish(new UVEEvent('event1'));
    
    expect(callback1).toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
  });
  
  it('should catch errors in event handlers and continue processing', () => {
    const errorCallback = () => {
      throw new Error('Test error');
    };
    const successCallback = jasmine.createSpy('successCallback');
    
    // Spy on console.error to prevent test output pollution
    spyOn(console, 'error');
    
    eventBus.subscribe('test-event', errorCallback);
    eventBus.subscribe('test-event', successCallback);
    eventBus.publish(new UVEEvent('test-event'));
    
    expect(successCallback).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });
});

describe('ModelObject', () => {
  let eventBus, modelObj;
  
  beforeEach(() => {
    eventBus = new EventBus();
    modelObj = new ModelObject(eventBus, 'test-object');
  });
  
  it('should store and retrieve property values', () => {
    modelObj.set('testProp', 'testValue');
    
    expect(modelObj.get('testProp')).toBe('testValue');
  });
  
  it('should return default value for non-existent properties', () => {
    expect(modelObj.get('nonExistent')).toBeNull();
    expect(modelObj.get('nonExistent', 'default')).toBe('default');
  });
  
  it('should publish events when properties change', () => {
    const callback = jasmine.createSpy('callback');
    eventBus.subscribe('model:property:change', callback);
    
    modelObj.set('testProp', 'testValue');
    
    expect(callback).toHaveBeenCalled();
    const event = callback.calls.first().args[0];
    expect(event.data.modelId).toBe('test-object');
    expect(event.data.property).toBe('testProp');
    expect(event.data.oldValue).toBeNull();
    expect(event.data.newValue).toBe('testValue');
  });
  
  it('should include previous value in change event', () => {
    const callback = jasmine.createSpy('callback');
    eventBus.subscribe('model:property:change', callback);
    
    modelObj.set('testProp', 'value1');
    modelObj.set('testProp', 'value2');
    
    expect(callback.calls.count()).toBe(2);
    const event = callback.calls.mostRecent().args[0];
    expect(event.data.oldValue).toBe('value1');
    expect(event.data.newValue).toBe('value2');
  });
});

describe('RDFModelManager', () => {
  let eventBus, rdfMock, modelManager;
  
  beforeEach(() => {
    eventBus = new EventBus();
    
    // Create a mock RDF-Ext implementation
    rdfMock = {
      dataset: jasmine.createSpy('dataset').and.returnValue({
        size: 0
      }),
      namespace: jasmine.createSpy('namespace').and.callFake(ns => {
        // Return a function that appends the local name to the namespace
        return (localName) => ({ value: `${ns}${localName}` });
      }),
      grapoi: jasmine.createSpy('grapoi').and.returnValue({
        has: () => ({ 
          addUnion: () => ({
            has: () => ({
              distinct: () => ({
                terms: []
              })
            })
          })
        }),
        out: () => ({
          values: []
        }),
        terms: []
      }),
      io: {
        dataset: {
          fromURL: jasmine.createSpy('fromURL').and.returnValue(Promise.resolve({
            size: 0
          }))
        }
      }
    };
    
    modelManager = new RDFModelManager(eventBus, rdfMock);
  });
  
  it('should initialize with an empty dataset', () => {
    expect(rdfMock.dataset).toHaveBeenCalled();
    expect(modelManager.dataset).toBeDefined();
  });
  
  it('should load data from URL', async () => {
    const url = 'http://example.org/data.ttl';
    await modelManager.loadFromUrl(url);
    
    expect(rdfMock.io.dataset.fromURL).toHaveBeenCalledWith(url);
    
    // Verify that an event was published
    const publishSpy = spyOn(eventBus, 'publish');
    await modelManager.loadFromUrl(url);
    
    expect(publishSpy).toHaveBeenCalled();
    expect(publishSpy.calls.first().args[0].type).toBe('rdf:loaded');
  });
  
  it('should publish error events when loading fails', async () => {
    const url = 'http://example.org/invalid.ttl';
    const error = new Error('Loading failed');
    
    rdfMock.io.dataset.fromURL.and.returnValue(Promise.reject(error));
    
    const publishSpy = spyOn(eventBus, 'publish');
    await modelManager.loadFromUrl(url);
    
    expect(publishSpy).toHaveBeenCalled();
    expect(publishSpy.calls.first().args[0].type).toBe('rdf:error');
    expect(publishSpy.calls.first().args[0].data.error).toBe(error.message);
  });
  
  it('should extract classes from the dataset', () => {
    const mockDataset = {
      size: 10
    };
    
    const extractSpy = spyOn(modelManager, 'extractClasses');
    modelManager.setDataset(mockDataset);
    
    expect(modelManager.dataset).toBe(mockDataset);
    expect(extractSpy).toHaveBeenCalled();
  });
  
  it('should publish event when classes are extracted', () => {
    const publishSpy = spyOn(eventBus, 'publish');
    
    // Call the private method directly
    modelManager.extractClasses();
    
    expect(publishSpy).toHaveBeenCalled();
    expect(publishSpy.calls.first().args[0].type).toBe('rdf:classes:extracted');
  });
  
  it('should return extracted classes', () => {
    const classes = modelManager.getClasses();
    
    expect(Array.isArray(classes)).toBe(true);
  });
});

describe('Integration Tests', () => {
  let eventBus, modelObj1, modelObj2;
  
  beforeEach(() => {
    eventBus = new EventBus();
    modelObj1 = new ModelObject(eventBus, 'object1');
    modelObj2 = new ModelObject(eventBus, 'object2');
  });
  
  it('should allow objects to communicate via events', () => {
    // Set up modelObj2 to listen for changes to modelObj1
    const callback = jasmine.createSpy('callback');
    
    eventBus.subscribe('model:property:change', (event) => {
      if (event.data.modelId === 'object1' && event.data.property === 'sourceProperty') {
        modelObj2.set('targetProperty', event.data.newValue);
      }
    });
    
    eventBus.subscribe('model:property:change', callback);
    
    // Change a property on modelObj1
    modelObj1.set('sourceProperty', 'test-value');
    
    // Verify that modelObj2 was updated
    expect(modelObj2.get('targetProperty')).toBe('test-value');
    
    // Verify that two events were published (one for each property change)
    expect(callback.calls.count()).toBe(2);
  });
});
