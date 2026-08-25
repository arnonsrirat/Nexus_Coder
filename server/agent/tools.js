import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import * as Diff from 'diff';

// Check if a path is inside workspace or machine filesystem
export function resolveSafePath(workspaceRoot, targetPath) {
  if (!targetPath) {
    return workspaceRoot || os.homedir();
  }
  if (path.isAbsolute(targetPath)) {
    return targetPath;
  }
  const baseDir = workspaceRoot || os.homedir();
  return path.resolve(baseDir, targetPath);
}

export const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'get_system_info',
      description: 'Get real-time hardware and OS statistics of the host machine (Platform, CPU load & cores, RAM total/used/free, Disk drive spaces for all partitions, Network interfaces, and Uptime).',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_processes',
      description: 'List running processes on the machine with PID, process name, memory usage (MB), CPU usage, and status. Useful for finding resource-heavy or unresponsive applications.',
      parameters: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description: 'Optional name or keyword to filter processes.'
          },
          sort_by: {
            type: 'string',
            enum: ['memory', 'cpu', 'name', 'pid'],
            description: 'Field to sort processes by (default "memory").'
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of processes to return (default 25).'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'kill_process',
      description: 'Terminate or stop a running process by its PID or Process Name.',
      parameters: {
        type: 'object',
        properties: {
          pid: {
            type: 'integer',
            description: 'Process ID (PID) to terminate.'
          },
          name: {
            type: 'string',
            description: 'Process name to terminate (e.g. "notepad", "node"). Used if PID is not provided.'
          },
          force: {
            type: 'boolean',
            description: 'Whether to force terminate (default true).'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_network_info',
      description: 'Inspect network adapters, active connections, and listening ports on the host machine (e.g. check what services/processes are using port 3000, 8080, etc.).',
      parameters: {
        type: 'object',
        properties: {
          port: {
            type: 'integer',
            description: 'Optional port number to inspect (e.g. 3000, 8080, 5000).'
          },
          listening_only: {
            type: 'boolean',
            description: 'Filter only listening ports (default true).'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file in the project or anywhere on the machine. Returns file content with line numbers if helpful.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative or absolute path to the file to read.'
          },
          start_line: {
            type: 'integer',
            description: 'Optional starting line number (1-indexed).'
          },
          end_line: {
            type: 'integer',
            description: 'Optional ending line number (1-indexed).'
          }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Create a new file or completely overwrite an existing file with the provided content.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path of the file to create or overwrite (can be relative or absolute).'
          },
          content: {
            type: 'string',
            description: 'The complete content to write into the file.'
          }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'apply_diff',
      description: 'Make a precise surgical edit to an existing file by replacing an exact block of search_content with replace_content.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path of the file to edit.'
          },
          search_content: {
            type: 'string',
            description: 'The exact lines/block of code currently in the file to be replaced.'
          },
          replace_content: {
            type: 'string',
            description: 'The new code to replace the search_content with.'
          }
        },
        required: ['path', 'search_content', 'replace_content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_dir',
      description: 'List files and directories in a given path to explore the project structure or machine filesystem.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to list. Use "." for current folder or specify any absolute directory path (e.g. "C:\\Users").'
          },
          recursive: {
            type: 'boolean',
            description: 'Whether to list subdirectories recursively (default false).'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_code',
      description: 'Search for text or patterns inside files in a workspace or specific directory on the machine.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search term or regex to look for.'
          },
          path: {
            type: 'string',
            description: 'Optional directory path to search in.'
          },
          file_extension: {
            type: 'string',
            description: 'Optional file extension filter (e.g. ".js", ".py", ".html", ".log").'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: 'Execute a terminal command (PowerShell, CMD, Bash, winget, pip, npm, system utilities) in a specified directory or host system.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The command line string to execute.'
          },
          cwd: {
            type: 'string',
            description: 'Optional working directory to run the command in. Defaults to workspace root or user home directory.'
          }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ask_user',
      description: 'Ask the user a question with interactive multiple choice options (e.g., Option 1, Option 2, Option 3) or ask for confirmation/clarification. Execution will pause until the user clicks an option or provides an answer.',
      parameters: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            description: 'The question or prompt to display to the user.'
          },
          options: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of selectable option strings (e.g., ["1. Option A", "2. Option B", "3. Option C"]).'
          },
          allow_custom_input: {
            type: 'boolean',
            description: 'Whether the user can also type a custom text response in addition to clicking options (default true).'
          }
        },
        required: ['question']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_plan',
      description: 'Create or update the step-by-step visual execution plan displayed in the Canvas / Plan tracker.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Overall goal or title of the plan.'
          },
          summary: {
            type: 'string',
            description: 'Short overview of what will be accomplished.'
          },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] }
              },
              required: ['title']
            },
            description: 'Ordered checklist of steps.'
          }
        },
        required: ['title', 'steps']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_canvas',
      description: 'Render interactive artifacts, documentation, live HTML/CSS preview, or code diagrams on the visual Canvas panel.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['markdown', 'html_preview', 'code', 'diagram'],
            description: 'Type of canvas content.'
          },
          title: {
            type: 'string',
            description: 'Title of the canvas artifact.'
          },
          content: {
            type: 'string',
            description: 'The content (Markdown text, HTML/JS code for preview, or raw code).'
          }
        },
        required: ['type', 'title', 'content']
      }
    }
  }
];

export class ToolExecutor {
  constructor(workspaceRoot, options = {}) {
    this.workspaceRoot = workspaceRoot;
    this.onApprovalRequest = options.onApprovalRequest || null;
    this.autoApprove = options.autoApprove || false;
    this.mcpManager = options.mcpManager || null;
  }

  setWorkspaceRoot(root) {
    this.workspaceRoot = root;
    if (this.mcpManager) {
      this.mcpManager.setWorkspace(root);
    }
  }

  setMcpManager(manager) {
    this.mcpManager = manager;
  }

  async execute(toolName, args, onStatusUpdate = () => {}) {
    try {
      // Delegate Model Context Protocol (MCP) tools
      if (toolName.startsWith('mcp__')) {
        if (!this.mcpManager) {
          return { error: 'MCP Manager is not initialized on the server.' };
        }
        onStatusUpdate({
          type: 'mcp_tool_executing',
          toolName
        });
        return await this.mcpManager.executeTool(toolName, args);
      }

      switch (toolName) {
        case 'get_system_info':
          return await this.getSystemInfo();
        case 'list_processes':
          return await this.listProcesses(args);
        case 'kill_process':
          return await this.killProcess(args);
        case 'get_network_info':
          return await this.getNetworkInfo(args);
        case 'read_file':
          return await this.readFile(args);
        case 'write_file':
          return await this.writeFile(args, onStatusUpdate);
        case 'apply_diff':
          return await this.applyDiff(args, onStatusUpdate);
        case 'list_dir':
          return await this.listDir(args);
        case 'search_code':
          return await this.searchCode(args);
        case 'run_command':
          return await this.runCommand(args, onStatusUpdate);
        case 'ask_user':
          return {
            isInteractivePrompt: true,
            question: args.question,
            options: args.options || [],
            allowCustomInput: args.allow_custom_input !== false
          };
        case 'update_plan':
          onStatusUpdate({
            type: 'plan_updated',
            plan: {
              title: args.title,
              summary: args.summary || '',
              steps: args.steps || []
            }
          });
          return {
            success: true,
            message: 'Visual plan updated in Canvas',
            plan: args
          };
        case 'update_canvas':
          onStatusUpdate({
            type: 'canvas_updated',
            canvas: {
              type: args.type,
              title: args.title,
              content: args.content
            }
          });
          return {
            success: true,
            message: `Canvas artifact '${args.title}' updated`,
            canvas: args
          };
        default:
          return { error: `Unknown tool: ${toolName}` };
      }
    } catch (err) {
      return { error: err.message || String(err) };
    }
  }

  async getSystemInfo() {
    const platform = os.platform();
    const type = os.type();
    const release = os.release();
    const arch = os.arch();
    const hostname = os.hostname();
    const uptimeSec = os.uptime();
    const uptimeHours = (uptimeSec / 3600).toFixed(1);
    let userInfo = {};
    try {
      userInfo = os.userInfo();
    } catch (e) {
      userInfo = { username: process.env.USERNAME || process.env.USER || 'user', homedir: os.homedir() };
    }

    // CPU info
    const cpus = os.cpus() || [];
    const cpuModel = cpus[0]?.model?.trim() || 'Unknown CPU';
    const cpuCores = cpus.length;
    const cpuSpeed = cpus[0]?.speed ? `${cpus[0].speed} MHz` : '';

    // Calculate approximate CPU usage
    let totalIdle = 0, totalTick = 0;
    for (const cpu of cpus) {
      for (const t in cpu.times) {
        totalTick += cpu.times[t];
      }
      totalIdle += cpu.times.idle;
    }
    const cpuUsagePercent = totalTick > 0 ? (((totalTick - totalIdle) / totalTick) * 100).toFixed(1) : 'N/A';

    // Memory info
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const totalMemGB = (totalMem / (1024 ** 3)).toFixed(2);
    const freeMemGB = (freeMem / (1024 ** 3)).toFixed(2);
    const usedMemGB = (usedMem / (1024 ** 3)).toFixed(2);
    const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(1);

    // Disk spaces
    const disks = [];
    if (platform === 'win32') {
      const driveLetters = ['C', 'D', 'E', 'F', 'G', 'H', 'Z'];
      for (const d of driveLetters) {
        try {
          const drivePath = `${d}:/`;
          if (fs.existsSync(`${d}:\\`)) {
            const stats = fs.statfsSync(drivePath);
            const totalGB = Number((BigInt(stats.blocks) * BigInt(stats.bsize)) / BigInt(1024 ** 3));
            const freeGB = Number((BigInt(stats.bavail) * BigInt(stats.bsize)) / BigInt(1024 ** 3));
            const usedGB = totalGB - freeGB;
            const pct = totalGB > 0 ? ((usedGB / totalGB) * 100).toFixed(1) : '0';
            disks.push({
              drive: `${d}:`,
              totalGB: `${totalGB} GB`,
              usedGB: `${usedGB} GB`,
              freeGB: `${freeGB} GB`,
              usedPercent: `${pct}%`
            });
          }
        } catch (e) {}
      }
    } else {
      try {
        const stats = fs.statfsSync('/');
        const totalGB = Number((BigInt(stats.blocks) * BigInt(stats.bsize)) / BigInt(1024 ** 3));
        const freeGB = Number((BigInt(stats.bavail) * BigInt(stats.bsize)) / BigInt(1024 ** 3));
        const usedGB = totalGB - freeGB;
        const pct = totalGB > 0 ? ((usedGB / totalGB) * 100).toFixed(1) : '0';
        disks.push({
          mount: '/',
          totalGB: `${totalGB} GB`,
          usedGB: `${usedGB} GB`,
          freeGB: `${freeGB} GB`,
          usedPercent: `${pct}%`
        });
      } catch (e) {}
    }

    // Active network interfaces
    const netInterfaces = os.networkInterfaces();
    const activeNets = [];
    for (const [name, addrs] of Object.entries(netInterfaces)) {
      for (const addr of addrs || []) {
        if (!addr.internal && addr.family === 'IPv4') {
          activeNets.push({
            interface: name,
            address: addr.address,
            netmask: addr.netmask,
            mac: addr.mac
          });
        }
      }
    }

    return {
      os: {
        platform,
        type,
        release,
        arch,
        hostname,
        username: userInfo.username,
        homeDir: userInfo.homedir,
        tempDir: os.tmpdir(),
        uptime: `${uptimeHours} hours`
      },
      cpu: {
        model: cpuModel,
        cores: cpuCores,
        speed: cpuSpeed,
        usageApprox: `${cpuUsagePercent}%`
      },
      memory: {
        totalGB: `${totalMemGB} GB`,
        usedGB: `${usedMemGB} GB`,
        freeGB: `${freeMemGB} GB`,
        usedPercent: `${memUsagePercent}%`
      },
      disks,
      network: activeNets
    };
  }

  async listProcesses({ search, sort_by = 'memory', limit = 25 }) {
    const isWin = os.platform() === 'win32';
    const maxItems = Math.min(Math.max(limit || 25, 1), 100);

    return new Promise((resolve) => {
      if (isWin) {
        const filterCmd = search ? `| Where-Object { $_.ProcessName -like "*${search}*" -or $_.Id -eq "${search}" }` : '';
        const sortProp = sort_by === 'cpu' ? 'CPU' : sort_by === 'name' ? 'ProcessName' : sort_by === 'pid' ? 'Id' : 'WorkingSet64';
        const psCmd = `powershell -NoProfile -Command "Get-Process ${filterCmd} | Sort-Object ${sortProp} -Descending | Select-Object -First ${maxItems} Id, ProcessName, CPU, @{Name='WorkingSetMB';Expression={[math]::round($_.WorkingSet64/1MB, 1)}}, Responding | ConvertTo-Json"`;

        exec(psCmd, { timeout: 15000, maxBuffer: 1024 * 1024 * 5 }, (err, stdout) => {
          if (err || !stdout || !stdout.trim()) {
            exec('tasklist /FO CSV /NH', { timeout: 10000 }, (tErr, tOut) => {
              if (tErr) return resolve({ error: `Failed to list processes: ${tErr.message}` });
              const lines = (tOut || '').split('\n').filter(l => l.trim());
              const procs = [];
              for (const line of lines) {
                const parts = line.split('","').map(p => p.replace(/"/g, '').trim());
                if (parts.length >= 5) {
                  const name = parts[0];
                  const pid = parseInt(parts[1], 10);
                  const memStr = parts[4].replace(/[^0-9]/g, '');
                  const memMB = memStr ? (parseInt(memStr, 10) / 1024).toFixed(1) : '0';
                  if (!search || name.toLowerCase().includes(search.toLowerCase()) || String(pid) === search) {
                    procs.push({ pid, name, memoryMB: parseFloat(memMB) });
                  }
                }
              }
              if (sort_by === 'name') procs.sort((a, b) => a.name.localeCompare(b.name));
              else procs.sort((a, b) => b.memoryMB - a.memoryMB);
              resolve({ totalFound: procs.length, processes: procs.slice(0, maxItems) });
            });
            return;
          }

          try {
            let parsed = JSON.parse(stdout);
            if (!Array.isArray(parsed)) parsed = [parsed];
            const procs = parsed.map(p => ({
              pid: p.Id,
              name: p.ProcessName,
              cpuSeconds: p.CPU !== null && p.CPU !== undefined ? Number(Number(p.CPU).toFixed(2)) : 0,
              memoryMB: p.WorkingSetMB,
              responding: p.Responding !== false
            }));
            resolve({ totalFound: procs.length, processes: procs });
          } catch (e) {
            resolve({ rawOutput: stdout.slice(0, 3000) });
          }
        });
      } else {
        const psCmd = `ps -eo pid,user,%cpu,%mem,comm --sort=-%mem | head -n ${maxItems + 1}`;
        exec(psCmd, { timeout: 10000 }, (err, stdout) => {
          if (err) return resolve({ error: `Failed to list processes: ${err.message}` });
          const lines = (stdout || '').trim().split('\n');
          const procs = [];
          for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].trim().split(/\s+/);
            if (parts.length >= 5) {
              const pid = parseInt(parts[0], 10);
              const user = parts[1];
              const cpu = parseFloat(parts[2]);
              const mem = parseFloat(parts[3]);
              const name = parts.slice(4).join(' ');
              if (!search || name.toLowerCase().includes(search.toLowerCase()) || String(pid) === search) {
                procs.push({ pid, user, cpuPercent: cpu, memPercent: mem, name });
              }
            }
          }
          resolve({ totalFound: procs.length, processes: procs.slice(0, maxItems) });
        });
      }
    });
  }

  async killProcess({ pid, name, force = true }) {
    if (!pid && !name) {
      return { error: 'Please provide either a pid (number) or name (string) to terminate.' };
    }
    const isWin = os.platform() === 'win32';
    const forceFlag = force !== false;

    return new Promise((resolve) => {
      let cmd = '';
      if (isWin) {
        if (pid) {
          cmd = `taskkill ${forceFlag ? '/F' : ''} /PID ${pid}`;
        } else {
          cmd = `taskkill ${forceFlag ? '/F' : ''} /IM "${name.endsWith('.exe') ? name : name + '.exe'}"`;
        }
      } else {
        if (pid) {
          cmd = `kill ${forceFlag ? '-9' : '-15'} ${pid}`;
        } else {
          cmd = `pkill ${forceFlag ? '-9' : ''} -f "${name}"`;
        }
      }

      exec(cmd, (err, stdout, stderr) => {
        if (err) {
          return resolve({
            success: false,
            error: (stderr || err.message).trim(),
            command: cmd
          });
        }
        resolve({
          success: true,
          message: (stdout || 'Process terminated successfully').trim(),
          command: cmd
        });
      });
    });
  }

  async getNetworkInfo({ port, listening_only = true }) {
    const isWin = os.platform() === 'win32';

    return new Promise((resolve) => {
      if (isWin) {
        const filterPort = port ? `| Where-Object { $_.LocalPort -eq ${port} }` : '';
        const filterState = listening_only ? `| Where-Object { $_.State -eq 'Listen' }` : '';
        const psCmd = `powershell -NoProfile -Command "Get-NetTCPConnection ${filterState} ${filterPort} | Select-Object -First 50 LocalAddress, LocalPort, RemoteAddress, RemotePort, State, OwningProcess | Sort-Object LocalPort | ConvertTo-Json"`;

        exec(psCmd, { timeout: 15000 }, (err, stdout) => {
          if (err || !stdout || !stdout.trim()) {
            exec('netstat -ano -p tcp', { timeout: 10000 }, (nErr, nOut) => {
              if (nErr) return resolve({ error: `Failed to get network info: ${nErr.message}` });
              const lines = (nOut || '').split('\n').filter(l => l.includes('TCP'));
              const conns = [];
              for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 4) {
                  const local = parts[1];
                  const state = parts[3];
                  const pid = parts[4] ? parseInt(parts[4], 10) : undefined;
                  const localPort = parseInt(local.split(':').pop(), 10);
                  if ((!port || localPort === port) && (!listening_only || state === 'LISTENING')) {
                    conns.push({ localAddress: local, localPort, state, pid });
                  }
                }
              }
              resolve({ totalFound: conns.length, connections: conns.slice(0, 50) });
            });
            return;
          }

          try {
            let parsed = JSON.parse(stdout);
            if (!Array.isArray(parsed)) parsed = [parsed];
            const conns = parsed.map(c => ({
              localAddress: c.LocalAddress,
              localPort: c.LocalPort,
              remoteAddress: c.RemoteAddress,
              remotePort: c.RemotePort,
              state: c.State,
              pid: c.OwningProcess
            }));
            resolve({ totalFound: conns.length, connections: conns });
          } catch (e) {
            resolve({ rawOutput: stdout.slice(0, 3000) });
          }
        });
      } else {
        const cmd = port ? `lsof -iTCP:${port} -sTCP:LISTEN -P -n` : `lsof -iTCP -sTCP:LISTEN -P -n | head -n 50`;
        exec(cmd, { timeout: 10000 }, (err, stdout) => {
          if (err) {
            exec('netstat -tuln', { timeout: 10000 }, (nErr, nOut) => {
              if (nErr) return resolve({ error: 'Could not fetch network info.' });
              resolve({ rawOutput: (nOut || '').slice(0, 3000) });
            });
            return;
          }
          resolve({ rawOutput: (stdout || '').slice(0, 3000) });
        });
      }
    });
  }

  async readFile({ path: filePath, start_line, end_line }) {
    const fullPath = resolveSafePath(this.workspaceRoot, filePath);
    if (!fs.existsSync(fullPath)) {
      return { error: `File not found: ${filePath}` };
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');

    if (start_line !== undefined || end_line !== undefined) {
      const start = Math.max(1, start_line || 1) - 1;
      const end = Math.min(lines.length, end_line || lines.length);
      const sliced = lines.slice(start, end);
      const numbered = sliced.map((line, idx) => `${start + idx + 1}: ${line}`).join('\n');
      return {
        path: filePath,
        fullPath: fullPath,
        linesCount: lines.length,
        showingLines: `${start + 1}-${end}`,
        content: numbered
      };
    }

    return {
      path: filePath,
      fullPath: fullPath,
      linesCount: lines.length,
      content: content
    };
  }

  async writeFile({ path: filePath, content }, onStatusUpdate) {
    const fullPath = resolveSafePath(this.workspaceRoot, filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const existed = fs.existsSync(fullPath);
    const oldContent = existed ? fs.readFileSync(fullPath, 'utf8') : '';
    
    fs.writeFileSync(fullPath, content, 'utf8');

    const diff = Diff.createPatch(filePath, oldContent, content, 'Original', 'Updated');

    onStatusUpdate({
      type: 'file_modified',
      path: filePath,
      fullPath: fullPath,
      action: existed ? 'updated' : 'created',
      diff: diff
    });

    return {
      success: true,
      path: filePath,
      fullPath: fullPath,
      action: existed ? 'File updated successfully' : 'File created successfully',
      bytes: Buffer.byteLength(content, 'utf8'),
      diff: diff
    };
  }

  async applyDiff({ path: filePath, search_content, replace_content }, onStatusUpdate) {
    const fullPath = resolveSafePath(this.workspaceRoot, filePath);
    if (!fs.existsSync(fullPath)) {
      return { error: `File not found: ${filePath}. Use write_file to create it.` };
    }

    const original = fs.readFileSync(fullPath, 'utf8');
    
    // Normalization to handle CRLF vs LF differences
    const normalize = str => str.replace(/\r\n/g, '\n');
    const normOriginal = normalize(original);
    const normSearch = normalize(search_content);
    const normReplace = normalize(replace_content);

    let updated = '';
    if (normOriginal.includes(normSearch)) {
      updated = normOriginal.replace(normSearch, normReplace);
    } else {
      // Fuzzy search fallback: trim trailing whitespace on each line
      const cleanLines = text => text.split('\n').map(l => l.trimEnd()).join('\n');
      const cleanOriginal = cleanLines(normOriginal);
      const cleanSearch = cleanLines(normSearch);

      if (cleanOriginal.includes(cleanSearch)) {
        const origLines = normOriginal.split('\n');
        const searchLines = normSearch.split('\n');
        let matchIndex = -1;

        for (let i = 0; i <= origLines.length - searchLines.length; i++) {
          let match = true;
          for (let j = 0; j < searchLines.length; j++) {
            if (origLines[i + j].trim() !== searchLines[j].trim()) {
              match = false;
              break;
            }
          }
          if (match) {
            matchIndex = i;
            break;
          }
        }

        if (matchIndex !== -1) {
          origLines.splice(matchIndex, searchLines.length, ...normReplace.split('\n'));
          updated = origLines.join('\n');
        } else {
          return {
            error: `Could not find exact match for search_content in ${filePath}. Please double-check the code you want to replace.`
          };
        }
      } else {
        return {
          error: `Could not find search_content in ${filePath}. Verify lines and content.`
        };
      }
    }

    fs.writeFileSync(fullPath, updated, 'utf8');
    const diff = Diff.createPatch(filePath, original, updated, 'Original', 'Modified');

    onStatusUpdate({
      type: 'file_modified',
      path: filePath,
      fullPath: fullPath,
      action: 'patched',
      diff: diff
    });

    return {
      success: true,
      path: filePath,
      fullPath: fullPath,
      message: 'Diff applied successfully',
      diff: diff
    };
  }

  async listDir({ path: dirPath = '.', recursive = false }) {
    const fullPath = resolveSafePath(this.workspaceRoot, dirPath);
    if (!fs.existsSync(fullPath)) {
      return { error: `Directory not found: ${dirPath}` };
    }

    const IGNORED = ['.git', 'node_modules', 'dist', 'build', '.next', '.cache', '__pycache__', '.venv', 'venv'];
    
    const results = [];
    const scan = (current, rel) => {
      try {
        const entries = fs.readdirSync(current, { withFileTypes: true });
        for (const entry of entries) {
          if (IGNORED.includes(entry.name)) continue;
          const entryRel = rel ? path.join(rel, entry.name) : entry.name;
          const entryFull = path.join(current, entry.name);
          
          if (entry.isDirectory()) {
            results.push({ name: entry.name, path: entryRel, fullPath: entryFull, type: 'directory' });
            if (recursive && results.length < 150) {
              scan(entryFull, entryRel);
            }
          } else {
            let size = 0;
            try { size = fs.statSync(entryFull).size; } catch (e) {}
            results.push({ name: entry.name, path: entryRel, fullPath: entryFull, type: 'file', size });
          }
        }
      } catch (e) {
        // Permission denied or unreadable directory
      }
    };

    scan(fullPath, '');
    return {
      path: dirPath,
      fullPath: fullPath,
      totalEntries: results.length,
      entries: results.slice(0, 150) // limit output token usage
    };
  }

  async searchCode({ query, file_extension, path: searchDir }) {
    const targetDir = searchDir ? resolveSafePath(this.workspaceRoot, searchDir) : (this.workspaceRoot || os.homedir());
    if (!fs.existsSync(targetDir)) return { error: `Directory not found: ${targetDir}` };
    const results = [];
    const IGNORED = ['.git', 'node_modules', 'dist', 'build', '.next', '.cache', '__pycache__', '.venv', 'venv'];
    const maxResults = 30;

    const scan = (dir, rel) => {
      if (results.length >= maxResults) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (IGNORED.includes(entry.name)) continue;
          const full = path.join(dir, entry.name);
          const entryRel = rel ? path.join(rel, entry.name) : entry.name;

          if (entry.isDirectory()) {
            scan(full, entryRel);
          } else if (entry.isFile()) {
            if (file_extension && !entry.name.endsWith(file_extension)) continue;
            try {
              const content = fs.readFileSync(full, 'utf8');
              const lines = content.split('\n');
              lines.forEach((line, idx) => {
                if (line.toLowerCase().includes(query.toLowerCase()) && results.length < maxResults) {
                  results.push({
                    file: entryRel,
                    fullPath: full,
                    line: idx + 1,
                    content: line.trim()
                  });
                }
              });
            } catch (e) {
              // Binary or unreadable file
            }
          }
        }
      } catch (e) {
        // Permission denied
      }
    };

    scan(targetDir, '');
    return {
      query,
      searchPath: targetDir,
      matchCount: results.length,
      matches: results
    };
  }

  async runCommand({ command, cwd }, onStatusUpdate) {
    const workingDir = cwd ? resolveSafePath(this.workspaceRoot, cwd) : (this.workspaceRoot || os.homedir());

    return new Promise((resolve) => {
      onStatusUpdate({
        type: 'terminal_command_start',
        command: command,
        cwd: workingDir
      });

      const proc = exec(command, {
        cwd: workingDir,
        timeout: 60000,
        maxBuffer: 1024 * 1024 * 5
      }, (error, stdout, stderr) => {
        const exitCode = error ? (error.code || 1) : 0;
        const output = (stdout || '') + (stderr || '');
        
        onStatusUpdate({
          type: 'terminal_command_end',
          command: command,
          exitCode: exitCode,
          output: output.slice(0, 10000)
        });

        resolve({
          command: command,
          cwd: workingDir,
          exitCode: exitCode,
          output: output.slice(0, 4000)
        });
      });
    });
  }
}

