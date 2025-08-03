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
app.use('/', commonRoutes);
app.use('/', adminRoutes);
app.use('/', reservationRoutes);

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