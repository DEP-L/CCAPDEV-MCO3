const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    accountType: { type: String, enum: ['student', 'tech'], required: true },
    studentID: { type: Number, default: 0 },
    techID: { type: Number, default: 0 },
    displayName: { type: String, default: "" },
    description: { type: String, default: "" },
    image: { type: String, default: "" }
});

module.exports = mongoose.model('User', userSchema);