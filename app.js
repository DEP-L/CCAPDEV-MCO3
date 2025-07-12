const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const mongoose = require('mongoose');
const User = require('./model/User');

const app = express();
const port = 3000;

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/lab-reservation', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.engine('hbs', exphbs.engine({ extname: '.hbs' }));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// get routes
app.get('/', (req, res) => {
    res.render('partials/index', { title: 'Welcome' });
});

app.get('/login', (req, res) => {
    res.render('partials/login', { title: 'Login' });
});

app.get('/register', (req, res) => {
    res.render('partials/register', { title: 'Register' });
});

app.get('/dashboard', (req, res) => {
    // add later: fetch labs and user info
    res.render('partials/dash', { title: 'Dashboard' });
});

app.get('/labs', (req, res) => {
    // add later: fetch lab list
    res.render('partials/labs', { title: 'Manage Labs' });
});

app.get('/profile', (req, res) => {
    // add later: fetch user profile and user reservations
    res.render('partials/profile', {
        title: 'Profile',
        displayName: 'John Doe',
        description: 'Sample user',
        image: '/img/default.png',
        reservation: []
        // temp values for now
    });
});

// temp post routes

// register post route
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
    } catch (err) {
        console.error(err);
        res.send('Error during registration.');
    }
});

// login post route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email, password });

        if (!user) {
            return res.send('Invalid email or password');
        }

        // sends users to dashboard if login is successful
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.send('Error during login.');
    }
});

app.post('/create-lab', (req, res) => {
    // add later: create lab in DB
    res.send('Lab created');
});

app.post('/reserve-slot', (req, res) => {
    // add later: reserve slot in DB
    res.send('Slot reserved');
});

app.post('/edit-profile', (req, res) => {
    // add later: update user profile
    res.send('Profile updated');
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