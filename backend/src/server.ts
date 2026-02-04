import "dotenv/config";
import app from "./app";

const port = Number(process.env.PORT) || 8080;

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
