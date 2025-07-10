// functions related to reservations (adding, editting, deleting)

document.addEventListener("DOMContentLoaded", function() {
    const labList = retrieveLabList();
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    const lab = this.getElementById("lab");
    const profile = this.getElementById("profile");

    const labSelect = this.getElementById("labSelect");
    const dateSelect = this.getElementById("dateSelect");
    const studentIDInput = this.getElementById("studentIDInput");
    const studentIDInputLabel = this.getElementById("studentIDInputLabel");
    const nextDay = this.getElementById("nextDay");
    const prevDay = this.getElementById("prevDay")
    const isAnon = this.getElementById("anon");
    const isAnonLabel = this.getElementById("anonLabel");
    const labView = this.getElementById("labView");
    const reserveBtn = this.getElementById("reserveBtn");

    // setting up the date strings for the date selection
    const today = new Date();
    const inSevenDays = new Date(today);
    inSevenDays.setDate(today.getDate() + 7);

    const todayString = createDateString(today);
    const sevenDaysString = createDateString(inSevenDays);

    // setting up the default option for the lab selection
    const defaultOption = this.createElement("option");
    defaultOption.value = "default";
    defaultOption.innerText = "---select a lab---";
    defaultOption.selected = true;
    defaultOption.disabled = true;

    if(labSelect) {
        labSelect.appendChild(defaultOption);

        for(let l of labList) {
            const o = document.createElement("option");
            o.innerText = l.labID;
            o.value = l.labID;
            labSelect.appendChild(o);
        }

        labSelect.addEventListener("change", function() {
            renderLabView(labSelect.value, dateSelect.value);
            renderReservationView();
        });
    }

    if(dateSelect) {
        // prevent user from selecting days already passed
        dateSelect.setAttribute("value", todayString);
        dateSelect.setAttribute("min", todayString);
        dateSelect.setAttribute("max", sevenDaysString);

        dateSelect.addEventListener("change", function() {
            renderLabView(labSelect.value, dateSelect.value);
            renderReservationView();
        });
    }

    if(studentIDInput) {
        if(currentUser.techID == 0 && currentUser.studentID > 0) {
            studentIDInputLabel.style.display = "none";
            studentIDInput.style.display = "none";
        } 
    }

    if(prevDay || nextDay) {
        let selectedDate, minDate, maxDate;

        nextDay.addEventListener("click", function() {
            selectedDate = new Date(dateSelect.value);
            maxDate = new Date(dateSelect.max);

            if(selectedDate < maxDate) {
                selectedDate.setDate(selectedDate.getDate() + 1);
                dateSelect.value = createDateString(selectedDate);
                renderLabView(labSelect.value, dateSelect.value);
                renderReservationView();
            }            
        });

        prevDay.addEventListener("click", function() {
            selectedDate = new Date(dateSelect.value);
            minDate = new Date(dateSelect.min);

            if(selectedDate > minDate) {
                selectedDate.setDate(selectedDate.getDate() - 1);
                dateSelect.value = createDateString(selectedDate);
                renderLabView(labSelect.value, dateSelect.value);
                renderReservationView();
            }
        });
    }
    
    if(labView) {
        renderLabView(labSelect.value, dateSelect.value);
    }

    if(reserveBtn) {
        reserveBtn.addEventListener("click", function() {
            let studentIDValue = currentUser.studentID > 0 && currentUser.techID == 0 ? currentUser.studentID : studentIDInput.value;

            if(addReservation(studentIDValue, labSelect.value, dateSelect.value, isAnon.checked)) {
                renderLabView(labSelect.value, dateSelect.value);
                renderReservationView();
            }
        });
    }
    
    if(isAnon || isAnonLabel) {
        if(currentUser.studentID == 0) {
            isAnon.style.display = "none";
            isAnonLabel.style.display = "none";
        }
    }

    if(lab) {
        if(currentUser.studentID == 0) {
            lab.addEventListener("click", function() {
                window.location.href = "lab.html";
            });
        } else {
            lab.style.display = "none";
        }
    } 

    if(profile) {
        profile.addEventListener("click", function() {
            window.location.href = `profile.html?s=${encodeURIComponent(currentUser.studentID)}t=${encodeURIComponent(currentUser.techID)}`;
        });
    }
});

function createDateString(date) {
    let dateString = "";
    let year, month, day;

    if(date instanceof Date) {
        year = date.getFullYear();
        month = String(date.getMonth() + 1).padStart(2, "0");
        day = String(date.getDate()).padStart(2, "0");
        dateString = `${year}-${month}-${day}`;
    }

    return dateString;
}

function renderLabView(selectedLabID, selectedDate) {
    const labView = document.getElementById("labView");
    const reservationList = retrieveReservationList();
    const selectedLab = retrieveLabList().find(l => l.labID == selectedLabID);
    let reservedSlots = [];
    let dateString;

    // return if no lab or date was selected
    if(!selectedLab || !selectedDate) {
        return;
    }

    dateString = new Date(selectedDate);
    dateString = dateString.toISOString();

    // remove the table content
    labView.innerHTML = "";

    // determine times and seats for row and column headers
    const times = Array.from(new Set(selectedLab.slotList.map(s => s.time))).sort();
    const seats = Array.from(new Set(selectedLab.slotList.map(s => s.seat))).sort();

    // determine reserved seats
    reservationList.forEach(r => {
        if(parseInt(r.labID) == parseInt(selectedLabID) && r.reservedDate.split("T")[0] == dateString.split("T")[0]) {
            reservedSlots = reservedSlots.concat(r.slotList);
        } 
    });

    console.log(reservedSlots);

    // create lab table elements
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    // create the header row
    const headerRow = document.createElement("tr");
    const emptyTh = document.createElement("th");
    headerRow.appendChild(emptyTh);
    seats.forEach(s => {
        const th = document.createElement("th");
        th.textContent = s;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    labView.appendChild(thead);

    // create the body rows
    times.forEach(t => {
        const row = document.createElement("tr");
        const timeCell = document.createElement("td");
        timeCell.textContent = t;
        row.appendChild(timeCell);

        seats.forEach(s => {
            const cell = document.createElement("td");
            const cellID = `${t}_${s}`;

            if(reservedSlots.some(r => r.time == t && r.seat == s)) {
                cell.classList.add("occupied");
                cell.textContent = "XX";
            } else {
                cell.classList.add("available");
                cell.textContent = "___";
            }

            cell.id = cellID;

            cell.addEventListener("click", function(event) {
                cell.classList.toggle("selected");

                if(cell.classList.contains("selected")) {
                    cell.textContent = cell.classList.contains("occupied") ? "[XX]" : "[__]";
                } else {
                    cell.textContent = cell.classList.contains("occupied") ? "XX" : "___";
                }

                renderReservationView();
            });
            row.appendChild(cell);
        });
        tbody.appendChild(row);
    });
    labView.appendChild(tbody);
}

function renderReservationView() {
    const labview = document.getElementById("labView");
    const reservationView = document.getElementById("reservationView");
    const selectedCells = labview.querySelectorAll("td.selected");
    let reservationString = "";

    // remove previously displayed reservations
    reservationView.innerText = "";

    selectedCells.forEach(c => {
        reservationString = reservationString + `${c.id}\n`;
    });

    reservationView.innerText = reservationString;
}

// creates a reservation
function addReservation(studentID, selectedLabID, selectedDate, anon) {
    const selectedCells = document.getElementById("labView").querySelectorAll("td.selected");
    const userList = retrieveUserList();
    let reservationList = retrieveReservationList();
    let reservedSlots = [];
    let hasOverlap = false;
    let reservationID, reservedDate, requestDate, slotList;

    let dateString = new Date(selectedDate);
    dateString = dateString.toISOString();

    // lab must be selected
    if(selectedLabID == "default") {
        alert("Select a lab.");
        return false;
    }

    // date must be selected
    if(!selectedDate) {
        alert("Select a date.");
        return false;
    }

    // student id must be a number
    if(!parseInt(studentID)) {
        alert("Student ID must be a number.")
        return false;
    }

    // student id must exist
    if(!userList.some(u => u.studentID == studentID)) {
        alert("Student with specified student ID does not exist.");
        return false;
    }

    // slots must be selected
    if(selectedCells.length == 0) {
        alert("Selected slots to reserve.");
        return false;
    }

    // reserved slots must not exist in the list of reservations
    reservationList.forEach(r => {
        if(parseInt(r.labID) == parseInt(selectedLabID) && r.reservedDate.split("T")[0] == dateString.split("T")[0]) {
            reservedSlots = reservedSlots.concat(r.slotList);
        } 
    });

    selectedCells.forEach(c => {
        if(reservedSlots.some(r => r.time == c.id.split("_")[0] && r.seat == c.id.split("_")[1])) {
            hasOverlap = true;
        } 
    });
    
    if(hasOverlap) {
        alert("Slot already reserved");
        return;
    }

    // assign reservation details
    reservationID = generateReservationID();
    reservedDate = new Date(selectedDate);
    requestDate = new Date(Date.now());
    slotList = [];

    selectedCells.forEach(c => {
        slotList.push({
            time: c.id.split("_")[0],
            seat: c.id.split("_")[1]
        });
    });

    // push the reservation onto the reservationList
    reservationList.push({
        reservationID: reservationID,
        studentID: parseInt(studentID),
        labID: parseInt(selectedLabID),
        reservedDate: reservedDate,
        requestDate: requestDate,
        anon: anon,
        slotList: slotList
    });

    localStorage.setItem("reservationList", JSON.stringify(reservationList));
    alert("Reservation added successfully.");
    return true;
}

// edits a reservation
function editReservation(reservationID) {
    // retrieveReservationList, push to list, store (localstorage.setItem)

    /*
    reservationID
    studentID
    labID

    reservationDate = selected date*
    requestDate = currentDate
    anon = false | true (default = false)
    slots = [{time, seat}, {time, seat}]*

    */

    // check if reservation overlaps
}

// deletes a reservation
function deleteReservation(reservationID) {
    // retrieveReservationList

    // shift given the reservationID

    // store list

    let reservationList = retrieveReservationList();

    localStorage.setItem("reservationList", JSON.stringify(reservationList));
}

// deletes all reservations for a given student
function deleteStudentReservations(studentID) {
    // retrieveReservationList
    // remove all reservations (shift for studentID == param, or keep for studentID != param)

    // can also:
    // reservationList.find(studentID == r.studentID)
    // deleteReservation(r.reservationID)
}

// deletes all reservations for a given lab
function deleteLabReservations(labID) {
    // retrieveReservationList
    // remove all reservations
}