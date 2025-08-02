const mongoose = require('mongoose');

const errorLogSchema = new mongoose.Schema({
    message: String,
    stack: String,
    route: String,
    timestamp: {
        type: Date,
        default: Date.now
    },
    userEmail: String
});

module.exports = mongoose.model('ErrorLog', errorLogSchema);