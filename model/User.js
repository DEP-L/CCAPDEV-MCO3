const mongoose = require('mongoose');
const Reservation = require('./Reservation');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    accountType: { type: String, enum: ['student', 'tech'], required: true },
    studentID: { type: Number, default: 0 },
    techID: { type: Number, default: 0 },
    displayName: { type: String, default: "" },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    reservations: { type: Array, default: [] }
});

// static method for generating student ID
userSchema.statics.generateStudentID = async function() {
    try {
        const lastStudent = await this.findOne({ accountType: 'student' })
                                      .sort({ studentID: -1 })
                                      .lean();
        if(lastStudent && lastStudent.studentID) {
            return lastStudent.studentID + 1;
        } else {
            return 1001; // starting ID for students
        }
    } catch (err) {
        console.error(err);
        throw new Error('Failed to generate student ID.');
    }
}

// static method for generating tech ID
userSchema.statics.generateTechID = async function() {
    try {
        const lastTech = await this.findOne({ accountType: 'tech' })
                                   .sort({ techID: -1 })
                                   .lean();
        if(lastTech && lastTech.techID) {
            return lastTech.techID + 1;
        } else {
            return 2001; // starting ID for techs
        }
    } catch (err) {
        console.error(err);
        throw new Error('Failed to generate tech ID.')
    }
}

module.exports = mongoose.model('User', userSchema);