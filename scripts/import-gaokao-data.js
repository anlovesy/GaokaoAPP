import { importAllCsvFiles } from "../server/services/importService.js";

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
