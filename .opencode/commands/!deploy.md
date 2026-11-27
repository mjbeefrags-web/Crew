---
description: !deploy — commit, push and watch the Railway + Cloudflare deployment
agent: general
---

Deploy the current CREWWW work to the cloud.

Use `$ARGUMENTS` as the commit message. If it is empty, use
`deploy: ship latest changes`.

Run the project script:

!`powershell -NoProfile -ExecutionPolicy Bypass -File .\!deploy.ps1 "$ARGUMENTS"`

Report the resulting commit, pushed branch and GitHub Actions run URL. If the
deployment fails, inspect the failing job and fix it before re-running.
