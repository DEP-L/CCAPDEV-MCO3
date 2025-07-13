// --- modules import ---
const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const mongoose = require('mongoose');

// --- models import --- 
const User = require('./model/User');
const Lab = require('./model/Lab');
const Reservation = require('./model/Reservation');

// --- express app initialization ---
const app = express();
const port = 3000;

// for express to correctly parse incoming POST form data (e.g req.body)
app.use(express.urlencoded({ extended: true }));

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

// --- routes --- 

// home
app.get('/', (req, res) => {
    res.render('partials/index', { title: 'Welcome' });
});

// login
app.get('/login', (req, res) => {
    res.render('partials/login', { title: 'Login' });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email, password });

        if (!user) {
            return res.send('Invalid email or password');
        }

        // sends users to dashboard if login is successful
        res.redirect(`/dashboard/${user._id}`);
    } catch (err) {
        console.error(err);
        res.send('Error during login.');
    }
});

// register
app.get('/register', (req, res) => {
    res.render('partials/register', { title: 'Register' });
});

app.post('/register', async (req, res) => {
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
    res.redirect('/login');
});

// dashboard
app.get('/dashboard/:id', async (req, res) => {
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
    res.render('partials/labs', { title: 'Manage Labs' });
});

app.post('/create-lab', (req, res) => {
    // add later: create lab in DB


    res.send('Lab created');
});

// profile
app.get('/profile/id/:id', async (req, res) => {
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

app.post('/edit-profile/id/:id', async (req, res) => {
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