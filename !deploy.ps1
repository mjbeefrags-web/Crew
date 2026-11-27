param(
  [string]$Message = "deploy: ship latest changes"
)

# !deploy — commit, push and watch the cloud deployment.
# Usage: .\!deploy.ps1 "feat: something"

$ErrorActionPreference = "Stop"

git add -A
if (git diff --cached --quiet) {
  Write-Host "No staged changes to commit."
} else {
  git commit -m $Message
}

$branch = git branch --show-current
git push origin $branch

$remote = git remote get-url origin
if ($remote -match 'github\.com[:/]([^/]+)/([^\.]+)(\.git)?$') {
  $owner = $Matches[1]
  $repo = $Matches[2]
} else {
  Write-Host "Pushed $branch. Could not parse GitHub remote; open Actions manually."
  exit 0
}

$api = "https://api.github.com/repos/$owner/$repo/actions/runs?branch=$branch&per_page=1"
Write-Host "Watching $api"

for ($attempt = 0; $attempt -lt 60; $attempt++) {
  try {
    $run = Invoke-RestMethod -Uri $api -Headers @{ "User-Agent" = "crewww-deploy" }
    $latest = $run.workflow_runs | Select-Object -First 1
    Write-Host "Run $($latest.run_number): $($latest.status) / $($latest.conclusion)"
    if ($latest.status -eq "completed") {
      if ($latest.conclusion -eq "success") {
        Write-Host "Deployment succeeded: $($latest.html_url)"
      } else {
        Write-Warning "Deployment ended with $($latest.conclusion): $($latest.html_url)"
      }
      exit 0
    }
  } catch {
    Write-Warning "Could not read Actions status: $($_.Exception.Message)"
  }
  Start-Sleep -Seconds 10
}

Write-Warning "Timed out watching deployment. Check $api"
