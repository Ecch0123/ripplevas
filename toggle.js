  // Function to open "Send Sign Request" modal and hide "Share with Others" modal
  function openSignRequestModal() {
    document.getElementById('signModal').style.display = 'none'; // Hide signModal
    document.getElementById('signRequestModal').style.display = 'block'; // Show request modal
}

// Function to close "Send Sign Request" modal and show "Share with Others" modal
function signcloseModal() {
    document.getElementById('signRequestModal').style.display = 'none'; // Hide request modal
    document.getElementById('signModal').style.display = 'block'; // Show signModal
}

// Function to close "Share with Others" modal
function closeSignModal() {
    document.getElementById('signModal').style.display = 'none';
}

function openShareModal() {
    document.getElementById('signModal').style.display = 'block'; // Example of showing a modal
}



function toggleMenu() {
    var menu = document.getElementById("dropdown");
    menu.style.display = menu.style.display === "block" ? "none" : "block";
}

// Close menu when clicking outside
document.addEventListener("click", function(event) {
    var menu = document.getElementById("dropdown");
    var menuIcon = document.querySelector(".menu-icon");
    if (!menuIcon.contains(event.target)) {
        menu.style.display = "none";
    }
});
function preparesendRequest() {
    document.getElementById('signRequestBtn').style.display = 'none'; // Hide signModal
    document.getElementById('signRequestModal').style.display = 'block'; // Show request modal
}


