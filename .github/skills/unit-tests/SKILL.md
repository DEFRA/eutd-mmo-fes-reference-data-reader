---
name: unit-tests
description: 'Expert unit test engineer for MMO FES Reference Data Reader. Use when: writing unit tests, updating tests for code changes, fixing failing tests, improving code coverage, fixing SonarQube issues.'
license: OGL-UK-3.0
metadata:
  author: mmo-fes
  version: "1.0"
---

# Reference Data Reader — Unit Tests Skill

Expert in writing and maintaining unit tests for the MMO FES Reference Data Reader service.

## When to Use

- Writing unit tests for new or modified code
- Fixing failing tests after code changes
- Improving code coverage to meet thresholds
- Fixing SonarQube issues or code smells

## Coverage Requirements

- **Statements**: 90%
- **Functions**: 90%
- **Lines**: 90%
- **Branches**: 90%
- Run tests: `npm test` (single run with coverage report)
- Watch mode: `npm run test:watch`

## Test Framework & Tools

- **Jest** as test runner with ts-jest
- **mongodb-memory-server** for MongoDB integration tests
- **jest.spyOn()** for mocking
- Test files in `test/` directory mirroring `src/` structure

## Mocking Patterns

### AJV Schema Validation

```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import schema from '../../data/schemas/Strategic Reporting/mySchema.json';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

it('should validate correct payload', () => {
  expect(validate(validPayload)).toBe(true);
});

it('should reject invalid payload', () => {
  expect(validate(invalidPayload)).toBe(false);
  expect(validate.errors).toBeDefined();
});
```

### Service Bus Mock

```typescript
jest.mock('../../src/services/queue.service', () => ({
  addToReportQueue: jest.fn().mockResolvedValue(undefined),
}));
```

### MongoDB Memory Server

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
```

### Date Mocking

```typescript
jest.spyOn(Date, 'now').mockImplementation(() => 1693751375000);
```

## What to Test

1. **Transformation functions** — `toSdDefraReport()`, `toPsDefraReport()`, `toLandings()`, `toTransportation()`
2. **Transportation mode mapping** — all vehicle types including `containerVessel` → `vessel`
3. **AJV validation** — valid and invalid payloads against JSON schemas
4. **Conditional field spreading** — verify optional fields are included/excluded correctly
5. **Schema-interface alignment** — TypeScript interface matches JSON schema
6. **Service Bus publishing** — messages sent with correct session IDs and properties
7. **Cron job execution** — scheduled tasks including error scenarios
8. **Certificate type mapping** — `certificateType === 'uk'` → `isDocumentIssuedInUK`
9. **Mongoose discriminator queries** — polymorphic document retrieval

## SonarQube Issue Resolution

When fixing SonarQube issues, **NEVER modify functionality**. If existing tests fail after a fix, revert it. Only structural refactoring is allowed.

## Workflow

1. Identify the source file(s) that need tests
2. Find existing test file or create new one mirroring `src/` → `test/` path
3. Read the source code to understand all branches and edge cases
4. Write tests following the Arrange/Act/Assert pattern
5. Run `npm test` and check coverage output
6. If coverage < 90%, add targeted tests
7. Check problems tab for SonarQube issues
