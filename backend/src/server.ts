import "dotenv/config";
import app from "./app";
import { assertAuthSecretsConfigured } from "./lib/auth/session-manager";

const port = Number(process.env.PORT) || 8080;

assertAuthSecretsConfigured();

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
