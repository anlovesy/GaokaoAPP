import { assertToolContract } from "./ToolContract.js";

export class ToolRegistry {
  constructor(tools = []) {
    this.tools = new Map();
    tools.forEach((tool) => this.register(tool));
  }

  register(tool) {
    assertToolContract(tool);

    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }

    this.tools.set(tool.name, tool);
    return tool;
  }

  get(name) {
    return this.tools.get(name) || null;
  }

  has(name) {
    return this.tools.has(name);
  }

  list() {
    return [...this.tools.values()];
  }

  resolve(name) {
    return this.get(name);
  }

  listMetadata() {
    return this.list().map((tool) => ({
      name: tool.name,
      version: tool.version,
      description: tool.description,
      metadata: tool.metadata
    }));
  }

  getModelToolDefinitions({ allowlist = null } = {}) {
    return this.list()
      .filter((tool) => tool.metadata.readOnly)
      .filter((tool) => !allowlist || allowlist.includes(tool.name))
      .map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: zodSchemaToJsonSchema(tool.inputSchema)
      }));
  }
}

export function createToolRegistry(tools = []) {
  return new ToolRegistry(tools);
}

function zodSchemaToJsonSchema(schema) {
  const definition = schema?._def || {};

  switch (definition.typeName) {
    case "ZodObject": {
      const shape = definition.shape();
      const properties = Object.fromEntries(
        Object.entries(shape).map(([key, value]) => [key, zodSchemaToJsonSchema(value)])
      );
      const required = Object.entries(shape)
        .filter(([, value]) => !value.isOptional())
        .map(([key]) => key);
      return {
        type: "object",
        properties,
        required,
        additionalProperties: definition.unknownKeys === "passthrough"
      };
    }
    case "ZodString":
      return applyStringChecks({ type: "string" }, definition.checks);
    case "ZodNumber":
      return applyNumberChecks(
        {
          type: definition.checks?.some((check) => check.kind === "int") ? "integer" : "number"
        },
        definition.checks
      );
    case "ZodBoolean":
      return { type: "boolean" };
    case "ZodArray":
      return { type: "array", items: zodSchemaToJsonSchema(definition.type) };
    case "ZodRecord":
      return {
        type: "object",
        additionalProperties: zodSchemaToJsonSchema(definition.valueType)
      };
    case "ZodNullable":
      return {
        anyOf: [zodSchemaToJsonSchema(definition.innerType), { type: "null" }]
      };
    case "ZodOptional":
    case "ZodDefault":
      return zodSchemaToJsonSchema(definition.innerType);
    case "ZodEffects":
      return zodSchemaToJsonSchema(definition.schema);
    case "ZodEnum":
      return { type: "string", enum: definition.values };
    case "ZodLiteral":
      return { const: definition.value };
    case "ZodUnknown":
    case "ZodAny":
    default:
      return {};
  }
}

function applyStringChecks(jsonSchema, checks = []) {
  for (const check of checks) {
    if (check.kind === "min") {
      jsonSchema.minLength = check.value;
    } else if (check.kind === "max") {
      jsonSchema.maxLength = check.value;
    }
  }
  return jsonSchema;
}

function applyNumberChecks(jsonSchema, checks = []) {
  for (const check of checks) {
    if (check.kind === "min") {
      jsonSchema[check.inclusive ? "minimum" : "exclusiveMinimum"] = check.value;
    } else if (check.kind === "max") {
      jsonSchema[check.inclusive ? "maximum" : "exclusiveMaximum"] = check.value;
    }
  }
  return jsonSchema;
}
