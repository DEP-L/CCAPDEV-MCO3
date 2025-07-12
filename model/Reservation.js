const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
    reservationID: { type: Number, default: 0 },
    labID: { type: Number, required: true },
    studentID: { type: Number, required: true },
    reserveDate: { type: Date, required: true },
    requestDate: { type: Date, default: Date.now },
    slots: { type: Array }
});

module.exports = mongoose.model('Reservation', reservationSchema);