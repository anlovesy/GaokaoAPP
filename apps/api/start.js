import { createServer } from "./app.js";

const port = Number(process.env.PORT || 3001);

createServer().listen(port, () => {
  console.log(`Gaokao planner API running at http://localhost:${port}`);
});
