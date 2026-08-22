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
}

export function createToolRegistry(tools = []) {
  return new ToolRegistry(tools);
}
