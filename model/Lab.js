const mongoose = require('mongoose');

const labSchema = new mongoose.Schema({
    labID: { type: Number, unique: true, default: 0 },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    seatCount: { type: Number, default: 20 }
});

module.exports = mongoose.model('Lab', labSchema);