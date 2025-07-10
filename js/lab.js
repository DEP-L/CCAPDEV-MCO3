// functions related to labs (adding, editing, deleting)

document.addEventListener("DOMContentLoaded", function () {
    const dashboard = this.getElementById("dashboard");
    const startTime = this.getElementById("startTime");
    const endTime = this.getElementById("endTime");
    const seatNumber = this.getElementById("seatNumber");
    const labSelect = this.getElementById("labSelect");
    const startTimeList = generateStartTimes();
    let endTimeList = generateEndTimes("00:00");
    let labList = retrieveLabList();

    // default option for the start time selection
    const defaultOptionS = this.createElement("option");
    defaultOptionS.innerText = "---select a time---";
    defaultOptionS.value = "default";
    defaultOptionS.disabled = true;
    defaultOptionS.selected = true;

    // default option for the end time selection
    const defaultOptionE = defaultOptionS.cloneNode(true);
    defaultOptionE.disabled = true;
    defaultOptionE.selected = true;

    if(dashboard) {
        dashboard.addEventListener("click", function() {
            window.location.href = "dash.html";
        });
    }

    //default option for the lab selection
    const defaultOptionL = this.createElement("option");
    defaultOptionL.innerText = "---select a lab---";
    defaultOptionL.value = "default";
    defaultOptionL.disabled = true;
    defaultOptionL.selected = true;

    if(startTime) {
        startTime.appendChild(defaultOptionS);

        // populate the start time selection
        startTimeList.forEach(function(t) {
            const o = document.createElement("option");
            o.innerText = t;
            o.value = t;
            startTime.appendChild(o);
        });

        // update the end time selection every time a start time is selected
        startTime.addEventListener("change", function() {
            if(startTime.value !== "default") {
                // clear the previous options and add the default option
                endTime.innerHTML = "";
                defaultOptionE.selected = true;
                endTime.appendChild(defaultOptionE);

                // generate a new list of end times and populate the end time list
                endTimeList = generateEndTimes(startTime.value);

                endTimeList.forEach(function(t) {
                    const o = document.createElement("option");
                    o.innerText = t;
                    o.value = t;
                    endTime.appendChild(o);
                });
            }
        });
    }

    if(endTime) {
        endTime.appendChild(defaultOptionE);
    }

    if(labSelect) {
        labSelect.appendChild(defaultOptionL);

        labList.forEach(function(l) {
            const o = document.createElement("option");
            o.innerText = l.labID;
            o.value = l.labID;
            labSelect.appendChild(o);
        });
    }

    // add lab and update the lab selection
    this.getElementById("createLabForm").addEventListener("submit", function(event) {
        addLab(startTime.value, endTime.value, seatNumber.value);
        labList = retrieveLabList();

        labSelect.innerHTML = "";
        defaultOptionL.selected = true;
        labSelect.appendChild(defaultOptionL);

        labList.forEach(function(l) {
            const o = document.createElement("option");
            o.innerText = l.labID;
            o.value = l.labID;
            labSelect.appendChild(o);
        });

        event.preventDefault();
    });

    // TODO: editting labs and their reservations

    // TODO: deleting labs and their reservations
});

// generates the list of timestamps in quarterly intervals for selection
function generateStartTimes() {
    // return list
    let list = [];
    let start = new Date();
    let end = new Date();

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 45, 0, 0);

    while(start <= end) {
        const hour = String(start.getHours()).padStart(2, '0');
        const min = String(start.getMinutes()).padStart(2, '0');
        list.push(`${hour}:${min}`);

        start.setMinutes(start.getMinutes() + 15);
    }

    return list;
}

// generates the list of timestamps quarterly after a given start time for selection
function generateEndTimes(s) {
    let list = [];
    const startH = s.split(":")[0];
    const startM = s.split(":")[1];
    let start = new Date();
    let end = new Date();

    start.setHours(startH, startM, 0, 0);
    end.setHours(23, 45, 0, 0);

    while(start <= end) {
        const hour = String(start.getHours()).padStart(2, '0');
        const min = String(start.getMinutes()).padStart(2, '0');
        list.push(`${hour}:${min}`);

        start.setMinutes(start.getMinutes() + 15);
    }

    return list;
}

// generates list of time slots in half hour intervals given a start and end time
function generateTimeList(start, end) {
    let list = [];
    let startTime = new Date();
    let endTime = new Date();

    if(start !== "default" && end !== "default") {
        startTime.setHours(start.split(":")[0], start.split(":")[1], 0, 0);
        endTime.setHours(end.split(":")[0], end.split(":")[1], 0, 0);

        // continue adding times as long as start < end, and the interval is >= 30mins
        while(startTime < endTime && endTime.getTime() - startTime.getTime() >= 30 * 60 * 1000) {
            const hour = String(startTime.getHours()).padStart(2, '0');
            const min = String(startTime.getMinutes()).padStart(2, '0');
            list.push(`${hour}:${min}`);

            startTime.setMinutes(startTime.getMinutes() + 30);
        }
    } else {
        alert("Please input a start and end time");
    }

    return list;
}

// generates a number of seats based on form input
function generateSeatList(n) {
    let list = [];
    const seatCount = parseInt(n);

    if(seatCount) {
        for(let i = 0; i < seatCount; i++) {
            list.push(i + 1);
        }
    } else if(seatCount == 0){
        alert("Please input a number for seat count");
    }

    return list;
}

// generates slots for a lab in {time, seat} pairs
function generateSlots(timeList, seatList) {
    // return list of slots
    let list = [];

    timeList.forEach(function(t) {
        seatList.forEach(function(s) {
            list.push({
                time: t,
                seat: s
            });
        })
    });

    return list;
}

// creates a lab
function addLab(start, end, n) {
    // retrieveLabList, push to list and store
    let labList = retrieveLabList();
    let labID, slotList;
    let startTime = new Date();
    let endTime = new Date();

    // start and end times must be inputted
    if(start == "default" || end == "default") {
        alert("Please input a start and end time");
        return false;
    }

    startTime.setHours(start.split(":")[0], start.split(":")[1], 0, 0);
    endTime.setHours(end.split(":")[0], end.split(":")[1], 0, 0);

    // interval between start and end must at least 30mins
    if(startTime == endTime || endTime.getTime() - startTime.getTime() < 30 * 60 * 1000) {
        alert("Please input times with an interval more than 30mins");
        return false;
    }

    // seat count must be a number
    if(!parseInt(n)) {
        alert("Please input a number for seat count.");
        return false;
    }

    // generate a lab ID and create a slot list
    labID = generateLabID();
    slotList = generateSlots(generateTimeList(start, end), generateSeatList(n));

    // push new lab onto labList and store it locally
    labList.push({
        labID: labID,
        slotList: slotList
    });

    localStorage.setItem("labList", JSON.stringify(labList));
    alert("Lab added successfully.");

    return true;
}

// TODO: removes a lab and all associated reservations
function deleteLab() {

}