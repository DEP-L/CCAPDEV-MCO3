const mongoose = require('mongoose');
const request = require('supertest');
const chai = require('chai');
const bcrypt = require('bcrypt');
const expect = chai.expect;

const app = require('../app2');
const User = require('../model/User');
const Lab = require('../model/Lab');
const Reservation = require('../model/Reservation');

describe('Reservation Routes (Local MongoDB)', function () {
    let agent;
    let sessionCookie;
    let testStudent;

    before(async function () {
        // connect to local MongoDB
        await mongoose.connect('mongodb://localhost:27017/lab-reservation', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        // cleanup previous test data
        await Reservation.deleteMany({ studentID: 9999 });
        await User.deleteOne({ email: 'teststudent@example.com' });

        // create test student
        const hashedPassword = await bcrypt.hash('test123', 10);
        testStudent = await User.create({
            email: 'teststudent@example.com',
            password: hashedPassword,
            accountType: 'student',
            studentID: 9999,
            displayName: 'Test Student',
            reservations: []
        });

        // ensure test lab exists
        await Lab.updateOne(
            { labID: 302 },
            {
                labName: 'Lab R302',
                labID: 302,
                timeList: ['8:00AM-8:30AM', '8:30AM-9:00AM'],
                seatCount: 20
            },
            { upsert: true }
        );

        agent = request.agent(app);

        // login to get session
        await agent
            .post('/login')
            .send({ email: 'teststudent@example.com', password: 'test123' })
            .expect(302);
    });

    after(async function () {
        await Reservation.deleteMany({ studentID: 9999 });
        await User.deleteOne({ email: 'teststudent@example.com' });
        await mongoose.disconnect();
    });

    it('should make a reservation successfully for Lab R302', async function () {
        const res = await agent
            .post('/reserve-slot')
            .send({
                lab: '302',
                date: '2025-12-01',
                timeSlots: ['8:00AM-8:30AM'],
                seat: '1'
            });

        expect(res.status).to.be.oneOf([200, 302]);

        const reservation = await Reservation.findOne({ studentID: 9999 });
        expect(reservation).to.exist;
        expect(reservation.labID).to.equal(302);
    });

    it('should delete the reservation successfully', async function () {
        const reservation = await Reservation.findOne({ studentID: 9999 });
        expect(reservation).to.exist;

        const res = await agent
            .post('/delete-reservation')
            .send({ reservationID: reservation.reservationID });

        expect(res.status).to.be.oneOf([200, 302]);

        const deleted = await Reservation.findOne({ reservationID: reservation.reservationID });
        expect(deleted).to.not.exist;
    });
});
