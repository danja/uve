/**
 * Tests for the storage manager
 */
import storageManager from '../../src/util/storageManager.js';
import mockFs from '../../src/util/mockFs.js';
import FSStorageService from '../../src/util/fsStorageService.js';
import SPARQLStorageService from '../../src/util/sparqlStorageService.js';

describe('StorageManager', () => {
    // Reset mockFs before each test
    beforeEach(() => {
        mockFs.reset();

        // Reset storageManager to default state
        storageManager.storageServices.clear();
        storageManager.defaultService = null;
        storageManager.registerService('default', new FSStorageService(mockFs));
        storageManager.setDefaultService('default');
    });

    it('should provide a window.fs API for backward compatibility', () => {
        expect(typeof window.fs).toBe('object');
        expect(typeof window.fs.readFile).toBe('function');
        expect(typeof window.fs.writeFile).toBe('function');
        expect(typeof window.fs.unlink).toBe('function');
        expect(typeof window.fs.exists).toBe('function');
        expect(typeof window.fs.readdir).toBe('function');
    });

    it('should write and read files through the fs API', async () => {
        const testPath = 'test.txt';
        const testContent = 'Hello, world!';

        await window.fs.writeFile(testPath, testContent);
        const content = await window.fs.readFile(testPath, { encoding: 'utf8' });

        expect(content).toBe(testContent);
    });

    it('should allow registering multiple storage services', async () => {
        // Create a mock SPARQL service (no actual HTTP requests)
        const mockSparqlService = jasmine.createSpyObj('SPARQLStorageService', [
            'read', 'write', 'delete', 'list', 'query'
        ]);

        mockSparqlService.read.and.returnValue(Promise.resolve('test data'));

        // Register the mock service
        storageManager.registerService('sparql', mockSparqlService);

        // Test with default service (fs)
        await storageManager.writeFile('fs-test.txt', 'fs data');
        const fsData = await storageManager.readFile('fs-test.txt', { encoding: 'utf8' });
        expect(fsData).toBe('fs data');

        // Switch to SPARQL service
        storageManager.setDefaultService('sparql');

        // Read from SPARQL service
        const sparqlData = await storageManager.readFile('sparql-test.txt');
        expect(sparqlData).toBe('test data');
        expect(mockSparqlService.read).toHaveBeenCalledWith('sparql-test.txt', jasmine.any(Object));
    });

    it('should handle errors properly', async () => {
        // Try to read a non-existent file
        try {
            await storageManager.readFile('non-existent.txt');
            fail('Expected an error to be thrown');
        } catch (error) {
            expect(error.message).toContain('ENOENT: no such file or directory');
        }

        // Verify exists returns false for non-existent files
        const exists = await storageManager.exists('non-existent.txt');
        expect(exists).toBe(false);
    });

    it('should support querying data', async () => {
        // Create some test data
        await storageManager.writeFile('doc1.json', JSON.stringify({
            type: 'article',
            title: 'Test Article'
        }));

        await storageManager.writeFile('doc2.json', JSON.stringify({
            type: 'note',
            title: 'Test Note'
        }));

        // Query for articles
        const articles = await storageManager.query({ type: 'article' });

        expect(articles.length).toBe(1);
        expect(articles[0].data.title).toBe('Test Article');

        // Query with non-matching filter
        const nonexistent = await storageManager.query({ type: 'nonexistent' });
        expect(nonexistent.length).toBe(0);
    });
});