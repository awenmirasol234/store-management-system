const port = process.env.PORT;
const response = await fetch("http://127.0.0.1:" + port + "/api/health");
if (!response.ok) {
  process.exit(1);
}
