// --- modules import ---
const express = require('express');
const exphbs = require('express-handlebars');
const session = require('express-session');
const moment = require('moment');
const path = require('path');
const mongoose = require('mongoose');

// --- models import --- 
const User = require('./model/User');
const Lab = require('./model/Lab');
const Reservation = require('./model/Reservation');

// --- express app initialization ---
const app = express();
const port = 3000;

// --- session middleware ---
app.use(session({
    secret: 'tempsecretkey',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 21 // 21 days
    }
}));

// --- mongoDB connection ---
mongoose.connect('mongodb://localhost:27017/lab-reservation', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- handlebar helpers ---
const hbshelpers = {
    times: function(n, options) {
        let result = '';
        for (let i = 0; i < n; i++) {
            result += options.fn(this, { data : { index : i} }); 
        }
        return result;
    },
    inc: function(value) {
        return parseInt(value) + 1;
    },
    eq: function(v1, v2) { 
        return v1 === v2;
    }
};

// --- handlebars configuration ---
app.engine('hbs', exphbs.engine({ 
    extname: '.hbs',
    helpers: hbshelpers
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// --- authentication middleware
function isAuthenticated(req, res, next) {
    if(req.session.user) {
        return next();
    } 
    res.redirect('/login');
}

function checkNotAuthenticated(req, res, next) {
    if(req.session.user) {
        return res.redirect('/dashboard');
    }
    next();
}

// --- routes ---

// main
app.get('/', (req, res) => {
    if(req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

// login
app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('partials/login', { title: 'Login' });
});

app.post('/login', checkNotAuthenticated, async (req, res) => {
    const { email, password } = req.body;

    try {
        // find a user with a matching email and password
        const user = await User.findOne({ email, password }).lean();

        // return if either email or password is invalid
        if(!user) {
            return res.send('Invalid email or password');
        }

        // set the user session
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
        }

        // redirect to dashboard
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.send('Failed to load dashboard.');
    }
});

// logout
app.post('/logout', async (req, res) => {
    req.session.destroy(err => {
        if(err) {
            console.error(err);
            return res.redirect('/login');
        }
        res.redirect('/login');
    })
})

// register
app.get('/register', (req, res) => {
    res.render('partials/register', { title: 'Register' });
});

app.post('/register', async (req, res) => {
    const { email, password, accountType } = req.body;

    if(!email || !password || !accountType) {
        return res.send('All fields are required.');
    }

    try {
        const existingUser = await User.findOne({ email: email}).lean();
        if(existingUser) {
            return res.send('Email already registered. Please use a different email or log in.');
        }
        
        let newStudentID = 0;
        let newTechID = 0;

        // generate ID using static methods from model
        if(accountType === 'student') {
            newStudentID = await User.generateStudentID();
        } else if(accountType === 'tech') {
            newTechID = await User.generateTechID();
        }

        // create new user instance
        const newUser = new User({
            email: email,
            password: password, 
            accountType: accountType,
            studentID: newStudentID,
            techID: newTechID,
            displayName: "",
            description: "",
            image: "",
            reservations: []
        });

        await newUser.save();

        res.redirect('/login');
    } catch (err) {
        console.error(err);
        res.send('Registration failed. Please try again later.');
    }
});

// dashboard
app.get('/dashboard', isAuthenticated, async (req, res) => {
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

        if(selectedLab) {
            const startOfDayUTC = moment.utc(selectedDate).startOf('day').toDate();
            const endOfDayUTC = moment.utc(selectedDate).endOf('day').toDate();

            const reservationsForDate = await Reservation.find({
                labID: selectedLab.labID,
                reserveDate: {
                    $gte: startOfDayUTC,
                    $lte: endOfDayUTC
                }
            }).lean();

            for(const reservation of reservationsForDate) {
                for(const timeSlot of reservation.timeList) {
                    if(!reservedSlots[timeSlot]) {
                        reservedSlots[timeSlot] = {};
                    }
                    // mark the seat as reserved by the studentID
                    reservedSlots[timeSlot][reservation.seatNumber] = reservation.studentID;
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
            reservedSlots: reservedSlots
        })
    } catch(err) {
        console.error(err);
        res.send('Failed to load dashboard.');
    }
});

// profile
app.get('/profile/id/:id', isAuthenticated, async (req, res) => {
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
        res.send('Failed to load profile.');
    }
});

// reservations
app.post('/reserve-slot', isAuthenticated, async(req, res) => {
    const { lab, date, timeSlots, seat } = req.body;
    let targetStudentID;
    let targetUserObjectID;

    // form validation
    if(!lab || !date || !timeSlots || !seat) {
        return res.send('All reservation fields are required.');
    }

    try {
        // assign studentID either from input if tech, or from session data if student
        if(req.session.user.accountType === 'tech') {
            targetStudentID = parseInt(req.body.studentID);
            const studentUser = await User.findOne({ studentID: targetStudentID }).lean();
            if(!studentUser) {
                return res.send('Student ID does not exist.');
            }
            targetUserObjectID = studentUser._id;
        } else {
            targetStudentID = req.session.user.studentID;
            targetUserObjectID = req.session.user._id;
        }

        // parsed body data
        const selectedTimeSlots = Array.isArray(timeSlots) ? timeSlots : [timeSlots];
        const newReservationDate = new Date(date);
        const parsedLabID = parseInt(lab);
        const parsedSeatNumber = parseInt(seat);

        // find existing reservations for the same lab, date, and seat
        const existingReservations = await Reservation.find({
            labID: parsedLabID,
            reserveDate: newReservationDate,
            seatNumber: parsedSeatNumber
        })

        // check for time slot overlaps
        for(const reservation of existingReservations) {
            const existingTimeList = reservation.timeList;
            for(const newSlot of selectedTimeSlots) {
                if(existingTimeList.includes(newSlot)) {
                    // overlap found
                    return res.status(409).send(`Failed to make reservation: Time slot ${newSlot} is already reserved for this lab, date, and seat.`);
                }
            }
        }

        const newReservationID = await Reservation.generateReservationID();
        
        const newReservation = new Reservation({
            reservationID: newReservationID,
            labID: parsedLabID,
            studentID: targetStudentID,
            reserveDate: newReservationDate,
            requestDate: Date.now(),
            timeList: selectedTimeSlots,
            seatNumber: parsedSeatNumber
        });

        await newReservation.save();
        res.redirect('/dashboard?message=Reservation%20successful!');
    } catch(err) {
        console.error(err);
        if(err.code === 11000 && err.message.includes('reservationID')) {
            return res.status(409).send('Failed to make reservation: A reservation with this ID already exists or a duplicate ID was generated. Please try again.');
        }
        res.status(500).send("Failed to make reservation. Please try again");
    }
}); 

// saving newly edited profile
app.post('/edit-profile/id/:id', isAuthenticated, async (req, res) => {
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
        res.status(500).send('Failed to update profile.');
    }
});

// --- server initialization --- 
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// --- database seeding for labs ---
async function seedDatabase() {
    try {
        const lab101 = await Lab.findOne({ labID: 101 }).lean();
        if(!lab101) {
            const newLab = new Lab({
                labName: 'Lab K101',
                labID: 101,
                timeList: [
                    '10:00AM-10:30AM',
                    '10:30AM-11:00AM',
                    '11:00AM-11:30AM',
                    '11:30AM-12:00PM',
                    '12:00PM-12:30PM',
                    '12:30PM-1:00PM',
                    '1:00PM-1:30PM',
                    '1:30PM-2:00PM',
                    '2:00PM-2:30PM'
                ],
                seatCount: 12
            });
            await newLab.save();
        }

        const lab201 = await Lab.findOne({ labID: 201 }).lean();
        if(!lab201) {
            const newLab = new Lab({
                labName: 'Lab B201',
                labID: 201,
                timeList: [
                    '12:00PM-12:30PM',
                    '12:30PM-1:00PM',
                    '1:00PM-1:30PM',
                    '1:30PM-2:00PM',
                    '2:00PM-2:30PM',
                    '2:30PM-3:00PM',
                    '3:00PM-3:30PM',
                    '3:30PM-4:00PM'
                ],
                seatCount: 15
            });
            await newLab.save();
        }

        const lab302 = await Lab.findOne({ labID: 302 }).lean();
        if(!lab302) {
            const newLab = new Lab({
                labName: 'Lab R302',
                labID: 302,
                timeList: [
                    '8:00AM-8:30AM',
                    '8:30AM-9:00AM',
                    '9:00AM-9:30AM',
                    '9:30AM-10:00AM',
                    '10:00AM-10:30AM',
                    '10:30AM-11:00AM',
                    '11:00AM-11:30AM',
                    '11:30AM-12:00PM',
                    '12:00PM-12:30PM',
                    '12:30PM-1:00PM',
                    '1:00PM-1:30PM',
                    '1:30PM-2:00PM',
                    '2:00PM-2:30PM'
                ],
                seatCount: 20
            });
            await newLab.save();
        }

        console.log('Database seeded');
    } catch (err) {
        console.error(err);
    }
}

mongoose.connection.on('connected', () => {
    seedDatabase();
})