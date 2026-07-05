# copy_assets_to_native.ps1
# Script to synchronize web assets to Android and iOS native shell projects.

$workspaceDir = "c:\Users\Admin\Desktop\cafezza"
$androidAssetsDir = Join-Path $workspaceDir "android\app\src\main\assets"
$iosAssetsDir = Join-Path $workspaceDir "ios\Cafezza\assets"

# Files and folders to copy
$filesToCopy = @(
    "index.html",
    "styles.css",
    "app.js",
    "fresh_boba_tea.png",
    "nutella_banana_croissant.png",
    "unforgettable_bagel.png",
    "cafezza_map.png"
)

$foldersToCopy = @(
    "upscaled_frames"
)

# Function to copy assets to a target directory
function Sync-Assets {
    param (
        [string]$targetDir
    )

    Write-Host "Syncing assets to: $targetDir"
    
    # Create directory if it doesn't exist
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir | Out-Null
    } else {
        # Clean directory
        Remove-Item -Path "$targetDir\*" -Recurse -Force -ErrorAction SilentlyContinue
    }

    # Copy files
    foreach ($file in $filesToCopy) {
        $srcPath = Join-Path $workspaceDir $file
        if (Test-Path $srcPath) {
            Copy-Item -Path $srcPath -Destination $targetDir -Force
            Write-Host "  Copied file: $file"
        } else {
            Write-Warning "  File not found: $srcPath"
        }
    }

    # Copy folders
    foreach ($folder in $foldersToCopy) {
        $srcPath = Join-Path $workspaceDir $folder
        if (Test-Path $srcPath) {
            $destPath = Join-Path $targetDir $folder
            Copy-Item -Path $srcPath -Destination $destPath -Recurse -Force
            Write-Host "  Copied folder: $folder"
        } else {
            Write-Warning "  Folder not found: $srcPath"
        }
    }
}

# Run sync for Android
Sync-Assets -targetDir $androidAssetsDir

# Run sync for iOS
Sync-Assets -targetDir $iosAssetsDir

Write-Host "Asset synchronization complete!"
