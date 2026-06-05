# Skill Gateway Deployment Guide

**Status:** Ready to deploy | **Time:** 30 minutes total

---

## Quick Start (Local Development)

```bash
cd apps/skill-gateway
npm install
npm start
```

**Gateway runs on:** http://localhost:3000

**Test it:**
```bash
# List all skills
curl http://localhost:3000/api/skills

# Invoke a skill
curl -X POST http://localhost:3000/api/skill/cic-section-summarizer/invoke \
  -H "Content-Type: application/json" \
  -d '{"sectionId":"phase-44.0","files":[]}'

# Get status
curl http://localhost:3000/api/status

# View API docs
curl http://localhost:3000/api/docs
```

---

## Deployment: Azure (Copilot)

### Step 1: Create Azure Resources (5 min)

```bash
# Set variables
RESOURCE_GROUP="skill-gateway-rg"
WEBAPP_NAME="skill-gateway-$(date +%s)"
APP_SERVICE_PLAN="skill-gateway-plan"

# Create resource group
az group create \
  --name $RESOURCE_GROUP \
  --location eastus

# Create app service plan
az appservice plan create \
  --name $APP_SERVICE_PLAN \
  --resource-group $RESOURCE_GROUP \
  --sku B1 \
  --is-linux

# Create web app
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN \
  --name $WEBAPP_NAME \
  --runtime "node|18.0"
```

### Step 2: Deploy Code (5 min)

```bash
# Build for production
npm install --production

# Create deployment package
zip -r deployment.zip . -x "node_modules/*" ".git/*" ".env"

# Deploy to Azure
az webapp deployment source config-zip \
  --resource-group $RESOURCE_GROUP \
  --name $WEBAPP_NAME \
  --src deployment.zip
```

### Step 3: Configure Environment (5 min)

```bash
# Set app settings
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $WEBAPP_NAME \
  --settings PORT=80 NODE_ENV=production
```

### Step 4: Verify Deployment (5 min)

```bash
# Get URL
GATEWAY_URL=$(az webapp show \
  --resource-group $RESOURCE_GROUP \
  --name $WEBAPP_NAME \
  --query defaultHostName -o tsv)

echo "Gateway URL: https://$GATEWAY_URL"

# Test API
curl https://$GATEWAY_URL/api/health
curl https://$GATEWAY_URL/api/skills
```

---

## Deployment: Google Cloud (Gemini)

### Step 1: Create Cloud Functions (10 min)

```bash
# Set project
PROJECT_ID="your-project-id"
REGION="us-central1"

gcloud config set project $PROJECT_ID

# Create Cloud Storage bucket for code
BUCKET_NAME="skill-gateway-src-${PROJECT_ID}"
gsutil mb gs://$BUCKET_NAME/

# Upload code
gcloud functions source create-from-git \
  --name skill-gateway \
  --source-url https://github.com/YOUR_ORG/rewrite-mcp.git \
  --source-dir apps/skill-gateway
```

### Step 2: Deploy Functions (5 min)

```bash
# Deploy main function
gcloud functions deploy skill-gateway-http \
  --gen2 \
  --runtime nodejs18 \
  --region=$REGION \
  --source gs://$BUCKET_NAME \
  --entry-point=router \
  --trigger-http \
  --allow-unauthenticated \
  --memory 512MB \
  --timeout 60s \
  --max-instances 100
```

### Step 3: Create Cloud Run Service (5 min)

```bash
# For better performance, use Cloud Run instead
gcloud run deploy skill-gateway \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 60 \
  --max-instances 100
```

### Step 4: Get Service URL

```bash
# Retrieve service URL
gcloud run services describe skill-gateway \
  --platform managed \
  --region $REGION \
  --format 'value(status.url)'
```

---

## Deployment: Docker (Any Platform)

### Step 1: Create Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY apps/skill-gateway/package*.json ./
RUN npm install --production

COPY apps/skill-gateway .
COPY skills-runtime ../skills-runtime
COPY skills ../skills
COPY workflows ../workflows

EXPOSE 3000

CMD ["node", "index.js"]
```

### Step 2: Build & Push

```bash
# Build image
docker build -t skill-gateway:latest .

# Tag for registry
docker tag skill-gateway:latest your-registry.azurecr.io/skill-gateway:latest

# Push to registry
docker push your-registry.azurecr.io/skill-gateway:latest
```

### Step 3: Run Locally

```bash
docker run -p 3000:3000 skill-gateway:latest
```

---

## Integration: Copilot Plugin

### Create Plugin Manifest

```json
{
  "schema_version": "v1",
  "info": {
    "name": "Skill Gateway",
    "description": "Access 13 CIC/MEE/RL skills and 3 workflows",
    "version": "1.0.0"
  },
  "auth": {
    "type": "api_key",
    "api_key_header": "X-API-Key"
  },
  "api": {
    "type": "REST",
    "base_url": "https://skill-gateway-XXXXX.azurewebsites.net"
  },
  "functions": [
    {
      "name": "invoke_skill",
      "description": "Invoke any of the 13 available skills",
      "method": "POST",
      "path": "/api/skill/{skillName}/invoke",
      "parameters": {
        "skillName": { "type": "string" },
        "payload": { "type": "object" }
      }
    },
    {
      "name": "execute_workflow",
      "description": "Execute one of the 3 available workflows",
      "method": "POST",
      "path": "/api/workflow/{workflowId}/execute",
      "parameters": {
        "workflowId": { "type": "string" },
        "inputs": { "type": "object" }
      }
    },
    {
      "name": "get_status",
      "description": "Get unified system status",
      "method": "GET",
      "path": "/api/status"
    }
  ]
}
```

### Register with Copilot

1. Go to [Microsoft Partner Center](https://partner.microsoft.com)
2. Create new plugin
3. Upload manifest above
4. Set API key in Copilot settings
5. Test in Copilot

---

## Integration: Gemini

### Register with Gemini

```python
from google.cloud import aiplatform
import json

# Initialize Vertex AI
aiplatform.init(project="YOUR_PROJECT")

# Define tools for Gemini
tools = {
    "invoke_skill": {
        "description": "Invoke any of 13 skills",
        "parameters": {
            "type": "object",
            "properties": {
                "skillName": {"type": "string"},
                "payload": {"type": "object"}
            }
        }
    },
    "execute_workflow": {
        "description": "Execute any of 3 workflows",
        "parameters": {
            "type": "object",
            "properties": {
                "workflowId": {"type": "string"},
                "inputs": {"type": "object"}
            }
        }
    }
}

# Create model with tools
model = aiplatform.GenerativeModel("gemini-1.5-pro")
model.tool_config.from_dict(tools)
```

---

## Testing

### Run Integration Tests

```bash
# 1. Start gateway locally
npm start

# 2. In another terminal, run tests
npm test
```

### Manual Testing

```bash
# Test skills endpoint
curl http://localhost:3000/api/skills | jq .

# Test workflow execution
curl -X POST http://localhost:3000/api/workflow/phase-summary-roadmap/execute \
  -H "Content-Type: application/json" \
  -d '{
    "phaseId": "phase-44.0",
    "sectionIds": ["§0.4"],
    "roadmap": {}
  }' | jq .

# Check status
curl http://localhost:3000/api/status | jq .

# View telemetry
curl http://localhost:3000/api/telemetry | jq .
```

---

## Monitoring

### Azure Monitoring

```bash
# View logs
az webapp log tail \
  --resource-group $RESOURCE_GROUP \
  --name $WEBAPP_NAME

# Set up alerts
az monitor metrics alert create \
  --resource-group $RESOURCE_GROUP \
  --name skill-gateway-alert \
  --condition "avg requests/total > 1000"
```

### Google Cloud Monitoring

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=skill-gateway" \
  --limit 50 \
  --format json
```

---

## Performance Tuning

### Memory & CPU

- **Development:** 512MB RAM, 1 CPU (fine)
- **Production:** 1GB+ RAM, 2+ CPUs (recommended)

### Scaling

- **Azure:** Auto-scale based on CPU/Memory
- **GCP:** Configure max instances in Cloud Run
- **Docker:** Use Kubernetes for auto-scaling

### Caching

Add Redis for telemetry caching:

```bash
# Azure Cache for Redis
az redis create \
  --resource-group $RESOURCE_GROUP \
  --name skill-gateway-cache \
  --sku basic
```

---

## Security Checklist

- [ ] Enable HTTPS only
- [ ] Add API authentication (API key or OAuth)
- [ ] Set CORS restrictions
- [ ] Add rate limiting (1000 req/min per IP)
- [ ] Enable request signing (Azure/GCP)
- [ ] Rotate secrets monthly
- [ ] Enable logging/monitoring
- [ ] Test with OWASP Top 10 vulnerabilities

---

## Rollback Plan

```bash
# If deployment fails, rollback to previous version
# Azure
az webapp deployment slot swap \
  --resource-group $RESOURCE_GROUP \
  --name $WEBAPP_NAME

# GCP
gcloud run services update skill-gateway \
  --update-env-vars REVISION=previous
```

---

**Timeline: 30 minutes**
- Local setup: 5 min
- Azure deployment: 15 min
- GCP deployment: 15 min
- Testing: 5 min

All done. Copilot and Gemini now have access to all 13 skills + 3 workflows.

