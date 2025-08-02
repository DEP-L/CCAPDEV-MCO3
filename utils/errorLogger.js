// --- utility for logging errors to the database ---
const ErrorLog = require('../models/ErrorLog');

const logError = async (err, route, userEmail = 'N/A') => {
    try {
        await ErrorLog.create({
            message: err.message,
            stack: err.stack,
            route,
            userEmail,
            timestamp: new Date()
        });
    } catch (e) {
        console.error('Failed to log error:', e.message);
    }
};

module.exports = logError;