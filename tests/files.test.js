const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../server'); 
const db = require('../config/db');   

let publicKey, privateKey;


describe('File Upload/Download/Delete Flow', () => {

    afterAll(async () => {
        await db.end(); // Close DB connection if using pg Pool
    });

    test('POST /upload - should upload a file', async () => {

        const res = await request(app)
            .post('/files/')
            .attach('file', path.join(__dirname, '/test_photo.jpg'));

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('publicKey');
        expect(res.body).toHaveProperty('privateKey');

        publicKey = res.body.publicKey;
        privateKey = res.body.privateKey;
    });

    test('GET /files/:publicKey - should download the file', async () => {
        const res = await request(app)
            .get(`/files/${publicKey}`);

        expect(res.statusCode).toBe(200);
        // expect(res.headers['content-type']).toMatch(/text\/plain|application\/octet-stream/);
        expect(res.headers['content-disposition']).toMatch(/attachment/);
    });

    test('DELETE /files/:privateKey - should delete the file', async () => {
        const res = await request(app)
            .delete(`/files/${privateKey}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('message', 'File deleted successfully.');
    });

    test('GET /files/:publicKey - should return 404 after deletion', async () => {
        const res = await request(app)
            .get(`/files/${publicKey}`);

        expect(res.statusCode).toBe(404);
    });

    test('DELETE /files/:privateKey - should return 404 on already deleted file', async () => {
        const res = await request(app)
            .delete(`/files/${privateKey}`);

        expect(res.statusCode).toBe(404);
    });
});