const { verifyClientToken } = require('../src/middleware/authentication');
const firebaseAuth = require('../src/config/firebase');

// Mock firebase-admin
jest.mock('../src/config/firebase', () => ({
    verifyIdToken: jest.fn()
}));

describe('Authentication Middleware', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return user object for valid student token', async () => {
        const mockUser = {
            uid: 'student123',
            name: 'Student A',
            email: 'student@siswa.um.edu.my',
            picture: 'pic.jpg'
        };
        firebaseAuth.verifyIdToken.mockResolvedValue(mockUser);

        const result = await verifyClientToken('valid-token');
        expect(result).toEqual({
            uid: 'student123',
            name: 'Student A',
            email: 'student@siswa.um.edu.my',
            picture: 'pic.jpg'
        });
    });

    test('should return user object for valid lecturer token', async () => {
        const mockUser = {
            uid: 'lecturer123',
            name: 'Lecturer A',
            email: 'lecturer@um.edu.my',
            picture: 'pic.jpg'
        };
        firebaseAuth.verifyIdToken.mockResolvedValue(mockUser);

        const result = await verifyClientToken('valid-token');
        expect(result.email).toBe('lecturer@um.edu.my');
    });

    test('should throw error for invalid domain', async () => {
        const mockUser = {
            uid: 'hacker123',
            email: 'hacker@gmail.com'
        };
        // Note: gmail.com was allowed in the original code for testing, so let's use a different one
        // Original code: allowedDomains = ['@siswa.um.edu.my', '@siswa-old.um.edu.my', '@um.edu.my', '@gmail.com'];



        // For now, let's test a definitely "wrong" domain.
        const badUser = {
            uid: 'bad',
            email: 'bad@random.com'
        }
        firebaseAuth.verifyIdToken.mockResolvedValue(badUser);

        await expect(verifyClientToken('valid-token')).rejects.toThrow('Access denied. Domain not authorized.');
    });

    test('should throw error for tampered/invalid token', async () => {
        firebaseAuth.verifyIdToken.mockRejectedValue(new Error('Signature verification failed'));

        await expect(verifyClientToken('invalid-token')).rejects.toThrow('Token verification failed: Signature verification failed');
    });
});