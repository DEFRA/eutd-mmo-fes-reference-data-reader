# MMO FES Reference Data Reader - AI Coding Agent Instructions

## Project Overview

This is the **MMO Fish Export Service (FES) Reference Data Reader**, a Node.js/TypeScript service responsible for loading reference data, running scheduled validation jobs, and transforming export certificate documents for reporting systems. It's part of a microservices architecture for UK fisheries export certificate management.

### Core Domain Concepts

- **Document Types**: Three primary certificate types tracked in this system:
  - **Catch Certificates (CC)**: Export certificates for caught fish
  - **Processing Statements (PS)**: Documents for processed fishery products
  - **Storage Documents (SD)**: Non-manipulation documents for stored products

- **Validation Flow**: Documents are validated against landing data, foreign catch certificates, and business rules, then transformed into reports for Strategic Reporting (SR), Defra Trade API, and Case Management systems.

- **Cron Jobs**: Service runs scheduled jobs (`node-cron`) to refresh species, vessels, and countries reference data from external APIs and Azure Blob Storage.

## Architecture & Key Components

### Directory Structure

```
src/
├── landings/           # Core domain logic for validation & transformation
│   ├── transformations/ # Document-to-report mappers (defraValidation.ts, defraTradeValidation.ts)
│   ├── types/          # TypeScript interfaces for domain models
│   ├── query/          # Risk scoring and validation queries
│   ├── orchestration/  # Batch report generation
│   └── persistence/    # MongoDB schemas and data access
├── controllers/        # Hapi.js HTTP endpoints
├── services/           # External API integrations (Trade API, AV scanning)
├── data/               # Reference data loaders (vessels, species, countries)
├── config.ts           # Environment configuration loader
└── server.ts           # Hapi server setup with cron job initialization
```

### Data Schemas Location

**Critical**: JSON schemas for SR reports are stored in `/data/schemas/Strategic Reporting/` (shared across the monorepo, not in `src/`). When adding fields to SR reports, **always update both**:
1. The JSON schema in `/data/schemas/Strategic Reporting/<DocumentType>.json`
2. The TypeScript interface in `src/landings/types/defraValidation.ts`
3. The transformation function in `src/landings/transformations/defraValidation.ts`

### Key Transformation Functions

Located in `src/landings/transformations/defraValidation.ts`:

- `toSdDefraReport()` - Transforms Storage Documents to SR format
- `toPsDefraReport()` - Transforms Processing Statements to SR format
- `toLandings()` - Transforms catch certificate landings with risk scoring
- `toTransportation()` - Maps transport details (truck/train/plane/vessel) with mode-specific fields

**Pattern**: Use helper functions like `populateExportData()`, `toDefraSdProduct()` for modular transformation steps.

## Development Workflows

### Setup & Running

```bash
# Clone and setup
cp .envSample .env    # Configure MongoDB, Azure, API credentials
npm i
npm start             # Dev mode with nodemon + ts-node
```

### Testing

```bash
npm test              # Run full test suite with coverage
npm run test:watch    # Watch mode for TDD
```

**Coverage Requirements** (enforced in CI):
- Statements: 97%
- Branches: 92%
- Functions: 97%
- Lines: 97%

Test files mirror `src/` structure in `test/` directory. Use `mongodb-memory-server` for integration tests.

### Common Test Patterns

```typescript
// Example from existing tests - use structured mock data
const mockDocument = {
  documentNumber: 'GBR-2023-SD-TEST123',
  exportData: {
    catches: [/* ... */],
    transportation: { vehicle: 'truck', /* ... */ }
  }
};

const result = toSdDefraReport('GBR-2023-SD-TEST123', correlationId, 'COMPLETE', false, mockDocument);
expect(result.products).toBeDefined();
```

### Debugging

```bash
npm run debug:start   # Starts with Node inspector on port 9229
```

## Project-Specific Conventions

### Branching Strategy

**GitFlow** is used (despite some confusion in READMEs mentioning trunk-based):
- `main` - Production releases
- `develop` - Integration branch
- `feature/*`, `epic/*`, `hotfix/*` - Feature work

**Critical**: Azure Pipelines will fail if branch naming doesn't follow this convention.

### Document Transformation Pattern

When mapping fields between systems, follow this pattern (see `toDefraSdProduct()` as reference):

```typescript
export function toDefraSdProduct(sdCatch): StorageDocumentReportCatch {
  return sdCatch ? {
    species: sdCatch.product,
    scientificName: sdCatch.scientificName,
    productWeight: parseInt(sdCatch.productWeight, 10),
    // Conditional mapping based on certificate type
    isDocumentIssuedInUK: sdCatch.certificateType === 'uk',
    issuingCountry: sdCatch.certificateType === 'uk' 
      ? "United Kingdom" 
      : sdCatch.issuingCountry?.officialCountryName,
  } : undefined;
}
```

**Key Points**:
1. Always handle nullable inputs (`sdCatch ? ... : undefined`)
2. Map `certificateType === 'uk'` to `isDocumentIssuedInUK` boolean
3. Use nested optional chaining (`issuingCountry?.officialCountryName`)
4. Parse numeric strings with `parseInt(value, 10)`

### Transportation Mode Mapping

Transportation data uses a discriminated union pattern. **Always use switch statements** (see `toTransportation()` function):

```typescript
switch (transportation.vehicle) {
  case 'truck': return { modeofTransport: 'truck', hasRoadTransportDocument: ..., registration: ... };
  case 'plane': return { modeofTransport: 'plane', flightNumber: ..., containerId: ... };
  case 'vessel': 
  case 'containerVessel': return { modeofTransport: 'vessel', name: ..., flag: ... };
  // Always include default case
  default: return { modeofTransport: transportation.vehicle, exportLocation: ... };
}
```

**Note**: `containerVessel` is normalized to `vessel` in the output.

### Spread Operator for Optional Fields

For conditional fields like `placeOfUnloading`, use spread operator:

```typescript
return {
  modeofTransport: transportation.vehicle,
  exportLocation: transportation.departurePlace,
  // Only include if present
  ...(transportation.placeOfUnloading && { placeOfUnloading: transportation.placeOfUnloading }),
};
```

### MongoDB Discriminator Pattern

Defra validation reports use Mongoose discriminators for polymorphic document storage:

```typescript
// Base model
const DefraValidationReportData = model('DefraValidationReportData', new Schema({}, baseConfig));

// Discriminated models share collection but have _type field
const DefraValidationStorageDocumentModel = DefraValidationReportData.discriminator(
  'defraValidationStorageDocument', 
  DefraValidationStorageDocumentSchema
);
```

All variants share the `defravalidationreports` collection.

## External Integrations

### Azure Service Bus

Reports are published to queues configured via environment:
- `AZURE_QUEUE_CONNECTION_STRING` + `REPORT_QUEUE` - Strategic Reporting
- `AZURE_QUEUE_TRADE_CONNECTION_STRING` + `REPORT_QUEUE_TRADE` - Defra Trade API

Queue publishing is enabled only in production (`NODE_ENV === 'production'`).

### Defra Trade API (Countries)

OAuth2 client credentials flow used for country data sync. Configuration in `ApplicationConfig`:
- `DEFRA_TRADE_API_OAUTH_CLIENT_ID/SECRET/SCOPE/TOKEN_URL`
- Scheduled refresh via `REFRESH_SPECIES_JOB` cron expression

### Azure Blob Storage

Reference data (vessels CSV, species data) stored in blob containers:
- `AZURE_BLOB_URL` + `AZURE_BLOB_CONTAINER` + `AZURE_SAS`
- `REFERENCE_DATA_AZURE_STORAGE` connection string for uploads

### Anti-Virus Scanning

File uploads scanned via `services/antiVirus.service.ts`. Can be disabled with `SKIP_AV_SCAN=true` in dev.

## Common Tasks

### Adding a New Field to SR Reports

1. **Update JSON schema** in `/data/schemas/Strategic Reporting/StorageDocument.json`:
   ```json
   "properties": {
     "newField": { "type": "string", "description": "..." }
   }
   ```

2. **Update TypeScript interface** in `src/landings/types/defraValidation.ts`:
   ```typescript
   export interface StorageDocumentReportCatch {
     // ... existing fields
     newField?: string;
   }
   ```

3. **Map in transformation** in `src/landings/transformations/defraValidation.ts`:
   ```typescript
   export function toDefraSdProduct(sdCatch): StorageDocumentReportCatch {
     return {
       // ... existing mappings
       newField: sdCatch.newSourceField,
     };
   }
   ```

4. **Add test coverage** in `test/landings/transformations/` to maintain 97% threshold.

### Risk Scoring

Risk calculations in `src/landings/query/isHighRisk.ts` combine vessel, species, and exporter scores. When adding new risk factors:
- Update `getTotalRiskScore()` calculation
- Modify `isHighRisk()` threshold if needed (currently checks if total > threshold)
- Update `landingValidationstatusAtSubmission` mapping in `toLandings()`

## Important Notes

- **Shared Package**: `mmo-shared-reference-data` is an internal npm package. Updates require publishing to Azure Artifacts feed (see `.npmrc` config instructions in shared-data README).
- **Correlation IDs**: Always propagate `_correlationId` through transformation pipelines for end-to-end traceability.
- **Moment.js**: Used for date manipulation. Always use `.format('YYYY-MM-DD')` for date-only fields to match SR schema.
- **Lodash**: Imported as full library. Prefer `isEmpty()` over `!value` for null/undefined/empty checks.
- **Application Insights**: Telemetry configured via `INSTRUMENTATION_KEY` and `INSTRUMENTATION_CLOUD_ROLE`. Logs via `bunyan` logger.

## Testing Gotchas

- **MongoDB Memory Server**: Starts slow on first test run. Use `--runInBand` in CI to avoid parallel test collisions.
- **Mock Service Bus**: Queue integration tests should mock `@azure/service-bus` to avoid external dependencies.
- **Timezone Issues**: Use `moment.utc()` in tests to avoid local timezone flakiness.

## Skills

Use `/develop` for implementation, coding, and research tasks. Use `/unit-tests` for writing tests, coverage, and SonarQube issues.

## Defra standards and governance

This service must comply with [Defra software development standards](https://github.com/DEFRA/software-development-standards) — the single source of truth. The rules below encode those standards; they do not replace them. When a standard changes, update this file.

### Quality gates

All code must pass these checks before merging:

- Linter passes (`npm run lint`)
- All tests pass (`npm test`)
- Coverage ≥90% global (Statements/Branches/Functions/Lines), ≥95% core business logic, 100% error-handling and security-critical paths — no decrease from the SonarCloud baseline
- SonarQube/SonarCloud quality gate passes; security hotspots reviewed and resolved
- At least one approving review from another developer
- No unresolved security vulnerabilities in dependencies

### Security and PII

- Follow [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
- Never commit secrets — load all configuration and credentials from environment variables (`src/config.ts`), never `process.env` scattered through code
- **Never log PII**: names, addresses, emails, phone numbers, NI numbers, bank details, usernames, passwords, API keys, tokens
- Validate and sanitise all external input; use parameterised queries for database access
- Avoid `eval`, dynamic `Function()`, or executing user-supplied data; validate and normalise file paths

### Dependencies

- New dependencies must be widely used, actively maintained, and compatible with the current Node.js LTS
- `mmo-shared-reference-data` is the SSOT for shared types and queries — never duplicate its logic
- Do not introduce a second HTTP framework, ORM, or date library without an approved exception

### Logging

- Structured logging via `bunyan` with bracketed context tags and `_correlationId` propagation
- Levels: `error` (failures), `warn` (handled but unexpected), `info` (business events), `debug` (development only)

### How Copilot should respond

- Follow conventions already in the codebase — check existing patterns first
- Prefer modifying existing files over creating new ones when the change fits naturally
- Provide minimal diffs touching only the necessary files; do not refactor unrelated code
- Always include or update tests for changed behaviour
- Keep the JSON schema, TypeScript interface, and transformation function in sync — update all three together
- If a request conflicts with these instructions — a discouraged library, a skipped test, a hard-coded secret, or a broken quality gate — flag it explicitly and do not proceed silently

### Licence

All code is published under the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/) unless an approved exception exists.

<!-- STANDARDS NOTE: These instructions reflect Defra software development standards (https://github.com/DEFRA/software-development-standards). Review this file periodically or after any Defra standards update. -->

---

**Last Updated**: Based on codebase snapshot October 31, 2025
