import { importAllCsvFiles } from "../apps/api/services/importService.js";

console.log(
  JSON.stringify(
    {
      ok: true,
      ...importAllCsvFiles()
    },
    null,
    2
  )
);
