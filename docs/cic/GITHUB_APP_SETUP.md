---
title: GitHub App Registration & Deployment Guide
version: 1.0.0
date: 2026-06-03
---

# GitHub App Registration & Deployment Guide

Complete step-by-step guide for registering the GitHub Actions Compliance Bot as a GitHub App and deploying it to production.

## Prerequisites

- GitHub organization or personal account with admin access
- Probot server deployment target (Heroku, AWS Lambda, GCP Cloud Run, or self-hosted)
- Domain with HTTPS (required for GitHub webhooks)

## Step 1: Register GitHub App

1. Go to your GitHub account settings: **Settings → Developer settings → GitHub Apps**
2. Click **New GitHub App**
3. Fill in the form:

```
GitHub App name:           gh-actions-compliance-bot
Homepage URL:              https://github.com/your-org/rewrite-mcp
Webhook URL:               https://your-deployment-domain.com/
Webhook secret:            (Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

4. **Permissions Required:**
   - Repository: Actions (read, write)
   - Repository: Contents (read, write)
   - Repository: Pull Requests (read, write)
   - Repository: Workflows (read, write)

5. **Subscribe to Events:**
   - `schedule.repository`
   - `workflow_run`

6. **Where can this GitHub App be installed?**
   - Select "Only on this account" or "Any account" depending on scope

7. Click **Create GitHub App**

## Step 2: Generate and Save Credentials

1. On the GitHub App settings page, scroll to **Private keys**
2. Click **Generate a private key**
3. Save the `.pem` file securely (you'll need its content)

4. Copy the **App ID** from the top of the page

5. You now have two secrets:
   - `GITHUB_APP_ID` (e.g., 12345)
   - `GITHUB_APP_PRIVATE_KEY` (content of .pem file)

## Step 3: Install GitHub App on Target Repositories

1. Go to your organization or personal account settings
2. **Settings → Developer settings → GitHub Apps → gh-actions-compliance-bot**
3. Click **Install App** on the left sidebar
4. Select which repositories can access the app:
   - For testing: Select only `rewrite-mcp`
   - For full rollout: Select all repositories or specific ones
5. Click **Install**

## Step 4: Deploy Probot Server

Choose your deployment platform:

### Option A: Heroku (Simplest)

```bash
# Login to Heroku
heroku login

# Create a new app
heroku create gh-actions-compliance-bot

# Set environment variables
heroku config:set GITHUB_APP_ID=12345 --app gh-actions-compliance-bot
heroku config:set GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----..." --app gh-actions-compliance-bot

# Deploy
cd tools
git push heroku main

# View logs
heroku logs --tail --app gh-actions-compliance-bot
```

### Option B: AWS Lambda

```bash
# Package Probot app
cd tools
npm run build  # or appropriate build command

# Deploy to AWS Lambda
# (Use AWS SAM, Serverless Framework, or manual upload)
```

### Option C: Self-Hosted (Docker)

```bash
# Create Dockerfile
cat > Dockerfile <<EOF
FROM node:24-alpine
WORKDIR /app
COPY tools .
RUN npm ci
EXPOSE 3000
CMD ["npm", "start"]
EOF

# Build and run
docker build -t gh-actions-bot .
docker run -e GITHUB_APP_ID=12345 -e GITHUB_APP_PRIVATE_KEY="..." -p 3000:3000 gh-actions-bot
```

## Step 5: Update GitHub App Webhook URL

1. Go back to GitHub App settings
2. Update **Webhook URL** to your deployed URL:
   - Heroku: `https://gh-actions-compliance-bot.herokuapp.com/`
   - AWS: `https://your-lambda-url.execute-api.us-east-1.amazonaws.com/`
   - Self-hosted: `https://your-domain.com/`

3. Copy **Webhook secret** and set as `GITHUB_APP_WEBHOOK_SECRET` environment variable

## Step 6: Verify Deployment

```bash
# Check deployment is alive
curl https://your-deployment-url/

# View Probot logs
# (Platform-specific: Heroku logs, CloudWatch, Docker logs, etc.)

# Trigger test event: Push to a workflow file in target repo
cd rewrite-mcp
# Edit .github/workflows/test.yml with node-version: 20
git push origin main

# GitHub should send webhook event
# Check logs for event processing
```

## Step 7: Configure Slack Notifications (Optional)

1. Create Slack webhook:
   - Go to your Slack workspace: **Settings → Integrations → Incoming Webhooks**
   - Click **Create New Webhook**
   - Select target channel
   - Copy webhook URL

2. Set environment variable:
   ```bash
   heroku config:set SLACK_WEBHOOK_URL="https://hooks.slack.com/..." --app gh-actions-compliance-bot
   ```

3. GitHub App will now post compliance notifications to Slack

## Step 8: Enable CI/CD Compliance Gate (Optional)

Add to your `.github/workflows/ci.yml`:

```yaml
- name: Check GitHub Actions Compliance
  run: npm run gh-actions:check-manifest
  
- name: Fail if non-compliant
  if: failure()
  run: exit 1
```

This prevents merging non-compliant workflows.

## Monitoring & Troubleshooting

### View Webhook Deliveries

1. Go to GitHub App settings
2. Click **Advanced**
3. Scroll to **Recent Deliveries**
4. Click on a delivery to see request/response details

### Common Issues

**Webhook signature mismatch:**
- Verify `GITHUB_APP_WEBHOOK_SECRET` matches GitHub settings
- Check webhook payload is being sent correctly

**GitHub App not responding:**
- Verify deployment is running and logs show no errors
- Check webhook URL is accessible and returns 2xx status
- Verify GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY are set

**Auto-fix PRs not being created:**
- Check GitHub App has write access to target repos
- Verify workflow files exist in `.github/workflows/`
- Check logs for compliance detection events

### View Deployment Logs

```bash
# Heroku
heroku logs --tail --app gh-actions-compliance-bot

# Docker
docker logs <container-id>

# AWS CloudWatch
aws logs tail /aws/lambda/gh-actions-bot --follow
```

## Testing the Compliance Bot

```bash
# Create a test workflow with violations
cat > .github/workflows/test.yml <<EOF
name: Test
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v3
        with:
          node-version: 20
EOF

# Commit and push
git add .github/workflows/test.yml
git commit -m "test: add non-compliant workflow"
git push origin main

# GitHub sends webhook event
# Bot detects violations and creates auto-fix PR
```

## Production Checklist

- [ ] GitHub App registered on github.com
- [ ] Private key saved securely (not in git)
- [ ] App ID and private key set as environment variables
- [ ] Webhook URL configured and pointing to deployed server
- [ ] Webhook secret set as environment variable
- [ ] GitHub App installed on target repositories
- [ ] Probot server deployed and running
- [ ] Webhook deliveries successful (check Advanced → Recent Deliveries)
- [ ] Test compliance detection triggers auto-fix PR
- [ ] Slack webhook optional: configured if using notifications
- [ ] CI/CD gate optional: added to prevent non-compliant merges
- [ ] Team notified of new enforcement

## Next Steps

1. **Verify auto-fix PRs:** Push a test workflow with `node-version: 20`, confirm bot creates PR
2. **Monitor:** Check logs and webhook deliveries daily for first week
3. **Rollout:** Expand to all repositories after 1-2 weeks of stable operation
4. **Expand scope:** Add other compliance checks (version pinning, security policies, etc.)

See [GH_ACTIONS_COMPLIANCE_GUIDE.md](./GH_ACTIONS_COMPLIANCE_GUIDE.md) for full system documentation.
