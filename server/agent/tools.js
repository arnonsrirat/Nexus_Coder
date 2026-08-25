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
      description: 'Get network configuration and active open ports / listening services on the host machine.',
      parameters: {
        type: 'object',
        properties: {
          include_interfaces: {
            type: 'boolean',
            description: 'Include IP and MAC addresses of network adapters (default true).'
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
  },
  {
    type: 'function',
    function: {
      name: 'add_skill',
      description: 'Create or register a new AI Skill / expert workflow. Use this tool when the user requests to create or add a skill, save custom prompt rules as a skill, or import custom instructions.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the skill (e.g. "React Query Master", "Docker & K8s Specialist").'
          },
          description: {
            type: 'string',
            description: 'Short summary of what this skill does.'
          },
          slashCommand: {
            type: 'string',
            description: 'Slash command trigger starting with "/" (e.g. "/rq", "/docker").'
          },
          prompt: {
            type: 'string',
            description: 'Detailed prompt instructions, guidelines, persona rules, and knowledge augmentation for the AI when this skill is active.'
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of tags for filtering (e.g. ["React", "State", "Frontend"]).'
          },
          icon: {
            type: 'string',
            enum: ['Sparkles', 'ShieldCheck', 'Database', 'Palette', 'CheckCircle2', 'Zap', 'Network', 'BookOpen', 'Bot', 'Code2'],
            description: 'Icon identifier for UI display (default "Sparkles").'
          },
          enabled: {
            type: 'boolean',
            description: 'Whether to enable this skill immediately (default true).'
          }
        },
        required: ['name', 'prompt']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'import_skill_file',
      description: 'Import an AI Skill from a markdown (.md) or text file located in the workspace or system.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative or absolute file path to the .md skill file.'
          },
          enabled: {
            type: 'boolean',
            description: 'Whether to enable the skill immediately upon importing (default true).'
          }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_skills',
      description: 'List all registered AI skills, active skills, and their slash commands.',
      parameters: {
        type: 'object',
        properties: {}
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
    this.skillsManager = options.skillsManager || null;
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

  setSkillsManager(manager) {
    this.skillsManager = manager;
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
        case 'add_skill':
          return await this.addSkill(args);
        case 'import_skill_file':
          return await this.importSkillFile(args);
        case 'list_skills':
          return await this.listSkills();
        default:
          return { error: `Unknown tool: ${toolName}` };
      }
    } catch (err) {
      return { error: err.message || String(err) };
    }
  }

  async addSkill(args) {
    if (!this.skillsManager) {
      return { error: 'Skills Manager is not initialized on the server.' };
    }
    const skill = this.skillsManager.addOrUpdateSkill(args);
    return {
      success: true,
      message: `Skill "${skill.name}" successfully created and saved!`,
      skill
    };
  }

  async importSkillFile(args) {
    if (!this.skillsManager) {
      return { error: 'Skills Manager is not initialized on the server.' };
    }
    const filePath = resolveSafePath(this.workspaceRoot, args.path);
    if (!fs.existsSync(filePath)) {
      return { error: `Skill file not found at path: ${filePath}` };
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const skill = this.skillsManager.importFromMarkdown(content, path.basename(filePath));
    if (args.enabled !== undefined) {
      this.skillsManager.toggleSkill(skill.id, !!args.enabled);
    }
    return {
      success: true,
      message: `Skill "${skill.name}" successfully imported from ${path.basename(filePath)}!`,
      skill
    };
  }

  async listSkills() {
    if (!this.skillsManager) {
      return { error: 'Skills Manager is not initialized on the server.' };
    }
    const all = this.skillsManager.getAllSkills();
    const active = this.skillsManager.getActiveSkills();
    return {
      total: all.length,
      activeCount: active.length,
      skills: all.map(s => ({
        id: s.id,
        name: s.name,
        slashCommand: s.slashCommand,
        description: s.description,
        tags: s.tags,
        enabled: s.enabled,
        isBuiltin: !!s.isBuiltin
      }))
    };
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

    // Memory info
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const toGB = (bytes) => (bytes / (1024 * 1024 * 1024)).toFixed(2);
    const toMB = (bytes) => (bytes / (1024 * 1024)).toFixed(0);

    // Dynamic disk usage scan via platform commands
    let disks = [];
    try {
      if (platform === 'win32') {
        const stdout = await new Promise((res) => {
          exec('wmic logicaldisk get Caption,FreeSpace,Size,VolumeName /format:csv', { timeout: 4000 }, (err, out) => {
            res(out || '');
          });
        });
        const lines = stdout.split('\r\n').filter(l => l.trim().length > 0);
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map(p => p.trim());
          if (parts.length >= 4) {
            const drive = parts[1];
            const free = parseInt(parts[2], 10);
            const total = parseInt(parts[3], 10);
            const name = parts[4] || '';
            if (drive && total > 0) {
              const used = total - free;
              disks.push({
                drive,
                name,
                totalGB: (total / (1024 * 1024 * 1024)).toFixed(1) + ' GB',
                freeGB: (free / (1024 * 1024 * 1024)).toFixed(1) + ' GB',
                usedGB: (used / (1024 * 1024 * 1024)).toFixed(1) + ' GB',
                usedPercent: ((used / total) * 100).toFixed(1) + '%'
              });
            }
          }
        }
      } else {
        const stdout = await new Promise((res) => {
          exec('df -kP', { timeout: 4000 }, (err, out) => res(out || ''));
        });
        const lines = stdout.split('\n').filter(l => l.trim().length > 0);
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(/\s+/);
          if (parts.length >= 6 && parts[0].startsWith('/dev/')) {
            const total = parseInt(parts[1], 10) * 1024;
            const used = parseInt(parts[2], 10) * 1024;
            const free = parseInt(parts[3], 10) * 1024;
            const mount = parts[5];
            disks.push({
              drive: parts[0],
              mount,
              totalGB: (total / (1024 * 1024 * 1024)).toFixed(1) + ' GB',
              freeGB: (free / (1024 * 1024 * 1024)).toFixed(1) + ' GB',
              usedGB: (used / (1024 * 1024 * 1024)).toFixed(1) + ' GB',
              usedPercent: parts[4]
            });
          }
        }
      }
    } catch (e) {
      // Ignore disk error
    }

    return {
      os: {
        platform,
        type,
        release,
        arch,
        hostname,
        username: userInfo.username || 'user',
        homedir: userInfo.homedir || os.homedir()
      },
      cpu: {
        model: cpuModel,
        cores: cpuCores,
        speedMHz: cpus[0]?.speed || 0,
        usageApprox: `${((1 - (freeMem / totalMem)) * 100).toFixed(1)}%`
      },
      memory: {
        totalGB: `${toGB(totalMem)} GB`,
        usedGB: `${toGB(usedMem)} GB`,
        freeGB: `${toGB(freeMem)} GB`,
        usedPercent: `${((usedMem / totalMem) * 100).toFixed(1)}%`
      },
      disks,
      uptime: `${uptimeHours} hours (${uptimeSec}s)`
    };
  }

  async listProcesses({ search = '', sort_by = 'memory', limit = 25 } = {}) {
    const isWin = os.platform() === 'win32';
    const processes = [];

    try {
      if (isWin) {
        const stdout = await new Promise((res) => {
          exec('powershell -NoProfile -Command "Get-Process | Select-Object -Property Id, ProcessName, WorkingSet64, CPU, Responding | ConvertTo-Json -Compress"', {
            timeout: 8000,
            maxBuffer: 1024 * 1024 * 10
          }, (err, out) => res(out || ''));
        });

        if (stdout.trim()) {
          const parsed = JSON.parse(stdout);
          const list = Array.isArray(parsed) ? parsed : [parsed];
          for (const p of list) {
            if (!p || !p.ProcessName) continue;
            const memMB = Math.round((p.WorkingSet64 || 0) / (1024 * 1024));
            const cpuSec = typeof p.CPU === 'number' ? p.CPU.toFixed(1) : '0';
            processes.push({
              pid: p.Id,
              name: p.ProcessName,
              memoryMB: memMB,
              cpuSeconds: parseFloat(cpuSec),
              status: p.Responding !== false ? 'Running' : 'Not Responding'
            });
          }
        }
      } else {
        const stdout = await new Promise((res) => {
          exec('ps -eo pid,pmem,pcpu,comm --sort=-pmem', { timeout: 5000 }, (err, out) => res(out || ''));
        });
        const lines = stdout.split('\n').filter(l => l.trim().length > 0);
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].trim().split(/\s+/);
          if (parts.length >= 4) {
            processes.push({
              pid: parseInt(parts[0], 10),
              name: parts.slice(3).join(' '),
              memoryPercent: parseFloat(parts[1]) || 0,
              cpuPercent: parseFloat(parts[2]) || 0,
              status: 'Running'
            });
          }
        }
      }
    } catch (e) {
      return { error: `Failed to list processes: ${e.message}` };
    }

    let filtered = processes;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || String(p.pid).includes(q));
    }

    if (sort_by === 'memory') {
      filtered.sort((a, b) => (b.memoryMB || b.memoryPercent || 0) - (a.memoryMB || a.memoryPercent || 0));
    } else if (sort_by === 'cpu') {
      filtered.sort((a, b) => (b.cpuSeconds || b.cpuPercent || 0) - (a.cpuSeconds || a.cpuPercent || 0));
    } else if (sort_by === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort_by === 'pid') {
      filtered.sort((a, b) => a.pid - b.pid);
    }

    return {
      totalProcesses: processes.length,
      returnedCount: Math.min(filtered.length, limit),
      processes: filtered.slice(0, limit)
    };
  }

  async killProcess({ pid, name, force = true } = {}) {
    if (!pid && !name) {
      return { error: 'Must provide either "pid" or "name" to terminate process.' };
    }
    const isWin = os.platform() === 'win32';
    let cmd = '';

    if (isWin) {
      if (pid) {
        cmd = `taskkill ${force ? '/F' : ''} /PID ${pid}`;
      } else {
        const cleanName = name.endsWith('.exe') ? name : `${name}.exe`;
        cmd = `taskkill ${force ? '/F' : ''} /IM "${cleanName}"`;
      }
    } else {
      if (pid) {
        cmd = `kill ${force ? '-9' : '-15'} ${pid}`;
      } else {
        cmd = `pkill ${force ? '-9' : '-15'} -f "${name}"`;
      }
    }

    return new Promise((resolve) => {
      exec(cmd, { timeout: 5000 }, (err, stdout, stderr) => {
        if (err) {
          resolve({
            success: false,
            error: stderr || stdout || err.message,
            commandExecuted: cmd
          });
        } else {
          resolve({
            success: true,
            message: `Process ${pid || name} successfully terminated.`,
            output: (stdout || '').trim(),
            commandExecuted: cmd
          });
        }
      });
    });
  }

  async getNetworkInfo({ include_interfaces = true, listening_only = true } = {}) {
    const isWin = os.platform() === 'win32';
    const interfaces = include_interfaces ? os.networkInterfaces() : {};
    let openPorts = [];

    try {
      if (isWin) {
        const stdout = await new Promise((res) => {
          exec('netstat -ano -p tcp', { timeout: 6000 }, (err, out) => res(out || ''));
        });
        const lines = stdout.split('\r\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 4 && parts[0] === 'TCP') {
            const state = parts[3];
            if (listening_only && state !== 'LISTENING') continue;
            const localAddr = parts[1];
            const foreignAddr = parts[2];
            const pid = parts[4] || '';
            openPorts.push({
              protocol: 'TCP',
              localAddress: localAddr,
              foreignAddress: foreignAddr,
              state,
              pid: parseInt(pid, 10) || null
            });
          }
        }
      } else {
        const stdout = await new Promise((res) => {
          exec('netstat -tuln 2>/dev/null || ss -tuln 2>/dev/null', { timeout: 5000 }, (err, out) => res(out || ''));
        });
        const lines = stdout.split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 4 && (parts[0].startsWith('tcp') || parts[0].startsWith('udp'))) {
            openPorts.push({
              protocol: parts[0].toUpperCase(),
              localAddress: parts[3],
              foreignAddress: parts[4] || '*:*',
              state: parts[5] || 'LISTEN'
            });
          }
        }
      }
    } catch (e) {
      // Ignore network errors
    }

    return {
      interfaces: Object.fromEntries(
        Object.entries(interfaces).map(([k, v]) => [
          k,
          (v || []).map(addr => ({
            family: addr.family,
            address: addr.address,
            netmask: addr.netmask,
            mac: addr.mac,
            internal: addr.internal
          }))
        ])
      ),
      listeningPortsCount: openPorts.length,
      openPorts: openPorts.slice(0, 50)
    };
  }

  async readFile({ path: filePath, start_line, end_line }) {
    const fullPath = resolveSafePath(this.workspaceRoot, filePath);
    if (!fs.existsSync(fullPath)) {
      return { error: `File not found: ${filePath}` };
    }
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      return { error: `Path is a directory, not a file: ${filePath}. Use 'list_dir' instead.` };
    }
    if (stat.size > 1024 * 1024 * 5) {
      return { error: `File is too large (> 5MB): ${filePath}` };
    }
    const raw = fs.readFileSync(fullPath, 'utf8');
    const lines = raw.split('\n');

    if (start_line !== undefined || end_line !== undefined) {
      const start = Math.max(1, start_line || 1) - 1;
      const end = Math.min(lines.length, end_line || lines.length);
      const sliced = lines.slice(start, end).map((l, i) => `${start + i + 1}: ${l}`).join('\n');
      return {
        path: filePath,
        totalLines: lines.length,
        lines: `${start + 1}-${end}`,
        content: sliced
      };
    }

    return {
      path: filePath,
      totalLines: lines.length,
      content: raw
    };
  }

  async writeFile({ path: filePath, content }, onStatusUpdate) {
    const fullPath = resolveSafePath(this.workspaceRoot, filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, 'utf8');

    onStatusUpdate({
      type: 'file_written',
      path: filePath,
      fullPath
    });

    return {
      success: true,
      message: `File written: ${filePath}`,
      path: filePath
    };
  }

  async applyDiff({ path: filePath, search_content, replace_content }, onStatusUpdate) {
    const fullPath = resolveSafePath(this.workspaceRoot, filePath);
    if (!fs.existsSync(fullPath)) {
      return { error: `File not found to apply diff: ${filePath}` };
    }
    const original = fs.readFileSync(fullPath, 'utf8');

    // Normalize line endings for exact matching
    const normOriginal = original.replace(/\r\n/g, '\n');
    const normSearch = search_content.replace(/\r\n/g, '\n');
    const normReplace = replace_content.replace(/\r\n/g, '\n');

    if (!normOriginal.includes(normSearch)) {
      // Fuzzy fallback: trim trailing whitespace on each line
      const cleanOrig = normOriginal.split('\n').map(l => l.trimEnd()).join('\n');
      const cleanSearch = normSearch.split('\n').map(l => l.trimEnd()).join('\n');

      if (!cleanOrig.includes(cleanSearch)) {
        return {
          error: `Could not find exact match for 'search_content' in ${filePath}. Please read the file first to ensure the code matches.`,
          path: filePath
        };
      }

      const replaced = cleanOrig.replace(cleanSearch, normReplace);
      fs.writeFileSync(fullPath, replaced, 'utf8');
    } else {
      const replaced = normOriginal.replace(normSearch, normReplace);
      fs.writeFileSync(fullPath, replaced, 'utf8');
    }

    // Generate unified diff for UI diff visualizer
    const unifiedDiff = Diff.createPatch(
      filePath,
      original,
      fs.readFileSync(fullPath, 'utf8')
    );

    onStatusUpdate({
      type: 'diff_applied',
      path: filePath,
      fullPath,
      diff: unifiedDiff
    });

    return {
      success: true,
      message: `Diff successfully applied to ${filePath}`,
      path: filePath,
      diff: unifiedDiff
    };
  }

  async listDir({ path: dirPath = '.', recursive = false }) {
    const fullPath = resolveSafePath(this.workspaceRoot, dirPath);
    if (!fs.existsSync(fullPath)) {
      return { error: `Directory not found: ${dirPath}` };
    }

    const IGNORE = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.cache', 'dist-exe', 'dist-server']);

    const readEntries = (currentDir, depth = 0) => {
      if (depth > 4) return [];
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      const items = [];

      for (const e of entries) {
        if (IGNORE.has(e.name)) continue;
        const itemPath = path.join(currentDir, e.name);
        const rel = path.relative(fullPath, itemPath);

        if (e.isDirectory()) {
          items.push({ name: e.name, path: rel, type: 'directory' });
          if (recursive && depth < 3) {
            items.push(...readEntries(itemPath, depth + 1));
          }
        } else {
          items.push({ name: e.name, path: rel, type: 'file' });
        }
      }
      return items;
    };

    const items = readEntries(fullPath);
    return {
      path: dirPath,
      total: items.length,
      items: items.slice(0, 200)
    };
  }

  async searchCode({ query, path: searchPath = '.', file_extension }) {
    const targetDir = resolveSafePath(this.workspaceRoot, searchPath);
    if (!fs.existsSync(targetDir)) {
      return { error: `Directory not found: ${searchPath}` };
    }

    const results = [];
    const IGNORE = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'package-lock.json']);

    const scan = (current, rel) => {
      if (results.length >= 50) return;
      try {
        const entries = fs.readdirSync(current, { withFileTypes: true });
        for (const e of entries) {
          if (results.length >= 50) break;
          if (IGNORE.has(e.name)) continue;

          const itemPath = path.join(current, e.name);
          const itemRel = path.join(rel, e.name);

          if (e.isDirectory()) {
            scan(itemPath, itemRel);
          } else if (e.isFile()) {
            if (file_extension && !e.name.endsWith(file_extension)) continue;

            try {
              const content = fs.readFileSync(itemPath, 'utf8');
              const lines = content.split('\n');
              lines.forEach((line, idx) => {
                if (results.length >= 50) return;
                if (line.toLowerCase().includes(query.toLowerCase())) {
                  results.push({
                    file: itemRel,
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
