// data retrieval / utility functions
// also backend logic

document.addEventListener("DOMContentLoaded", function() {
    const currentDate = new Date();
    const logout = this.getElementById("logout");
    let userList = retrieveUserList();
    let currentUser = JSON.parse(localStorage.getItem("currentUser"));
    let sessionDate;

    // if user is currently not logged in, redirect to auth page
    if(!window.location.href.endsWith("auth.html")) {
        if(!currentUser) {
            alert("Cannot find current user session. Please login.");
            window.location.href = "auth.html";
        } else {
            sessionDate = new Date(currentUser.sessionDate);
            // if user is found but currentDate exceeds user's sessionDate, redirect
            if(currentDate >= sessionDate) {
                alert("Current user session has expired. Please login.");
                localStorage.removeItem("currentUser");
                window.location.href = "auth.html";
            }
        }
    }

    // log the user out and redirect to auth.html
    if(logout) {
        logout.addEventListener("click", function() {
            // set the currentUser's sessionDate to the currentDate
            currentUser.sessionDate = currentDate;

            // remove the current session and update the userList in localStorage
            localStorage.removeItem("currentUser");
            localStorage.setItem("userList", JSON.stringify(userList));

            alert("Logout successful.");
            window.location.href = "auth.html";
        });
    }
});

// retrieves the list of users from local storage
function retrieveUserList() {
    const listString = localStorage.getItem("userList");
    let list = [];

    if(listString) {
        try {
            list = JSON.parse(listString);
            // ensure list is an array, otherwise return an empty array
            if(!Array.isArray(list)) {
                list = [];
            }
            
        } catch(e) {
            // if parsing fails, return an empty array
            list = [];
        }
    }

    return list;
}

// filters the user list for students
function retrieveStudentList() {
    const userList = retrieveUserList();
    let studentList = [];

    for(let u of userList) {
        if(u.studentID > 0 && u.techID == 0) {
            studentList.push(u);
        }
    }

    return studentList;
}

// filters the user list for technicians
function retrieveTechList() {
    const userList = retrieveUserList();
    let techList = [];

    for(let u of userList) {
        if(u.studentID == 0 && u.techID > 0) {
            techList.push(u);
        }
    }

    return techList;
}

// retrieves the list of reservations from local storage
function retrieveReservationList() {
    const listString = localStorage.getItem("reservationList");
    let list = [];

    if(listString) {
        try {
            list = JSON.parse(listString);
            
            if(!Array.isArray(list)) {
                list = [];
            }
        } catch (e) {
            list = [];
        }
    }

    return list;
}

// filters the reservation list by student
function retrieveReservationsByStudent(studentID) {
    const reservationList = retrieveReservationList();
    let studentReservationList = [];

    for(let r of reservationList) {
        if(r.studentID == studentID) {
            studentReservationList.push(r);
        }
    }

    return studentReservationList;
} 

// filters the reservation list by lab
function retrieveReservationByLab(labID) {
    const reservationList = retrieveReservationList();
    let labReservationList = [];

    for(let r of reservationList) {
        if(r.labID == labID) {
            labReservationList.push(r);
        }
    }

    return labReservationList;
}

// retrieves the list of labs from local storage
function retrieveLabList() {
    const listString = localStorage.getItem("labList");
    let list = [];

    if(listString) {
        try {
            list = JSON.parse(listString);
            
            if(!Array.isArray(list)) {
                list = [];
            }
        } catch (e) {
            list = [];
        }
    }

    return list;
}

// generates a new student ID
function generateStudentID() {
    const studentList = retrieveStudentList();
    let maxID = 0;

    for(let s of studentList) {
        if(s.studentID > maxID) {
            maxID = s.studentID;
        }
    }
    return maxID + 1;
}

// generates a new tech ID
function generateTechID() {
    const techList = retrieveTechList();
    let maxID = 0;

    for(let t of techList) {
        if(t.techID > maxID) {
            maxID = t.techID;
        }
    }

    return maxID + 1;
}

// generates a new reservation ID
function generateReservationID() {
    const reservationList = retrieveReservationList();
    let maxID = 0;

    for(let r of reservationList) {
        if(r.reservationID > maxID) {
            maxID = r.reservationID;
        }
    }

    return maxID + 1;
}

// generates a new lab ID
function generateLabID() {
    const labList = retrieveLabList();
    let maxID = 0;

    for(let l of labList) {
        if(l.labID > maxID) {
            maxID = l.labID;
        }
    }

    return maxID + 1;
}