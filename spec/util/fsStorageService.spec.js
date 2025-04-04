/**
 * Tests for the FS storage service
 */
import FSStorageService from '../../src/util/fsStorageService.js';
import mockFs from '../../src/util/mockFs.js';

describe('FSStorageService', () => {
    let storage;

    // Set up storage service and reset mockFs before each test
    beforeEach(() => {
        mockFs.reset();
        storage = new FSStorageService(mockFs, 'test-data');
    });

    it('should write and read data by ID', async () => {
        const testId = 'document1.json';
        const testData = { title: 'Test Document', content: 'Hello world' };

        await storage.write(testId, testData);
        const result = await storage.read(testId, { encoding: 'utf8' });

        // Convert result back to object for comparison
        const parsedResult = JSON.parse(result);
        expect(parsedResult).toEqual(testData);
    });

    it('should handle binary data', async () => {
        const testId = 'binary.dat';
        const testData = new Uint8Array([1, 2, 3, 4, 5]);

        await storage.write(testId, testData);
        const result = await storage.read(testId);

        expect(result instanceof Uint8Array).toBe(true);
        expect(Array.from(result)).toEqual([1, 2, 3, 4, 5]);
    });

    it('should delete data by ID', async () => {
        const testId = 'to-delete.json';
        const testData = { delete: true };

        await storage.write(testId, testData);

        // Verify it exists
        const exists = await mockFs.exists(storage._getPath(testId));
        expect(exists).toBe(true);

        // Delete it
        await storage.delete(testId);

        // Verify it's gone
        const existsAfterDelete = await mockFs.exists(storage._getPath(testId));
        expect(existsAfterDelete).toBe(false);
    });

    it('should list resources', async () => {
        // Create test data in various paths
        await storage.write('file1.json', { id: 1 });
        await storage.write('file2.json', { id: 2 });
        await storage.write('dir1/file3.json', { id: 3 });
        await storage.write('dir1/file4.json', { id: 4 });

        // List root resources
        const rootFiles = await storage.list();
        expect(rootFiles.length).toBe(2);
        expect(rootFiles).toContain('file1.json');
        expect(rootFiles).toContain('file2.json');

        // List subdirectory resources
        const subFiles = await storage.list('dir1');
        expect(subFiles.length).toBe(2);
        expect(subFiles).toContain('dir1/file3.json');
        expect(subFiles).toContain('dir1/file4.json');
    });

    it('should query data with filters', async () => {
        // Create test data
        await storage.write('doc1.json', { type: 'article', title: 'Article 1' });
        await storage.write('doc2.json', { type: 'article', title: 'Article 2' });
        await storage.write('doc3.json', { type: 'note', title: 'Note 1' });

        // Query by type
        const articles = await storage.query({ type: 'article' });
        expect(articles.length).toBe(2);
        expect(articles[0].data.title).toBe('Article 1');
        expect(articles[1].data.title).toBe('Article 2');

        // Query by type and title
        const specificArticle = await storage.query({ type: 'article', title: 'Article 2' });
        expect(specificArticle.length).toBe(1);
        expect(specificArticle[0].data.title).toBe('Article 2');

        // Query that returns no results
        const nonexistent = await storage.query({ type: 'nonexistent' });
        expect(nonexistent.length).toBe(0);
    });

    it('should handle paths with proper normalization', async () => {
        // Test with trailing slash in base path
        const storage1 = new FSStorageService(mockFs, 'base/');
        await storage1.write('test.json', { data: 'test' });

        // Test without trailing slash in base path
        const storage2 = new FSStorageService(mockFs, 'base');
        const result = await storage2.read('test.json', { encoding: 'utf8' });

        expect(JSON.parse(result)).toEqual({ data: 'test' });
    });
});