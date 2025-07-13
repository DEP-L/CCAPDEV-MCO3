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

// --- handlebars configuration ---
app.engine('hbs', exphbs.engine({ extname: '.hbs' }));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// --- authentication middleware
function isAuthenticated(req, res, next) {
    if(req.session.user) {
        return next();
    }
}

function checkNotAuthenticated(req, res, next) {
    if(req.session.user) {
        return res.redirect('/dashboard');
    }
    next();
}

// --- routes --- 

// home
app.get('/', (req, res) => {
    if(req.session.user) {
        res.redirect('/dashboard' + req.session.user._id);
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

    if(!email || !password) {
        return res.redirect('/login');
    }

    try {
        const user = await User.findOne({ email: email });

        if (!user) {
            return res.redirect('/login');
        }

        const isMatch = password === user.password;

        if(isMatch) {
            req.session.user = {
                _id: user._id,
                email: user.email,
                accountType: user.accountType,
                studentID: user.studentID,
                techID: user.techID,
                displayName: user.displayName
            };
            res.redirect('/dashboard/' + user._id);
        } else {
            res.redirect('/login');
        }
    } catch (err) {
        console.error('Login error: ', err);
        res.send('Error during login.');
        res.redirect('/login');
    }
});

// register
app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('partials/register', { title: 'Register' });
});

app.post('/register', checkNotAuthenticated, async (req, res) => {
    const { email, password, accountType } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.send('Email already registered.');
        }

        const newUser = new User({
            email,
            password,
            accountType,
            studentID: accountType === 'student' ? generateID('student') : 0,
            techID: accountType === 'tech' ? generateID('tech') : 0
        });

        await newUser.save();
        res.send('Registration successful!');
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        res.send('Error during registration.');
    }
});

// logout
app.post('/logout', async (req, res) => {
    const userID = req.session.user ? req.session.user._id : undefined;
    req.session.destroy(err => {
        if(err) {
            console.error('Error destroying session:', err);
            return res.redirect('/dashboard/' + userID);
        }
        res.redirect('/login');
    });
});

// dashboard
app.get('/dashboard/:id', isAuthenticated, async (req, res) => {
    const userID = req.params.id;

    try {
        const user = await User.findById(userID);

        res.render('partials/dash', {
            title: 'Dashboard',
            _id: user._id,
            studentID: user.studentID,
            techID: user.techID,
            displayName: user.displayName
        });
    } catch (err) {
        console.error(err);
        res.send('Failed to load dashboard.');
    }
});

app.post('/reserve-slot', (req, res) => {
    // add later: reserve slot in DB
    res.send('Slot reserved');
});

// labs
app.get('/labs', (req, res) => {
    // add later: fetch lab list
    

    res.render('partials/labs');
});

app.post('/create-lab', (req, res) => {
    // add later: create lab in DB


    res.send('Lab created');
});

// profile
app.get('/profile/id/:id', isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const ownerID = parseInt(req.query.ownerID);
    const isEditing = req.query.edit === 'true';

    try {
        const user = await User.findOne({
            $or: [
                { studentID: id },
                { techID: id }
            ]
        });

        if (!user) return res.send('User not found.');

        const isOwner = user.studentID === ownerID || user.techID === ownerID;

        res.render('partials/profile', {
            _id: user._id,
            title: 'Profile',
            displayName: user.displayName,
            description: user.description,
            image: user.image,
            reservation: user.reservation || [],
            studentID: user.studentID,
            techID: user.techID,
            isOwner,
            isEditing
        });
    } catch (err) {
        console.error(err);
        res.send('Failed to load profile.');
    }
});

app.post('/edit-profile/id/:id', isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const { displayName, description } = req.body;

    try {
        const user = await User.findOne({
        $or: [{ studentID: id }, { techID: id }]
        });

        if (!user) return res.status(404).send('User not found.');

        await User.findByIdAndUpdate(user._id, {
        displayName,
        description
        // handle image upload later
        });

        res.redirect(`/profile/id/${id}?ownerID=${id}`);
    } catch (err) {
        res.status(500).send('Failed to update profile.');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// ------ TEMPORARY HELPER FUNCTIONS ------ (remove if implemented properly later)

// --- seeder function for temporary database values ---
async function seedDatabase() {
    try {
        // Create a default admin user if not exists
        const adminUser = await User.findOne({ email: 'admin@dlsu.edu.ph' });
        if (!adminUser) {
            const password = 123;
            const newAdmin = new User({
                email: 'admin@dlsu.edu.ph',
                password: password,
                accountType: 'tech',
                techID: 2001,
                displayName: 'Admin User'
            });
            await newAdmin.save();
            console.log('Default admin user created: admin@dlsu.edu.ph / 123');
        }

        // Create a default student user if not exists
        const studentUser = await User.findOne({ email: 'student@dlsu.edu.ph' });
        if (!studentUser) {
            const password = 123;
            const newStudent = new User({
                email: 'student@dlsu.edu.ph',
                password: password,
                accountType: 'student',
                studentID: 1001,
                displayName: 'Student User'
            });
            await newStudent.save();
            console.log('Default student user created: stustudent@dlsu.edu.ph / 123');
        }

        // Create a default lab if not exists
        const lab101 = await Lab.findOne({ labID: 101 });
        if (!lab101) {
            const newLab = new Lab({
                labID: 101,
                startTime: new Date().setHours(8, 0, 0, 0), // 8 AM today
                endTime: new Date().setHours(17, 0, 0, 0), // 5 PM today
                seatCount: 20
            });
            await newLab.save();
            console.log('Default Lab 101 created.');
        }

        // Create a sample reservation for today if not exists
        const today = moment().startOf('day').toDate();
        const existingReservation = await Reservation.findOne({ labID: 101, studentID: 1001, reserveDate: today });
        if (!existingReservation) {
            const newReservation = new Reservation({
                reservationID: 1, // Simple ID for demo
                labID: 101,
                studentID: 1001,
                reserveDate: today,
                requestDate: new Date(),
                slots: ['09:00', '09:30', '10:00']
            });
            await newReservation.save();
            console.log('Sample reservation for Lab 101 created for student 1001.');
        }

    } catch (error) {
        console.error('Database seeding error:', error);
    }
}

// call seedDatabase after successful MongoDB connection
mongoose.connection.on('connected', () => {
    seedDatabase();
});

// ------ USER ID GENERATION ----
let studentIDCounter = 1001;
let techIDCounter = 2001;

function generateID(type) {
    if (type === 'student') {
        return studentIDCounter++;
    } else {
        return techIDCounter++;
    }
}
// -------------------------------