//
// json schema for parts of catch cert required by queries 
//
//
export const minimalSchema = {
  "$schema": "http://json-schema.org/draft-07/schema",
  "title": "Catch Certificate Minimal",
  "required": [ "documentNumber", "createdAt", "exportData" ],
  "type": "object",
  "properties": {
    "documentNumber": { "type": "string", "minLength": 1 },
    "createdAt": { "type": "string", "format": "date-time" },
    "exportData": { "$ref": "#/definitions/exportData" },
  },
  "definitions": {
    "exportData": {
      "required": ["products"],
      "type": "object",
      "properties": {
        "products": { "items": { "$ref": "#/definitions/products" }, "type": "array" }
      }
    },
    "products": {
      "type": "object",
      "required": ["speciesCode", "caughtBy","state","presentation"],
      "properties": {
        "speciesCode": { "type": "string", "minLength": 1 },
        "caughtBy": { "items": { "$ref": "#/definitions/caughtBy" }, "type": "array" },
        "state": { "$ref": "#/definitions/code" },
        "presentation": { "$ref": "#/definitions/code" }
      }
    },
    "caughtBy": {
      "type": "object",
      "required": ["pln", "date", "weight"],
      "properties": {
        "pln": { "type": "string", "minLength": 1 },
        "date": { "type": "string", "format": "date" },
        "weight": { "type": "number" },
        "_status": { "type": "string", "enum": [
          "PENDING_LANDING_DATA",
          "HAS_LANDING_DATA",
          "EXCEEDED_14_DAY_LIMIT"
        ]}
      }
    },
    "code": {
      "type": "object",
      "required": ["code"],
      "properties": {
        "code": { "type": "string", "minLength": 1 } 
      }
    }
  }
}


