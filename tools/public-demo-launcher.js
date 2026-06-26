import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import http from "node:http";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const toolsDir = path.join(projectRoot, "tools");

const serverPidPath = path.join(toolsDir, "project-server-public.pid");
const tunnelPidPath = path.join(toolsDir, "cloudflared-public.pid");
const activeTunnelLogPathFile = path.join(toolsDir, "cloudflared-public-active-log.txt");
const activeServerLogPathFile = path.join(toolsDir, "project-server-public-active-log.txt");
const activeServerErrorLogPathFile = path.join(toolsDir, "project-server-public-active-error-log.txt");
const publicUrlFile = path.join(toolsDir, "public-demo-url.txt");
const cloudflaredPath = path.join(toolsDir, "cloudflared.exe");
const port = 3011;

// HTTP/2 is more reliable than QUIC in locked-down networks where UDP is blocked.
const tunnelProtocol = process.env.GAOKAO_TUNNEL_PROTOCOL || "http2";
const command = process.argv[2];

if (command === "start") {
  start().catch((error) => {
    console.error(`[ERROR] ${error.message}`);
    process.exit(1);
  });
} else if (command === "stop") {
  stop();
} else {
  console.error("Usage: node tools/public-demo-launcher.js <start|stop>");
  process.exit(1);
}

async function start() {
  const adminUsername = process.env.GAOKAO_DEMO_ADMIN_USERNAME || "LYYzhiyuan";
  const adminPassword = process.env.GAOKAO_DEMO_ADMIN_PASSWORD || "";

  if (adminPassword.trim().length < 8) {
    throw new Error("Admin password must be at least 8 characters.");
  }

  if (!fs.existsSync(cloudflaredPath)) {
    throw new Error("Missing tools/cloudflared.exe");
  }

  stopManagedProcess(tunnelPidPath);

  const listeningPid = getListeningPid(port);
  if (listeningPid) {
    writePid(serverPidPath, listeningPid);
  }

  const runId = createRunId();
  const serverLogPath = path.join(toolsDir, `project-server-public-${runId}.log`);
  const serverErrorLogPath = path.join(toolsDir, `project-server-public-${runId}.error.log`);
  const tunnelLogPath = path.join(toolsDir, `cloudflared-public-${runId}.log`);

  writeTextFile(activeServerLogPathFile, serverLogPath);
  writeTextFile(activeServerErrorLogPathFile, serverErrorLogPath);
  writeTextFile(activeTunnelLogPathFile, tunnelLogPath);
  removeFileIfExists(publicUrlFile);

  let serverStartedByLauncher = false;
  if (!(await isHealthReady(`http://127.0.0.1:${port}/api/health`, 2000))) {
    console.log("Starting local production service in the background...");
    const serverStdout = fs.openSync(serverLogPath, "a");
    const serverStderr = fs.openSync(serverErrorLogPath, "a");
    const serverProcess = spawn(process.execPath, ["server/index.js"], {
      cwd: projectRoot,
      detached: true,
      windowsHide: true,
      stdio: ["ignore", serverStdout, serverStderr],
      env: {
        ...process.env,
        PORT: String(port),
        ADMIN_USERNAME: adminUsername,
        ADMIN_PASSWORD: adminPassword
      }
    });
    serverProcess.unref();
    writePid(serverPidPath, serverProcess.pid);
    serverStartedByLauncher = true;
  } else {
    console.log(`Local service is already running on port ${port}.`);
  }

  const healthOk = await waitForHealth(`http://127.0.0.1:${port}/api/health`, 30000);
  if (!healthOk) {
    if (serverStartedByLauncher) {
      stopManagedProcess(serverPidPath);
    }
    throw new Error(`Local service failed to start. Check: ${serverLogPath}`);
  }

  console.log(`Starting Cloudflare quick tunnel with protocol ${tunnelProtocol}...`);
  const tunnelStdout = fs.openSync(tunnelLogPath, "a");
  const tunnelStderr = fs.openSync(tunnelLogPath, "a");
  const tunnelProcess = spawn(
    cloudflaredPath,
    [
      "tunnel",
      "--protocol",
      tunnelProtocol,
      "--url",
      `http://127.0.0.1:${port}`,
      "--logfile",
      tunnelLogPath
    ],
    {
      cwd: projectRoot,
      detached: true,
      windowsHide: true,
      stdio: ["ignore", tunnelStdout, tunnelStderr],
      env: {
        ...process.env
      }
    }
  );
  tunnelProcess.unref();
  writePid(tunnelPidPath, tunnelProcess.pid);

  const publicUrl = await waitForTunnelUrl(tunnelLogPath, 20000);
  if (publicUrl) {
    writeTextFile(publicUrlFile, publicUrl);
  } else {
    removeFileIfExists(publicUrlFile);
  }

  console.log("");
  console.log("Public demo is running.");
  console.log(`Admin username: ${adminUsername}`);
  console.log(`Admin password: ${adminPassword}`);

  if (publicUrl) {
    console.log(`Public demo URL: ${publicUrl}`);
    console.log(`Saved URL file: ${publicUrlFile}`);
  } else {
    console.log("Quick tunnel was not established successfully.");
    console.log(`Local URL: http://127.0.0.1:${port}`);
    console.log(`Tunnel log: ${tunnelLogPath}`);
  }

  console.log(`Stop script: ${path.join(projectRoot, "stop-public-demo.cmd")}`);
}

function stop() {
  stopManagedProcess(tunnelPidPath);

  const listeningPid = getListeningPid(port);
  if (listeningPid) {
    stopPid(listeningPid);
  }

  removeFileIfExists(tunnelPidPath);
  removeFileIfExists(serverPidPath);
  removeFileIfExists(publicUrlFile);
  console.log("Public demo server and tunnel have been stopped.");
}

function stopManagedProcess(pidPath) {
  if (!fs.existsSync(pidPath)) {
    return;
  }

  const rawPid = fs.readFileSync(pidPath, "utf8").trim();
  const pid = Number(rawPid);
  removeFileIfExists(pidPath);

  if (!Number.isInteger(pid) || pid <= 0) {
    return;
  }

  try {
    stopPid(pid);
  } catch {
    return;
  }
}

function removeFileIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "EBUSY")) {
      throw error;
    }
  }
}

function stopPid(pid) {
  try {
    execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true
    });
  } catch {
    return;
  }
}

function getListeningPid(targetPort) {
  try {
    const output = execFileSync("netstat", ["-ano", "-p", "tcp"], {
      encoding: "utf8",
      windowsHide: true
    });

    const lines = output.split(/\r?\n/);
    for (const line of lines) {
      if (!line.includes("LISTENING")) {
        continue;
      }

      const parts = line.trim().split(/\s+/);
      if (parts.length < 5) {
        continue;
      }

      const localAddress = parts[1];
      const pid = Number(parts[4]);
      if (localAddress.endsWith(`:${targetPort}`) && Number.isInteger(pid) && pid > 0) {
        return pid;
      }
    }
  } catch {
    return 0;
  }

  return 0;
}

function writePid(filePath, pid) {
  fs.writeFileSync(filePath, String(pid));
}

function writeTextFile(filePath, value) {
  fs.writeFileSync(filePath, value, "utf8");
}

function createRunId() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join("");
}

async function isHealthReady(url, timeoutMs) {
  return waitForHealth(url, timeoutMs);
}

function waitForHealth(url, timeoutMs) {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const attempt = () => {
      const request = http.get(url, (response) => {
        response.resume();
        if (response.statusCode === 200) {
          resolve(true);
          return;
        }

        retry();
      });

      request.on("error", retry);
      request.setTimeout(2000, () => {
        request.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - startedAt >= timeoutMs) {
        resolve(false);
        return;
      }

      setTimeout(attempt, 1000);
    };

    attempt();
  });
}

function waitForTunnelUrl(logPath, timeoutMs) {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const attempt = () => {
      if (fs.existsSync(logPath)) {
        const content = fs.readFileSync(logPath, "utf8");
        const matches = content.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/g);
        if (matches?.length) {
          const publicMatch = matches.find((item) => !item.includes("api.trycloudflare.com"));
          if (publicMatch) {
            resolve(publicMatch);
            return;
          }
        }

        if (
          content.includes("failed to request quick Tunnel") ||
          content.includes("forbidden by its access permissions")
        ) {
          resolve("");
          return;
        }
      }

      if (Date.now() - startedAt >= timeoutMs) {
        resolve("");
        return;
      }

      setTimeout(attempt, 1000);
    };

    attempt();
  });
}
