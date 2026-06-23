Write-Host "Starting NutriSnap..." -ForegroundColor Green

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Start backend
$backendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    $env:PYTHONPATH = $dir
    python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
} -ArgumentList "$root\backend"

Write-Host "Backend starting on http://127.0.0.1:8000" -ForegroundColor Cyan

# Start frontend
$frontendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    $env:Path = "$dir\node_modules\.bin;$env:Path"
    npm run dev
} -ArgumentList "$root\frontend"

Write-Host "Frontend starting on http://127.0.0.1:5173" -ForegroundColor Cyan

Write-Host ""
Write-Host "Press any key to stop both servers..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Stop-Job $backendJob -ErrorAction SilentlyContinue
Stop-Job $frontendJob -ErrorAction SilentlyContinue
Remove-Job $backendJob -ErrorAction SilentlyContinue
Remove-Job $frontendJob -ErrorAction SilentlyContinue

Write-Host "Servers stopped." -ForegroundColor Green
