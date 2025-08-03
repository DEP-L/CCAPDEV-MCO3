// --- modules import ---
const express = require('express');
const exphbs = require('express-handlebars');
const session = require('express-session');
const moment = require('moment');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// --- models import ---
const Lab = require('./model/Lab');
const User = require('./model/User');

// --- routes import ---
const commonRoutes = require('./routes/common');
const adminRoutes = require('./routes/admin');
const reservationRoutes = require('./routes/reservation');

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
.then(() => {
    console.log('Connected to MongoDB');
    seedDefaultAdmin();
})
.catch(err => console.error('MongoDB connection error:', err));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- create default admin ---
const seedDefaultAdmin = async () => {
    const existingAdmin = await User.findOne({ accountType: 'admin' }).lean();
    const hashedPassword = await bcrypt.hash('123', 10);

    if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash('123', 10);

        await User.create({
            email: 'admin@dlsu.edu.ph',
            password: hashedPassword,
            accountType: 'admin',
            studentID: 0,
            techID: 0,
            displayName: 'Administrator',
            description: '',
            image: '',
            reservations: []
        });
        console.log('Default admin created: admin@dlsu.edu.ph / 123');
    } else {
        console.log('Admin already exists. Skipping admin account creation.');
    }
};

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
    },
    formatDate: function(date) {
        return moment(date).format('YYYY-MM-DD');
    },
    formatList: function(list) {
        if(Array.isArray(list)) {
            return list.join(', ');
        }
        return list;
    }
};

// --- handlebars configuration ---
app.engine('hbs', exphbs.engine({ 
    extname: '.hbs',
    helpers: hbshelpers
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

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
app.get('/dashboard', isLoggedIn, async (req, res) => {
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
app.get('/profile/id/:id', isLoggedIn, async (req, res) => {
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

// reservations
app.post('/reserve-slot', isLoggedIn, async(req, res) => {
    const accountType = req.session.user.accountType;
    if (accountType !== 'student' && accountType !== 'tech') return res.status(403).send('Forbidden');

    const { lab, date, timeSlots, seat } = req.body;
    let targetStudentID;

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
        } else {
            targetStudentID = req.session.user.studentID;
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

        // added security check to prevent duplicate reservations
        const recentDuplicate = await Reservation.findOne({
            studentID: targetStudentID,
            labID: parsedLabID,
            seatNumber: parsedSeatNumber,
            reserveDate: newReservationDate,
            timeList: { $size: selectedTimeSlots.length, $all: selectedTimeSlots },
            requestDate: { $gte: new Date(Date.now() - 5000) } // last 5 seconds
        });

        if (recentDuplicate) {
            return res.status(429).send('Duplicate reservation detected. Please wait a few seconds and try again.');
        }

        await newReservation.save();
        res.redirect('/dashboard?message=Reservation%20successful!');
    } catch (err) {
        await logError(err, '/reserve', req.session?.user?.email);

        console.error(err);
        if (err.code === 11000 && err.message.includes('reservationID')) {
            return res.status(409).send('Failed to make reservation: A reservation with this ID already exists or a duplicate ID was generated. Please try again.');
        }
        res.status(500).send("Failed to make reservation. Please try again");
    }
}); 

app.post('/delete-reservation', isLoggedIn, async(req, res) => {
    const { reservationID } = req.body;
    const accountType = req.session.user.accountType;
    if (accountType !== 'student' && accountType !== 'tech') return res.status(403).send('Forbidden');

    try {
        const reservation = await Reservation.findOne({ reservationID: parseInt(reservationID) }).lean();
        if(!reservation) {
            return res.status(404).send('Reservation not found');
        }

        if(accountType === 'student' && reservation.studentID !== req.session.user.studentID) {
            return res.status(403).send('Reservation does not belong to current user.');
        }

        await Reservation.deleteOne({ reservationID: parseInt(reservationID) });
        res.redirect('/dashboard?message=Reservation%20successfully%20deleted!');
    } catch (err) {
        await logError(err, '/delete-reservation', req.session?.user?.email);
        
        console.error(err);
        res.status(500).send('Failed to delete reservation. Please try again.');
    }
});

// saving newly edited profile
app.post('/edit-profile/id/:id', isLoggedIn, async (req, res) => {
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
app.post('/delete-account/id/:id', isLoggedIn, async (req, res) => {
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
// --- admin routes ---
app.get('/admin/create-tech', isLoggedIn, isAdmin, (req, res) => {
    res.render('admin/create-tech', {
        user: req.session.user,
        success: req.query.success === '1'
    });
});


app.post('/admin/create-tech', isLoggedIn, isAdmin, async (req, res) => {
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

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}

module.exports = app;