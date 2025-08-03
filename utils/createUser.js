const bcrypt = require('bcrypt');
const User = require('../model/User');

async function createUser({ email, password, accountType, displayName }) {
    // check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new Error('Email is already in use.');
    }

    let idField = '';
    let generatedID = 0;

    const validAccountTypes = ['student', 'tech', 'admin'];
    if (!validAccountTypes.includes(accountType)) {
        throw new Error('Invalid account type.');
    }

    if (accountType === 'student') {
        idField = 'studentID';
        generatedID = await User.generateStudentID();
    } else if (accountType === 'tech') {
        idField = 'techID';
        generatedID = await User.generateTechID();
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
        email,
        password: hashedPassword,
        accountType,
        displayName: displayName || '',
        [idField]: generatedID
    });

    await newUser.save();
    return newUser;
}

module.exports = createUser;