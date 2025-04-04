/**
 * Initialize global window.fs for early access
 * This ensures window.fs is available before storageManager is fully initialized
 * @module util/initFs
 */

import mockFs from './mockFs.js';

// Initialize window.fs with mock implementation
if (typeof window !== 'undefined' && !window.fs) {
    window.fs = {
        readFile: mockFs.readFile,
        writeFile: mockFs.writeFile,
        unlink: mockFs.unlink,
        exists: mockFs.exists,
        readdir: mockFs.readdir,
        // Expose mock state for debugging
        _isMock: true
    };

    console.log('window.fs initialized with mock implementation');
}

export default {};