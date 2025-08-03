// --- intialize express app ---
const express = require('express');
const router = express.Router();

// --- modules ---
const logError = require('../utils/errorLogger');

// --- models import ---
const User = require('../model/User');
const Reservation = require('../model/Reservation');

// --- middlewares ---
const { isLoggedIn, isStudentOrTech } = require('../middlewares/auth');

// reservations
router.post('/reserve-slot', isLoggedIn, isStudentOrTech, async(req, res) => {
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

        // check for conflicting reservations in other labs (time slot overlaps)
        const existingReservationsSameDate = await Reservation.find({
            studentID: targetStudentID,
            reserveDate: newReservationDate
        });

        for (const resv of existingReservationsSameDate) {
            for (const slot of selectedTimeSlots) {
                if (resv.timeList.includes(slot)) {
                    if (resv.labID !== parsedLabID) {
                        return res.status(409).send(`You already have a reservation in another lab during time slot ${slot}.`);
                    }
                }
            }
        }

        // restricts students from reserving in the same lab on the same date with a different seat
        const sameLabOtherSeat = await Reservation.findOne({
            studentID: targetStudentID,
            labID: parsedLabID,
            reserveDate: newReservationDate,
            seatNumber: { $ne: parsedSeatNumber }
        });

        if (sameLabOtherSeat) {
            return res.status(409).send(
                `You already have a reservation in this lab on that date at a different seat (Seat ${sameLabOtherSeat.seatNumber}).`
            );
        }

        // find existing reservations for the same lab, date, and seat
        const existingReservations = await Reservation.find({
            labID: parsedLabID,
            reserveDate: newReservationDate,
            seatNumber: parsedSeatNumber
        });

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
    } catch (err) {
        await logError(err, '/reserve', req.session?.user?.email);

        console.error(err);
        if (err.code === 11000 && err.message.includes('reservationID')) {
            return res.status(409).send('Failed to make reservation: A reservation with this ID already exists or a duplicate ID was generated. Please try again.');
        }
        res.status(500).send("Failed to make reservation. Please try again");
    }
});
 

router.post('/delete-reservation', isLoggedIn, async(req, res) => {
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

module.exports = router;
