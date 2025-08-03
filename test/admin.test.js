const request = require('supertest');
const { expect } = require('chai');
const mongoose = require('mongoose');
const User = require('../model/User');
const createUser = require('../utils/createUser');

const app = require('../app2');
const agent = request.agent(app);

describe('Admin Routes', function () {
    let adminUser;

    before(async function () {
        // create admin and login
        await User.deleteOne({ email: 'admin@test.com' });

        adminUser = await createUser({
            email: 'admin@test.com',
            password: 'adminpass123',
            accountType: 'admin'
        });

        await agent
            .post('/login')
            .send({ email: adminUser.email, password: 'adminpass123' })
            .expect(302);
    });

    describe('GET /admin/create-tech', function () {
        it('should render the create-tech page for admins', function (done) {
            agent
                .get('/admin/create-tech')
                .expect(200)
                .expect(res => {
                    expect(res.text).to.include('Create');
                })
                .end(done);
        });
    });

    describe('POST /admin/create-tech', function () {
        const techEmail = 'newtech@test.com';

        beforeEach(async () => {
            await User.deleteOne({ email: techEmail });
        });

        it('should show error if fields are empty', function (done) {
            agent
                .post('/admin/create-tech')
                .send({ email: '', password: '' })
                .expect(200)
                .expect(res => {
                    expect(res.text).to.include('All fields are required');
                })
                .end(done);
        });

        it('should create a tech account and redirect', function (done) {
            agent
                .post('/admin/create-tech')
                .send({ email: techEmail, password: 'techpass123' })
                .expect(302)
                .expect('Location', '/admin/create-tech?success=1')
                .end(done);
        });
    });

    after(async () => {
        await User.deleteMany({ email: { $in: ['admin@test.com', 'newtech@test.com'] } });
        await mongoose.connection.close();
    });
});
