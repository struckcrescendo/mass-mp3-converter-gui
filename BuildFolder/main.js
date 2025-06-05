const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { execFile } = require('child_process'); // Use execFile for direct execution

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 750,
        height: 650,
        minWidth: 750, // Prevent resizing too small
        minHeight: 650,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true, // Recommended for security
            nodeIntegration: false // Recommended for security
        }
    });

    mainWindow.loadFile('index.html');
    // mainWindow.webContents.openDevTools(); // Uncomment for debugging
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// --- IPC Main Handlers ---

// Handler for selecting source folder
ipcMain.handle('select-folder', async (event) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    if (canceled) {
        return null;
    } else {
        return filePaths[0];
    }
});

// Handler for selecting a single file
ipcMain.handle('select-file', async (event) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Audio Files', extensions: ['flac', 'wav', 'ogg', 'mp3', 'aac', 'm4a'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    if (canceled) {
        return null;
    } else {
        return filePaths[0];
    }
});

// Handler for audio conversion
ipcMain.handle('convert-audio', async (event, { inputFile, inputFormat, outputFolder, isSingleFile }) => {
    try {
        const ffmpegPath = getFFmpegPath();

        if (!ffmpegPath) {
            throw new Error('FFmpeg executable not found.');
        }

        const baseFilename = path.basename(inputFile, path.extname(inputFile));
        const outputFile = path.join(outputFolder, `${baseFilename}.mp3`);

        const command = [
            '-i', inputFile,
            '-ab', '320k', // Audio bitrate: 320 kbps for high quality
            '-map_metadata', '0', // Copy metadata from input to output
            outputFile
        ];

        // Ensure output folder exists
        if (!require('fs').existsSync(outputFolder)) {
            require('fs').mkdirSync(outputFolder, { recursive: true });
        }

        return new Promise((resolve, reject) => {
            execFile(ffmpegPath, command, (error, stdout, stderr) => {
                if (error) {
                    console.error('FFmpeg error:', error.message);
                    console.error('FFmpeg stderr:', stderr);
                    reject(new Error(`FFmpeg conversion failed: ${stderr || error.message}`));
                    return;
                }
                if (stderr.includes('Error converting') || stderr.includes('Error while opening')) { // Catch specific FFmpeg errors
                    reject(new Error(`FFmpeg conversion reported error: ${stderr}`));
                    return;
                }
                console.log('FFmpeg stdout:', stdout);
                resolve({ success: true, message: `Successfully converted "${path.basename(inputFile)}" to "${path.basename(outputFile)}"` });
            });
        });

    } catch (error) {
        console.error('Conversion process error:', error);
        return { success: false, message: error.message };
    }
});

// Handler for checking FFmpeg availability
ipcMain.handle('check-ffmpeg', async () => {
    try {
        const ffmpegPath = getFFmpegPath();
        if (!ffmpegPath) {
             return { available: false, path: null, error: 'FFmpeg executable path not resolved.' };
        }
        await new Promise((resolve, reject) => {
            execFile(ffmpegPath, ['-version'], (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`FFmpeg check failed: ${error.message} - ${stderr}`));
                } else {
                    resolve(true);
                }
            });
        });
        return { available: true, path: ffmpegPath };
    } catch (error) {
        return { available: false, path: null, error: error.message };
    }
});


// Helper to get FFmpeg path within the bundled app
function getFFmpegPath() {
    // Determine the base path for resources
    const resourcesPath = app.isPackaged
        ? path.join(process.resourcesPath, 'bin') // macOS: Contents/Resources/bin, Windows: resources/bin
        : path.join(__dirname, 'bin'); // Development: project_root/bin

    let ffmpegExecutable;
    if (process.platform === 'win32') {
        ffmpegExecutable = path.join(resourcesPath, 'ffmpeg.exe');
    } else { // macOS and Linux
        ffmpegExecutable = path.join(resourcesPath, 'ffmpeg');
    }

    // Check if the executable exists at the determined path
    if (require('fs').existsSync(ffmpegExecutable)) {
        console.log(`FFmpeg found at: ${ffmpegExecutable}`);
        return ffmpegExecutable;
    } else {
        console.warn(`FFmpeg not found at bundled path: ${ffmpegExecutable}`);
        // Fallback to system PATH if not bundled (for development or if bundling fails)
        console.warn('Falling back to system PATH for FFmpeg.');
        return 'ffmpeg'; // Rely on system PATH
    }
}
