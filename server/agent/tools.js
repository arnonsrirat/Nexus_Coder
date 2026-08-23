import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import * as Diff from 'diff';

// Check if a path is inside workspace (or allowed)
export function resolveSafePath(workspaceRoot, targetPath) {
  if (!workspaceRoot) {
    throw new Error('No workspace folder selected.');
  }
  if (!targetPath) {
    return workspaceRoot;
  }
  const resolved = path.isAbsolute(targetPath) ? targetPath : path.resolve(workspaceRoot, targetPath);
  return resolved;
}

export const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file in the project. Returns file content with line numbers if helpful.',
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
            description: 'Path of the file to create or overwrite.'
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
      description: 'List files and directories in a given path to explore the project structure.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to list. Use "." or empty string for project root.'
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
      description: 'Search for text or patterns inside all project files.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search term or regex to look for.'
          },
          file_extension: {
            type: 'string',
            description: 'Optional file extension filter (e.g. ".js", ".py", ".html").'
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
      description: 'Execute a terminal command in the project directory (e.g., npm test, git status, pip install, node script.js).',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The command line string to execute.'
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
  }

  setWorkspaceRoot(root) {
    this.workspaceRoot = root;
  }

  async execute(toolName, args, onStatusUpdate = () => {}) {
    try {
      switch (toolName) {
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
        linesCount: lines.length,
        showingLines: `${start + 1}-${end}`,
        content: numbered
      };
    }

    return {
      path: filePath,
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
      action: existed ? 'updated' : 'created',
      diff: diff
    });

    return {
      success: true,
      path: filePath,
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
        // Build replacement
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
      action: 'patched',
      diff: diff
    });

    return {
      success: true,
      path: filePath,
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
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        if (IGNORED.includes(entry.name)) continue;
        const entryRel = rel ? path.join(rel, entry.name) : entry.name;
        const entryFull = path.join(current, entry.name);
        
        if (entry.isDirectory()) {
          results.push({ name: entry.name, path: entryRel, type: 'directory' });
          if (recursive) {
            scan(entryFull, entryRel);
          }
        } else {
          results.push({ name: entry.name, path: entryRel, type: 'file', size: fs.statSync(entryFull).size });
        }
      }
    };

    scan(fullPath, '');
    return {
      path: dirPath,
      totalEntries: results.length,
      entries: results.slice(0, 150) // limit output token usage
    };
  }

  async searchCode({ query, file_extension }) {
    if (!this.workspaceRoot) return { error: 'No workspace folder set.' };
    const results = [];
    const IGNORED = ['.git', 'node_modules', 'dist', 'build', '.next', '.cache', '__pycache__', '.venv', 'venv'];
    const maxResults = 30;

    const scan = (dir, rel) => {
      if (results.length >= maxResults) return;
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
    };

    scan(this.workspaceRoot, '');
    return {
      query,
      matchCount: results.length,
      matches: results
    };
  }

  async runCommand({ command }, onStatusUpdate) {
    if (!this.workspaceRoot) return { error: 'No workspace folder selected.' };

    return new Promise((resolve) => {
      onStatusUpdate({
        type: 'terminal_command_start',
        command: command
      });

      const proc = exec(command, {
        cwd: this.workspaceRoot,
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
          exitCode: exitCode,
          output: output.slice(0, 4000)
        });
      });
    });
  }
}
