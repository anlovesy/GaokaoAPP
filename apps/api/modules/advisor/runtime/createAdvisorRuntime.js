import { AdvisorRuntime } from "./AdvisorRuntime.js";

export function createAdvisorRuntime(dependencies) {
  return new AdvisorRuntime(dependencies);
}
