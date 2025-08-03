const request = require('supertest');
const { expect } = require('chai');
const mongoose = require('mongoose');
const User = require('../model/User');
const createUser = require('../utils/createUser');

const app = require('../app2');
const agent = request.agent(app);

// Route tests
describe('Common Routes', function () {
    describe('GET /login', function () {
        it('should return the login page', function (done) {
            request(app)
                .get('/login')
                .expect('Content-Type', /html/)
                .expect(200)
                .end(function (err, res) {
                    if (err) return done(err);
                    expect(res.text).to.include('Login');
                    done();
                });
        });
    });

    describe('GET /register', function () {
        it('should return the registration page', function (done) {
            request(app)
                .get('/register')
                .expect('Content-Type', /html/)
                .expect(200)
                .end(function (err, res) {
                    if (err) return done(err);
                    expect(res.text).to.include('Register');
                    done();
                });
        });
    });

    describe('POST /register', function () {
        beforeEach(async () => {
            await User.deleteOne({ email: 'testuser@example.com' });
        });

        it('should return an error if email or password is missing', function (done) {
            request(app)
                .post('/register')
                .send({ email: '', password: '' })
                .expect(200)
                .end((err, res) => {
                    expect(res.text).to.include('All fields are required');
                    done(err);
                });
        });

        it('should register a new user and redirect', function (done) {
            request(app)
                .post('/register')
                .send({ email: 'testuser@example.com', password: 'testpass123' })
                .expect(302)
                .expect('Location', '/login')
                .end(done);
        });

        it('should return error if email is already in use', async () => {
            await createUser({ email: 'testuser@example.com', password: 'somepass', accountType: 'student' });

            const res = await request(app)
                .post('/register')
                .send({ email: 'testuser@example.com', password: 'testpass123' });

            expect(res.status).to.equal(200);
            expect(res.text.toLowerCase()).to.include('email already registered');
        });
    });

    describe('POST /login', function () {
        beforeEach(async () => {
            await User.deleteOne({ email: 'loginuser@example.com' });

            await createUser({
                email: 'loginuser@example.com',
                password: 'loginpass123',
                accountType: 'student'
            });
        });

        it('should return error if fields are empty', function (done) {
            request(app)
                .post('/login')
                .send({ email: '', password: '' })
                .expect(200)
                .end((err, res) => {
                    expect(res.text).to.include('Invalid email or password');
                    done(err);
                });
        });

        it('should return error for invalid credentials', function (done) {
            request(app)
                .post('/login')
                .send({ email: 'wrong@example.com', password: 'wrongpass' })
                .expect(200)
                .end((err, res) => {
                    expect(res.text).to.include('Invalid email or password');
                    done(err);
                });
        });

        it('should redirect to student dashboard on successful login', function (done) {
            request(app)
                .post('/login')
                .send({ email: 'loginuser@example.com', password: 'loginpass123' })
                .expect(302)
                .expect('Location', '/dashboard')
                .end(done);
        });
    });

    describe('Common Routes (Unauthenticated)', function () {
        it('should redirect unauthenticated users to login', function (done) {
            request(app)
                .get('/dashboard')
                .expect(401) // or 302 if redirecting
                .end((err, res) => {
                    expect(res.text).to.include('You must be logged in');
                    done(err);
                });
        });
    });

    describe('Common Routes (Authenticated)', function () {
        let testUser;

        before(async function () {
            await User.deleteOne({ email: 'editprofile@test.com' });

            testUser = await createUser({
                email: 'editprofile@test.com',
                password: 'pass123',
                displayName: 'Old Name',
                accountType: 'student'
            });

            await agent
                .post('/login')
                .send({ email: testUser.email, password: 'pass123' })
                .expect(302);
        });

        it('should show the user profile page', async function () {
            const url = `/profile/id/${User.studentID}?ownerID=${User._id}`;

            agent.get(url)
            .expect(200)
            .expect((res) => {
                expect(res.text).to.include('Profile');
            });
        });

        it('should update the user profile and redirect', async function () {
            agent
            .post(`/edit-profile/id/${User.studentID}`)
            .send({ displayName: 'Updated Name', description: 'New bio' })
            .expect(302)
            .expect('Location', `/profile/id/${User.studentID}`);
        });
    });

    describe('Account Deletion (Authenticated)', function () {
        let testUser;

        before(async function () {
            await User.deleteOne({ email: 'deleteuser@test.com' });

            testUser = await createUser({
                email: 'deleteuser@test.com',
                password: 'pass123',
                displayName: 'Delete Me',
                accountType: 'student'
            });

            await agent
                .post('/login')
                .send({ email: testUser.email, password: 'pass123' })
                .expect(302);
        });

        it('should delete the user and redirect to login', function (done) {
            agent
                .post(`/delete-account/id/${testUser._id}`)
                .expect(302)
                .expect('Location', '/login')
                .end(async (err) => {
                    const deletedUser = await User.findById(testUser._id);
                    expect(deletedUser).to.be.null;
                    done(err);
                });
        });
    });

    after(async () => {
        await mongoose.connection.close();
    });
});
