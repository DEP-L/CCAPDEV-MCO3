const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
    reservationID: { type: Number, default: 0, unique: true },
    labID: { type: Number, required: true },
    studentID: { type: Number, required: true },
    reserveDate: { type: Date, required: true },
    requestDate: { type: Date, default: Date.now },
    seatNumber: { type: Number, require: true},
    timeList: { type: Array, require: true }
    // isAnon: { type: Boolean, default: true }
});

// static method for generating reservation ID
reservationSchema.statics.generateReservationID = async function() {
    try {
        const lastReservation = await this.find().lean();
        if(lastReservation && lastReservation.reservationID) {
            return lastReservation.reservationID + 1;
        } else {
            return 3001; // starting ID for reservations
        }
    } catch (err) {
        console.error(err);
        throw new Error('Failed to generate reservation ID.');
    }
}

module.exports = mongoose.model('Reservation', reservationSchema);