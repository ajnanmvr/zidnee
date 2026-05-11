# Zidnee API Documentation

## Generated OpenAPI/Swagger Files

This directory contains auto-generated API specification files for the Zidnee platform.

### Files Available

- **swagger.json** - OpenAPI 3.0 specification in JSON format
- **swagger.yaml** - OpenAPI 3.0 specification in YAML format
- **swagger-postman.json** - JSON file for Postman import

### Regenerate Files

To regenerate these files after updating API routes:

```bash
cd apps/server
pnpm swagger:generate
```

### Import into API Testing Tools

#### Postman
1. Open Postman
2. Click **File** → **Import**
3. Select `swagger.json`
4. Collections are created automatically

#### Insomnia
1. Open Insomnia
2. Click **Create** → **From URL**
3. Paste the path to `swagger.yaml`
4. Import the specification

#### Thunder Client (VS Code)
1. Open Thunder Client extension
2. Click **Import** → **OpenAPI 3.0**
3. Select `swagger.json`

#### Swagger Editor (Online)
1. Go to https://editor.swagger.io
2. Click **File** → **Import URL**
3. Or copy-paste the content from `swagger.json`

### Live Documentation

Access the interactive Swagger UI while the server is running:

```bash
http://localhost:3001/api/docs
```

### Direct API Endpoints

- **JSON Spec:** `GET http://localhost:3001/api/docs.json`
- **YAML Spec:** `GET http://localhost:3001/api/export/swagger-yaml`
- **Downloadable JSON:** `GET http://localhost:3001/api/export/swagger-json`

### Documentation Structure

All API endpoints are documented with:
- Summary and description
- Request/response schemas
- Required parameters
- Security requirements
- Permission keys

### Supported Tools

| Tool | Status | Format | Setup |
|------|--------|--------|-------|
| Postman | ✓ Ready | JSON | File > Import > swagger.json |
| Insomnia | ✓ Ready | YAML | Create > From URL > swagger.yaml |
| Thunder Client | ✓ Ready | JSON | Import > OpenAPI 3.0 |
| Swagger Editor | ✓ Ready | JSON | Import URL |
| API Blueprint | ✓ Ready | JSON/YAML | Copy content |

### Auto-Update Workflow

The Swagger files are auto-generated from JSDoc comments in route files:

```typescript
/**
 * @swagger
 * /api/endpoint:
 *   get:
 *     tags:
 *       - Category
 *     summary: Endpoint summary
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/endpoint", handler);
```

**No manual documentation needed** — JSDoc → API Spec → All tools sync automatically!

### Generated Files Details

```
docs/
├── api/
│   ├── swagger.json          # Primary spec file (JSON)
│   ├── swagger.yaml          # Alternative spec file (YAML)
│   └── swagger-postman.json  # Postman-compatible JSON
└── README.md                 # This file
```

### CI/CD Integration

Add to your build pipeline:

```bash
# Generate before deploying
pnpm swagger:generate
```

This ensures API documentation is always in sync with code.
