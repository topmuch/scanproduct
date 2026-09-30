/**
 * Debug — teste nodemailer directement contre les faux serveurs du test
 * pour isoler les désynchronisations du protocole (hors app Next.js).
 */
import net from "net";
import tls from "tls";
import nodemailer from "nodemailer";

const PLAIN_PORT = 2687;
const TLS_PORT = 2565;

interface CapturedMail {
  from: string;
  to: string;
}
const captured: CapturedMail[] = [];
let logLines: string[] = [];
const log = (s: string) => {
  logLines.push(s);
};

function smtpHandler(socket: net.Socket | tls.TLSSocket, tag: string) {
  let inData = false;
  let from = "";
  let to = "";
  let buffer = "";
  let expectingB64 = false;

  log(`[${tag}] +connect → 220 greeting`);
  socket.write("220 test.local ESMTP DebugSrv\r\n");

  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    let idx: number;
    while ((idx = buffer.indexOf("\r\n")) !== -1) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      log(`[${tag}] C> ${line.slice(0, 80)}`);

      if (expectingB64) {
        expectingB64 = false;
        const decoded = Buffer.from(line, "base64").toString("utf8");
        log(`[${tag}]   (b64) ${JSON.stringify(decoded)}`);
        if (decoded.includes("rejectme")) {
          socket.write("535 5.7.8 Authentication credentials invalid\r\n");
        } else {
          socket.write("235 2.7.0 Authentication successful\r\n");
        }
        continue;
      }

      if (inData) {
        if (line === ".") {
          inData = false;
          captured.push({ from, to });
          log(`[${tag}]   MSG captured from=${from} to=${to}`);
          socket.write("250 OK: queued\r\n");
        } else {
          // stocker
        }
        continue;
      }

      const cmd = line.toUpperCase();
      if (cmd.startsWith("EHLO")) {
        socket.write("250-test.local\r\n250-SIZE 35882577\r\n250 AUTH PLAIN\r\n");
      } else if (cmd.startsWith("AUTH PLAIN")) {
        const b64 = line.slice(10).trim();
        if (b64) {
          const decoded = Buffer.from(b64, "base64").toString("utf8");
          log(`[${tag}]   (b64 IR) ${JSON.stringify(decoded)}`);
          if (decoded.includes("rejectme")) {
            socket.write("535 5.7.8 Authentication credentials invalid\r\n");
          } else {
            socket.write("235 2.7.0 Authentication successful\r\n");
          }
        } else {
          expectingB64 = true;
          socket.write("334 \r\n");
        }
      } else if (cmd.startsWith("MAIL FROM:")) {
        from = line.slice(10).trim();
        socket.write("250 OK\r\n");
      } else if (cmd.startsWith("RCPT TO:")) {
        to = line.slice(8).trim();
        socket.write("250 OK\r\n");
      } else if (cmd.startsWith("DATA")) {
        inData = true;
        socket.write("354 End data with <CR><LF>.<CR><LF>\r\n");
      } else if (cmd.startsWith("QUIT")) {
        socket.write("221 BYE\r\n");
        socket.end();
      } else {
        socket.write("250 OK\r\n");
      }
    }
  });
  socket.on("error", () => {});
}

const plainServer = net.createServer((s) => smtpHandler(s, "plain"));
const { execSync } = require("child_process");
const fs = require("fs");
const TLS_DIR = "/home/z/my-project/scripts/.tls-test";
fs.mkdirSync(TLS_DIR, { recursive: true });
const keyPath = `${TLS_DIR}/key.pem`;
const certPath = `${TLS_DIR}/cert.pem`;
if (!fs.existsSync(certPath)) {
  execSync(
    `openssl req -x509 -newkey rsa:2048 -nodes -keyout ${keyPath} -out ${certPath} -subj "/CN=localhost" -days 2`,
    { stdio: "ignore" },
  );
}
const tlsServer = tls.createServer(
  { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) },
  (s) => smtpHandler(s, "tls"),
);
tlsServer.on("tlsClientError", (e: Error) =>
  log(`[tls] tlsClientError (attendu si client en clair): ${e.message.slice(0, 80)}`),
);

async function main() {
  await new Promise<void>((r) => plainServer.listen(PLAIN_PORT, "127.0.0.1", r));
  await new Promise<void>((r) => tlsServer.listen(TLS_PORT, "127.0.0.1", r));
  console.log("Servers up");

  // Scénario 1 : secure=false + bon user (auth IR) contre serveur EN CLAIR
  try {
    const t = nodemailer.createTransport({
      host: "127.0.0.1",
      port: PLAIN_PORT,
      secure: false,
      auth: { user: "ok@test.local", pass: "pw" },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 8000,
      tls: { rejectUnauthorized: false },
    });
    const info = await t.sendMail({
      from: "VerifScan <ok@test.local>",
      to: "dest@test.local",
      subject: "plain + auth IR",
      text: "hello",
    });
    console.log("S1 OK:", info.response);
  } catch (e) {
    console.log("S1 FAIL:", (e as Error).message);
  }

  // Scénario 2 : secure=false + rejectme (535 attendu)
  try {
    const t = nodemailer.createTransport({
      host: "127.0.0.1",
      port: PLAIN_PORT,
      secure: false,
      auth: { user: "rejectme@test.local", pass: "pw" },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 8000,
      tls: { rejectUnauthorized: false },
    });
    await t.sendMail({
      from: "V <rejectme@test.local>",
      to: "dest@test.local",
      subject: "should fail 535",
      text: "hello",
    });
    console.log("S2 UNEXPECTED SUCCESS");
  } catch (e) {
    console.log("S2 FAIL (attendu):", (e as Error).message.slice(0, 120));
  }

  // Scénario 3 : secure=TRUE contre serveur EN CLAIR (wrong version number attendu)
  try {
    const t = nodemailer.createTransport({
      host: "127.0.0.1",
      port: PLAIN_PORT,
      secure: true,
      auth: { user: "x@test.local", pass: "pw" },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 8000,
      tls: { rejectUnauthorized: false },
    });
    await t.verify();
    console.log("S3 UNEXPECTED SUCCESS");
  } catch (e) {
    console.log("S3 FAIL (attendu):", (e as Error).message.slice(0, 160));
  }

  // Scénario 4 : secure=TRUE contre serveur TLS implicite
  try {
    const t = nodemailer.createTransport({
      host: "127.0.0.1",
      port: TLS_PORT,
      secure: true,
      auth: { user: "ok@test.local", pass: "pw" },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 8000,
      tls: { rejectUnauthorized: false },
    });
    const info = await t.sendMail({
      from: "V <ok@test.local>",
      to: "dest@test.local",
      subject: "tls ok",
      text: "hello",
    });
    console.log("S4 OK:", info.response);
  } catch (e) {
    console.log("S4 FAIL:", (e as Error).message.slice(0, 160));
  }

  // Scénario 5 : secure=FALSE contre serveur TLS implicite (timeout greeting attendu)
  try {
    const t = nodemailer.createTransport({
      host: "127.0.0.1",
      port: TLS_PORT,
      secure: false,
      auth: { user: "ok@test.local", pass: "pw" },
      connectionTimeout: 5000,
      greetingTimeout: 3000,
      socketTimeout: 5000,
      tls: { rejectUnauthorized: false },
    });
    await t.verify();
    console.log("S5 UNEXPECTED SUCCESS");
  } catch (e) {
    console.log("S5 FAIL (attendu):", (e as Error).message.slice(0, 160));
  }

  console.log("\n--- SERVER LOG ---");
  for (const l of logLines) console.log(l);

  plainServer.close();
  tlsServer.close();
  process.exit(0);
}

main();
