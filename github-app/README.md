# Atriumn Issue-Driven Development GitHub App

This GitHub App efficiently routes issue comments to trigger development pipeline workflows, eliminating the wasteful "skipped runs" from traditional `issue_comment` triggers.

## How It Works

1. **Install the app** on your repositories
2. **Comment triggers** are filtered and converted to `repository_dispatch` events
3. **Workflows run only when needed** - no more skipped runs!

## Supported Triggers

### Human Commands
- `@atriumn start` → Triggers research phase
- `@atriumn approve-research` → Approves research and starts planning
- `@atriumn approve-plan` → Approves plan and starts implementation

### AI Status Updates
- `🟣 ATRIUMN-RESEARCH-COMPLETE` → Research phase completed
- `🟣 ATRIUMN-PLANNING-COMPLETE` → Planning phase completed  
- `🟣 ATRIUMN-IMPLEMENTATION-COMPLETE` → Implementation phase completed

## Setup

### 1. Create GitHub App
```bash
# Use the app.yml manifest to create your GitHub App
gh api --method POST /app-manifests/YOUR-MANIFEST-CODE \
  --field manifest=@app.yml
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
export GITHUB_APP_ID=your_app_id
export GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----..."
export GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

### 4. Deploy
Deploy to your preferred platform (Vercel, Railway, Heroku, etc.)

### 5. Update Workflows
Change your workflow triggers from:
```yaml
on:
  issue_comment:
    types: [created]
```

To:
```yaml
on:
  repository_dispatch:
    types: [pipeline-start, research-complete, approve-research, planning-complete, approve-plan, implementation-complete]
```

## Development

```bash
npm run dev  # Local development with nodemon
npm start    # Production server
```

## Benefits

- **90% fewer GitHub Actions runs** (no more skipped runs)
- **Faster trigger response** (direct dispatch vs comment filtering)
- **Cleaner Actions history** (only meaningful runs)
- **Cost savings** on GitHub Actions minutes