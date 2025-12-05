# Check if Node.js is installed
$nodeInstalled = $null
try {
    $nodeInstalled = Get-Command node -ErrorAction SilentlyContinue
} catch {
    $nodeInstalled = $null
}

if (-not $nodeInstalled) {
    Write-Host "Node.js is not installed or not in PATH. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# If we get here, Node.js is installed
Write-Host "Found Node.js. Starting Next.js development server..." -ForegroundColor Green

# Check if next script exists directly
$nextPath = ".\node_modules\.bin\next.cmd"
if (Test-Path $nextPath) {
    # Run using the local Next.js installation
    Write-Host "Using local Next.js installation..." -ForegroundColor Green
    & $nextPath dev
} else {
    # Try to find node_modules in parent directories
    $currentDir = Get-Location
    $foundNext = $false
    
    while ($currentDir -ne $null -and -not $foundNext) {
        $testPath = Join-Path $currentDir "node_modules\.bin\next.cmd"
        if (Test-Path $testPath) {
            Write-Host "Found Next.js at $testPath" -ForegroundColor Green
            & $testPath dev
            $foundNext = $true
        } else {
            # Move up one directory
            $parentDir = Split-Path $currentDir -Parent
            if ($parentDir -eq $currentDir) {
                $currentDir = $null
            } else {
                $currentDir = $parentDir
            }
        }
    }
    
    if (-not $foundNext) {
        # As a last resort, try to use Node directly to load Next.js
        Write-Host "Trying to run Next.js using Node directly..." -ForegroundColor Yellow
        $nextJsMain = ".\node_modules\next\dist\bin\next"
        
        if (Test-Path ($nextJsMain + ".js")) {
            node $nextJsMain dev
        } else {
            Write-Host "Cannot find Next.js. Please install dependencies with 'npm install' first." -ForegroundColor Red
            Write-Host "If npm is not recognized, you need to install Node.js from https://nodejs.org/" -ForegroundColor Red
            exit 1
        }
    }
} 