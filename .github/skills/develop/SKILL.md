---
name: develop
description: 'Expert TypeScript developer for MMO FES Reference Data Reader. Use when: implementing features, fixing bugs, refactoring code, researching codebase, planning solutions. Covers document-to-SR transformations, AJV schema validation, transportation mode mapping, cron jobs.'
license: OGL-UK-3.0
metadata:
  author: mmo-fes
  version: "1.0"
---

# Reference Data Reader — Developer Skill

Expert software engineer for the MMO FES Reference Data Reader service. Reads the codebase, researches, plans, reasons, writes production-ready code for reference data loading, validation, and reporting transformations.

## Working framework alignment

This skill supports the **§4 working framework** in [copilot-instructions.md](../../copilot-instructions.md) — it does not replace it. Triage first:

- **Trivial** change: light Read → Implement → Test → Summarise.
- **Standard** work (a normal transformation/mapping or persistence change, or fix, with no new architecture, external integration, or security surface): a lightweight inline plan (authored by the Developer, no heavyweight Planner) plus user approval before implementation.
- **Complex** work (new architecture, a new external integration, schema changes affecting the SR/Trade API contract, scheduled-job changes, a security surface): full planning and user approval before implementation — normally coordinated by the [Orchestrator](../../agents/reference-data-reader-orchestrator.agent.md) and [Planner](../../agents/reference-data-reader-planner.agent.md) agents.

Use the [deep-research-defra-alignment](../deep-research-defra-alignment/SKILL.md) skill for the single, risk-scoped Research (§4.2) pass when something is genuinely uncertain.

## When to Use

- Implementing document-to-SR (Strategic Reporting) transformations
- Adding or modifying JSON schema validation
- Working with transportation mode mapping
- Modifying cron jobs or scheduled data loading
- Any production code writing task

## Workflow

### Before Making Changes

1. Search codebase for similar transformation patterns in `src/landings/`
2. Check JSON schemas in `/data/schemas/Strategic Reporting/`
3. Verify types in `mmo-shared-reference-data` — never duplicate shared library logic
4. Review Mongoose discriminators for the document type being modified

### During Implementation

1. Follow all mandatory rules from the auto-loaded instruction files (`nodejs-hapi.instructions.md`, `typescript.instructions.md`)
2. Keep JSON schema, TypeScript interface, and transformation function in sync — update all three together
3. Use spread operator for conditional/optional fields in transformations

### After Implementation

1. Run build: `npm run build`
2. Run lint: `npm run lint`
3. Verify no TypeScript errors in problems panel
4. Invoke the `/unit-tests` skill to write or update tests
5. Review git diff to ensure no accidental changes

## Project Conventions

### Document-to-SR Transformation

```typescript
// defraValidation.ts — transformation functions
export function toSdDefraReport(document: IDocument): IStrategicReport {
  return {
    documentNumber: document.documentNumber,
    // map certificateType === 'uk' to the boolean isDocumentIssuedInUK
    isDocumentIssuedInUK: document.certificateType === 'uk',
    transportation: toTransportation(document.transportation),
    ...(document.exporterCompany && {
      exporterCompany: document.exporterCompany,
    }),
  };
}
```

### Transportation Mode Mapping

```typescript
// modeofTransport preserved; containerVessel normalised to 'vessel'
export function toTransportation(transport: ITransportation): ITransportationReport {
  switch (transport.vehicle) {
    case 'truck':
      return {
        modeofTransport: 'truck',
        hasRoadTransportDocument: transport.cmr === 'true',
        registration: transport.registrationNumber,
        exportLocation: transport.departurePlace,
      };
    case 'plane':
      return {
        modeofTransport: 'plane',
        flightNumber: transport.flightNumber,
        containerId: transport.containerNumber,
        exportLocation: transport.departurePlace,
      };
    case 'vessel':
    case 'containerVessel':
      return {
        modeofTransport: 'vessel', // normalise containerVessel → vessel
        name: transport.name,
        flag: transport.flagState,
        exportLocation: transport.departurePlace,
        ...(transport.placeOfUnloading && { placeOfUnloading: transport.placeOfUnloading }),
      };
    default:
      return {
        modeofTransport: transport.vehicle,
        exportLocation: transport.departurePlace,
      };
  }
}
```

### AJV Schema Validation Before Publishing

```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const validate = ajv.compile(schema);
const isValid = validate(payload);
if (!isValid) {
  logger.error('[PUBLISH][VALIDATION][FAILED]', validate.errors);
  return;
}
await publishToServiceBus(payload);
```

### Spread Operator for Conditional Fields

```typescript
// Use spread for optional/conditional fields — not if/else assignments
const report = {
  ...baseFields,
  ...(document.exporterCompany && { exporterCompany: document.exporterCompany }),
  ...(document.notes?.length && { notes: document.notes }),
};
```

### Mongoose Discriminators

```typescript
// Polymorphic document storage
const BaseDocSchema = new Schema({ documentNumber: String, type: String });
const BaseDoc = model('Document', BaseDocSchema);

const CatchCertSchema = new Schema({ catches: [CatchSchema] });
const CatchCert = BaseDoc.discriminator('CatchCertificate', CatchCertSchema);
```

## Anti-Patterns

> Mandatory rules in the instruction files also apply. The items below are additional anti-patterns specific to this skill:

- Updating JSON schema without updating the TypeScript interface (or vice versa)
- Using if/else for optional fields instead of spread operator
- Forgetting `containerVessel` → `vessel` normalization in transport mapping
- Duplicating types or logic already available in `mmo-shared-reference-data`
