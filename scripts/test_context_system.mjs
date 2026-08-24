import { AgentEngine, estimateTokens, getModelContextLimit } from '../server/agent/engine.js';
import { SessionStore } from '../server/sessionStore.js';

console.log('--- Testing Token Estimation & Context Limits ---');
const testMessages = [
  { role: 'system', content: 'You are NexusCoder.' },
  { role: 'user', content: 'Hello world, please write a fast fibonacci algorithm in JS.' },
  { role: 'assistant', content: 'Here is the function:', tool_calls: [{ function: { name: 'write_file', arguments: '{"path":"fib.js","content":"function fib(n){return n<=1?n:fib(n-1)+fib(n-2);}"}' } }] },
  { role: 'tool', name: 'write_file', content: JSON.stringify({ success: true, path: 'fib.js', size: 120 }) },
  { role: 'assistant', content: 'I have written fib.js successfully!' }
];

const estTokens = estimateTokens(testMessages);
console.log('Estimated Tokens:', estTokens);
console.assert(estTokens > 10, 'Estimated tokens should be > 10');

console.log('Claude 3.7 limit:', getModelContextLimit('anthropic/claude-3.7-sonnet'));
console.assert(getModelContextLimit('anthropic/claude-3.7-sonnet') === 200000);

console.log('Gemini 2.5 Flash limit:', getModelContextLimit('google/gemini-2.5-flash'));
console.assert(getModelContextLimit('google/gemini-2.5-flash') === 1000000);

console.log('DeepSeek R1 limit:', getModelContextLimit('deepseek/deepseek-r1'));
console.assert(getModelContextLimit('deepseek/deepseek-r1') === 128000);

console.log('\n--- Testing AgentEngine Context Compaction ---');
const engine = new AgentEngine();
engine.sessionStore = new SessionStore();
engine.messages = [
  { role: 'system', content: 'You are NexusCoder.' },
  { role: 'user', content: 'Read huge file\n\n### Attached Files Context:\n--- File: big.js ---\n' + 'console.log("x");\n'.repeat(300) },
  { role: 'assistant', content: 'Here is the file content...', tool_calls: [{ function: { name: 'read_file', arguments: '{"path":"big.js"}' } }] },
  { role: 'tool', name: 'read_file', content: 'line 1\n'.repeat(500) },
  { role: 'user', content: 'Next step please' },
  { role: 'assistant', content: 'Working on next step' }
];

const beforeTokens = estimateTokens(engine.messages);
console.log('Before compaction tokens:', beforeTokens);

const compactResult = engine.compactContext();
console.log('Compacted result:', compactResult);
console.assert(compactResult.compacted === true, 'Compaction should succeed');
console.assert(compactResult.afterTokens < beforeTokens, 'Tokens should decrease after compaction');
console.log('Tokens saved:', compactResult.savedTokens);

console.log('\n--- Testing Branch With Summary ---');
engine.activePlan = {
  title: 'Build Feature X',
  summary: 'In progress feature building',
  steps: [
    { title: 'Step 1: Setup', status: 'completed' },
    { title: 'Step 2: Logic', status: 'in_progress' },
    { title: 'Step 3: Test', status: 'pending' }
  ]
};

const branched = engine.createBranchWithSummary();
console.log('Branched chat created:', branched.id, branched.title);
console.log('Branched messages in new chat:', engine.uiMessages[0]?.displayContent);
console.assert(engine.messages.length === 1, 'Branched session should start with 1 continuation context message');
console.assert(engine.uiMessages[0]?.isContinuationSummary === true, 'First message should be continuation summary');

console.log('\n✅ All tests passed successfully!');
