/**
 * Tests for the mock filesystem module
 */
import mockFs from '../../src/util/mockFs.js';

describe('mockFs', () => {
    // Reset mockFs before each test
    beforeEach(() => {
        mockFs.reset();
    });

    it('should write and read a file', async () => {
        const testPath = 'test.txt';
        const testContent = 'Hello, world!';

        await mockFs.writeFile(testPath, testContent);
        const content = await mockFs.readFile(testPath, { encoding: 'utf8' });

        expect(content).toBe(testContent);
    });

    it('should handle binary data with Uint8Array', async () => {
        const testPath = 'binary.dat';
        const testData = new Uint8Array([1, 2, 3, 4, 5]);

        await mockFs.writeFile(testPath, testData);
        const data = await mockFs.readFile(testPath);

        // Since we're simulating binary, check if the types match
        expect(data instanceof Uint8Array).toBe(true);
        // Convert Uint8Array to Array for easier comparison
        expect(Array.from(data)).toEqual([1, 2, 3, 4, 5]);
    });

    it('should throw an error when reading a non-existent file', async () => {
        try {
            await mockFs.readFile('non-existent.txt');
            // If we get here, the test fails
            fail('Expected an error to be thrown');
        } catch (error) {
            expect(error.message).toContain('ENOENT: no such file or directory');
        }
    });

    it('should delete a file', async () => {
        const testPath = 'to-delete.txt';
        await mockFs.writeFile(testPath, 'Delete me');

        // File exists before deletion
        expect(await mockFs.exists(testPath)).toBe(true);

        await mockFs.unlink(testPath);

        // File doesn't exist after deletion
        expect(await mockFs.exists(testPath)).toBe(false);
    });

    it('should list files in a directory', async () => {
        // Create some files in different directories
        await mockFs.writeFile('dir1/file1.txt', 'Content 1');
        await mockFs.writeFile('dir1/file2.txt', 'Content 2');
        await mockFs.writeFile('dir2/file3.txt', 'Content 3');

        const dir1Files = await mockFs.readdir('dir1');

        expect(dir1Files.length).toBe(2);
        expect(dir1Files).toContain('file1.txt');
        expect(dir1Files).toContain('file2.txt');

        const dir2Files = await mockFs.readdir('dir2');

        expect(dir2Files.length).toBe(1);
        expect(dir2Files).toContain('file3.txt');
    });

    it('should identify directories', async () => {
        await mockFs.writeFile('dir1/file1.txt', 'Content 1');

        expect(await mockFs.isDirectory('dir1')).toBe(true);
        expect(await mockFs.isDirectory('dir1/file1.txt')).toBe(false);
        expect(await mockFs.isDirectory('nonexistent')).toBe(false);
    });

    it('should reset all file storage', async () => {
        await mockFs.writeFile('file1.txt', 'Content 1');
        await mockFs.writeFile('file2.txt', 'Content 2');

        expect(await mockFs.exists('file1.txt')).toBe(true);

        mockFs.reset();

        expect(await mockFs.exists('file1.txt')).toBe(false);
        expect(await mockFs.exists('file2.txt')).toBe(false);
    });
});