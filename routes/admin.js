// --- intialize express app ---
const express = require('express');
const router = express.Router();

// --- middlewares ---
const { isLoggedIn, isAdmin } = require('../middlewares/auth');
const createUser = require('../utils/createUser');

// --- modules ---
const logError = require('../utils/errorLogger');

// --- admin routes ---
// --- creating tech accounts ---
router.get('/admin/create-tech', isLoggedIn, isAdmin, (req, res) => {
    res.render('admin/create-tech', {
        user: req.session.user,
        success: req.query.success === '1'
    });
});


router.post('/admin/create-tech', isLoggedIn, isAdmin, async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.render('admin/create-tech', { error: 'All fields are required.', user: req.session.user });
    }

    try {
        await createUser({
            email,
            password,
            accountType: 'tech'
        });

        return res.redirect('/admin/create-tech?success=1');
    } catch (err) {
        console.error(err);
        await logError(err, '/admin/create-tech', req.body?.email || req.session?.user?.email);
        return res.status(500).render('admin/create-tech', {
            error: err.message || 'Internal server error.',
            user: req.session.user
        });
    }
});

module.exports = router;
