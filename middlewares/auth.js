// --- middleware functions for authentication and authorization ---
function isLoggedIn(req, res, next) {
    if (req.session?.user) return next();
    return res.status(401).send('You must be logged in to access this page.');
}

function isAdmin(req, res, next) {
    if (req.session?.user?.accountType === 'admin') return next();
    return res.status(403).send('Forbidden: Admins only');
}

function isTech(req, res, next) {
    if (req.session?.user?.accountType === 'tech') return next();
    return res.status(403).send('Forbidden: Lab technicians only');
}

function isStudent(req, res, next) {
    if (req.session?.user?.accountType === 'student') return next();
    return res.status(403).send('Forbidden: Students only');
}

function isStudentOrTech(req, res, next) {
    const role = req.session.user?.accountType;
    if (role === 'student' || role === 'tech') return next();
    return res.redirect('/dashboard');
}

module.exports = { isLoggedIn, isAdmin, isTech, isStudent, isStudentOrTech };
