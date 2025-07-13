const mongoose = require('mongoose');

const labSchema = new mongoose.Schema({
    labName: { type: String, unique: true, require: true },
    labID: { type: Number, unique: true, default: 0 },
    timeList: { type: Array, required: true },
    seatCount: { type: Number, required: true, default: 10 }
});

module.exports = mongoose.model('Lab', labSchema);