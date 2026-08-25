import React, { useState, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  ShieldCheck,
  Database,
  Palette,
  CheckCircle2,
  Zap,
  Network,
  BookOpen,
  Bot,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Search,
  Check,
  X,
  Code2,
  Sliders,
  Tag,
  Upload,
  Download,
  FileText,
  FileUp,
  FileDown,
  Info,
  Copy
} from 'lucide-react';

const ICON_MAP = {
  ShieldCheck: ShieldCheck,
  Database: Database,
  Palette: Palette,
  CheckCircle2: CheckCircle2,
  Zap: Zap,
  Network: Network,
  BookOpen: BookOpen,
  Bot: Bot,
  Sparkles: Sparkles,
  Code2: Code2
};

const ICON_OPTIONS = [
  { name: 'Sparkles', icon: Sparkles },
  { name: 'ShieldCheck', icon: ShieldCheck },
  { name: 'Database', icon: Database },
  { name: 'Palette', icon: Palette },
  { name: 'CheckCircle2', icon: CheckCircle2 },
  { name: 'Zap', icon: Zap },
  { name: 'Network', icon: Network },
  { name: 'BookOpen', icon: BookOpen },
  { name: 'Bot', icon: Bot },
  { name: 'Code2', icon: Code2 }
];

export default function SkillsModal() {
  const {
    isSkillsModalOpen,
    setIsSkillsModalOpen,
    skills,
    activeSkills,
    toggleSkill,
    saveSkill,
    deleteSkill,
    resetBuiltinSkills,
    importSkillMarkdown,
    exportSkillMarkdown
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [editingSkill, setEditingSkill] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formSlash, setFormSlash] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formIcon, setFormIcon] = useState('Sparkles');
  const [showPasteHelper, setShowPasteHelper] = useState(false);
  const [pastedMd, setPastedMd] = useState('');

  const fileInputRef = useRef(null);
  const formFileInputRef = useRef(null);

  if (!isSkillsModalOpen) return null;

  // Extract all unique tags
  const allTags = ['All', ...new Set(skills.flatMap(s => s.tags || []))];

  const filteredSkills = skills.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.slashCommand && s.slashCommand.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTag = selectedTag === 'All' || (s.tags && s.tags.includes(selectedTag));
    return matchesSearch && matchesTag;
  });

  const showNotification = (text, type = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  const handleOpenCreate = () => {
    setEditingSkill(null);
    setFormName('');
    setFormSlash('/');
    setFormDesc('');
    setFormPrompt('');
    setFormTags('');
    setFormIcon('Sparkles');
    setShowPasteHelper(false);
    setPastedMd('');
    setIsCreating(true);
  };

  const handleOpenEdit = (skill) => {
    setEditingSkill(skill);
    setFormName(skill.name);
    setFormSlash(skill.slashCommand || '');
    setFormDesc(skill.description || '');
    setFormPrompt(skill.prompt || '');
    setFormTags((skill.tags || []).join(', '));
    setFormIcon(skill.icon || 'Sparkles');
    setShowPasteHelper(false);
    setPastedMd('');
    setIsCreating(true);
  };

  const handleSaveSkillForm = async (e) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const tagsArray = formTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    await saveSkill({
      id: editingSkill?.id,
      name: formName.trim(),
      slashCommand: formSlash.trim(),
      description: formDesc.trim(),
      prompt: formPrompt.trim(),
      tags: tagsArray,
      icon: formIcon,
      enabled: editingSkill ? editingSkill.enabled : true
    });

    showNotification(`Skill "${formName.trim()}" saved successfully!`);
    setIsCreating(false);
    setEditingSkill(null);
  };

  // Import one or multiple files
  const processFiles = async (files) => {
    if (!files || files.length === 0) return;
    setIsImporting(true);

    try {
      const skillItems = [];
      for (const file of Array.from(files)) {
        if (!file.name.match(/\.(md|markdown|txt)$/i)) continue;
        const text = await file.text();
        if (text && text.trim()) {
          skillItems.push({
            content: text,
            filename: file.name
          });
        }
      }

      if (skillItems.length === 0) {
        showNotification('No valid markdown (.md) skill files found in selection.', 'error');
        setIsImporting(false);
        return;
      }

      const res = await importSkillMarkdown({ skills: skillItems });
      if (res?.success) {
        const count = res.imported ? res.imported.length : skillItems.length;
        showNotification(`Successfully imported ${count} skill(s) from .md file(s)!`);
      }
    } catch (err) {
      showNotification(`Import failed: ${err.message}`, 'error');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (e) => {
    processFiles(e.target.files);
  };

  // Drag & Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Export skill as .md download
  const handleExportSkill = async (skill) => {
    try {
      const mdContent = await exportSkillMarkdown(skill.id);
      const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = `${skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'skill'}.skill.md`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification(`Exported "${filename}"`);
    } catch (err) {
      showNotification(`Export failed: ${err.message}`, 'error');
    }
  };

  // Parse pasted MD in form assistant
  const handleParsePastedMd = () => {
    if (!pastedMd.trim()) return;

    let raw = pastedMd.trim();
    let name = '';
    let description = '';
    let slashCommand = '';
    let icon = 'Sparkles';
    let tags = [];
    let prompt = '';

    const frontmatterMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (frontmatterMatch) {
      const yamlBlock = frontmatterMatch[1];
      prompt = frontmatterMatch[2].trim();

      const lines = yamlBlock.split(/\r?\n/);
      let currentKey = null;
      let listItems = [];

      for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#')) continue;

        if (line.startsWith('-') && currentKey) {
          const val = line.substring(1).trim().replace(/^['"]|['"]$/g, '');
          if (val) listItems.push(val);
          continue;
        }

        if (currentKey && listItems.length > 0) {
          if (currentKey === 'tags' || currentKey === 'categories') tags = [...listItems];
          listItems = [];
          currentKey = null;
        }

        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          const key = line.substring(0, colonIdx).trim().toLowerCase();
          let value = line.substring(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');

          if (key === 'name' || key === 'title') name = value;
          else if (key === 'description' || key === 'desc' || key === 'summary') description = value;
          else if (key === 'slashcommand' || key === 'slash_command' || key === 'slash' || key === 'command') slashCommand = value;
          else if (key === 'icon') icon = value || 'Sparkles';
          else if (key === 'tags' || key === 'tag' || key === 'categories') {
            if (value.startsWith('[') && value.endsWith(']')) {
              tags = value.slice(1, -1).split(',').map(t => t.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
            } else if (value) {
              tags = value.split(',').map(t => t.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
            } else {
              currentKey = key;
              listItems = [];
            }
          }
        }
      }

      if (currentKey && listItems.length > 0) {
        if (currentKey === 'tags' || currentKey === 'categories') tags = [...listItems];
      }
    } else {
      const lines = raw.split(/\r?\n/);
      const bodyLines = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!name && line.startsWith('# ')) {
          name = line.substring(2).trim();
          continue;
        }
        if (!slashCommand && /^(\/|[sS]lash:?\s*\/|[cC]ommand:?\s*\/)/.test(line)) {
          const match = line.match(/\/([a-zA-Z0-9_-]+)/);
          if (match) slashCommand = '/' + match[1];
          continue;
        }
        if (tags.length === 0 && /^[tT]ags?:/i.test(line)) {
          const tagStr = line.replace(/^[tT]ags?:/i, '').trim();
          tags = tagStr.replace(/^\[|\]$/g, '').split(',').map(t => t.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
          continue;
        }
        if (!description && (line.startsWith('> ') || /^[dD]escription:/i.test(line))) {
          description = line.replace(/^>\s*|^[dD]escription:\s*/i, '').trim();
          continue;
        }
        if (/^[iI]con:/i.test(line)) {
          icon = line.replace(/^[iI]con:\s*/i, '').trim();
          continue;
        }
        bodyLines.push(lines[i]);
      }

      prompt = bodyLines.join('\n').trim();
    }

    if (name) setFormName(name);
    if (slashCommand) setFormSlash(slashCommand);
    if (description) setFormDesc(description);
    if (tags.length > 0) setFormTags(tags.join(', '));
    if (icon && ICON_MAP[icon]) setFormIcon(icon);
    if (prompt) setFormPrompt(prompt);
    else if (!prompt && raw) setFormPrompt(raw);

    setShowPasteHelper(false);
    setPastedMd('');
    showNotification('Extracted fields from markdown successfully!');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden Global File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".md,.markdown,.txt"
        multiple
        className="hidden"
      />

      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-60 bg-purple-950/80 backdrop-blur-md flex flex-col items-center justify-center border-2 border-dashed border-purple-400 m-4 rounded-2xl animate-in fade-in duration-150 pointer-events-none">
          <FileUp className="w-14 h-14 text-purple-300 animate-bounce mb-3" />
          <h3 className="text-lg font-bold text-white">Drop .md Skill Files to Import</h3>
          <p className="text-xs text-purple-200 mt-1">Supports YAML frontmatter and standard markdown skill formats</p>
        </div>
      )}

      <div className="w-full max-w-3xl bg-slate-900/95 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20 border border-purple-400/40">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">AI Skills & Specialized Workflows</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-950/70 text-purple-300 border border-purple-500/40 rounded-full font-mono">
                  {activeSkills.length} Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Augment NexusCoder with specialized persona workflows, expert rules, and slash commands.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Import .md Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
              title="Import .md skill file (with YAML frontmatter or standard markdown)"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isImporting ? 'Importing...' : 'Import .md'}</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-semibold shadow-md shadow-purple-600/30 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Skill</span>
            </button>

            <button
              onClick={() => setIsSkillsModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Notification Toast */}
        {statusMessage && (
          <div className={`px-6 py-2 border-b text-xs flex items-center justify-between font-medium ${
            statusMessage.type === 'error'
              ? 'bg-rose-950/80 border-rose-800 text-rose-200'
              : 'bg-purple-950/80 border-purple-800 text-purple-200'
          }`}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Search & Tags Bar */}
        {!isCreating && (
          <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search skills or /commands..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex-shrink-0 ${
                    selectedTag === tag
                      ? 'bg-purple-950/80 text-purple-300 border border-purple-500/50 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {isCreating ? (
            /* Create / Edit Form */
            <form onSubmit={handleSaveSkillForm} className="space-y-4 max-w-xl mx-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-slate-200">
                  {editingSkill ? `Edit Skill: ${editingSkill.name}` : 'Create New AI Skill'}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPasteHelper(!showPasteHelper)}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{showPasteHelper ? 'Hide MD Parser' : 'Paste / Load .md'}</span>
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Paste / Load .md helper box */}
              {showPasteHelper && (
                <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/40 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                      <FileUp className="w-3.5 h-3.5" />
                      <span>Paste Markdown with YAML Frontmatter or Markdown Headers</span>
                    </span>
                    <input
                      type="file"
                      ref={formFileInputRef}
                      accept=".md,.markdown,.txt"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const text = await file.text();
                          setPastedMd(text);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => formFileInputRef.current?.click()}
                      className="text-[11px] text-purple-300 hover:text-white px-2 py-0.5 rounded bg-purple-900/60 border border-purple-500/40 flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Choose .md File</span>
                    </button>
                  </div>
                  <textarea
                    value={pastedMd}
                    onChange={(e) => setPastedMd(e.target.value)}
                    placeholder="---\nname: Docker Specialist\ndescription: Docker and compose expert\nslashCommand: /docker\ntags: [Docker, DevOps]\n---\n\n### Active Skill: Docker Specialist\n..."
                    rows={4}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleParsePastedMd}
                      disabled={!pastedMd.trim()}
                      className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>Fill Form Fields</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200">Skill Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Next.js 15 Server Actions"
                    required
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200">Slash Command Trigger</label>
                  <input
                    type="text"
                    value={formSlash}
                    onChange={(e) => setFormSlash(e.target.value)}
                    placeholder="/nextjs"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Description</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Short summary of what this skill or workflow handles..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Icon</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {ICON_OPTIONS.map(({ name: iconName, icon: IconComp }) => {
                    const isSelected = formIcon === iconName;
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setFormIcon(iconName)}
                        className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs transition-all ${
                          isSelected
                            ? 'bg-purple-950/80 text-purple-300 border-purple-500 shadow-md shadow-purple-500/20'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                        <span className="text-[10px]">{iconName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">
                  Prompt Instructions / Knowledge Augmentation *
                </label>
                <textarea
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  placeholder="Detailed instructions, coding guidelines, or persona instructions for the AI when this skill is active..."
                  rows={6}
                  required
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="React, Architecture, Fullstack"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Skill</span>
                </button>
              </div>
            </form>
          ) : (
            /* Skills List */
            <div className="space-y-3">
              {filteredSkills.map((skill) => {
                const IconComponent = ICON_MAP[skill.icon] || Sparkles;
                const isEnabled = !!skill.enabled;

                return (
                  <div
                    key={skill.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isEnabled
                        ? 'bg-slate-950/80 border-purple-500/40 shadow-sm shadow-purple-500/10'
                        : 'bg-slate-950/40 border-slate-800/80 opacity-75'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                          isEnabled
                            ? 'bg-purple-950/80 text-purple-300 border-purple-500/50 shadow-md shadow-purple-500/20'
                            : 'bg-slate-900 text-slate-500 border-slate-800'
                        }`}>
                          <IconComponent className="w-4 h-4" />
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-xs text-slate-200">{skill.name}</span>
                            {skill.slashCommand && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-500/40 text-[10px] font-mono font-semibold">
                                {skill.slashCommand}
                              </span>
                            )}
                            {skill.isBuiltin && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-[9px] text-slate-400 font-mono">
                                BUILT-IN
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-400 leading-relaxed">{skill.description}</p>

                          {skill.tags && skill.tags.length > 0 && (
                            <div className="flex items-center gap-1.5 pt-1">
                              {skill.tags.map((t) => (
                                <span
                                  key={t}
                                  className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-900 text-slate-400 border border-slate-800"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right controls */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Toggle Button */}
                        <button
                          onClick={() => toggleSkill(skill.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            isEnabled
                              ? 'bg-purple-950/80 text-purple-300 border border-purple-500/50 hover:bg-purple-900/50'
                              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-purple-400 animate-pulse' : 'bg-slate-600'}`} />
                          <span>{isEnabled ? 'Active' : 'Disabled'}</span>
                        </button>

                        {/* Export .md button */}
                        <button
                          onClick={() => handleExportSkill(skill)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-slate-800 transition-colors"
                          title="Export skill as .md file"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(skill)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-slate-800 transition-colors"
                          title="Edit skill details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {!skill.isBuiltin && (
                          <button
                            onClick={() => deleteSkill(skill.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                            title="Delete custom skill"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-purple-400">💡 Tip:</span>
            <span>Drag & drop <code className="text-purple-300 bg-purple-950/60 px-1 rounded">.md</code> files here or ask AI in chat: <code className="text-purple-300 bg-purple-950/60 px-1 rounded">"Add skill for Docker"</code>.</span>
          </div>

          <button
            onClick={resetBuiltinSkills}
            className="text-slate-500 hover:text-slate-300 flex items-center gap-1 text-[11px] hover:underline"
            title="Reset built-in skills to defaults"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Built-ins</span>
          </button>
        </div>
      </div>
    </div>
  );
}
