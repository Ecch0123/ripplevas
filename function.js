

const { PDFDocument, rgb } = window.PDFLib;

let isResizing = false; // Global flag for resizing
let uploadedPDFBytes = null;
let savedSignatures = []; // Store multiple signatures
let lastX = 0;
let lastY = 0;
let startX = 0;
let pageNum = 1;
let startY = 0;
let fabricCanvas;
const addedElements = [];
let activeElement = null;
let  savedSignatureData = null;
var mods = 0;
var stateHistory = []; // Ensure it's initialized
if (typeof pdfjsLib !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc ="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
}
let isFirstFieldAdded = false;
const fieldCounter = {};
let fieldVisibility = {
    paragraph: false,
    checkbox: false,
    dropdown: false,
    image: false,
    attachment: false,
    initials: false
};
let sidebarCollapsed = false;

const pdfUpload = document.getElementById('pdf-upload');
const imageUpload = document.getElementById('image-upload');
const pdfRender = document.getElementById('pdf-render');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const pdfCtx = pdfRender.getContext('2d');
const textBox = document.getElementById('text-box');
















    


// PDF.js Loading (Upload all pages into separate containers with margins)

function displayFileName(fileName) {
    const fileNameContainer = document.getElementById("FileName");

    // Split the file name to prioritize the first word and file type
    const nameParts = fileName.split('.');
    const fileType = nameParts.pop(); // Get the file type (last part)
    const firstWord = nameParts[0]; // Get the first word
    const fullName = nameParts.join('.'); // Join remaining parts (if any) back

    // Create the display text
    let displayText = firstWord; // Start with the first word
    if (fullName.length > firstWord.length) {
        displayText += `...${fileType}`; // Append ellipsis and file type if there’s more text
    } else {
        displayText += `.${fileType}`; // Just append file type if no more text
    }

    // Create a div for the display text
    const displayDiv = document.createElement('div');
    displayDiv.className = 'file-name';
    displayDiv.innerHTML = displayText;

    // Create an input field for editing the file name (hidden initially)
    const inputField = document.createElement('input');
    inputField.type = 'text';
    inputField.value = fullName; // Set the full name as the value
    inputField.style.display = 'none'; // Hide the input field initially
    inputField.style.width = '100%'; // Set the width to fill the container

    inputField.addEventListener('blur', () => {
        // Update display on blur
        const updatedFileName = inputField.value;
        const updatedFirstWord = updatedFileName.split('.')[0];
        const updatedFileType = updatedFileName.split('.').pop();
        displayFileName(updatedFileName); // Call the display function again
    });

    // Click event to switch to the input field
    displayDiv.addEventListener('click', () => {
        displayDiv.style.display = 'none'; // Hide the display text
        inputField.style.display = 'block'; // Show the input field
        inputField.focus(); // Focus on the input field
    });

    // Clear the container and append the input field and display div
    fileNameContainer.innerHTML = ''; // Clear previous content
    fileNameContainer.appendChild(inputField); // Add input field
    fileNameContainer.appendChild(displayDiv); // Add display text
}
const container = canvas.parentElement;




async function handlePDFUpload(event) {
    const fileInput = event.target;

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        uploadedPDFName = file.name.replace(/\.[^/.]+$/, "");

        displayFileName(file.name);

        const fileReader = new FileReader();
        fileReader.onload = async function () {
            uploadedPDFBytes = new Uint8Array(this.result); // Convert to Uint8Array
            console.log("PDF Loaded Successfully!", uploadedPDFBytes);
            const pdfData = new Uint8Array(uploadedPDFBytes); // ✅ Use uploadedPDFBytes
            const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

            const container1 = document.getElementById("pdfContainer");

            // ✅ Save state before clearing to allow undoing to the previous PDF
            saveState();

            // ✅ Clear previous PDF content
            container1.innerHTML = ""; 

            // ✅ Reset undo/redo history to prevent mixing different PDFs
            stateHistory = [];
            mods = 0;

            for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
                const page = await pdf.getPage(pageNumber);
                const viewport = page.getViewport({ scale: 1.5 });

                // Create a container for each page
                const pageDiv = document.createElement("div");
                pageDiv.classList.add("pdfPage");
                pageDiv.id = `page-${pageNumber}`; // Unique ID for tracking
                pageDiv.style.position = "relative";

                // Create a canvas for rendering the PDF page
                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                // Render the PDF page on the canvas
                const renderContext = { canvasContext: context, viewport: viewport };
                await page.render(renderContext).promise;

                // ✅ Overlay image
                const overlayImage = new Image();
                overlayImage.src = "rippleVAs.png";
                overlayImage.style.width = "80%";
                overlayImage.style.height = "20%";
                overlayImage.style.opacity = "0.5";
                overlayImage.style.position = "absolute";
                overlayImage.style.top = "0";
                overlayImage.style.left = "10%";
                overlayImage.style.pointerEvents = "none";

                overlayImage.onload = function () {
                    context.globalAlpha = 0.1;
                    context.drawImage(overlayImage, 0, 0, viewport.width * 0.8, viewport.height * 0.2);
                    context.globalAlpha = 1.0;
                };

                // ✅ Create text layer
                const textLayerDiv = document.createElement("div");
                textLayerDiv.classList.add("textLayer");
                textLayerDiv.style.position = "absolute";
                textLayerDiv.style.top = "0";
                textLayerDiv.style.left = "0";
                textLayerDiv.style.width = `${viewport.width}px`;
                textLayerDiv.style.height = `${viewport.height}px`;
                textLayerDiv.style.pointerEvents = "all";
                textLayerDiv.style.color = "transparent";
                textLayerDiv.style.opacity = "0";

                // Render text layer
                const textContent = await page.getTextContent();
                pdfjsLib.renderTextLayer({
                    textContent: textContent,
                    container: textLayerDiv,
                    viewport: viewport,
                    textDivs: [],
                    enhanceTextSelection: true,
                    textLayerMode: 2
                });

                // Append elements to pageDiv
                pageDiv.appendChild(canvas);
                pageDiv.appendChild(textLayerDiv);

                // Append pageDiv to container
                container1.appendChild(pageDiv);
            }

            addPageNumberTracker();

            // ✅ Save the new PDF state after loading
            saveState();

            // ✅ Enable download button after successful PDF upload
            document.getElementById("download-btn").disabled = false;
            
        };

        fileReader.readAsArrayBuffer(file);
    }
}


document.addEventListener("mouseup", (event) => {
    const selection = window.getSelection();
    console.log("Selection:", selection.toString(), "Anchor Node:", selection.anchorNode);
});

document.addEventListener("mouseup", (event) => {
    setTimeout(() => {
        const selection = window.getSelection();
        if (!selection.isCollapsed && selection.anchorNode?.parentElement?.closest(".textLayer")) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            showContextMenu(rect.left + window.scrollX, rect.bottom + window.scrollY);
        } else {
            hideContextMenu();
        }
    }, 100);
});

function showContextMenu(x, y) {
    let contextMenu = document.getElementById("textContextMenu");

    if (!contextMenu) {
        contextMenu = document.createElement("div");
        contextMenu.id = "textContextMenu";
        document.body.appendChild(contextMenu);
    }

    // Set inner HTML with icons
    contextMenu.innerHTML = `
        <button onclick="copyText()" title="Copy"><i class="fas fa-copy"></i></button>
        <button onclick="applyTextStyle('highlight')" title="Highlight"><i class="fas fa-highlighter"></i></button>
        <button onclick="applyTextStyle('underline')" title="Underline"><i class="fas fa-underline"></i></button>
        <button onclick="applyTextStyle('squiggly')" title="Squiggly"><i class="fas fa-wave-square"></i></button>
        <button onclick="applyTextStyle('strikeout')" title="Strikeout"><i class="fas fa-strikethrough"></i></button>
        <button onclick="addLink()" title="Add Link"><i class="fas fa-link"></i></button>
    `;

    contextMenu.style.top = `${y + 10}px`;
    contextMenu.style.left = `${x}px`;
    contextMenu.style.position = "absolute";
    contextMenu.style.zIndex = "1000"; // Ensure it's above other elements
    
}

function hideContextMenu() {
    const contextMenu = document.getElementById("textContextMenu");
    if (contextMenu) {
        contextMenu.style.display = "none";
    }
}

// Apply styles to selected text
function applyTextStyle(type) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const span = document.createElement("span");

    switch (type) {
        case "highlight":
            span.style.backgroundColor = "yellow";
            break;
        case "underline":
            span.style.textDecoration = "underline";
            break;
        case "squiggly":
            span.style.borderBottom = "2px wavy red";
            break;
        case "strikeout":
            span.style.textDecoration = "line-through";
            break;
    }

    span.appendChild(range.extractContents());
    range.insertNode(span);
    window.getSelection().removeAllRanges();
    hideContextMenu();
}

// Copy text function
function copyText() {
    const selection = window.getSelection();
    if (selection.toString()) {
        navigator.clipboard.writeText(selection.toString()).then(() => {
            alert("Copied to clipboard!");
        });
    }
    hideContextMenu();
}

// Add a hyperlink to selected text
function addLink() {
    createLinkModal((url) => {
        if (url) {
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.target = "_blank";
            anchor.appendChild(markElement.firstChild);
            markElement.appendChild(anchor);
        }
    });
    hideContextMenu();
}



function addPageNumberTracker() {
    // Create a floating div for page number display
    const pageNumberDisplay = document.createElement("div");
    pageNumberDisplay.id = "currentPageDisplay";
    Object.assign(pageNumberDisplay.style, {
        position: "fixed",
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)", // Center align
        background: "rgba(0, 0, 0, 0.7)",
        color: "white",
        padding: "10px",
        borderRadius: "5px",
        fontSize: "16px",
        zIndex: "1000",
        fontFamily: "Arial, sans-serif",
        transition: "opacity 0.5s ease-out",
        opacity: "0",
        pointerEvents: "none",
    });
    document.body.appendChild(pageNumberDisplay);

    let hideTimeout;

    // Function to show and hide page number
    function showPageNumber() {
        pageNumberDisplay.style.opacity = "1"; // Show
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
            pageNumberDisplay.style.opacity = "0"; // Hide after 1s
        }, 1000);
    }

    // IntersectionObserver setup
    const observer = new IntersectionObserver(
        (entries) => {
            let visiblePage = null;
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    visiblePage = entry.target.dataset.page || entry.target.id.split("-")[1];
                }
            });
            if (visiblePage) {
                pageNumberDisplay.textContent = `Page ${visiblePage}`;
                showPageNumber();
            }
        },
        { root: null, threshold: 0.6 }
    );

    // Observe all pages
    document.querySelectorAll(".pdfPage").forEach((pageDiv, index) => {
        pageDiv.dataset.page = index + 1;
        observer.observe(pageDiv);
    });

    // Detect scroll to show page number
    document.addEventListener("scroll", showPageNumber, { passive: true });
}



function uploadPDF() {
    pdfUpload.click();
}





// ✅ Save the current state of the entire document, including canvas
function saveState() {
    if (!Array.isArray(stateHistory)) {
        stateHistory = []; // ✅ Ensure it's an array
    }

    if (mods > 0) {
        stateHistory = stateHistory.slice(0, -mods); // Remove redo history
        mods = 0;
    }

    let pages = document.querySelectorAll(".pdfPage");
    let snapshot = Array.from(pages).map(page => {
        let canvas = page.querySelector("canvas");
        let canvasData = canvas ? canvas.toDataURL() : null; // Save canvas as image

        return {
            pageId: page.id,
            content: page.innerHTML,
            canvasData: canvasData
        };
    });

    stateHistory.push(JSON.stringify(snapshot));
    console.log("State saved. Current history length:", stateHistory.length);
}

function undo() {
    if (!Array.isArray(stateHistory) || stateHistory.length <= 1) {
        console.warn("Cannot undo, no previous state.");
        return;
    }

    if (mods < stateHistory.length - 1) {
        let targetIndex = stateHistory.length - 1 - (mods + 1);
        restoreState(stateHistory[targetIndex]);
        mods += 1;
    } else {
        console.warn("No more undo steps available.");
    }
}

function redo() {
    if (!Array.isArray(stateHistory) || mods === 0) {
        console.warn("Cannot redo, no future state available.");
        return;
    }

    let targetIndex = stateHistory.length - 1 - (mods - 1);
    restoreState(stateHistory[targetIndex]);
    mods -= 1;
}

// ✅ Restore state function (Now includes canvas!)
function restoreState(stateJSON) {
    let state = JSON.parse(stateJSON);
    let container = document.querySelector("#pdfContainer");
    let currentPages = document.querySelectorAll(".pdfPage");

    currentPages.forEach(page => {
        if (!state.find(p => p.pageId === page.id)) {
            page.remove();
        }
    });

    state.forEach(pageState => {
        let page = document.getElementById(pageState.pageId);
        if (!page) {
            page = document.createElement("div");
            page.className = "pdfPage";
            page.id = pageState.pageId;
            container.appendChild(page);
        }
        page.innerHTML = pageState.content;

        // Restore canvas content
        let canvas = page.querySelector("canvas");
        if (canvas && pageState.canvasData) {
            let ctx = canvas.getContext("2d");
            let img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = pageState.canvasData;
        }

        // Reinitialize events for restored elements
        page.querySelectorAll(".stamp, .text-element, .shape").forEach(el => {
            setupMarkEvents(el, createMarkContextMenu(el));
            makeDraggable(el, page);
            createResizeHandles(el);
        });
    });

    console.log("State restoration complete.");
}

// ✅ Capture all changes
function captureState() {
    saveState();
}

// ✅ Listen to user actions instead of DOMNode changes
document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".pdfPage").forEach(page => {
        page.addEventListener("click", captureState);
    });

    saveState();
});

// ✅ Bind Undo/Redo to Keyboard Shortcuts
document.addEventListener("keydown", function (event) {
    if (event.ctrlKey && event.key === "z") {
        event.preventDefault();
        undo();
    }
    if (event.ctrlKey && event.key === "y") {
        event.preventDefault();
        redo();
    }
});


function hideAllContextMenus() {
    document.querySelectorAll(".context-menu").forEach(menu => {
        menu.style.display = "none";
    });
}


function insertText() {
    hideAllContextMenus(); // Hide all context menus before activating the text tool
    
    isDrawing = false;
    isCrosshairActive = false;
    isCrosshairActive = true; // Activate crosshair mode
    document.body.style.cursor = "crosshair";

    document.addEventListener("mousedown", startDrawingText);
    document.addEventListener("mouseup", finishDrawingText);

    console.log("Crosshair activated");
}

// Example: When activating the stamp tool, also hide context menus
function activateStampTool() {
    hideAllContextMenus(); // Hide all context menus before enabling the stamp tool
    console.log("Stamp tool activated");
}


function startDrawingText(event) {
    if (!isCrosshairActive) return; // Only start drawing if crosshair is active

    isDrawing = true;
    isCrosshairActive = false; // Disable crosshair after click

    const pageDiv = event.target.closest(".pdfPage");
    if (!pageDiv) return;

    const containerRect = pageDiv.getBoundingClientRect();
    const startX = event.clientX - containerRect.left;
    const startY = event.clientY - containerRect.top;

    tempTextBox = document.createElement("div");
    tempTextBox.className = "text-element";
    tempTextBox.style.position = "absolute";
    tempTextBox.style.left = `${startX}px`;
    tempTextBox.style.top = `${startY}px`;
    tempTextBox.style.width = "1px";
    tempTextBox.style.height = "1px";
    tempTextBox.style.border = "1px dashed black";
    tempTextBox.style.background = "rgba(0, 0, 0, 0.1)";
    tempTextBox.style.pointerEvents = "none";
    tempTextBox.style.zIndex = "1000";

    pageDiv.appendChild(tempTextBox);
    document.addEventListener("mousemove", resizeTextBox);
}

function finishDrawingText(event) {
    if (!tempTextBox) return;

    const pageDiv = event.target.closest(".pdfPage");
    if (!pageDiv) return;

    document.removeEventListener("mousemove", resizeTextBox);
    document.removeEventListener("mousedown", startDrawingText);
    document.removeEventListener("mouseup", finishDrawingText);

    const finalTextBox = createTextElement();
    finalTextBox.style.left = tempTextBox.style.left;
    finalTextBox.style.top = tempTextBox.style.top;
    finalTextBox.style.width = tempTextBox.style.width;
    finalTextBox.style.height = tempTextBox.style.height;

    pageDiv.appendChild(finalTextBox);
    pageDiv.removeChild(tempTextBox);
    tempTextBox = null;
    isDrawing = false;
    document.body.style.cursor = "default";

    // Attach draggable, resizer, and context menu
    const contextMenu = createMarkContextMenu(finalTextBox);
    pageDiv.appendChild(contextMenu);

    setupMarkEvents(finalTextBox, contextMenu);

    makeTextDraggable(finalTextBox, pageDiv);
    createResizeHandles(finalTextBox);

    finalTextBox.focus();
    saveState();
}

function resizeTextBox(event) {
    if (!tempTextBox) return;

    const pageDiv = event.target.closest(".pdfPage");
    if (!pageDiv) return;

    const containerRect = pageDiv.getBoundingClientRect();
    const newWidth = event.clientX - containerRect.left - parseFloat(tempTextBox.style.left);
    const newHeight = event.clientY - containerRect.top - parseFloat(tempTextBox.style.top);

    tempTextBox.style.width = `${Math.max(20, newWidth)}px`;
    tempTextBox.style.height = `${Math.max(20, newHeight)}px`;
}


// Create the text element with styles
// Create the text element with styles
function createTextElement() {
    const textElement = document.createElement('div');
    textElement.classList.add("text-element");
    textElement.contentEditable = "true";
    textElement.textContent = "Insert text here";

    Object.assign(textElement.style, {
        position: 'absolute',
        background: 'transparent',
        padding: '8px',
        border: '1px solid black',
        cursor: 'text',
        color: 'black',
        width: '200px',
        minHeight: '50px',
        resize: 'none',
        overflowY: 'scroll',
        overflowX: 'hidden',
        fontFamily: 'Arial',
        fontSize: '16px',
        display: 'flex',
        alignItems: 'flex-start',
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
        boxSizing: 'border-box',
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none' // IE/Edge
    });

    textElement.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            document.execCommand("insertLineBreak"); // Insert a new line instead of a column
        }
    });

    textElement.classList.add("hide-scrollbar"); // Chrome/Safari (added via CSS)
    return textElement;
}
function makeTextDraggable(textElement, pageDiv) {
    let offsetX, offsetY, isDragging = false;
    const contextMenu = textElement.nextElementSibling; // Get the context menu

    // ✅ Ensure text box has a visible border
    textElement.style.cursor = "default";
    textElement.style.border = "1px dashed black"; // Visible dashed border
    textElement.style.boxSizing = "border-box";

    function isBorderClick(event, bounds) {
        const borderWidth = 4; // Define border thickness
        return (
            event.clientX <= bounds.left + borderWidth ||
            event.clientX >= bounds.right - borderWidth ||
            event.clientY <= bounds.top + borderWidth ||
            event.clientY >= bounds.bottom - borderWidth
        );
    }

    // ✅ Change cursor to 4-sided arrow when hovering over the border
    textElement.addEventListener("mousemove", (event) => {
        const bounds = textElement.getBoundingClientRect();
        textElement.style.cursor = isBorderClick(event, bounds) ? "move" : "default";
    });

    // ✅ Dragging starts when clicking on the border
    textElement.addEventListener("mousedown", (event) => {
        const bounds = textElement.getBoundingClientRect();
        if (!isBorderClick(event, bounds)) return; // Prevent dragging from inside the text box

        isDragging = true;
        offsetX = event.clientX - bounds.left;
        offsetY = event.clientY - bounds.top;
        textElement.style.zIndex = "1000";
        event.preventDefault();
    });

    document.addEventListener("mousemove", (event) => {
        if (isDragging) {
            let newPage = document.elementFromPoint(event.clientX, event.clientY)?.closest(".pdfPage");

            if (newPage && newPage !== pageDiv) {
                pageDiv.removeChild(textElement);
                newPage.appendChild(textElement);
                pageDiv = newPage;
            }

            const containerRect = pageDiv.getBoundingClientRect();

            let newX = event.clientX - containerRect.left - offsetX;
            let newY = event.clientY - containerRect.top - offsetY;

            newX = Math.max(0, Math.min(newX, containerRect.width - textElement.offsetWidth));
            newY = Math.max(0, Math.min(newY, containerRect.height - textElement.offsetHeight));

            textElement.style.left = `${newX}px`;
            textElement.style.top = `${newY}px`;

            // Move the context menu along with the text box
            if (contextMenu) {
                contextMenu.style.left = `${newX}px`;
                contextMenu.style.top = `${newY + textElement.offsetHeight + 5}px`; // 5px below
            }
        }
    });

    document.addEventListener("mouseup", () => {
        isDragging = false;
        textElement.style.zIndex = "10";
    });
}
// Enable automatic height adjustment based on content
function enableAutoResize(textElement) {
    textElement.addEventListener('input', () => {
        textElement.style.height = 'auto';
        textElement.style.height = `${textElement.scrollHeight}px`;
    });
}










document.addEventListener("click", function(event) {
    if (event.target.classList.contains("text-element")) {
        activeElement = event.target;
        console.log("✍️ Text selected:", activeElement);
        createAlignmentContainer(); // Open menu near the selected signature
    }
});


function createAlignmentContainer() {
    

    const alignmentContainer = document.createElement("div");
    alignmentContainer.style.position = "fixed";
    alignmentContainer.style.left = "10px";
    alignmentContainer.style.bottom = "0";
    alignmentContainer.style.width = "18%";
    alignmentContainer.style.maxHeight = "70%";
    alignmentContainer.style.background = "#fff";
    alignmentContainer.style.border = "1px solid #ccc";
    alignmentContainer.style.borderRadius = "8px";
    alignmentContainer.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.2)";
    alignmentContainer.style.padding = "10px";
    alignmentContainer.style.display = "flex";
    alignmentContainer.style.flexDirection = "column";
    alignmentContainer.style.overflowY = "auto";

    function createHeader(text) {
        const header = document.createElement("div");
        header.innerText = text;
        header.style.fontSize = "20px";
        header.style.fontWeight = "bold";
        header.style.textAlign = "center";
        header.style.padding = "10px 0";
        header.style.borderBottom = "1px solid #A9A9A9";
        header.style.color = "#A9A9A9";
        return header;
    }
    alignmentContainer.addEventListener("click", (event) => event.stopPropagation());

    alignmentContainer.appendChild(createHeader("FREE TEXT ANNOTATION"));

    function createIconButton(iconClass, onClick, tooltip) {
        const button = document.createElement("button");
        button.innerHTML = `<i class="${iconClass}"></i>`;
        button.style.border = "2px solid transparent";
        button.style.background = "transparent";
        button.style.cursor = "pointer";
        button.style.padding = "8px";
        button.style.fontSize = "40px";
        button.style.display = "flex";
        button.style.alignItems = "center";
        button.style.justifyContent = "center";
        button.style.borderRadius = "15%";
        button.style.color = "#D3D3D3";
        button.title = tooltip;

        button.onmouseover = () => button.style.borderColor = "blue";
        button.onmouseout = () => button.style.borderColor = "transparent";
        button.onclick = onClick;

        return button;
    }

    const textStyleRow = document.createElement("div");
    textStyleRow.style.display = "flex";
    textStyleRow.style.justifyContent = "center";

    const boldButton = createIconButton("fas fa-bold", () => {
        activeElement.style.fontWeight = activeElement.style.fontWeight === "bold" ? "normal" : "bold";
    }, "Bold");

    const underlineButton = createIconButton("fas fa-underline", () => {
        activeElement.style.textDecoration = activeElement.style.textDecoration === "underline" ? "none" : "underline";
    }, "Underline");

  

    const fontSizeSelect = document.createElement("select");
    ["12px", "14px", "16px", "18px", "24px", "32px", "48px"].forEach(size => {
        const option = document.createElement("option");
        option.value = size;
        option.textContent = size;
        fontSizeSelect.appendChild(option);
    });
    fontSizeSelect.onchange = () => activeElement.style.fontSize = fontSizeSelect.value;

    const fontFamilySelect = document.createElement("select");
    ["Arial", "Times New Roman", "Courier New", "Georgia", "Verdana"].forEach(font => {
        const option = document.createElement("option");
        option.value = font;
        option.textContent = font;
        fontFamilySelect.appendChild(option);
    });
    fontFamilySelect.onchange = () => activeElement.style.fontFamily = fontFamilySelect.value;

    textStyleRow.appendChild(boldButton);
    textStyleRow.appendChild(underlineButton);
    
    textStyleRow.appendChild(fontSizeSelect);
    textStyleRow.appendChild(fontFamilySelect);

    const alignmentRow = document.createElement("div");
    alignmentRow.style.display = "flex";
    alignmentRow.style.justifyContent = "center";

    const alignLeftButton = createIconButton("fas fa-align-left", () => {
        activeElement.style.display = "block"; // Ensure block-level display
        activeElement.style.textAlign = "left";
    }, "Align Left");
    
    const alignCenterButton = createIconButton("fas fa-align-center", () => {
        activeElement.style.display = "block";
        activeElement.style.textAlign = "center";
    }, "Align Center");
    
    const alignRightButton = createIconButton("fas fa-align-right", () => {
        activeElement.style.display = "block";
        activeElement.style.textAlign = "right";
    }, "Align Right");
    
    const justifyButton = createIconButton("fas fa-align-justify", () => {
        activeElement.style.display = "block";
        activeElement.style.textAlign = "justify";
    }, "Justify");
    
    alignmentRow.appendChild(alignLeftButton);
    alignmentRow.appendChild(alignCenterButton);
    alignmentRow.appendChild(alignRightButton);
    alignmentRow.appendChild(justifyButton);

    function createColorPickerSection(title, applyColorCallback, clearCallback) {
        const container = document.createElement("div");
        container.style.marginBottom = "10px";

        const label = document.createElement("label");
        label.textContent = title;
        label.style.display = "block";
        container.appendChild(label);

        const colorPicker = document.createElement("input");
        colorPicker.type = "color";
        colorPicker.style.margin = "5px";
        container.appendChild(colorPicker);

        const addButton = document.createElement("button");
        addButton.textContent = "Add";
        addButton.style.margin = "5px";
        container.appendChild(addButton);

        const clearButton = document.createElement("button");
        clearButton.textContent = "Clear";
        clearButton.style.margin = "5px";
        container.appendChild(clearButton);

        const colorList = document.createElement("div");
        colorList.style.display = "grid";
        colorList.style.gridTemplateColumns = "repeat(6, 20px)";
        colorList.style.gap = "10px";
        colorList.style.marginTop = "5px";
        container.appendChild(colorList);

        const commonColors = [
            "#b9724a", "#edb160", "#51dbda", "#e9685d", "#7a96e8",
            "#d7d7d7", "#333333", "#ffffff", "#915395", "#7dd48b"
        ];

        let selectedColorItem = null;

        function createColorItem(color) {
            const colorItem = document.createElement("div");
            colorItem.style.width = "25px";
            colorItem.style.height = "25px";
            colorItem.style.borderRadius = "50%";
            colorItem.style.backgroundColor = color;
            colorItem.style.cursor = "pointer";
            colorItem.style.border = "2px solid transparent";

            colorItem.onclick = () => {
                if (selectedColorItem) {
                    selectedColorItem.style.border = "2px solid transparent";
                }
                colorItem.style.border = "2px solid blue";
                selectedColorItem = colorItem;

                applyColorCallback(color);
            };

            colorList.appendChild(colorItem);
        }

        commonColors.forEach(createColorItem);

        addButton.onclick = () => {
            const color = colorPicker.value;
            createColorItem(color);
            applyColorCallback(color);
        };

        clearButton.onclick = () => {
            clearCallback();
            if (title === "Fill Color") {
                activeElement.style.backgroundColor = "transparent"; // Ensure fill color resets to transparent
            } else {
                activeElement.style.color = "black"; // Reset other colors to black
            }
        };

        return container;
    }
    const strokeColorSection = createColorPickerSection(
        "Font Color",
        (color) => { activeElement.style.color = color; },
        () => { activeElement.style.color = "black"; }
    );
    const strokeWidthLabel = document.createElement("label");
    strokeWidthLabel.textContent = "Font Color Width";

    const strokeWidthSlider = document.createElement("input");
    strokeWidthSlider.type = "range";
    strokeWidthSlider.min = "0";
    strokeWidthSlider.max = "10";
    strokeWidthSlider.value = "1";
    strokeWidthSlider.style.margin = "5px";
    strokeWidthSlider.oninput = () => {
        activeElement.style.textShadow = `0 0 ${strokeWidthSlider.value}px ${activeElement.style.color}`;
    };
    const opacityLabel = document.createElement("label");
    opacityLabel.textContent = "Opacity";


    const fillColorSection = createColorPickerSection(
        "Fill Color",
        (color) => { activeElement.style.backgroundColor = color; },
        () => { activeElement.style.backgroundColor = "transparent"; }
    );

   

   

   
    const opacitySlider = document.createElement("input");
    opacitySlider.type = "range";
    opacitySlider.min = "0";
    opacitySlider.max = "1";
    opacitySlider.step = "0.05";
    opacitySlider.value = "1";
    opacitySlider.style.margin = "5px";
    opacitySlider.oninput = () => {
        activeElement.style.opacity = opacitySlider.value;
    };

    alignmentContainer.appendChild(textStyleRow);
    alignmentContainer.appendChild(alignmentRow);
    alignmentContainer.appendChild(strokeColorSection);
    alignmentContainer.appendChild(strokeWidthLabel);
    alignmentContainer.appendChild(strokeWidthSlider);
    alignmentContainer.appendChild(fillColorSection);
   

    alignmentContainer.appendChild(opacityLabel);
    alignmentContainer.appendChild(opacitySlider);

    return alignmentContainer;
}async function downloadAsPDF() {
    console.log("Checking uploadedPDFBytes before downloading:", uploadedPDFBytes);

    if (!uploadedPDFBytes || uploadedPDFBytes.length === 0) {
        alert("No PDF uploaded! Please upload a file first.");
        return;
    }

    const uploadedPDFCopy = new Uint8Array(uploadedPDFBytes);
    const pages = document.querySelectorAll(".pdfPage");
    
    // ✅ Load the existing PDF
    const pdfDoc = await PDFDocument.load(uploadedPDFCopy);

    for (let i = 0; i < pages.length; i++) {
        const page = pdfDoc.getPage(i);
        const canvas = pages[i].querySelector("canvas");
        const rect = canvas.getBoundingClientRect();

        // ✅ Get PDF dimensions
        const { width: pdfWidth, height: pdfHeight } = page.getSize();
        const scaleX = pdfWidth / rect.width;
        const scaleY = pdfHeight / rect.height;

        // ✅ Select all elements (Text, Stamps, Signatures, Fields)
        const addedElements = pages[i].querySelectorAll(".text-element, .stamp-element, .signature-element, .pdf-element");

        for (let mod of addedElements) {
            const modRect = mod.getBoundingClientRect();
            const x = (modRect.left - rect.left) * scaleX;
            const y = pdfHeight - ((modRect.top - rect.top) * scaleY + (mod.clientHeight * scaleY));
            
            // ✅ Convert element to an image and embed it
            const imgData = await captureElementAsImage(mod);
            if (imgData) {
                const imgBytes = await fetch(imgData).then(res => res.arrayBuffer());
                const imgEmbed = await pdfDoc.embedPng(imgBytes);
                
                page.drawImage(imgEmbed, {
                    x,
                    y,
                    width: mod.clientWidth * scaleX,
                    height: mod.clientHeight * scaleY,
                });
            }
        }
    }

    // ✅ Save and download the modified PDF (True PDF)
    const modifiedPdfBytes = await pdfDoc.save();
    const blob = new Blob([modifiedPdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "modified.pdf";
    link.click();
}

// ✅ Function to capture an element as an image
async function captureElementAsImage(element) {
    return new Promise((resolve) => {
        html2canvas(element, { backgroundColor: null }).then(canvas => {
            resolve(canvas.toDataURL("image/png"));
        });
    });
}


async function drawTextToPDF(textElement, pdfDoc, page, x, y, scaleX, scaleY) {
    try {
        const canvas = await html2canvas(textElement, { backgroundColor: null, scale: 2 });
        const imgData = canvas.toDataURL("image/png"); // Convert to PNG

        // Convert image data to an array buffer
        const imgBytes = await fetch(imgData).then(res => res.arrayBuffer());
        const img = await pdfDoc.embedPng(imgBytes);

        // Draw the image onto the PDF
        page.drawImage(img, {
            x: x,
            y: y,
            width: textElement.offsetWidth * scaleX,
            height: textElement.offsetHeight * scaleY,
        });
    } catch (error) {
        console.error("Error capturing text element as image", error);
    }
}








// Ensure this is declared before any function uses it

function createSignatureStyleMenu() {
    let styleMenu = document.getElementById("styleMenu");

    if (!styleMenu) {
        styleMenu = document.createElement("div");
        styleMenu.id = "styleMenu";
        styleMenu.classList.add("signature-style-menu");

        Object.assign(styleMenu.style, {
            position: "fixed",
            left: "10px",
            bottom: "0",
            width: "18%",
            height: "70vh",
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: "8px",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
            padding: "10px",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            zIndex: "1001",
        });

        // ✅ Prevent closing when clicking inside
        styleMenu.addEventListener("click", (event) => event.stopPropagation());
        
        // ✅ Thickness Control
        const thicknessLabel = document.createElement("label");
        thicknessLabel.textContent = "Thickness:";
        thicknessLabel.style.display = "block";

        const thicknessInput = document.createElement("input");
        thicknessInput.type = "range";
        thicknessInput.min = "1";
        thicknessInput.max = "10";
        thicknessInput.value = "2";
        thicknessInput.style.width = "100%";
        thicknessInput.addEventListener("input", () => {
            if (activeElement) {
                const path = activeElement.querySelector("path");
                if (path) path.setAttribute("stroke-width", thicknessInput.value);
            }
        });

        // ✅ Color Picker Section (Only for Stroke Color)
        function createColorPickerSection(title, applyColorCallback, clearCallback) {
            const container = document.createElement("div");
            container.style.marginBottom = "10px";

            const label = document.createElement("label");
            label.textContent = title;
            label.style.display = "block";
            container.appendChild(label);

            const colorPicker = document.createElement("input");
            colorPicker.type = "color";
            colorPicker.style.margin = "5px";
            container.appendChild(colorPicker);

            const addButton = document.createElement("button");
            addButton.textContent = "Add";
            addButton.style.margin = "5px";
            container.appendChild(addButton);

            const clearButton = document.createElement("button");
            clearButton.textContent = "Clear";
            clearButton.style.margin = "5px";
            container.appendChild(clearButton);

            const colorList = document.createElement("div");
            colorList.style.display = "grid";
            colorList.style.gridTemplateColumns = "repeat(6, 20px)";
            colorList.style.gap = "10px";
            colorList.style.marginTop = "5px";
            container.appendChild(colorList);

            const commonColors = [
                "#b9724a", "#edb160", "#51dbda", "#e9685d", "#7a96e8",
                "#d7d7d7", "#333333", "#ffffff", "#915395", "#7dd48b"
            ];

            let selectedColorItem = null;

            function createColorItem(color) {
                const colorItem = document.createElement("div");
                colorItem.style.width = "25px";
                colorItem.style.height = "25px";
                colorItem.style.borderRadius = "50%";
                colorItem.style.backgroundColor = color;
                colorItem.style.cursor = "pointer";
                colorItem.style.border = "2px solid transparent";

                colorItem.onclick = () => {
                    if (selectedColorItem) {
                        selectedColorItem.style.border = "2px solid transparent";
                    }
                    colorItem.style.border = "2px solid blue";
                    selectedColorItem = colorItem;

                    applyColorCallback(color);
                };

                colorList.appendChild(colorItem);
            }

            commonColors.forEach(createColorItem);

            addButton.onclick = () => {
                const color = colorPicker.value;
                createColorItem(color);
                applyColorCallback(color);
            };

            clearButton.onclick = () => {
                clearCallback();
            };

            return container;
        }

        const strokeColorSection = createColorPickerSection(
            "Stroke Color",
            (color) => {
                if (activeElement) {
                    const path = activeElement.querySelector("path");
                    if (path) path.setAttribute("stroke", color);
                }
            },
            () => {
                if (activeElement) {
                    const path = activeElement.querySelector("path");
                    if (path) path.setAttribute("stroke", "#000000");
                }
            }
        );

        // ✅ Opacity Control
        const opacityLabel = document.createElement("label");
        opacityLabel.textContent = "Opacity:";
        opacityLabel.style.display = "block";

        const opacityInput = document.createElement("input");
        opacityInput.type = "range";
        opacityInput.min = "0.1";
        opacityInput.max = "1";
        opacityInput.step = "0.1";
        opacityInput.value = "1";
        opacityInput.style.width = "100%";
        opacityInput.addEventListener("input", () => {
            if (activeElement) {
                const path = activeElement.querySelector("path");
                if (path) path.setAttribute("stroke-opacity", opacityInput.value);
            }
        });

        styleMenu.append(
            thicknessLabel, thicknessInput,
            strokeColorSection,
            opacityLabel, opacityInput
        );

        document.body.appendChild(styleMenu);
    }

    styleMenu.style.display = "block";
    return styleMenu;
}

// ✅ Ensure clicking a signature opens the menu
document.addEventListener("click", function(event) {
    if (event.target.classList.contains("signature-element")) {
        activeElement = event.target;
        console.log("✍️ Signature selected:", activeElement);
        createSignatureStyleMenu(); // Open menu near the selected signature
    }
});



function startSigning() {
    let signatureStyle = {
        thickness: 2,
        color: "black",
        opacity: 1
    };

    const signContainer = document.createElement('div');
    signContainer.style.position = 'fixed';
    signContainer.style.top = '50%';
    signContainer.style.left = '50%';
    signContainer.style.transform = 'translate(-50%, -50%)';
    signContainer.style.border = '1px solid rgb(51, 204, 210)';
    signContainer.style.padding = '10px';
    signContainer.style.background = 'white';
    signContainer.style.zIndex = '1000';
    signContainer.style.display = 'flex';
    signContainer.style.flexDirection = 'column';
    signContainer.style.alignItems = 'center';

    // Wrapper for signature preview (Canvas + Uploaded Image)
    const signPreviewContainer = document.createElement('div');
    signPreviewContainer.style.width = '400px';
    signPreviewContainer.style.height = '200px';
    signPreviewContainer.style.border = '2px solid rgb(127, 210, 216)';
    signPreviewContainer.style.position = 'relative';
    signPreviewContainer.style.overflow = 'hidden';
    signContainer.appendChild(signPreviewContainer);

    const signBox = document.createElement('canvas');
    signBox.width = 400;
    signBox.height = 200;
    signBox.style.position = 'absolute';
    signBox.style.top = '0';
    signBox.style.left = '0';
    signPreviewContainer.appendChild(signBox);

    const signCtx = signBox.getContext('2d');
    let isSigning = false;
    let pathData = [];

    function updateSignatureStyle() {
        signCtx.lineWidth = signatureStyle.thickness;
        signCtx.strokeStyle = signatureStyle.color;
        signCtx.globalAlpha = signatureStyle.opacity;
    }

    signBox.addEventListener('mousedown', (e) => {
        updateSignatureStyle();
        isSigning = true;
        signCtx.beginPath();
        signCtx.moveTo(e.offsetX, e.offsetY);
        pathData.push(`M${e.offsetX},${e.offsetY}`);
    });

    signBox.addEventListener('mouseup', () => {
        isSigning = false;
    });

    signBox.addEventListener('mousemove', (e) => {
        if (!isSigning) return;
        signCtx.lineTo(e.offsetX, e.offsetY);
        signCtx.stroke();
        pathData.push(`L${e.offsetX},${e.offsetY}`);
    });

    const uploadInput = document.createElement('input');
    uploadInput.type = 'file';
    uploadInput.accept = 'image/*';
    uploadInput.style.marginTop = '10px';
    uploadInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                // Remove any previous image before adding a new one
                const existingImg = signPreviewContainer.querySelector("img");
                if (existingImg) {
                    existingImg.remove();
                }

                const imgPreview = document.createElement("img");
                imgPreview.src = reader.result;
                imgPreview.style.width = "100%";
                imgPreview.style.height = "100%";
                imgPreview.style.position = "absolute";
                imgPreview.style.top = "0";
                imgPreview.style.left = "0";
                imgPreview.style.opacity = signatureStyle.opacity;
                imgPreview.style.objectFit = "contain";

                signPreviewContainer.appendChild(imgPreview);

                savedSignatures.push({
                    type: 'image',
                    data: `<img src="${reader.result}" width="400" height="200" style="opacity: ${signatureStyle.opacity};"/>`
                });
            };
            reader.readAsDataURL(file);
        }
    };
    signContainer.appendChild(uploadInput);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.marginTop = '10px';
    buttonContainer.style.gap = '10px';

    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.onclick = () => {
        if (pathData.length > 0) {
            savedSignatures.push({
                type: 'svg',
                data: `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
                    <path d="${pathData.join(' ')}" stroke="${signatureStyle.color}" fill="none" stroke-width="${signatureStyle.thickness}" stroke-opacity="${signatureStyle.opacity}" />
                </svg>`
            });
        }

        document.body.style.cursor = "crosshair";
        document.addEventListener("click", placeSignature);
        document.body.removeChild(signContainer);
    };
    buttonContainer.appendChild(saveButton);

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.onclick = () => {
        document.body.removeChild(signContainer);
    };
    buttonContainer.appendChild(cancelButton);

    signContainer.appendChild(buttonContainer);
    document.body.appendChild(signContainer);
}



function placeSignature(event) {
    if (savedSignatures.length === 0) return;

    const pageCanvas = event.target.closest(".pdfPage")?.querySelector("canvas");
    if (!pageCanvas) return;

    const containerRect = pageCanvas.getBoundingClientRect();
    const x = event.clientX - containerRect.left;
    const y = event.clientY - containerRect.top;

    // Get the last saved signature and remove it from the queue
    const signatureData = savedSignatures.pop();

    const signElement = document.createElement("div");
    signElement.classList.add("signature-element");
    signElement.innerHTML = signatureData.data;
    signElement.style.position = 'absolute';
    signElement.style.left = `${x}px`;
    signElement.style.top = `${y}px`;
    signElement.style.cursor = 'move';
    signElement.style.width = '400px'; 
    signElement.style.height = '200px';
    signElement.style.zIndex = "1000";

    pageCanvas.parentElement.appendChild(signElement);

    // Apply dragging, resizer, and context menu
    const contextMenu = createMarkContextMenu(signElement);
    pageCanvas.parentElement.appendChild(contextMenu);
    setupMarkEvents(signElement, contextMenu);
    makeDraggable(signElement, pageCanvas.parentElement);
    createSignatureResizer(signElement);

    document.body.style.cursor = "default";

    // If there are still more signatures, allow placing another one
    if (savedSignatures.length > 0) {
        document.addEventListener("click", placeSignature);
    } else {
        document.removeEventListener("click", placeSignature);
    }

    saveState();
}async function drawSignatureToPDF(signatureElement, pdfDoc, page) {
    const imgTag = signatureElement.querySelector("img");
    const svgTag = signatureElement.querySelector("svg");
    
    if (imgTag) {
        // Ensure uploaded image stays within the sign container
        imgTag.style.maxWidth = "100%";
        imgTag.style.maxHeight = "100%";
        imgTag.style.objectFit = "contain";
        
        // Handle uploaded image signature
        const imgBytes = await fetch(imgTag.src).then(res => res.arrayBuffer());
        const img = await pdfDoc.embedPng(imgBytes);
        const { x, y } = getTextElementPosition(signatureElement);
        
        page.drawImage(img, {
            x: x,
            y: y,
            width: signatureElement.clientWidth,
            height: signatureElement.clientHeight,
        });
    } else if (svgTag) {
        // Convert SVG to image and embed it in the PDF
        const svgData = new XMLSerializer().serializeToString(svgTag);
        const svgBlob = new Blob([svgData], { type: "image/svg+xml" });
        const svgUrl = URL.createObjectURL(svgBlob);
        const img = new Image();
        img.src = svgUrl;
        
        await new Promise(resolve => img.onload = resolve);
        
        const offCanvas = document.createElement("canvas");
        offCanvas.width = signatureElement.clientWidth;
        offCanvas.height = signatureElement.clientHeight;
        const ctx = offCanvas.getContext("2d");
        ctx.drawImage(img, 0, 0, offCanvas.width, offCanvas.height);
        
        const pngUrl = offCanvas.toDataURL("image/png");
        const pngBytes = await fetch(pngUrl).then(res => res.arrayBuffer());
        const pngImage = await pdfDoc.embedPng(pngBytes);
        const { x, y } = getTextElementPosition(signatureElement);
        
        page.drawImage(pngImage, {
            x: x,
            y: y,
            width: signatureElement.clientWidth,
            height: signatureElement.clientHeight,
        });
        
        URL.revokeObjectURL(svgUrl);
    }
}


function createSignatureResizer(signElement) {
    const handles = [
        { position: "top-left", cursor: "nwse-resize" },
        { position: "top-right", cursor: "nesw-resize" },
        { position: "bottom-left", cursor: "nesw-resize" },
        { position: "bottom-right", cursor: "nwse-resize" },
    ];

    const signature = signElement.querySelector("svg, img"); // Get signature content
    const originalWidth = signElement.offsetWidth;
    const originalHeight = signElement.offsetHeight;

    handles.forEach(handle => {
        const resizer = document.createElement("div");
        resizer.classList.add("resizer", handle.position);
        resizer.style.width = "20px";
        resizer.style.height = "20px";
        resizer.style.background = "blue";
        resizer.style.position = "absolute";
        resizer.style.cursor = handle.cursor;
        resizer.style.zIndex = "1000";
        resizer.style.opacity = "0";

        if (handle.position.includes("top")) resizer.style.top = "-5px";
        if (handle.position.includes("bottom")) resizer.style.bottom = "-5px";
        if (handle.position.includes("left")) resizer.style.left = "-5px";
        if (handle.position.includes("right")) resizer.style.right = "-5px";

        signElement.appendChild(resizer);
        resizer.addEventListener("mousedown", initResize);
    });

    function initResize(e) {
        e.stopPropagation();
        e.preventDefault();

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = signElement.offsetWidth;
        const startHeight = signElement.offsetHeight;
        const startLeft = signElement.offsetLeft;
        const startTop = signElement.offsetTop;
        const handleType = e.target.classList[1]; // e.g., 'top-left', 'bottom-right'

        function doResize(event) {
            const dx = event.clientX - startX;
            const dy = event.clientY - startY;

            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;

            switch (handleType) {
                case 'top-left':
                    newWidth = startWidth - dx;
                    newHeight = startHeight - dy;
                    newLeft = startLeft + dx;
                    newTop = startTop + dy;
                    break;
                case 'top-right':
                    newWidth = startWidth + dx;
                    newHeight = startHeight - dy;
                    newTop = startTop + dy;
                    break;
                case 'bottom-left':
                    newWidth = startWidth - dx;
                    newHeight = startHeight + dy;
                    newLeft = startLeft + dx;
                    break;
                case 'bottom-right':
                    newWidth = startWidth + dx;
                    newHeight = startHeight + dy;
                    break;
            }

            // Prevent shrinking too small
            const minSize = 10;
            if (newWidth < minSize) newWidth = minSize;
            if (newHeight < minSize) newHeight = minSize;

            signElement.style.width = `${newWidth}px`;
            signElement.style.height = `${newHeight}px`;
            signElement.style.left = `${newLeft}px`;
            signElement.style.top = `${newTop}px`;

            // Scale signature content inside (SVG or IMG)
            if (signature) {
                signature.style.width = `${newWidth}px`;
                signature.style.height = `${newHeight}px`;

                if (signature.tagName.toLowerCase() === "svg") {
                    signature.setAttribute("width", newWidth);
                    signature.setAttribute("height", newHeight);
                    const path = signature.querySelector("path");
                    if (path) {
                        path.setAttribute("transform", `scale(${newWidth / originalWidth}, ${newHeight / originalHeight})`);
                    }
                }
            }
        }

        function stopResize() {
            document.removeEventListener('mousemove', doResize);
            document.removeEventListener('mouseup', stopResize);
            saveState();
        }

        document.addEventListener('mousemove', doResize);
        document.addEventListener('mouseup', stopResize);
    }
}










function insertCalendar() {
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().split("T")[0]; // Extract YYYY-MM-DD

    addElementToPDF(formattedDate);
    document.body.style.cursor = "crosshair"; 
}



function insertCheckMark() {
    addElementToPDF("\u2713"); 
    document.body.style.cursor = "crosshair"; 
}
function insertXMark() {
    addElementToPDF("\u274C");
    document.body.style.cursor = "crosshair"; 
}


function insertDotMark() {
    addElementToPDF("•");
    document.body.style.cursor = "crosshair"; 
}



function activateEraser() {
    document.body.style.cursor = "crosshair"; // Indicate eraser mode

    function removeElement(event) {
        if (event.target.classList.contains("pdf-element")) {
            event.target.remove();
        }
    }

    document.addEventListener("click", removeElement);
    
    // Exit eraser mode after 5 seconds
    setTimeout(() => {
        document.body.style.cursor = "default";
        document.removeEventListener("click", removeElement);
    }, 5000);
}




function insertCalendar() {
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().split("T")[0]; // Extract YYYY-MM-DD

    addElementToPDF(formattedDate);
    document.body.style.cursor = "crosshair"; 
}

function insertCheckMark() {
    addElementToPDF("\u2713"); 
    document.body.style.cursor = "crosshair"; 
}

function insertXMark() {
    addElementToPDF("\u274C");
    document.body.style.cursor = "crosshair"; 
}

function insertDotMark() {
    addElementToPDF("•");
    document.body.style.cursor = "crosshair"; 
}
function addElementToPDF(content) {
    document.querySelectorAll(".pdfPage").forEach((pageDiv) => {
        pageDiv.addEventListener(
            "click",
            function placeMark(event) {
                const containerRect = pageDiv.getBoundingClientRect();
                const pageCanvas = pageDiv.querySelector("canvas");
                if (!pageCanvas) return;
                
                const scale = pageCanvas.width / pageCanvas.offsetWidth;
                const x = (event.clientX - containerRect.left) * scale;
                const y = (event.clientY - containerRect.top) * scale;

                // ✅ Create a text div inside the PDF canvas container
                let element = document.createElement("div");
                element.classList.add("pdf-element");
                Object.assign(element.style, {
                    position: "absolute",
                    left: `${event.clientX - containerRect.left}px`,
                    top: `${event.clientY - containerRect.top}px`,
                    width: "auto",
                    height: "auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "move",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "28px",
                    fontWeight: "bold",
                    background: "transparent",
                    pointerEvents: "auto",
                    padding: "5px",
                    whiteSpace: "nowrap"
                });

                let mark = document.createElement("span");
                mark.classList.add("mark");
                mark.textContent = content;
                mark.contentEditable = "true"; // Allow text editing
                element.appendChild(mark);

                // ✅ Append inside the PDF canvas container
                pageCanvas.parentElement.appendChild(element);

                // Attach resizer, context menu, and drag functionalities
                const contextMenu = createMarkContextMenu(element);
                pageCanvas.parentElement.appendChild(contextMenu);

                makeDraggable(element, pageCanvas.parentElement);
                createResizeHandles(element);

                // ✅ Save state after placing text
                const textData = {
                    type: "text",
                    text: content,
                    x,
                    y,
                    fontSize: "28px",
                    fontWeight: "bold",
                    pageIndex: parseInt(pageDiv.dataset.pageIndex, 10),
                    element: element // Keep reference for future actions
                };

                saveState(textData); // ✅ Save state with text data

                // Reset cursor style after adding the mark
                document.body.style.cursor = "default";

                pageDiv.removeEventListener("click", placeMark);
            },
           
        );
    });
}




function changeSelectedMarksColor(color) {
    let selectedMarks = document.querySelectorAll(".pdf-element.selected");
    console.log("Selected Marks:", selectedMarks); // Debugging log
    selectedMarks.forEach(el => {
        let mark = el.querySelector(".mark");
        if (mark) {
            mark.style.color = color;
            console.log("Updated color for:", mark.textContent, "to", color);
        }
    });
}


function hideAllMarks() {
    document.querySelectorAll(".pdf-element").forEach(el => {
        el.style.border = "2px solid transparent";
        el.nextElementSibling.style.display = "none";
        el.querySelectorAll(".resize-handle").forEach(handle => {
            handle.style.display = "none";
        });
        el.classList.remove("selected");
    });
}

function updateColorPicker(element) {
    let colorPicker = document.getElementById("colorPicker");
    if (colorPicker) {
        let mark = element.querySelector(".mark");
        colorPicker.value = rgbToHex(window.getComputedStyle(mark).color);
    }
}

function rgbToHex(rgb) {
    let result = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    return result ? "#" + (1 << 24 | result[1] << 16 | result[2] << 8 | result[3]).toString(16).slice(1) : "#000000";
}

// Example of how to change the color of the selected mark
let colorPicker = document.getElementById("colorPicker");
colorPicker.addEventListener("input", () => {
    changeSelectedMarksColor(colorPicker.value);



});

function setupMarkEvents(markElement, contextMenu) {
    if (markElement.dataset.eventsApplied) return; // Prevent duplicate event listeners
    markElement.dataset.eventsApplied = "true";

    function hideAllMarks() {
        document.querySelectorAll(".pdf-element, .text-element").forEach(el => {
            el.style.border = "2px solid transparent";
            el.contentEditable = "true"; // Disable editing for all
            el.classList.remove("selected");

            // Hide context menu if it exists
            if (el.nextElementSibling && el.nextElementSibling.classList.contains("mark-context-menu")) {
                el.nextElementSibling.style.display = "none";
            }

            // Hide resizers
            el.querySelectorAll(".resize-handle").forEach(handle => {
                handle.style.display = "none";
            });
        });

        // Hide all context menus
        document.querySelectorAll(".mark-context-menu").forEach(menu => {
            menu.style.display = "none";
        });
    }

    function positionContextMenu() {
        const rect = markElement.getBoundingClientRect();
        const parentRect = markElement.parentElement.getBoundingClientRect();
        contextMenu.style.left = `${rect.left - parentRect.left}px`;
        contextMenu.style.top = `${rect.bottom - parentRect.top + 5}px`;
    }

    markElement.addEventListener("click", (event) => {
        event.stopPropagation();
        hideAllMarks(); // Hide previous selections

        // ✅ Update active element and make it editable
        activeElement = markElement;
        activeElement.classList.add("selected");
        activeElement.style.border = "2px solid black";
        activeElement.contentEditable = "true"; // Enable editing for the selected element

        // Show resizers
        activeElement.querySelectorAll(".resize-handle").forEach(handle => {
            handle.style.display = "block";
        });

        // ✅ Show and position the context menu
        positionContextMenu();
        contextMenu.style.display = "block";
    });

    document.addEventListener("click", (event) => {
        if (!markElement.contains(event.target) && !contextMenu.contains(event.target)) {
            markElement.contentEditable = "true"; // Disable editing when clicking outside
            markElement.style.border = "2px solid transparent";
            markElement.classList.remove("selected");

            if (activeElement === markElement) {
                activeElement = null; // Reset selection when clicking outside
            }

            contextMenu.style.display = "none"; // ✅ Hide context menu
        }
    });

    // Prevent context menu from closing when clicking inside
    contextMenu.addEventListener("click", (e) => e.stopPropagation());

    // Close menu when clicking a button inside it
    contextMenu.querySelectorAll("button").forEach(button => {
        button.addEventListener("click", () => {
            contextMenu.style.display = "none";
            markElement.style.border = "2px solid transparent";
            markElement.contentEditable = "true"; // Make sure it stays disabled
            markElement.querySelectorAll(".resize-handle").forEach(handle => {
                handle.style.display = "none";
            });
        });
    });

    console.log("setupMarkEvents applied to:", markElement);
}



function hideAllResizeHandles() {
    document.addEventListener("click", (event) => {
        if (!event.target.closest('.pdf-element') && !event.target.closest('.mark-context-menu')) {
            hideAllHandles(); // Use a differently named function
        }
    });

    function hideAllHandles() {
        document.querySelectorAll(".resize-handle").forEach((resizeHandle) => {
            resizeHandle.style.display = "none";
        });
        document.querySelectorAll(".pdf-element").forEach((el) => {
            el.style.border = "2px solid transparent";
        });
    }
}



function createMarkContainer(markElement) {
    const markContainer = document.createElement("div");
    markContainer.style.position = "fixed";
    markContainer.style.left = "10px";
    markContainer.style.bottom = "0";
    markContainer.style.width = "18%";
    markContainer.style.height = "70%";
    markContainer.style.background = "#fff";
    markContainer.style.border = "1px solid #ccc";
    markContainer.style.borderRadius = "8px";
    markContainer.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.2)";
    markContainer.style.padding = "10px";
    markContainer.style.display = "flex";
    markContainer.style.flexDirection = "column";
    
    function createHeader(text) {
        const header = document.createElement("div");
        header.innerText = text;
        header.style.fontSize = "20px";
        header.style.fontWeight = "bold";
        header.style.textAlign = "center";
        header.style.padding = "10px 0";
        header.style.borderBottom = "1px solid #A9A9A9";
        header.style.color = "#A9A9A9";
        return header;
    }

    markContainer.appendChild(createHeader("MARK ANNOTATION"));

    function createColorPickerSection(title, applyColorCallback) {
        const container = document.createElement("div");
        container.style.marginBottom = "10px";

        const label = document.createElement("label");
        label.textContent = title;
        label.style.display = "block";
        container.appendChild(label);

        const colorPicker = document.createElement("input");
        colorPicker.type = "color";
        colorPicker.style.margin = "5px";
        container.appendChild(colorPicker);

        colorPicker.oninput = () => {
            applyColorCallback(colorPicker.value);
        };
        
        return container;
    }

    const strokeColorSection = createColorPickerSection("Text Color", (color) => {
        markElement.style.color = color;
    });

    const opacityLabel = document.createElement("label");
    opacityLabel.textContent = "Opacity";
    
    const opacitySlider = document.createElement("input");
    opacitySlider.type = "range";
    opacitySlider.min = "0";
    opacitySlider.max = "1";
    opacitySlider.step = "0.05";
    opacitySlider.value = "1";
    opacitySlider.style.margin = "5px";
    opacitySlider.oninput = () => {
        markElement.style.opacity = opacitySlider.value;
    };
    
    markContainer.appendChild(strokeColorSection);
    markContainer.appendChild(opacityLabel);
    markContainer.appendChild(opacitySlider);

    return markContainer;
}


document.addEventListener("contextmenu", function (event) {
    // Check if the clicked element is editable (text, mark, stamp, etc.)
    if (!activeElement) {
        console.warn("No active element selected for context menu.");
        event.preventDefault();
        return;
    }
    
    // Call function to show context menu at the cursor position
    showContextMenu(event);
});


function createMarkContextMenu(markElement, markContainer) {
    const markContextMenu = document.createElement('div');
    markContextMenu.classList.add("mark-context-menu");
    Object.assign(markContextMenu.style, {
        position: 'absolute',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '5px',
        display: 'none',
        zIndex: '1000',
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)'
    });

    function createIconButton(iconClass, onClick) {
        const button = document.createElement('button');
        button.innerHTML = `<i class="${iconClass}"></i>`;
        Object.assign(button.style, {
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            margin: '5px',
            fontSize: '14px'
        });
        button.onclick = onClick;
        return button;
    }

    const deleteButton = createIconButton("fas fa-trash-alt", () => {
        console.log("🗑️ Deleting mark element:", markElement);
        console.log("🗑️ Deleting mark container:", markContainer);
    
        if (markElement && document.body.contains(markElement)) {
            markElement.remove();
            console.log("✅ Mark element removed");
        }
    
        if (markContainer && document.body.contains(markContainer)) {
            markContainer.remove();
            console.log("✅ Mark container removed");
        }
    
        if (markContextMenu && document.body.contains(markContextMenu)) {
            markContextMenu.remove();
            console.log("✅ Context menu removed");
        }
    });
    

    const linkButton = createIconButton('fas fa-link', () => {
        createLinkModal((url) => {
            if (url) {
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.target = "_blank";
                anchor.appendChild(markElement.firstChild);
                markElement.appendChild(anchor);
            }
        });
    });
  
    // Modify the comment button to use the modal
    const commentButton = createIconButton('fas fa-comment', () => {
        createCommentModal();
    });
    
   


    function togglePanel(panelId) {
        let panel = document.getElementById(panelId);
    
        if (!activeElement) {
            console.warn("❌ No active element selected.");
            return;
        }
    
        document.querySelectorAll(".pdf-element, .text-element").forEach(el => {
            if (el !== activeElement) {
                el.contentEditable = "true";
                el.style.border = "2px solid transparent";
            }
        });
    
        if (!panel) {
            if (panelId === "alignmentContainer") {
                panel = createAlignmentContainer(activeElement);
            } else if (panelId === "markContainer") {
                panel = createMarkContainer(activeElement);
            } else if (panelId === "styleMenu") {  // 🆕 Create Signature Style Panel
                panel = createSignatureStyleMenu(activeElement);
            }
    
            if (panel) {
                panel.id = panelId;
                document.body.appendChild(panel);
            } else {
                console.error(`❌ Cannot create panel with ID '${panelId}'`);
                return;
            }
        }
    
        updatePanelStyles(panel, activeElement);
    
        // Hide all other panels except the one being toggled
        document.querySelectorAll("#alignmentContainer, #markContainer, #stampsPanel, #styleMenu")
            .forEach(p => {
                if (p !== panel) p.style.display = "none";
            });
    
        panel.style.display = "block";
        panel.style.zIndex = "1001";
    }
    
    
    
    // ✅ Style Button (Paintbrush) → Opens correct panel for selected element
    const styleButton = createIconButton("fas fa-paint-brush", () => {
        if (!activeElement) {
            console.warn("❌ No active element selected for styling.");
            return;
        }
    
        if (activeElement.classList.contains("text-element")) {
            console.log("📌 Text box selected → Showing alignment container");
            togglePanel("alignmentContainer");
        } else if (activeElement.classList.contains("signature-element")) {  
            console.log("✍️ Signature selected → Showing signature style container"); 
            togglePanel("styleMenu");
        }
         else {
            console.log("📌 Mark selected → Showing mark container");
            togglePanel("markContainer");
        }
    });
    
    

    function updatePanelStyles(panel, element) {
        if (!panel || !element) return;
    
        // ✅ Example: Update font size input
        const fontSizeInput = panel.querySelector("#fontSizeInput");
        if (fontSizeInput) {
            fontSizeInput.value = parseInt(window.getComputedStyle(element).fontSize, 10) || 16;
        }
    
        // ✅ Example: Update text color input
        const colorInput = panel.querySelector("#colorInput");
        if (colorInput) {
            colorInput.value = window.getComputedStyle(element).color || "#000000";
        }
    
        // ✅ Example: Update text alignment buttons
        const textAlign = window.getComputedStyle(element).textAlign;
        panel.querySelectorAll(".alignment-btn").forEach(btn => {
            btn.classList.remove("active");
            if (btn.dataset.align === textAlign) {
                btn.classList.add("active");
            }
        });
    
        console.log("✅ Panel updated with selected element styles:", element);
    }
    
    
    
    markContextMenu.append(deleteButton, linkButton, commentButton, styleButton);

    // 🛠️ Call `setupMarkEvents` to ensure context menu hides properly
    setupMarkEvents(markElement, markContextMenu);

    // Prevent clicks inside the context menu from hiding it
    markContextMenu.addEventListener("click", (e) => e.stopPropagation());

    document.body.appendChild(markContextMenu);
    return markContextMenu;
}



function createLinkModal(callback) {
    // Create the modal container
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.background = '#fff';
    modal.style.padding = '20px';
    modal.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    modal.style.zIndex = '1000';
    modal.style.borderRadius = '8px';

    // Create the title
    const title = document.createElement('h3');
    title.textContent = 'Insert Link or Page';
    modal.appendChild(title);

    // Create the input field
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter URL';
    input.style.width = '100%';
    input.style.margin = '10px 0';
    input.style.padding = '5px';
    modal.appendChild(input);

    // Create the link button
    const linkButton = document.createElement('button');
    linkButton.textContent = 'Link';
    linkButton.style.padding = '5px 10px';
    linkButton.style.background = '#007bff';
    linkButton.style.color = '#fff';
    linkButton.style.border = 'none';
    linkButton.style.cursor = 'pointer';
    linkButton.disabled = true;
    modal.appendChild(linkButton);

    // Enable button when input has text
    input.addEventListener('input', () => {
        linkButton.disabled = !input.value.trim();
    });

    // Close modal on outside click
    function closeModal() {
        document.body.removeChild(modal);
    }

    // Create close button
    const closeButton = document.createElement('span');
    closeButton.textContent = '×';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '15px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '18px';
    closeButton.onclick = closeModal;
    modal.appendChild(closeButton);

    // Handle link insertion
    linkButton.onclick = () => {
        callback(input.value.trim());
        closeModal();
    };

    document.body.appendChild(modal);
}

  function createCommentModal(markElement) {
        // Check if the modal already exists
        if (document.getElementById('comment-modal')) return;
    
        // Create the modal container
        const modal = document.createElement('div');
        modal.id = 'comment-modal';
        modal.style.position = 'fixed';
        modal.style.top = '50%';
        modal.style.right = '20px';
        modal.style.width = '300px';
        modal.style.height = '400px';
        modal.style.background = '#fff';
        modal.style.border = '1px solid #ccc';
        modal.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        modal.style.zIndex = '1';
        modal.style.padding = '10px';
        modal.style.borderRadius = '8px';
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';

        
        // Modal Header
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.paddingBottom = '10px';
        header.style.borderBottom = '1px solid #ccc';
    
        const title = document.createElement('h3');
        title.textContent = 'Comments';
        title.style.margin = '0';
        title.style.fontSize = '16px';
        
        const closeButton = document.createElement('span');
        closeButton.textContent = '×';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontSize = '18px';
        closeButton.onclick = () => document.body.removeChild(modal);
        
        header.appendChild(title);
        header.appendChild(closeButton);
        modal.appendChild(header);
    
        // Comment List Section
        const commentList = document.createElement('div');
        commentList.style.flex = '1';
        commentList.style.overflowY = 'auto';
        commentList.style.padding = '10px';
        commentList.style.borderBottom = '1px solid #ccc';
    
        // Comment Input Section
        const commentInput = document.createElement('input');
        commentInput.type = 'text';
        commentInput.placeholder = 'Add a comment...';
        commentInput.style.width = '100%';
        commentInput.style.padding = '5px';
        commentInput.style.marginTop = '10px';
        commentInput.style.border = '1px solid #ccc';
        commentInput.style.borderRadius = '4px';
    
        const sendButton = document.createElement('button');
        sendButton.textContent = 'Send';
        sendButton.style.marginTop = '10px';
        sendButton.style.padding = '5px 10px';
        sendButton.style.background = '#007bff';
        sendButton.style.color = '#fff';
        sendButton.style.border = 'none';
        sendButton.style.cursor = 'pointer';
        sendButton.style.borderRadius = '4px';
    
        sendButton.onclick = () => {
            if (commentInput.value.trim() === '') return;
            addComment(commentList, commentInput.value.trim());
            commentInput.value = '';
        };
    
        // Append elements
        modal.appendChild(commentList);
        modal.appendChild(commentInput);
        modal.appendChild(sendButton);
    
        document.body.appendChild(modal);
    }
    
    // Function to add a new comment
    function addComment(commentList, text) {
        const commentItem = document.createElement('div');
        commentItem.style.borderBottom = '1px solid #eee';
        commentItem.style.padding = '5px 0';
    
        const commentText = document.createElement('p');
        commentText.textContent = text;
        commentText.style.margin = '0';
        commentText.style.fontSize = '14px';
    
        const replyInput = document.createElement('input');
        replyInput.type = 'text';
        replyInput.placeholder = 'Reply...';
        replyInput.style.width = '100%';
        replyInput.style.padding = '3px';
        replyInput.style.marginTop = '5px';
        replyInput.style.border = '1px solid #ccc';
        replyInput.style.borderRadius = '4px';
    
        const replyButton = document.createElement('button');
        replyButton.textContent = 'Reply';
        replyButton.style.marginTop = '5px';
        replyButton.style.padding = '3px 8px';
        replyButton.style.background = '#28a745';
        replyButton.style.color = '#fff';
        replyButton.style.border = 'none';
        replyButton.style.cursor = 'pointer';
        replyButton.style.borderRadius = '4px';
    
        replyButton.onclick = () => {
            if (replyInput.value.trim() === '') return;
            const replyText = document.createElement('p');
            replyText.textContent = `↳ ${replyInput.value.trim()}`;
            replyText.style.margin = '5px 0 0 10px';
            replyText.style.fontSize = '12px';
            replyText.style.color = '#555';
    
            commentItem.appendChild(replyText);
            replyInput.value = '';
        };
    
        commentItem.appendChild(commentText);
        commentItem.appendChild(replyInput);
        commentItem.appendChild(replyButton);
        commentList.appendChild(commentItem);
    }
    



document.getElementById("send-comment").addEventListener("click", function() {
    const commentInput = document.getElementById("main-reply-input");
    const commentText = commentInput.value.trim();

    if (commentText !== "") {
        const commentsList = document.getElementById("comments-list");
        const commentDiv = document.createElement("div");
        commentDiv.classList.add("comment-thread");

        const commentHeader = document.createElement("div");
        commentHeader.classList.add("comment-header");

        const commentIcon = document.createElement("div");
        commentIcon.classList.add("comment-icon");
        commentIcon.textContent = "U"; // Or some user icon

        const commentTextDiv = document.createElement("div");
        commentTextDiv.classList.add("comment-text");
        commentTextDiv.textContent = commentText;

        commentHeader.appendChild(commentIcon);
        commentDiv.appendChild(commentHeader);
        commentDiv.appendChild(commentTextDiv);

        commentsList.appendChild(commentDiv);
        commentInput.value = ""; // Clear the input
    }
});


function positionMarkContextMenu(markElement, contextMenu) {
    const rect = markElement.getBoundingClientRect();
    const canvasRect = markElement.parentElement.getBoundingClientRect();

    contextMenu.style.left = `${rect.left - canvasRect.left}px`;
    contextMenu.style.top = `${rect.bottom - canvasRect.top + 5}px`; // 5px below the mark
    contextMenu.style.display = "block"; // Ensure visibility
}

// Function to show comment panel




function createResizeHandles(element) {
    const handles = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    const handleSize = '10px';

    handles.forEach(handle => {
        const resizeHandle = document.createElement('div');
        resizeHandle.classList.add('resize-handle', handle);

        // Common styles for all handles
        Object.assign(resizeHandle.style, {
            position: 'absolute',
            width: handleSize,
            height: handleSize,
            backgroundColor: 'blue',
            zIndex: '10',
            display: 'none', // Hidden initially
            opacity: '0'
        });

        // Positioning each handle
        switch (handle) {
            case 'top-left':
                Object.assign(resizeHandle.style, { left: '-5px', top: '-5px', cursor: 'nwse-resize' });
                break;
            case 'top-right':
                Object.assign(resizeHandle.style, { right: '-5px', top: '-5px', cursor: 'nesw-resize' });
                break;
            case 'bottom-left':
                Object.assign(resizeHandle.style, { left: '-5px', bottom: '-5px', cursor: 'nesw-resize' });
                break;
            case 'bottom-right':
                Object.assign(resizeHandle.style, { right: '-5px', bottom: '-5px', cursor: 'nwse-resize' });
                break;
        }

        // Append handle to the element
        element.appendChild(resizeHandle);

        // Add event listener for resizing
        resizeHandle.addEventListener('mousedown', initResize);
    });
}

function initResize(e) {
    e.stopPropagation();
    e.preventDefault();

    const element = e.target.parentElement;
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = parseInt(window.getComputedStyle(element).width, 10);
    const startHeight = parseInt(window.getComputedStyle(element).height, 10);
    const startLeft = parseInt(element.style.left, 10) || 0;
    const startTop = parseInt(element.style.top, 10) || 0;
    const aspectRatio = startWidth / startHeight;
    const handleType = e.target.classList[1]; // e.g., 'top-left', 'bottom-right'

    function doResize(event) {
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
    
        let newWidth = startWidth;
        let newHeight = startHeight;
        let newLeft = startLeft;
        let newTop = startTop;
    
        switch (handleType) {
            case 'top-left':
                newWidth = startWidth - dx;
                newHeight = startHeight - dy;
                newLeft = startLeft + dx;
                newTop = startTop + dy;
                break;
            case 'top-right':
                newWidth = startWidth + dx;
                newHeight = startHeight - dy;
                newTop = startTop + dy;
                break;
            case 'bottom-left':
                newWidth = startWidth - dx;
                newHeight = startHeight + dy;
                newLeft = startLeft + dx;
                break;
            case 'bottom-right':
                newWidth = startWidth + dx;
                newHeight = startHeight + dy;
                break;
        }
    

    // Prevent resizing too small
    const minSize = 20;
    if (newWidth < minSize) newWidth = minSize;
    if (newHeight < minSize) newHeight = minSize;

    element.style.width = `${newWidth}px`;
    element.style.height = `${newHeight}px`;
    element.style.left = `${newLeft}px`;
    element.style.top = `${newTop}px`;

    // Adjust font size smoothly based on element size
    let scaleFactor = Math.min(newWidth / startWidth, newHeight / startHeight);
    let baseFontSize = 28;
    let newFontSize = Math.max(12, baseFontSize * scaleFactor);

    element.querySelectorAll('.mark').forEach(mark => {
        mark.style.fontSize = `${newFontSize}px`;
        mark.style.lineHeight = `${newHeight - 8}px`;
        mark.style.whiteSpace = "nowrap";
    });

    const contextMenu = element.nextElementSibling; // Get the context menu
    if (contextMenu && contextMenu.classList.contains("mark-context-menu")) {
        contextMenu.style.left = `${newLeft}px`;
        contextMenu.style.top = `${newTop + newHeight + 5}px`; // 5px below the mark
    }

    // 🔥 UPDATE NEW SIZE FOR FUTURE RESIZES
    element.dataset.width = newWidth;
    element.dataset.height = newHeight;
}

     

    function stopResize() {
        document.removeEventListener('mousemove', doResize);
        document.removeEventListener('mouseup', stopResize);
    }

    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);
}



// Function to make an element draggable across different pages
function makeDraggable(element, pageDiv) {
    let offsetX, offsetY, isDragging = false;
    const contextMenu = element.nextElementSibling; // Get the context menu

    element.addEventListener("mousedown", (event) => {
        isDragging = true;
        offsetX = event.clientX - element.getBoundingClientRect().left;
        offsetY = event.clientY - element.getBoundingClientRect().top;
        element.style.zIndex = "1000";
        event.preventDefault();
    });

    document.addEventListener("mousemove", (event) => {
        if (isDragging) {
            let newPage = document.elementFromPoint(event.clientX, event.clientY)?.closest(".pdfPage");

            if (newPage && newPage !== pageDiv) {
                // Move the element to the new pageDiv
                pageDiv.removeChild(element);
                newPage.appendChild(element);
                pageDiv = newPage; // Update reference to the new page
            }

            const containerRect = pageDiv.getBoundingClientRect();

            let newX = event.clientX - containerRect.left - offsetX;
            let newY = event.clientY - containerRect.top - offsetY;

            // Ensure the element stays within the pageDiv boundaries
            newX = Math.max(0, Math.min(newX, containerRect.width - element.offsetWidth));
            newY = Math.max(0, Math.min(newY, containerRect.height - element.offsetHeight));

            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;

            // Move the context menu along with the element
            if (contextMenu) {
                contextMenu.style.left = `${newX}px`;
                contextMenu.style.top = `${newY + element.offsetHeight + 5}px`; // 5px below
            }
        }
    });

    document.addEventListener("mouseup", () => {
        isDragging = false;
        element.style.zIndex = "10";

        // Keep the context menu at the final position
        if (contextMenu) {
            const rect = element.getBoundingClientRect();
            contextMenu.style.left = `${rect.left}px`;
            contextMenu.style.top = `${rect.bottom + window.scrollY + 5}px`; // Stay below the mark
        }
    });
}




function showResizeHandles(element) {
    element.querySelectorAll('.resize-handle').forEach(handle => {
        handle.style.display = 'block';
    });
    element.style.border = '2px solid black'; // Show border
}

function changeSelectedMarksColor(color) {
    document.querySelectorAll(".pdf-element").forEach(el => {
        if (el.style.border === "2px solid black") {
            el.querySelector(".mark").style.color = color;
        }
    });
}




function insertShape(type) {
    document.querySelectorAll(".pdfPage").forEach((pageDiv) => {
        pageDiv.addEventListener(
            "click",
            function placeShape(event) {
                const containerRect = pageDiv.getBoundingClientRect();
                const pageCanvas = pageDiv.querySelector("canvas");
                if (!pageCanvas) return;

                // ✅ Ensure the shape is placed inside the canvas container
                const shape = document.createElement("div");
                shape.classList.add("pdf-element", "shape", type);
                Object.assign(shape.style, {
                    position: "absolute",
                    left: `${event.clientX - containerRect.left}px`,
                    top: `${event.clientY - containerRect.top}px`,
                    width: "100px",
                    height: "100px",
                    border: "2px solid black",
                    cursor: "move",
                    zIndex: "1",
                    pointerEvents: "auto"
                });

                // Apply specific styles based on shape type
                if (type === "rectangle") {
                    shape.style.background = "rgba(0, 0, 255, 0.3)"; // Semi-transparent blue
                } else if (type === "circle") {
                    shape.style.borderRadius = "50%";
                    shape.style.background = "rgba(255, 0, 0, 0.3)"; // Semi-transparent red
                } else {
                    shape.innerHTML = getSVGShape(type);
                }

                // ✅ Append the shape inside the PDF canvas container
                pageCanvas.parentElement.appendChild(shape);

                // Attach resizer, context menu, and drag functionalities
                const contextMenu = createMarkContextMenu(shape);
                pageCanvas.parentElement.appendChild(contextMenu);

                setupMarkEvents(shape, contextMenu);
                makeDraggable(shape, pageCanvas.parentElement);
                createResizeHandles(shape);

                // ✅ Save state after placing a shape
                saveState();

                // Store shape data for undo/redo
                const shapeData = {
                    type: "shape",
                    shapeType: type,
                    x: parseFloat(shape.style.left),
                    y: parseFloat(shape.style.top),
                    width: parseFloat(shape.style.width),
                    height: parseFloat(shape.style.height),
                    pageIndex: parseInt(pageDiv.dataset.pageIndex, 10),
                    element: shape // Keep reference for future actions
                };

                saveState(shapeData); // ✅ Save state with shape data

                // Remove the click event after placement
                pageDiv.removeEventListener("click", placeShape);
            },
            { once: true }
        );
    });
}


// Function to get an SVG for more complex shapes
function getSVGShape(type) {
    switch (type) {
        case "line":
            return `<svg width="100" height="100"><line x1="0" y1="50" x2="100" y2="50" stroke="black" stroke-width="2"/></svg>`;
        case "arrow":
            return `<svg width="100" height="100"><line x1="10" y1="50" x2="80" y2="50" stroke="black" stroke-width="3"/><polygon points="80,45 100,50 80,55" fill="black"/></svg>`;
        case "pentagon":
            return `<svg width="100" height="100"><polygon points="50,10 61,35 90,35 65,55 75,85 50,68 25,85 35,55 10,35 39,35" fill="rgba(0,255,0,0.3)" stroke="black" stroke-width="2"/></svg>`;
        case "star":
            return `<svg width="100" height="100"><polygon points="50,10 61,35 90,35 65,55 75,85 50,68 25,85 35,55 10,35 39,35" fill="yellow" stroke="black" stroke-width="2"/></svg>`;
        case "zigzag":
            return `<svg width="100" height="100"><polyline points="0,20 20,40 40,20 60,40 80,20 100,40" stroke="black" stroke-width="3" fill="none"/></svg>`;
        case "table":
            return `<svg width="100" height="100"><rect width="100" height="100" fill="rgba(200,200,200,0.3)" stroke="black" stroke-width="2"/><line x1="0" y1="50" x2="100" y2="50" stroke="black" stroke-width="2"/><line x1="50" y1="0" x2="50" y2="100" stroke="black" stroke-width="2"/></svg>`;
        default:
            return "";
    }
}

function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) {
        console.error(`${panelId} not found!`);
        return;
    }

    // Hide other panels
    document.querySelectorAll("#stampsPanel, .mark-container, .alignment-container").forEach(container => {
        if (container !== panel) {
            container.style.display = "none";
        }
    });

    // ✅ Toggle visibility
    if (panel.style.display === "none" || panel.style.display === "") {
        panel.style.display = "block";
        panel.style.zIndex = "1001"; // Ensure panel is on top
    } else {
        panel.style.display = "none";
    }
}

function insertRubberStamp() {
    togglePanel("stampsPanel");

    // ✅ Bring the stamp panel forward when toggled
    const panel = document.getElementById("stampsPanel");
    if (panel && panel.style.display === "block") {
        panel.style.zIndex = "1002"; // Higher than other containers
    }
}




window.selectedStampText = null;
window.selectedStampClass = null; // Variable to store selected stamp class

// ✅ Function to select a stamp
function selectStamp(stampText) {
    console.log("Stamp selected:", stampText);
    window.selectedStampText = stampText;

    // Set the corresponding class for each stamp
    switch (stampText) {
        case 'APPROVED':
            window.selectedStampClass = 'approved';
            break;
        case 'AS IS':
            window.selectedStampClass = 'as-is';
            break;
        case 'COMPLETED':
            window.selectedStampClass = 'completed';
            break;
        case 'CONFIDENTIAL':
            window.selectedStampClass = 'confidential';
            break;
        case 'DEPARTMENTAL':
            window.selectedStampClass = 'departmental';
            break;
        case 'DRAFT':
            window.selectedStampClass = 'draft';
            break;
        case 'EXPERIMENTAL':
            window.selectedStampClass = 'experimental';
            break;
        case 'EXPIRED':
            window.selectedStampClass = 'expired';
            break;
        case 'FINAL':
            window.selectedStampClass = 'final';
            break;
        default:
            window.selectedStampClass = null;
    }

    const stampLabel = document.getElementById("stampLabel");
    if (stampLabel) {
        stampLabel.textContent = `Selected Stamp: ${stampText}`;
    }

    // Change cursor to crosshair
    document.body.style.cursor = "crosshair";

    // Add a temporary click listener to place the stamp
    document.addEventListener("click", placeStamp);
      saveState();
      
}






function placeStamp(event) {
    const pageDiv = event.target.closest(".pdfPage");
    if (!pageDiv || !window.selectedStampText) return;

    const containerRect = pageDiv.getBoundingClientRect();
    const pageCanvas = pageDiv.querySelector("canvas");
    if (!pageCanvas) return;

    // ✅ Ensure the stamp is placed inside the canvas container
    const stampDiv = document.createElement("div");
    stampDiv.classList.add("pdf-element", "stamp", window.selectedStampClass);
    stampDiv.innerHTML = `<span>${window.selectedStampText}</span>`;

    Object.assign(stampDiv.style, {
        position: "absolute",
        left: `${event.clientX - containerRect.left}px`,
        top: `${event.clientY - containerRect.top}px`,
        cursor: "move",
        zIndex: "1000",
        pointerEvents: "auto" // Ensure it can be interacted with
    });

    // ✅ Append the stamp inside the PDF canvas container
    pageCanvas.parentElement.appendChild(stampDiv);

    // Attach resizer, context menu, and drag functionalities
    const contextMenu = createMarkContextMenu(stampDiv);
    pageCanvas.parentElement.appendChild(contextMenu);

    setupMarkEvents(stampDiv, contextMenu);
    makeDraggable(stampDiv, pageCanvas.parentElement);
    createResizeHandles(stampDiv);

    // ✅ Save state after placing a stamp
    saveState();

    // Reset selection
    window.selectedStampText = null;
    window.selectedStampClass = null;
    document.body.style.cursor = "default";

    document.removeEventListener("click", placeStamp);
}



// Function to open the modal
function createNewStamp() {
    document.getElementById("stampModal").style.display = "block";
}

// Function to close the modal
function closeModal() {
    document.getElementById("stampModal").style.display = "none";
}

// Close the modal when the close button is clicked
document.getElementById("closeModal").onclick = closeModal;

// Close the modal if the user clicks outside the modal content
window.onclick = function(event) {
    let modal = document.getElementById("stampModal");
    if (event.target === modal) {
        closeModal();
    }
};

// Function to save the stamp (you can implement your logic here)
document.getElementById("saveStamp").onclick = function() {
    const stampText = document.getElementById("stampText").value;
    const fontStyle = document.getElementById("fontStyle").value;
    const textColor = document.getElementById("textColor").value;
    const bgColor = document.getElementById("bgColor").value;
    const includeTimestamp = document.getElementById("timestamp").checked;

    // Implement your save logic here
    console.log("Stamp Saved:", {
        stampText,
        fontStyle,
        textColor,
        bgColor,
        includeTimestamp
    });

    // Close the modal after saving
    closeModal();
};
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("toggleSidebarBtn").innerHTML = "▼";
});

function toggleSidebar(event) {
    event.stopPropagation(); // Prevent the text field from being selected
    event.preventDefault(); // Stop default behavior

    const toggleableFields = document.querySelectorAll(
        "#field-list li:not(#text-field):not(#signature-field):not(#date-field)"
    );
    const toggleBtn = document.getElementById("toggleSidebarBtn");

    sidebarCollapsed = !sidebarCollapsed;

    toggleableFields.forEach((field) => {
        field.style.display = sidebarCollapsed ? "none" : "block";
    });

    toggleBtn.innerHTML = sidebarCollapsed ? "▼" : "▲"; 
}



document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("toggleSidebarBtn").innerHTML = "▼";
});

function toggleSidebar(event) {
    event.stopPropagation(); // Prevent the text field from being selected
    event.preventDefault(); // Stop default behavior

    const toggleableFields = document.querySelectorAll(
        "#field-list li:not(#text-field):not(#signature-field):not(#date-field)"
    );
    const toggleBtn = document.getElementById("toggleSidebarBtn");

    sidebarCollapsed = !sidebarCollapsed;

    toggleableFields.forEach((field) => {
        field.style.display = sidebarCollapsed ? "none" : "block";
    });

    toggleBtn.innerHTML = sidebarCollapsed ? "▼" : "▲"; 
}





// ✅ Function to select a field type before placing
function selectField(fieldType) {
    console.log("Field selected:", fieldType);
    window.selectedFieldType = fieldType;

    // Change cursor to crosshair to indicate placement mode
    document.body.style.cursor = "crosshair";

    // Listen for click event to place the field
    document.addEventListener("click", placeField);
}


// ✅ Function to place the selected field on the PDF canvas
function placeField(event) {
    const pageDiv = event.target.closest(".pdfPage");
    if (!pageDiv || !window.selectedFieldType) return;

    const containerRect = pageDiv.getBoundingClientRect();
    const pageCanvas = pageDiv.querySelector("canvas");
    if (!pageCanvas) return;

    const clickX = event.clientX - containerRect.left;
    const clickY = event.clientY - containerRect.top;


    document.querySelectorAll(".pdf-element").forEach(field => {
        field.classList.remove("active");
        field.style.border = "none";
        
        const menu = field.querySelector(".field-menu");
        if (menu) {
            menu.style.display = "none";
        }
    });
    

    if (!fieldCounter[window.selectedFieldType]) {
        fieldCounter[window.selectedFieldType] = 1;
    } else {
        fieldCounter[window.selectedFieldType]++;
    }

    

    // ✅ Create a new field element
    const fieldDiv = document.createElement("div");
    fieldDiv.classList.add("pdf-element", "field", `field-${window.selectedFieldType}`);
    fieldDiv.style.position = "absolute";
    fieldDiv.style.left = `${clickX}px`;
    fieldDiv.style.top = `${clickY}px`;
    fieldDiv.style.height="40px";
    fieldDiv.style.width = "200px";
    fieldDiv.style.padding = "5px";
    fieldDiv.style.border = "4px solid #3498db ";
    fieldDiv.style.backgroundColor = "none";
    fieldDiv.style.cursor = "move";
    fieldDiv.style.zIndex = "1";
    fieldDiv.style.display = "flex";
    fieldDiv.style.alignItems = "center";
    fieldDiv.style.justifyContent = "center";
    


    

    // ✅ Add content based on field type
    switch (window.selectedFieldType) {
        case "text":
            fieldDiv.contentEditable = true;
            fieldDiv.innerText = "Enter text";
            fieldDiv.style.cursor = "pointer";
            break;
        case "paragraph":
            fieldDiv.contentEditable = true;
            fieldDiv.innerText = "Enter paragraph text...";
            fieldDiv.style.width = "200px";
            fieldDiv.style.cursor = "pointer";
            fieldDiv.style.height = "50px";
            break;
        case "checkbox":
            fieldDiv.innerHTML = `<input type="checkbox"> Checkbox`;
            break;
        case "dropdown":
            fieldDiv.innerHTML = `
                <select>
                    <option>Option 1</option>
                    <option>Option 2</option>
                    <option>Option 3</option>
                </select>
            `;
            break;
            case "date":
                fieldDiv.contentEditable = true;
                fieldDiv.innerText = "Insert Date Here";
                fieldDiv.style.fontStyle = "italic";
                fieldDiv.style.color = "#888";
                fieldDiv.style.cursor = "pointer";
            
                 fieldDiv.classList.add("field-date");
                break;
            
        case "image":
            const img = new Image();
            img.src = "your-image-url.png"; // Replace with actual image URL
            img.style.width = "100px";
            img.style.height = "100px";
            fieldDiv.appendChild(img);
            break;
            case "signature":
                case "initials":
                    fieldDiv.innerText = "Insert Sign Here";
                    fieldDiv.style.fontStyle = "italic";
                    fieldDiv.style.color = "black";
                    fieldDiv.style.cursor = "pointer";
                    fieldDiv.style.width ="200px";
                    fieldDiv.style.height ="60px";
                    fieldDiv.style.fontWeight ="bold";
                
                    break;
                
    }

   // Floating menu
   const menu = document.createElement("div");
   menu.classList.add("field-menu");
   menu.style.position = "absolute";
   menu.style.bottom = "calc(100% + 5px)"; // 5px above the field
   menu.style.left = "50%";
   menu.style.transform = "translateX(-50%)";
   menu.style.width = "auto";
   menu.style.background = "#007bff";
   menu.style.padding = "6px 10px";
   menu.style.borderRadius = "6px";
   menu.style.boxShadow = "0px 2px 5px rgba(0, 0, 0, 0.2)";
   menu.style.display = "flex";
   menu.style.flexDirection = "column";
   menu.style.alignItems = "center";
   menu.style.color = "white";
   menu.style.fontWeight = "bold";
   menu.style.whiteSpace = "nowrap";
   menu.style.zIndex = "1000";


   // Field label inside menu
   const fieldTitle = document.createElement("div");
   fieldTitle.innerText = `${capitalizeFirstLetter(window.selectedFieldType)} Field ${fieldCounter[window.selectedFieldType]}`;
   fieldTitle.style.fontSize = "12px";
   fieldTitle.style.paddingBottom = "5px";

   // Buttons container
   const buttonContainer = document.createElement("div");
   buttonContainer.style.display = "flex";
   buttonContainer.style.gap = "5px";

   // Buttons
   const fillBtn = document.createElement("button");
   fillBtn.innerText = "Fill";
   fillBtn.classList.add("menu-button");
   fillBtn.onclick = function() { fillField(fieldDiv); };

   const naBtn = document.createElement("button");
   naBtn.innerText = "NA";
   naBtn.classList.add("menu-button");
   naBtn.onclick = function() { markNA(this); }; 


   const settingsBtn = document.createElement("button");
   settingsBtn.innerText = "⚙️";
   settingsBtn.classList.add("menu-button");

   const deleteBtn = document.createElement("button");
   deleteBtn.innerText = "🗑️";
   deleteBtn.classList.add("menu-button", "delete-button");
   deleteBtn.onclick = function() { deleteField(fieldDiv); };

   // Style buttons
   [fillBtn, naBtn, settingsBtn, deleteBtn].forEach(btn => {
       btn.style.border = "none";
       btn.style.background = "white";
       btn.style.color = "#007bff";
       btn.style.padding = "4px 6px";
       btn.style.borderRadius = "4px";
       btn.style.cursor = "pointer";
       btn.style.fontSize = "12px";
       btn.style.fontWeight = "bold";
   });

   buttonContainer.append(fillBtn, naBtn, settingsBtn, deleteBtn);
   menu.append(fieldTitle, buttonContainer);
   fieldDiv.appendChild(menu);
   pageCanvas.parentElement.appendChild(fieldDiv);

   // Ensure menu stays in viewport
   adjustMenuPosition(menu, fieldDiv);



  // ✅ Click event to toggle active field state
  document.querySelectorAll(".pdf-element").forEach(fieldDiv => {
    fieldDiv.addEventListener("click", function (e) {
        e.stopPropagation();

        document.querySelectorAll(".pdf-element").forEach(field => {
            field.classList.remove("active");
            field.style.border = "none";
            field.style.backgroundColor = "#c1c1c1";
            field.style.color = "rgb(0, 194, 223)";
            field.style.fontWeight = "bold";

            const menu = field.querySelector(".field-menu");
            if (menu) menu.style.display = "none";

            const resizeHandles = field.querySelectorAll(".resize-handle");
            resizeHandles.forEach(handle => handle.style.display = "none");

            const assignedLabel = field.querySelector(".assigned-label");
            if (assignedLabel) {
                assignedLabel.style.display = "none"; // ✅ Hide label when field is active
            }
        });

        const signRequestButton = document.getElementById("signRequestBtn"); // Update ID as needed

    // ✅ Show button only when the first field is added
    if (!isFirstFieldAdded) {
        isFirstFieldAdded = true;  // ✅ Update flag
        if (signRequestButton) {
            signRequestButton.style.display = "block"; // ✅ Show button
        }
    }

        // ✅ Keep menu visible when clicking
        fieldDiv.classList.add("active");
        fieldDiv.style.border = "4px solid #3498db";
        fieldDiv.style.backgroundColor = "transparent";
        fieldDiv.style.fontWeight = "normal";
        fieldDiv.style.color = "black";

        const menu = fieldDiv.querySelector(".field-menu");
        if (menu) menu.style.display = "flex"; // ✅ Ensure the menu reopens when clicked

        const resizeHandles = fieldDiv.querySelectorAll(".resize-handle");
        resizeHandles.forEach(handle => handle.style.display = "block");
    });
});


    // ✅ Click outside to deactivate all fields and hide resize handles
    document.addEventListener("click", function hideMenus(e) {
    document.querySelectorAll(".pdf-element").forEach(field => {
        if (!field.contains(e.target)) {
            field.classList.remove("active");
            field.style.border = "none";
            field.style.backgroundColor = "#c1c1c1";
            field.style.color = "rgb(0, 194, 223)";
            field.style.fontWeight = "bold";

            const menu = field.querySelector(".field-menu");
            if (menu) menu.style.display = "none";

            const resizeHandles = field.querySelectorAll(".resize-handle");
            resizeHandles.forEach(handle => handle.style.display = "none");

            const assignedLabel = field.querySelector(".assigned-label");
            if (assignedLabel) {
                assignedLabel.style.display = "inline"; // ✅ Show label on deselect
            }
        }
    });
});

    // ✅ Save state after placing a field
    saveState();
    fieldmakeDraggable(fieldDiv);
    fieldcreateResizeHandles(fieldDiv);

    // Reset selection
    window.selectedFieldType = null;
    document.body.style.cursor = "default";

    document.removeEventListener("click", placeField);
}
// ✅ Function to capitalize first letter of a string
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}


// Adjusts menu to stay within viewport
function adjustMenuPosition(menu, fieldDiv) {
    const menuRect = menu.getBoundingClientRect();
    const fieldRect = fieldDiv.getBoundingClientRect();
    const pageWidth = window.innerWidth;

    // Prevent menu from overflowing the left side
    if (menuRect.left < 10) {
        menu.style.left = "10px";
        menu.style.transform = "none";
    }

    // Prevent menu from overflowing the right side
    if (menuRect.right > pageWidth - 10) {
        menu.style.left = "auto";
        menu.style.right = "10px";
        menu.style.transform = "none";
    }
}

function manageFields() {
    console.log("✅ sendRequest() function triggered!");

    const nameInput = document.getElementById("signerName");

    if (nameInput && nameInput.value.trim() !== "") {
        const latestName = nameInput.value.trim();
        localStorage.setItem("lastSigner", latestName); // Save name in localStorage
        console.log("✅ Name saved in localStorage:", latestName);
    } else {
        console.log("⚠️ No name entered!");
    }

    document.getElementById('signRequestModal').style.display = 'none';
    document.getElementById('sidebar').style.display = 'block';
    saveState();
}


// ✅ Auto-fill date field with current date and keep the menu visible
function autoFillDate(field) {
    const today = new Date().toISOString().split('T')[0];
    field.innerText = today;
    field.style.fontStyle = "normal";
    field.style.color = "black";

    // ✅ Keep menu visible after filling
    const menu = field.querySelector(".field-menu");
    if (menu) menu.style.display = "flex";
    saveState();
}
function fillField(button) {
    const field = button.closest(".pdf-element");

    if (!field) return;

    if (field.classList.contains("field-date")) {
        autoFillDate(field);
    } else if (field.classList.contains("field-text") || field.classList.contains("field-paragraph")) {
        field.focus();
    } else if (field.classList.contains("field-signature")) {
        openSignatureModal(field);
    }

    // ✅ Keep field interactive
    field.classList.add("active");
    field.style.border = "4px solid #3498db"; // Highlight active field

    // ✅ Keep menu visible after filling
    const menu = field.querySelector(".field-menu");
    if (menu) menu.style.display = "flex";

    // ✅ Reattach click event if needed
    field.addEventListener("click", function (e) {
        e.stopPropagation();
        field.classList.add("active");
        field.style.border = "4px solid #3498db";
        if (menu) menu.style.display = "flex";
    });

    saveState();
}


function markNA(button) {
    const field = button.closest(".pdf-element");
    let existingDropdown = field.querySelector(".name-dropdown");

    // ✅ Remove existing dropdown if present
    if (existingDropdown) {
        existingDropdown.remove();
    }

    // ✅ Create dropdown container
    const dropdown = document.createElement("div");
    dropdown.classList.add("name-dropdown");
    dropdown.style.position = "absolute";
    dropdown.style.top = "30px";
    dropdown.style.left = "0";
    dropdown.style.width = "180px";
    dropdown.style.border = "1px solid #ccc";
    dropdown.style.background = "#fff";
    dropdown.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
    dropdown.style.zIndex = "1000";
    dropdown.style.borderRadius = "6px";
    dropdown.style.padding = "5px 0";
    dropdown.style.fontSize = "14px";

    // ✅ Fetch last stored name
    let lastName = localStorage.getItem("lastSigner") || "";

    // ✅ "Not Assigned" Option
    const notAssignedOption = document.createElement("div");
    notAssignedOption.textContent = "Not Assigned";
    notAssignedOption.style.padding = "10px";
    notAssignedOption.style.cursor = "pointer";
    notAssignedOption.style.color = "White";
    notAssignedOption.style.backgroundColor = "#7F939E";
    notAssignedOption.addEventListener("mouseover", () => (notAssignedOption.style.background = "#78909C"));
    notAssignedOption.addEventListener("mouseout", () => (notAssignedOption.style.background = "#7F939E"));
    notAssignedOption.addEventListener("click", function () {
        button.textContent = "NA";
        field.querySelector(".assigned-label")?.remove(); // ✅ Hide label if exists
        dropdown.remove();
    });
    dropdown.appendChild(notAssignedOption);

    // ✅ Add selectable name option
    if (lastName) {
        const nameOption = document.createElement("div");
        nameOption.textContent = lastName;
        nameOption.classList.add("name-option");
        nameOption.style.padding = "10px";
        nameOption.style.cursor = "pointer";
        nameOption.style.borderBottom = "1px solid #ddd";
        nameOption.addEventListener("mouseover", () => (nameOption.style.background = "#f0f0f0"));
        nameOption.addEventListener("mouseout", () => (nameOption.style.background = "#fff"));
        nameOption.addEventListener("click", function () {
            let initials = lastName.length > 1 ? lastName.substring(0, 2).toUpperCase() : lastName[0].toUpperCase();
            button.textContent = initials; // ✅ Replace "NA" with first 2 letters of name

            // ✅ Create the assigned label (hidden initially)
            let assignedLabel = field.querySelector(".assigned-label");
            if (!assignedLabel) {
                assignedLabel = document.createElement("span");
                assignedLabel.classList.add("assigned-label");
                assignedLabel.textContent = `${initials}*`;
                assignedLabel.style.position = "absolute";
                assignedLabel.style.left = "100%";
                assignedLabel.style.top = "0";
                assignedLabel.style.marginLeft = "5px";
                assignedLabel.style.fontSize = "12px";
                assignedLabel.style.fontWeight = "bold";
                assignedLabel.style.backgroundColor = "#d6eaf8";
                assignedLabel.style.color = "#007bff";
                assignedLabel.style.padding = "2px 5px";
                assignedLabel.style.borderRadius = "3px";
                assignedLabel.style.display = "none"; // ✅ Initially hidden

                field.appendChild(assignedLabel);
            }
            dropdown.remove();
        });
        dropdown.appendChild(nameOption);
    }

    // ✅ "Add or Modify Signers..." Option
    const modifyOption = document.createElement("div");
    modifyOption.textContent = "Add or modify signers...";
    modifyOption.style.padding = "10px";
    modifyOption.style.cursor = "pointer";
    modifyOption.style.fontWeight = "bold";
    modifyOption.style.color = "#007bff";
    modifyOption.style.fontSize = "10px";
    modifyOption.addEventListener("mouseover", () => (modifyOption.style.background = "#f0f0f0"));
    modifyOption.addEventListener("mouseout", () => (modifyOption.style.background = "#fff"));
    modifyOption.addEventListener("click", function () {
        alert("Open signer management modal here!");
    });
    dropdown.appendChild(modifyOption);

    // ✅ Append dropdown to field
    field.appendChild(dropdown);

    // ✅ Click outside to close dropdown and show assigned label
    document.addEventListener("click", function closeDropdown(event) {
        if (!field.contains(event.target)) {
            dropdown.remove();
            let assignedLabel = field.querySelector(".assigned-label");
            if (assignedLabel) {
                assignedLabel.style.display = "inline"; // ✅ Show assigned label
            }
            document.removeEventListener("click", closeDropdown);
        }
    });
    saveState();
    
}


// ✅ Function to delete field
function deleteField(button) {
    const field = button.closest(".pdf-element");
    field.remove();
    saveState();
}

// ✅ Attach event listeners to sidebar buttons
document.querySelectorAll("#field-list li").forEach(item => {
    item.addEventListener("click", function () {
        const fieldType = this.innerText.toLowerCase().replace(" ", ""); // Normalize field name
        selectField(fieldType);
    });
});

function openSignatureModal(field) {
    const modal = document.createElement("div");
    Object.assign(modal.style, {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "white",
        padding: "15px",
        border: "2px solid #00AABB",
        zIndex: "1000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
    });

    // Signature Canvas
    const signCanvas = document.createElement("canvas");
    Object.assign(signCanvas, { width: 400, height: 150 });
    signCanvas.style.border = "1px solid #00AABB";
    modal.appendChild(signCanvas);

    const signCtx = signCanvas.getContext("2d");
    Object.assign(signCtx, {
        lineWidth: 3,
        lineJoin: "round",
        lineCap: "round",
        strokeStyle: "black"
    });

    let isDrawing = false;

    signCanvas.addEventListener("mousedown", (e) => {
        isDrawing = true;
        signCtx.beginPath();
        signCtx.moveTo(e.offsetX, e.offsetY);
    });

    signCanvas.addEventListener("mousemove", (e) => {
        if (isDrawing) {
            signCtx.lineTo(e.offsetX, e.offsetY);
            signCtx.stroke();
        }
    });

    signCanvas.addEventListener("mouseup", () => (isDrawing = false));

    // Upload Input
    const uploadInput = document.createElement("input");
    Object.assign(uploadInput, { type: "file", accept: "image/*" });
    uploadInput.style.marginTop = "10px";
    uploadInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.src = reader.result;
                img.onload = () => {
                    signCtx.clearRect(0, 0, signCanvas.width, signCanvas.height);
                    signCtx.drawImage(img, 0, 0, signCanvas.width, signCanvas.height);
                };
            };
            reader.readAsDataURL(file);
        }
    });
    modal.appendChild(uploadInput);

    // Buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.style.marginTop = "10px";

    const createButton = (text, width, marginLeft = "0", onClick) => {
        const button = document.createElement("button");
        button.textContent = text;
        Object.assign(button.style, {
            width,
            border: "2px solid #00AABB",
            marginLeft
        });
        button.onclick = onClick;
        return button;
    };
    const saveBtn = createButton("Save", "50px", "0", () => {
        const signatureData = signCanvas.toDataURL("image/png");
    
        // Insert signature into the field
        const img = new Image();
        Object.assign(img, { src: signatureData, style: { width: "250%", height: "120%", objectFit: "contain", border: "none" } });
    
        field.innerHTML = ""; // Clear field
        field.appendChild(img);
    
        // Remove the border of the field
        field.style.border = "none"; 
    
        document.body.removeChild(modal);
    });
    
    const cancelBtn = createButton("Cancel", "75px", "10px", () => {
        document.body.removeChild(modal);
    });

    buttonContainer.append(saveBtn, cancelBtn);
    modal.appendChild(buttonContainer);
    document.body.appendChild(modal);

    saveState();
}


function fieldmakeDraggable(fieldDiv, pageDiv) {
    let offsetX, offsetY, isDragging = false;
    const borderSize = 4;

    function isOnBorder(event) {
        const rect = fieldDiv.getBoundingClientRect();
        return (
            event.clientX <= rect.left + borderSize ||
            event.clientX >= rect.right - borderSize ||
            event.clientY <= rect.top + borderSize ||
            event.clientY >= rect.bottom - borderSize
        );
    }

    fieldDiv.addEventListener("mousemove", (event) => {
        if (isOnBorder(event)) {
            fieldDiv.style.cursor = "move";
        } else {
            fieldDiv.style.cursor = "default";
        }
    });

    fieldDiv.addEventListener("mousedown", (event) => {
        if (isResizing || !isOnBorder(event)) return; // Prevent drag while resizing

        isDragging = true;
        offsetX = event.clientX - fieldDiv.getBoundingClientRect().left;
        offsetY = event.clientY - fieldDiv.getBoundingClientRect().top;
        fieldDiv.style.zIndex = "1000";
        event.preventDefault();
    });

    document.addEventListener("mousemove", (event) => {
        if (!isDragging || isResizing) return; // Prevent dragging while resizing

        let newPage = document.elementFromPoint(event.clientX, event.clientY)?.closest(".pdfPage");

        if (newPage && newPage !== pageDiv) {
            if (pageDiv && pageDiv.contains(fieldDiv)) {
                pageDiv.removeChild(fieldDiv);
            }
            newPage.appendChild(fieldDiv);
            pageDiv = newPage;
        }

        const containerRect = pageDiv.getBoundingClientRect();
        let newX = event.clientX - containerRect.left - offsetX;
        let newY = event.clientY - containerRect.top - offsetY;

        newX = Math.max(0, Math.min(newX, containerRect.width - fieldDiv.offsetWidth));
        newY = Math.max(0, Math.min(newY, containerRect.height - fieldDiv.offsetHeight));

        fieldDiv.style.left = `${newX}px`;
        fieldDiv.style.top = `${newY}px`;
    });

    document.addEventListener("mouseup", () => {
        isDragging = false;
        fieldDiv.style.zIndex = "10";
    });
    saveState();
}

function fieldcreateResizeHandles(fieldDiv) {
    const handles = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    const handleSize = '10px';

    handles.forEach(handle => {
        const resizeHandle = document.createElement('div');
        resizeHandle.classList.add('resize-handle', handle);

        Object.assign(resizeHandle.style, {
            position: 'absolute',
            width: handleSize,
            height: handleSize,
            backgroundColor: 'blue',
            zIndex: '10',
            opacity: '1',
            borderRadius: '0', 
        });

        switch (handle) {
            case 'top-left':
                Object.assign(resizeHandle.style, { left: '-5px', top: '-5px', cursor: 'nwse-resize' });
                break;
            case 'top-right':
                Object.assign(resizeHandle.style, { right: '-5px', top: '-5px', cursor: 'nesw-resize' });
                break;
            case 'bottom-left':
                Object.assign(resizeHandle.style, { left: '-5px', bottom: '-5px', cursor: 'nesw-resize' });
                break;
            case 'bottom-right':
                Object.assign(resizeHandle.style, { right: '-5px', bottom: '-5px', cursor: 'nwse-resize' });
                break;
        }

        fieldDiv.appendChild(resizeHandle);

        resizeHandle.addEventListener('mousedown', (event) => {
            event.preventDefault();
            isResizing = true; // Prevent dragging while resizing

            let startX = event.clientX;
            let startY = event.clientY;
            let startWidth = fieldDiv.offsetWidth;
            let startHeight = fieldDiv.offsetHeight;

            function resize(event) {
                let newWidth = startWidth;
                let newHeight = startHeight;

                if (handle.includes('right')) {
                    newWidth = Math.max(50, startWidth + (event.clientX - startX)); 
                }
                if (handle.includes('left')) {
                    newWidth = Math.max(50, startWidth - (event.clientX - startX));
                }
                if (handle.includes('bottom')) {
                    newHeight = Math.max(30, startHeight + (event.clientY - startY));
                }
                if (handle.includes('top')) {
                    newHeight = Math.max(30, startHeight - (event.clientY - startY));
                }

                fieldDiv.style.width = `${newWidth}px`;
                fieldDiv.style.height = `${newHeight}px`;
            }

            function stopResize() {
                isResizing = false; // Re-enable dragging
                document.removeEventListener('mousemove', resize);
                document.removeEventListener('mouseup', stopResize);
            }

            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
        });
    });
    saveState();
}



async function sendRequest() {
    const fileInput = document.querySelector("#pdf-upload");
    const signerName = document.querySelector("#signerName").value;
    const signerEmail = document.querySelector("#signerEmail").value;

    if (!fileInput.files.length) {
        alert("Please upload a file before sending.");
        return;
    }

    const formData = new FormData();
    formData.append("signerName", signerName);
    formData.append("signerEmail", signerEmail);
    formData.append("file", fileInput.files[0]);

    try {
        const response = await fetch("http://127.0.0.2:3001/send-email", {
            method: "POST",
            body: formData,
        });

        const result = await response.json();
        if (response.ok) {
            showSuccessModal();
            console.log("✅ Email sent successfully, calling showSuccessModal()");
            console.log("📄 Document Link:", result.link);
        } else {
            alert("❌ Error: " + result.error);
        }   
    } catch (error) {
        console.error("❌ Request Error:", error);
        alert("❌ Failed to send email.");
    }
}


