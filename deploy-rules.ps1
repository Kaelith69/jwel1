# Deploy Firestore Rules to Firebase
# Run this after updating firestore.rules

Write-Host "🔥 Deploying Firestore Rules to Firebase..." -ForegroundColor Cyan

# Check if Firebase CLI is installed
$firebaseExists = Get-Command firebase -ErrorAction SilentlyContinue

if (-not $firebaseExists) {
    Write-Host "❌ Firebase CLI not found!" -ForegroundColor Red
    Write-Host "Install it with: npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

# Deploy rules
Write-Host "📤 Deploying rules..." -ForegroundColor Yellow
firebase deploy --only firestore:rules

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Firestore rules deployed successfully!" -ForegroundColor Green
    Write-Host "🔗 View in console: https://console.firebase.google.com/project/jwel369/firestore/rules" -ForegroundColor Cyan
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}
