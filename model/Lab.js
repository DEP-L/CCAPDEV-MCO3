const mongoose = require('mongoose');

const labSchema = new mongoose.Schema({
    labID: { type: Number, default: 0 },
    slots: { type: Array, default: [] }
});

module.exports = mongoose.model('Lab', labSchema);