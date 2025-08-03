// --- intialize express app ---
const express = require('express');
const router = express.Router();

// --- modules ---
const logError = require('../utils/errorLogger');
const bcrypt = require('bcrypt');
const moment = require('moment');

// --- models import ---
const Lab = require('../model/Lab');
const User = require('../model/User');
const Reservation = require('../model/Reservation');

// --- middlewares ---
const { isLoggedIn } = require('../middlewares/auth');

function checkNotAuthenticated(req, res, next) {
    if(req.session.user) {
        return res.redirect('/dashboard');
    }
    next();
}

// main
router.get('/', (req, res) => {
    if(req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

// login
router.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('partials/login', { title: 'Login' });
});

router.post('/login', checkNotAuthenticated, async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.send('Invalid email or password');
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.send('Invalid email or password');
        }

        req.session.user = {
            _id: user._id.toString(),
            email: user.email,
            password: user.password,
            accountType: user.accountType,
            studentID: user.studentID,
            techID: user.techID,
            displayName: user.displayName,
            description: user.description,
            image: user.image
        };

        res.redirect('/dashboard');

    } catch (err) {
        console.error(err);
        await logError(err, '/login', req.body?.email || req.session?.user?.email);
        res.send('Failed to load the dashboard. Please try again later.');
    }
});

// logout
router.post('/logout', async (req, res) => {
    req.session.destroy(err => {
        if(err) {
            console.error(err);
            return res.redirect('/login');
        }
        res.redirect('/login');
    })
})

// register
router.get('/register', (req, res) => {
    res.render('partials/register', { title: 'Register' });
});

router.post('/register', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.send('All fields are required.');
    }

    try {
        const existingUser = await User.findOne({ email }).lean();
        if (existingUser) {
            return res.send('Email already registered. Please use a different email or log in.');
        }

        const accountType = 'student'; // force only student registration
        const newStudentID = await User.generateStudentID();

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            email,
            password: hashedPassword,
            accountType,
            studentID: newStudentID,
            techID: 0,
            displayName: "",
            description: "",
            image: "",
            reservations: []
        });

        await newUser.save();
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        await logError(err, '/register', req.body?.email || req.session?.user?.email);
        res.send('Registration failed. Please try again later.');
    }
});

// dashboard
router.get('/dashboard', isLoggedIn, async (req, res) => {
    const userID = req.session.user._id;
    
    try {
        const user = await User.findById(userID).lean();
        if(!user) {
            return res.send('User not found');
        }

        const labs = await Lab.find({}).lean();
        let selectedLab = null;
        const requestedLabID = req.query.labID;
        let selectedDate = req.query.date;

        if(requestedLabID) {
            selectedLab = await Lab.findOne({ labID: parseInt(requestedLabID) }).lean();
        } else if(labs.length > 0) {
            selectedLab = labs[0];
        }

        if(!selectedDate) {
            selectedDate = moment().format('YYYY-MM-DD');
        }

        // store reserved slots for easy lookup
        let reservedSlots = {};
        let userReservations = [];

        if(selectedLab) {
            const startOfDayUTC = moment.utc(selectedDate).startOf('day').toDate();
            const endOfDayUTC = moment.utc(selectedDate).endOf('day').toDate();

            const commonReservationQuery = {
                labID: selectedLab.labID,
                reserveDate: {
                    $gte: startOfDayUTC,
                    $lte: endOfDayUTC
                }
            };

            if(user.accountType === 'student') {
                userReservations = await Reservation.find({
                    ...commonReservationQuery,
                    studentID: user.studentID
                }).lean();
            } else if(user.accountType === 'tech') {
                userReservations = await Reservation.find(commonReservationQuery).lean();
            }

            const reservationsForDate = await Reservation.find(commonReservationQuery).lean();

            const studentIDsToFetch = [...new Set(reservationsForDate.map(r => r.studentID))];
            const students = await User.find({ studentID: { $in: studentIDsToFetch } }).lean();
            const studentMap = new Map(students.map(s => [s.studentID, s]));

            for(const reservation of reservationsForDate) {
                for(const timeSlot of reservation.timeList) {
                    if(!reservedSlots[timeSlot]) {
                        reservedSlots[timeSlot] = {};
                    }
                    // mark the seat as reserved by the studentID
                    const studentData = studentMap.get(reservation.studentID);
                    reservedSlots[timeSlot][reservation.seatNumber] = {
                        studentID: reservation.studentID, 
                        displayName: studentData ? studentData.displayName : 'Unknown User'
                    };
                }
            }
        }

        res.render('partials/dash', {
            title: 'Dashboard',
            _id: user._id.toString(),
            studentID: user.studentID,
            techID: user.techID,
            displayName: user.displayName,
            labs: labs,
            selectedLab: selectedLab,
            selectedDate: selectedDate,
            reservedSlots: reservedSlots,
            userReservations: userReservations,
            isStudent: user.accountType === 'student',
            isTech: user.accountType === 'tech',
            isAdmin: user.accountType === 'admin'
        });
    } catch (err) {
        console.error(err);
        await logError(err, '/dashboard', req.body?.email || req.session?.user?.email);
        res.send('Failed to load the dashboard. Please try again later.');
    }
});

// profile
router.get('/profile/id/:id', isLoggedIn, async (req, res) => {
    const ID = req.params.id.toString();
    const ownerID = req.query.ownerID;
    const isEditing = req.query.edit === 'true';

    try {
        const userID = parseInt(ID);
        const user = await User.findOne({
            $or: [{ studentID: userID }, { techID: userID }]
        }).lean();

        if(!user) {
            return res.send('User not found');
        }

        const isOwner = ownerID === req.session.user._id.toString(); // checks ownership using _id

        res.render('partials/profile', {
            title: 'Profile',
            _id: user._id,
            displayName: user.displayName,
            description: user.description,
            image: user.image,
            reservations: user.reservations,
            studentID: user.studentID,
            techID: user.techID,
            isOwner,
            isEditing
        })
    } catch (err) {
        console.error(err);
        await logError(err, '/profile', req.body?.email || req.session?.user?.email);
        res.send('Failed to load profile. Please try again later.');
    }
});

// saving newly edited profile
router.post('/edit-profile/id/:id', isLoggedIn, async (req, res) => {
    const { displayName, description, image } = req.body;
    const ID = req.params.id;

    try {
        const user = await User.findOne({
            $or: [{ studentID: parseInt(ID) }, { techID: parseInt(ID) }]
        });

        if (!user) return res.send('User not found');

        user.displayName = displayName || user.displayName;
        user.description = description || user.description;
        user.image = image || user.image;

        await user.save();
        res.redirect(`/profile/id/${ID}`);
    } catch (err) {
        await logError(err, '/edit-profile', req.body?.email || req.session?.user?.email);
        res.status(500).send('Failed to update profile.');
    }
});

// delete account
router.post('/delete-account/id/:id', isLoggedIn, async (req, res) => {
    const idToDelete = req.params.id;

    try {
        const user = await User.findById(idToDelete);
        if (!user) return res.send('User not found');

        await Reservation.deleteMany({ studentID: user.studentID });

        await User.deleteOne({ _id: idToDelete });

        req.session.destroy(() => {
        res.redirect('/login');
        });
    } catch (err) {
        console.error(err);
        await logError(err, '/delete-account', req.body?.email || req.session?.user?.email);
        res.status(500).send('Failed to delete account.');
    }
});

module.exports = router;
