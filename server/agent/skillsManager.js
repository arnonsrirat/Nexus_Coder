import fs from 'fs';
import path from 'path';
import os from 'os';
import { EventEmitter } from 'events';

const SKILLS_CONFIG_FILE = path.join(os.homedir(), '.nexuscoder-skills.json');

export const DEFAULT_BUILTIN_SKILLS = [
  {
    id: 'skill-code-review',
    name: 'Code Review & Security Auditor',
    description: 'In-depth code quality inspection, edge cases, vulnerability analysis, and OWASP Top 10 compliance',
    slashCommand: '/review',
    icon: 'ShieldCheck',
    tags: ['Quality', 'Security', 'Best Practices'],
    prompt: `### Active Skill: Code Review & Security Auditor
When analyzing or reviewing code, adopt the persona of a Principal Software & Security Architect:
1. **Critical Vulnerability Audit**: Check for SQL Injection, XSS, SSRF, broken authentication, memory leaks, race conditions, unhandled exceptions, and unsafe deserialization.
2. **Architecture & Clean Code**: Evaluate SOLID principles, separation of concerns, DRY, type safety, and maintainability.
3. **Structured Review Report**:
   - 🚨 **Critical / Security Issues**: Immediate risks that require fixing.
   - ⚠️ **Warnings & Optimization**: Performance bottlenecks, potential edge cases, missing error boundaries.
   - 💡 **Refactored Code Suggestions**: Provide clear, copy-pasteable improved code snippets.
   - ✅ **Positive Highlights**: Well-implemented idiomatic patterns.`,
    enabled: true,
    isBuiltin: true
  },
  {
    id: 'skill-sql-db',
    name: 'SQL & Database Architect',
    description: 'Schema modeling, index optimization, complex query design, and migration scripting',
    slashCommand: '/sql',
    icon: 'Database',
    tags: ['Database', 'SQL', 'Performance'],
    prompt: `### Active Skill: SQL & Database Architect
When designing database schemas, writing queries, or diagnosing performance:
1. Provide normalized (3NF) relational models or high-throughput NoSQL structures with clear primary & foreign keys.
2. Include optimal indexing strategies (B-Tree, GiST, covering indexes) and explain query execution plans (EXPLAIN ANALYZE).
3. Write resilient migration scripts with rollback strategies and transactions.
4. Always sanitize queries and enforce parameterized inputs to eliminate injection vectors.`,
    enabled: true,
    isBuiltin: true
  },
  {
    id: 'skill-ui-ux',
    name: 'Modern UI/UX & Tailwind Master',
    description: 'Stunning glassmorphism, responsive micro-animations, accessible color palettes, and modern frontend design',
    slashCommand: '/design',
    icon: 'Palette',
    tags: ['Frontend', 'UI/UX', 'Tailwind', 'CSS'],
    prompt: `### Active Skill: Modern UI/UX & Tailwind Master
When crafting frontend components and layouts:
1. **Visual Excellence & Aesthetics**: Use modern design principles — smooth gradients, frosted glassmorphism (backdrop-filter: blur), subtle glowing borders, refined typography, and harmonious HSL color palettes.
2. **Micro-Interactions**: Incorporate snappy hover states, smooth transitions, loading skeletons, and interactive visual feedback.
3. **Accessibility & Responsiveness**: Ensure mobile-first responsive layout, proper contrast ratios, semantic HTML5, and ARIA attributes.
4. Avoid plain/generic boxy designs. Make every component feel high-end, polished, and delightful.`,
    enabled: true,
    isBuiltin: true
  },
  {
    id: 'skill-unit-test',
    name: 'Unit Test & TDD Specialist',
    description: 'Comprehensive test suites (Vitest, Jest, PyTest, Mocha), edge case coverage, and mock strategies',
    slashCommand: '/test',
    icon: 'CheckCircle2',
    tags: ['Testing', 'TDD', 'Quality'],
    prompt: `### Active Skill: Unit Test & TDD Specialist
When writing unit or integration tests:
1. Follow the **Arrange-Act-Assert (AAA)** pattern with descriptive test names ('should ... when ...').
2. Cover the happy path, boundary conditions, edge cases, error throws, and asynchronous timeouts.
3. Use clean mocks and stubs for external APIs, databases, and filesystem operations.
4. Aim for high branch coverage and provide instructions on how to run the test suite.`,
    enabled: true,
    isBuiltin: true
  },
  {
    id: 'skill-refactor',
    name: 'Performance & Refactor Engine',
    description: 'Eliminate code smells, optimize runtime algorithms, reduce bundle size, and decouple monolithic logic',
    slashCommand: '/refactor',
    icon: 'Zap',
    tags: ['Refactoring', 'Performance', 'Clean Architecture'],
    prompt: `### Active Skill: Performance & Refactor Engine
When refactoring code:
1. Identify and eliminate code smells (deep nesting, long methods, magic strings, circular dependencies).
2. Optimize time & space complexity (O(N) vs O(N^2)), reduce unnecessary re-renders, and streamline memory footprint.
3. Preserve existing public API contracts and behaviors while improving internal maintainability.
4. Explain the rationale behind each architectural change clearly.`,
    enabled: true,
    isBuiltin: true
  },
  {
    id: 'skill-api-arch',
    name: 'REST, GraphQL & WebSocket Architect',
    description: 'Clean RESTful endpoints, GraphQL schemas, real-time WebSocket protocol contracts, and validation',
    slashCommand: '/api',
    icon: 'Network',
    tags: ['Backend', 'API', 'Architecture'],
    prompt: `### Active Skill: REST, GraphQL & WebSocket Architect
When designing or implementing APIs:
1. Use standard HTTP status codes, idempotent methods, and consistent error envelope structures.
2. Implement schema validation (Zod, Joi, Pydantic) on request bodies, headers, and query parameters.
3. Include rate limiting considerations, pagination (cursor or offset), authentication middlewares (JWT/Bearer), and OpenAPI/Swagger documentation.
4. For real-time protocols, define event payloads, heartbeat ping/pong, and reconnection handling.`,
    enabled: true,
    isBuiltin: true
  },
  {
    id: 'skill-docs',
    name: 'Documentation & Technical Writer',
    description: 'Clear READMEs, architecture diagrams, API references, and onboarding guides',
    slashCommand: '/docs',
    icon: 'BookOpen',
    tags: ['Docs', 'Markdown', 'Technical Writing'],
    prompt: `### Active Skill: Documentation & Technical Writer
When creating documentation:
1. Structure documents with an engaging Overview, Prerequisites, Quick Start, Configuration tables, and Architecture flow.
2. Use GitHub Flavored Markdown alerts (> [!NOTE], > [!TIP], > [!IMPORTANT]) to highlight key instructions.
3. Provide working code examples with clear terminal commands.
4. Keep technical descriptions concise, organized, and easily readable for developers of all levels.`,
    enabled: true,
    isBuiltin: true
  },
  {
    id: 'skill-agent-flow',
    name: 'Autonomous Multi-Step Agent Workflow',
    description: 'Breaks complex goals into detailed execution checklists, verifies each step, and creates visual plans',
    slashCommand: '/agent',
    icon: 'Bot',
    tags: ['Agent', 'Planning', 'Autonomous'],
    prompt: `### Active Skill: Autonomous Multi-Step Agent Workflow
When handling complex or multi-file programming tasks:
1. **Plan First**: Call 'update_plan' with a clear checklist of milestones before modifying code.
2. **Inspect & Verify**: Thoroughly read affected files and directory structures before applying diffs.
3. **Incremental Progress**: Execute each step systematically, updating the plan's status to 'in_progress' and then 'completed'.
4. **Visual Artifacts**: Use 'update_canvas' to present architecture overviews or interactive previews when helpful.`,
    enabled: true,
    isBuiltin: true
  }
];

export class SkillsManager extends EventEmitter {
  constructor() {
    super();
    /** @type {Map<string, Object>} */
    this.skills = new Map();
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(SKILLS_CONFIG_FILE)) {
        const raw = fs.readFileSync(SKILLS_CONFIG_FILE, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.skills)) {
          // Load stored skills
          for (const s of data.skills) {
            if (s && s.id) {
              this.skills.set(s.id, s);
            }
          }
          // Ensure all built-in skills exist
          for (const b of DEFAULT_BUILTIN_SKILLS) {
            if (!this.skills.has(b.id)) {
              this.skills.set(b.id, { ...b });
            }
          }
          return;
        }
      }
    } catch (e) {
      console.warn('Could not load skills config, initializing defaults:', e.message);
    }

    // Default initialization
    this.resetToDefaults(false);
  }

  save() {
    try {
      const data = {
        skills: Array.from(this.skills.values())
      };
      fs.writeFileSync(SKILLS_CONFIG_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.warn('Could not save skills config:', e.message);
    }
  }

  resetToDefaults(autoSave = true) {
    this.skills.clear();
    for (const s of DEFAULT_BUILTIN_SKILLS) {
      this.skills.set(s.id, { ...s });
    }
    if (autoSave) this.save();
    this.emitUpdate();
  }

  getAllSkills() {
    return Array.from(this.skills.values());
  }

  getActiveSkills() {
    return Array.from(this.skills.values()).filter(s => s.enabled);
  }

  getSkillById(id) {
    return this.skills.get(id) || null;
  }

  getSkillBySlashCommand(cmd) {
    if (!cmd) return null;
    const cleanCmd = cmd.toLowerCase().trim();
    return Array.from(this.skills.values()).find(s => 
      s.slashCommand && s.slashCommand.toLowerCase() === cleanCmd
    ) || null;
  }

  addOrUpdateSkill(skillData) {
    if (!skillData || !skillData.name) {
      throw new Error('Skill name is required.');
    }

    const id = skillData.id || `skill_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const existing = this.skills.get(id);

    const updatedSkill = {
      id,
      name: skillData.name.trim(),
      description: skillData.description || '',
      slashCommand: skillData.slashCommand ? (skillData.slashCommand.startsWith('/') ? skillData.slashCommand : `/${skillData.slashCommand}`) : '',
      icon: skillData.icon || 'Sparkles',
      tags: Array.isArray(skillData.tags) ? skillData.tags : [],
      prompt: skillData.prompt || '',
      enabled: skillData.enabled !== false,
      isBuiltin: existing?.isBuiltin || false
    };

    this.skills.set(id, updatedSkill);
    this.save();
    this.emitUpdate();
    return updatedSkill;
  }

  toggleSkill(id, enabledState = null) {
    const skill = this.skills.get(id);
    if (!skill) throw new Error(`Skill with ID "${id}" not found.`);

    skill.enabled = enabledState !== null ? enabledState : !skill.enabled;
    this.save();
    this.emitUpdate();
    return skill;
  }

  deleteSkill(id) {
    const skill = this.skills.get(id);
    if (!skill) return false;
    if (skill.isBuiltin) {
      // Just disable built-in skills rather than permanently destroying
      skill.enabled = false;
      this.save();
      this.emitUpdate();
      return true;
    }
    const deleted = this.skills.delete(id);
    if (deleted) {
      this.save();
      this.emitUpdate();
    }
    return deleted;
  }

  emitUpdate() {
    this.emit('skills_updated', {
      skills: this.getAllSkills(),
      activeSkills: this.getActiveSkills()
    });
  }

  /**
   * Parses user input for slash command triggers (e.g. "/review Check this code")
   * and returns the matched skill along with stripped user prompt.
   */
  matchSlashCommand(input = '') {
    if (!input || !input.trim().startsWith('/')) return { matchedSkill: null, cleanPrompt: input };

    const trimmed = input.trim();
    const parts = trimmed.split(/\s+/);
    const firstWord = parts[0].toLowerCase();

    const skill = this.getSkillBySlashCommand(firstWord);
    if (skill) {
      const cleanPrompt = parts.slice(1).join(' ').trim();
      return {
        matchedSkill: skill,
        cleanPrompt: cleanPrompt || `Please execute ${skill.name} workflow.`
      };
    }

    return { matchedSkill: null, cleanPrompt: input };
  }

  /**
   * Construct prompt augmentation string from all currently active skills and optional triggered skill
   */
  getSkillsPromptAugmentation(triggeredSkill = null) {
    const active = this.getActiveSkills();
    const skillsToInject = [...active];

    if (triggeredSkill && !skillsToInject.some(s => s.id === triggeredSkill.id)) {
      skillsToInject.unshift(triggeredSkill);
    }

    if (skillsToInject.length === 0) return '';

    let promptAugmentation = '\n\n### Activated AI Skills & Expert Workflows:\n';
    for (const skill of skillsToInject) {
      promptAugmentation += `\n--- Skill: ${skill.name} (${skill.slashCommand || 'Active'}) ---\n${skill.prompt}\n`;
    }

    return promptAugmentation;
  }
}
