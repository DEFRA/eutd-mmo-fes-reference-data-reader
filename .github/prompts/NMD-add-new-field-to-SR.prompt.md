### Adding a New Field to SR Reports

1. **Update JSON schema** in `/data/schemas/Strategic Reporting/StorageDocument.json`:
   ```json
   "properties": {
     "newField": { "type": "string", "description": "..." }
   }
   ```
  meanwhile add `newField` in the required/optional fields array and add examples in `examples` section.

2. **Update TypeScript interface** in `src/landings/types/defraValidation.ts`:
   ```typescript
   export interface IDefraValidationStorageDocument {
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

4. **Add test coverage** add `newField` in `/test/landings/transformations/defraValidationReport.spec.ts` to update tests for the modified files without removing existing test logic.