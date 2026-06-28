# Setup Windows Task Scheduler for daily roadmap sync
# Run as Administrator

param(
  [string]$SlackWebhook = "https://hooks.slack.com/services/PLACEHOLDER",
  [string]$TaskName = "Daily Roadmap Sync",
  [string]$Schedule = "0 9 * * *"  # 09:00 UTC daily
)

# Validate input
if (-not $SlackWebhook -or $SlackWebhook -eq "https://hooks.slack.com/services/PLACEHOLDER") {
  Write-Warning "⚠️  Using placeholder Slack webhook. Update SLACK_WEBHOOK_URL before running."
}

# Define task details
$ScriptPath = "C:\dev\tools\multiRepoRoadmapSync.cjs"
$WorkingDir = "C:\dev"

# Convert cron to Task Scheduler schedule
# 0 9 * * * = Every day at 09:00 UTC
$TaskTrigger = New-ScheduledTaskTrigger -Daily -At 09:00

# Create action
$TaskAction = New-ScheduledTaskAction `
  -Execute "node.exe" `
  -Argument $ScriptPath `
  -WorkingDirectory $WorkingDir

# Create settings
$TaskSettings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RunOnlyIfNetworkAvailable

# Register task
try {
  Register-ScheduledTask `
    -TaskName $TaskName `
    -Trigger $TaskTrigger `
    -Action $TaskAction `
    -Settings $TaskSettings `
    -Description "Daily scan of C:\dev repos against roadmap docs; updates docs and sends Slack report" `
    -Force `
    -ErrorAction Stop

  Write-Host "✅ Task registered: $TaskName"
  Write-Host "   Schedule: Daily at 09:00 UTC"
  Write-Host "   Script: $ScriptPath"
  Write-Host "   Working dir: $WorkingDir"
  Write-Host ""
  Write-Host "⚙️  To update environment variables:"
  Write-Host "   Set-Item -Path env:SLACK_WEBHOOK_URL -Value 'https://hooks.slack.com/services/YOUR_WEBHOOK'"
  Write-Host ""
  Write-Host "📋 To view/edit task:"
  Write-Host "   taskschd.msc"
  Write-Host ""
  Write-Host "🧪 To test (run now):"
  Write-Host "   Start-ScheduledTask -TaskName '$TaskName'"
} catch {
  Write-Error "Failed to register task: $_"
  exit 1
}
