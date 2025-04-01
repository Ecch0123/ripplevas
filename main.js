if (typeof pdfjsLib !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
}

const pdfUpload = document.getElementById("pdf-upload");
const dropArea = document.getElementById("drop-area");

// Click event for file selection

// Drag & Drop Event Listeners
dropArea.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropArea.classList.add("dragover");
});

dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("dragover");
});


function showFilePreview(file) {
    const previewContainer = document.getElementById("file-preview");
    previewContainer.innerHTML = ""; // Clear previous preview

    const fileCard = document.createElement("div");
    fileCard.classList.add("file-card");

    fileCard.innerHTML = `
        <div class="file-info">
            <p><strong>Name:</strong> ${file.name}</p>
            <p><strong>Size:</strong> ${(file.size / 1024).toFixed(2)} KB</p>
            <p><strong>Type:</strong> PDF</p>
            <button class="remove-btn" onclick="removeFile()">❌</button>
        </div>
    `;

    previewContainer.appendChild(fileCard);
}

function removeFile() {
    document.getElementById("file-preview").innerHTML = "";
    document.getElementById("pdf-upload").value = ""; // Reset file input
}


document.addEventListener("DOMContentLoaded", function() {
    const newDocButton = document.querySelector(".upload button");
    const uploadContainer = document.querySelector(".upload-container");

    newDocButton.addEventListener("click", function() {
        if (uploadContainer.style.display === "none" || uploadContainer.style.display === "") {
            uploadContainer.style.display = "block";
        } else {
            uploadContainer.style.display = "none";
        }
    });

    document.addEventListener("click", function(event) {
        if (!uploadContainer.contains(event.target) && event.target !== newDocButton) {
            uploadContainer.style.display = "none";
        }
    });
});

function toggleUploadContainer() {
    document.getElementById("dashboard").style.display = "none"; // Hide Dashboard
    document.getElementById("inbox").style.display = "none"; // Hide Inbox (if exists)
    document.getElementById("sent").style.display = "none"; // Hide Sent (if exists)
    
    const uploadContainer = document.querySelector(".upload-container");
    if (uploadContainer.style.display === "block") {
        uploadContainer.style.display = "none"; // Hide if already open
    } else {
        uploadContainer.style.display = "block"; // Show Upload
    }
}

function showDashboard() {
    document.getElementById("dashboard").style.display = "block";
    document.querySelector(".upload-container").style.display = "none"; // Hide Upload
}

function inbox() {
    document.getElementById("inbox").style.display = "block";
    document.querySelector(".upload-container").style.display = "none"; // Hide Upload
}

function sent() {
    document.getElementById("sent").style.display = "block";
    document.querySelector(".upload-container").style.display = "none"; // Hide Upload
}


