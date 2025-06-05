a// Tab functionality
function openTab(evt, tabName) {
    let i, tabcontent, tabbuttons;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
        tabcontent[i].classList.remove("active");
    }
    tabbuttons = document.getElementsByClassName("tab-button");
    for (i = 0; i < tabbuttons.length; i++) {
        tabbuttons[i].classList.remove("active");
    }
    document.getElementById(tabName).style.display = "flex"; // Changed to flex for column layout
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
}

// Set default active tab on load
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.tab-button').click(); // Activates the first tab
    checkFFmpegAvailability(); // Check FFmpeg on app load
});

const logArea = document.getElementById('logArea');
const folderConvertBtn = document.getElementById('folderConvertBtn');
const singleConvertBtn = document.getElementById('singleConvertBtn');

function updateLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    logArea.innerHTML += `[${timestamp}] ${message}\n`;
    logArea.scrollTop = logArea.scrollHeight; // Auto-scroll to bottom
}

function disableButtons(disable) {
    folderConvertBtn.disabled = disable;
    singleConvertBtn.disabled = disable;
    const tabButtons = document.getElementsByClassName("tab-button");
    for (let i = 0; i < tabButtons.length; i++) {
        tabButtons[i].disabled = disable;
    }
}

async function selectFolder(inputId) {
    const folderPath = await window.electronAPI.selectFolder();
    if (folderPath) {
        document.getElementById(inputId).value = folderPath;
    }
}

async function selectFile(inputId) {
    const filePath = await window.electronAPI.selectFile();
    if (filePath) {
        document.getElementById(inputId).value = filePath;
    }
}

async function checkFFmpegAvailability() {
    updateLog("Checking FFmpeg availability...");
    const result = await window.electronAPI.checkFFmpeg();
    if (result.available) {
        updateLog(`FFmpeg found at: ${result.path}`);
    } else {
        updateLog(`WARNING: FFmpeg not found or not callable. Error: ${result.error || 'Unknown'}. Please ensure it's installed and correctly bundled.`);
        alert("FFmpeg is required for conversion but could not be found. Please ensure it's correctly installed and bundled with the application.");
    }
}

async function startFolderConversion() {
    const folderSourcePath = document.getElementById('folderSourcePath').value.trim();
    const inputFormat = document.getElementById('inputFormat').value.trim().toLowerCase();
    const folderDestPath = document.getElementById('folderDestPath').value.trim();

    if (!folderSourcePath || !inputFormat || !folderDestPath) {
        alert("Please fill all fields for Folder Conversion.");
        return;
    }

    disableButtons(true);
    updateLog(`\n--- Starting Folder Conversion ---`);
    updateLog(`Source Folder: ${folderSourcePath}`);
    updateLog(`Input Format: ${inputFormat.toUpperCase()}`);
    updateLog(`Destination Folder: ${folderDestPath}`);

    try {
        const fs = await window.electronAPI.convertAudio({ action: 'list_files', folder: folderSourcePath, format: inputFormat });
        if (!fs.success) {
            updateLog(`ERROR: Could not list files in source folder: ${fs.message}`);
            return;
        }

        const filesToConvert = fs.files;
        if (filesToConvert.length === 0) {
            updateLog(`No ${inputFormat.toUpperCase()} files found in the source folder.`);
            alert(`No ${inputFormat.toUpperCase()} files found to convert.`);
            return;
        }

        let convertedCount = 0;
        let errorCount = 0;
        for (const filename of filesToConvert) {
            updateLog(`Processing: ${filename}`);
            const inputFile = `${folderSourcePath}/${filename}`;
            const result = await window.electronAPI.convertAudio({
                inputFile: inputFile,
                outputFolder: folderDestPath,
                isSingleFile: false // Indicates folder conversion mode
            });

            if (result.success) {
                updateLog(`  SUCCESS: ${result.message}`);
                convertedCount++;
            } else {
                updateLog(`  ERROR: ${result.message}`);
                errorCount++;
            }
        }

        updateLog(`\n--- Folder Conversion Complete ---`);
        updateLog(`Summary: Converted ${convertedCount} files, Failed ${errorCount} files.`);

    } catch (error) {
        updateLog(`CRITICAL ERROR during folder conversion: ${error.message}`);
        alert(`An unexpected error occurred during folder conversion: ${error.message}`);
    } finally {
        disableButtons(false);
    }
}


async function startSingleFileConversion() {
    const singleSourcePath = document.getElementById('singleSourcePath').value.trim();
    const singleDestPath = document.getElementById('singleDestPath').value.trim();

    if (!singleSourcePath || !singleDestPath) {
        alert("Please fill all fields for Single File Conversion.");
        return;
    }

    disableButtons(true);
    updateLog(`\n--- Starting Single File Conversion ---`);
    updateLog(`Source File: ${singleSourcePath}`);
    updateLog(`Destination Folder: ${singleDestPath}`);

    try {
        const result = await window.electronAPI.convertAudio({
            inputFile: singleSourcePath,
            outputFolder: singleDestPath,
            isSingleFile: true
        });

        if (result.success) {
            updateLog(`  SUCCESS: ${result.message}`);
            updateLog(`\n--- Single File Conversion Complete ---`);
            updateLog(`Summary: Converted 1 file, Failed 0 files.`);
        } else {
            updateLog(`  ERROR: ${result.message}`);
            updateLog(`\n--- Single File Conversion Complete ---`);
            updateLog(`Summary: Converted 0 files, Failed 1 file.`);
        }
    } catch (error) {
        updateLog(`CRITICAL ERROR during single file conversion: ${error.message}`);
        alert(`An unexpected error occurred during single file conversion: ${error.message}`);
    } finally {
        disableButtons(false);
    }
}

