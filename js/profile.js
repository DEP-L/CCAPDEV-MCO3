// functions related to profiles (registry is handled by auth.js)

document.addEventListener("DOMContentLoaded", function () {
    const userList = retrieveUserList();
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    const urlParams = new URLSearchParams(window.location.search);
    const requestedUserStudentID = parseInt(urlParams.get("s")) || 0;
    const requestedUserTechID = parseInt(urlParams.get("t")) || 0; // Get user id (student id) from URL
    let requestedUser = userList.find(u => u.studentID == requestedUserStudentID && u.techID == requestedUserTechID);
    let isOwnProfile = false;

    const image = this.getElementById("image");
    const imageUpload = this.getElementById("imageUpload");
    const displayName = this.getElementById("displayName");
    const description = this.getElementById("description");

    const dashboard = this.getElementById("dashboard");
    const saveAccount = this.getElementById("saveAccount")
    const deleteAccount = this.getElementById("deleteAccount");

    if(currentUser.studentID == requestedUser.studentID && currentUser.techID == requestedUser.techID) {
        isOwnProfile = true;
    }

    if(dashboard) {
        dashboard.addEventListener("click", function() {
            window.location.href = "dash.html";
        });
    }

    if(image) {
        image.src = requestedUser.image || "img/default-avatar.jpg";    
    }

    if(displayName) {
        displayName.value = requestedUser.displayName;

        if(!isOwnProfile) {
            displayName.disabled = true;
        }
    }

    if(description) {
        description.value = requestedUser.description;

        if(!isOwnProfile) {
            description.disabled = true;
        }
    }

    if(imageUpload) {
        imageUpload.addEventListener("change", function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    image.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if(saveAccount) {
        saveAccount.addEventListener("click", function() {
            editProfile(image.src, displayName.value, description.value);
        });
    }

    if(deleteAccount) {
        deleteAccount.addEventListener("click", function() {

        });
    }
});

// edits a profile
function editProfile(imageSrc, displayName, description) {
    // retrieve userList
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    let userList = retrieveUserList();
    let user;

    if(user = userList.find(u => u.studentID == currentUser.studentID && u.techID == currentUser.techID)) {
        user.image = imageSrc;
        user.displayName = displayName;
        user.description = description;

        // replace the user with updated info
        for(let i = 0; i < userList; i++) {
            if(userList[i].studentID == user.studentID && userList[i].techID == user.techID) {
                userList[i] = user;
            }
        }
    } 

    localStorage.setItem("userList", JSON.stringify(userList));
    alert("Profile updated.");
}

// deletes a profile (and removes all related reservations)
function deleteProfile(studentID, techID) {
    // retrieveUserList, remove from list
    
    // if techID == 0, studentID > 0
    // deleteStudentReservations, if the user is a student (error for techs handled since no r has studentID == 0)

    // store userList -> localstorage
}