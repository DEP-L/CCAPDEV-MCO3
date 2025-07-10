const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const mongoose = require('mongoose');

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