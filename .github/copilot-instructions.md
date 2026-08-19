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

## Standards precedence (highest wins)

When guidance conflicts, follow this order:

1. **DEFRA Software Development Standards** (mandatory) — https://defra.github.io/software-development-standards/
2. **DEFRA Digital Service Manual** — https://digital.defra.gov.uk/service-manual
3. **GOV.UK Service Standard & Service Manual (GDS)** — https://www.gov.uk/service-manual
4. **Community best practice** — [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/), [12-factor](https://12factor.net/), widely-adopted Node.js/TypeScript patterns

> **DEFRA takes precedence over GDS. GDS takes precedence over community guidance.** Any deviation from a DEFRA standard MUST be raised as a formal exception through DEFRA's architectural governance (Delivery Architecture team: `delivery.architecture@defra.gov.uk`).

## The working framework (Triage → Read → Research → Clarify → Plan → Approval → Implement → Test → Iterate → Summarise)

This section is the **single source of truth** for the working loop. The custom agents ([Orchestrator](.github/agents/reference-data-reader-orchestrator.agent.md), [Planner](.github/agents/reference-data-reader-planner.agent.md), [Developer](.github/agents/reference-data-reader-developer.agent.md) and [Reviewer](.github/agents/reference-data-reader-reviewer.agent.md)) reference it and **must not restate or fork it**. The guiding principle is **match effort to risk**: do the least work that still delivers the change safely and to standard.

**Triage first — pick one of three gears by size and risk:**

- **Trivial** (typo, comment/doc tweak, a small localised change with no impact on architecture, transformations, schema validation, persistence, external integrations, security or data correctness): skip the planner, research and review. Do a light **Read → Implement → Test → Summarise**, and research only the one point that is genuinely uncertain.
- **Standard** (a normal transformation/mapping or persistence change, or fix, with **no** new architecture, external integration, or security surface): use a **lightweight inline plan** (a short Objective · Plan · Files · Validation · Risks note from the Developer agent — no heavyweight Planner), get approval, then implement and test. Run a **single** risk-scoped research pass **only if** something is genuinely uncertain.
- **Complex** (new architecture, a new external integration, schema changes affecting the SR/Trade API contract, scheduled-job changes, a security surface, or multi-item delivery): run the full loop with the Planner agent below.

**Manual override.** The user can force a gear — e.g. "treat this as trivial", "just a lightweight/standard plan", "force the full plan", "skip the planner" — and that instruction wins over the automatic classification. Always honour a request for **more** rigour. When the user asks for **less** rigour than the risk warrants, comply but **briefly flag the risk first**, and never drop the approval gate or security for a change that genuinely touches architecture, external integrations, security or data correctness.

The loop (Standard and Complex; Trivial uses the light path above):

1. **Read** — Read the relevant files/config in the repo for context before acting. Never assume; verify.
2. **Research (single pass, risk-scoped)** — When something is genuinely uncertain — an unfamiliar or version-sensitive API, security, or DEFRA/GDS policy — do **one** thorough, risk-scoped research pass in the open and validate findings against DEFRA/GDS and framework/library guidance so advice reflects current APIs and policy. Cite sources. **Do not run a second, separate validation research round** — the plan is checked against these same cited sources. Well-trodden or cosmetic steps need little or no research.
3. **Clarify** — Ask the user targeted questions whenever requirements are ambiguous or missing. Surface requirement gaps explicitly with suggested fixes. Do not guess at intent.
4. **Plan** — For **Complex** work, delegate planning to the [Planner - Reference Data Reader](.github/agents/reference-data-reader-planner.agent.md) agent, which returns a complete plan with its research already cited. For **Standard** work, produce the lightweight inline plan directly — no separate planning agent. Either way, **check** the plan's risky/version-sensitive steps are covered and cited; only send a targeted revision back if a genuine gap is found (do not re-research what is already cited).
5. **Approval** — Present the plan to the user and obtain explicit approval before implementation. If changes are requested, update the plan and re-present. **Cap the plan → approve → implement cycle at 3 iterations**; if it is still unresolved, stop and surface the blocker to the user.
6. **Implement** — Deliver one task at a time (or parallel independent tasks) from the approved plan. Stay focused on the requested outcome; do not scope-creep or refactor unrelated code. When a change introduces or alters architecture, capture the decision as an ADR and update the relevant docs **where the repo already keeps them** (e.g. `docs/`).
7. **Test / Validate** — Build (`npm run build`), run the test suite (`npm test`), lint (`npm run lint`), check errors, and confirm each task works before moving on.
8. **Iterate** — Refine until the user is satisfied with each task.
9. **Summarise** — End with a detailed **executive summary** of what changed, why, how it was validated, and any follow-ups or risks.

**Code review is optional and on-request.** A full code review is **not** part of the default loop. Run it only when the user asks for one. At the end of implementation, if no review has been run, **offer** one (a single Yes/No question); invoke the reviewer only on an explicit Yes.

## Workflow agents

Standard and Complex work is coordinated through four custom agents that all run the framework above:

| Agent | Role |
|-------|------|
| [Orchestrator - Reference Data Reader](.github/agents/reference-data-reader-orchestrator.agent.md) | Plans, delegates, verifies and reports; owns the Yes/No user-approval gate and the end-of-work review offer. Does **not** implement. |
| [Planner - Reference Data Reader](.github/agents/reference-data-reader-planner.agent.md) | Internal planning subagent; produces the approval-ready plan and the single research pass behind it. Invoked for **Complex** work. |
| [Developer - Reference Data Reader](.github/agents/reference-data-reader-developer.agent.md) | Implements an already-approved plan end-to-end with tests; authors the lightweight inline plan for **Standard** work. |
| [Reviewer - Reference Data Reader](.github/agents/reference-data-reader-reviewer.agent.md) | Read-only review against DEFRA standards; reports findings by severity. **Optional, on-request only** — not run by default. |

Research (§4.2) uses the [deep-research-defra-alignment](.github/skills/deep-research-defra-alignment/SKILL.md) skill — a single risk-scoped pass run by the **Planner** (Complex work) or the **Developer** (Standard work). The [Speckit](.github/agents) agents (`speckit.*`) are a separate spec-driven toolset and are **not** part of this workflow.

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
