// profile registration / login functions

document.addEventListener("DOMContentLoaded", function() {
    // code for login / register toggle + taking in input
    const registerSection = this.getElementById("registerSection");
    const loginSection = this.getElementById("loginSection");

    // by default, register section is hidden and login section is displayed
    registerSection.style.display = "none";
    loginSection.style.display = "block";

    // toggle between the register / login sections
    this.querySelectorAll(".authToggle").forEach(a => {
        a.addEventListener("click", function() {
            toggleAuthView(registerSection, loginSection);
        });
    });

    // register user profile
    this.getElementById("registerForm").addEventListener("submit", function(event) {
        const email = document.getElementById("emailRegister");
        const password = document.getElementById("passwordRegister");
        const accountType = document.getElementById("accountTypeRegister");

        if(registerProfile(email.value, password.value, accountType.value)) {
            toggleAuthView(registerSection, loginSection);
        }

        email.value = "";
        password.value = "";
        accountType.value = "";

        event.preventDefault();
    });

    // log user in
    this.getElementById("loginForm").addEventListener("submit", function(event) {
        const email = document.getElementById("emailLogin");
        const password = document.getElementById("passwordLogin");
        
        if(loginUser(email.value, password.value)) {
            // redirect to dashboard upon successful login
            window.location.href = "dash.html"; 
        }

        email.value = "";
        password.value = "";

        event.preventDefault();
    });
});

// toggle between the register / login views
function toggleAuthView(registerSection, loginSection) {
    if(registerSection.style.display === "none") {
        registerSection.style.display = "block";
        loginSection.style.display = "none";
    } else {
        registerSection.style.display = "none";
        loginSection.style.display = "block";
    }
}

// creates a new profile, return true if profile successfully registered
function registerProfile(email, password, accountType) {
    let userList = retrieveUserList();
    let studentID, techID;

    // check if email is valid
    if(!email.endsWith("@dlsu.edu.ph")) {
        alert("Please use a valid DLSU email.");
        return false;
    }

    // check if email already exists
    if(userList.some(u => u.email === email)) {
        alert("This email is already registered. Please login instead.");
        return false;
    }

    // check if password is filled out
    if(!password) {
        alert("Please input a password");
        return false;
    }

    // assign the ID depending on the account type
    if(accountType == "student") {
        studentID = generateStudentID();
        techID = 0;
    } else {
        studentID = 0;
        techID = generateTechID();
    }

    // push new user onto userList and store the editted list
    userList.push({
        studentID: studentID,
        techID: techID,
        email: email,
        password: password,
        displayName: "",
        description: "",
        image: "",
        sessionDate: new Date()
    });

    localStorage.setItem("userList", JSON.stringify(userList));
    alert("Account successfully registered.");

    return true;
}

// logs a user in, setting their login session to 8 days from the current date
function loginUser(email, password) {
    const currentDate = new Date();
    let userList = retrieveUserList();
    let currentUser = userList.find(u => u.email === email && u.password === password);
    let sessionDate = new Date();

    if(!currentUser) {
        alert("Invalid credentials.");
        return false;
    }

    // set the user's session date to last 21 days 
    sessionDate.setDate(currentDate.getDate() + 21);
    currentUser.sessionDate = sessionDate;

    // replace the user with the editted session date in the userList
    userList = userList.map(u => u.studentID === currentUser.studentID && u.techID === currentUser.techID ? currentUser : u);

    // store both the currentUser and updated userList locally
    localStorage.setItem("userList", JSON.stringify(userList));
    localStorage.setItem("currentUser", JSON.stringify(currentUser));

    alert("Login successful.");

    return true;
}