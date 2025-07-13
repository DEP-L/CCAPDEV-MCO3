const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
    reservationID: { type: Number, default: 0 },
    labID: { type: Number, required: true, unique: true },
    studentID: { type: Number, required: true },
    reserveDate: { type: Date, required: true },
    requestDate: { type: Date, default: Date.now },
    seatNumber: { type: Number, require: true},
    timeList: { type: Array, require: true }
});

module.exports = mongoose.model('Reservation', reservationSchema);