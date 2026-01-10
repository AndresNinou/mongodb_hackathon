import net from "net";

export async function findAvailablePort(start: number, end: number): Promise<number> {
  for (let port = start; port <= end; port++) {
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
  }
  throw new Error(`No available port found between ${start} and ${end}`);
}

export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => {
        resolve(true);
      });
    });

    server.listen(port, "127.0.0.1");
  });
}
