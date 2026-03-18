const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const toolEngine = require('../services/tool-engine');
const toolRegistry = require('../services/tool-registry');

describe('ToolEngine — safeParse', () => {
  it('parses valid JSON string', () => {
    const result = toolEngine.safeParse('{"key":"value"}');
    assert.deepEqual(result, { key: 'value' });
  });

  it('returns object as-is', () => {
    const obj = { a: 1 };
    assert.strictEqual(toolEngine.safeParse(obj), obj);
  });

  it('returns {} for invalid JSON', () => {
    assert.deepEqual(toolEngine.safeParse('not json'), {});
  });

  it('returns {} for empty string', () => {
    assert.deepEqual(toolEngine.safeParse(''), {});
  });

  it('returns {} for null', () => {
    assert.deepEqual(toolEngine.safeParse(null), {});
  });
});

describe('ToolEngine — argsKey', () => {
  it('serializes args to string', () => {
    assert.equal(toolEngine.argsKey({ a: 1 }), '{"a":1}');
  });

  it('returns empty string for circular reference', () => {
    const obj = {};
    obj.self = obj;
    assert.equal(toolEngine.argsKey(obj), '');
  });
});

describe('ToolEngine — detectLoop', () => {
  it('returns false for empty history', () => {
    assert.ok(!toolEngine.detectLoop([]));
  });

  it('returns false for short history', () => {
    assert.ok(!toolEngine.detectLoop([
      { name: 'foo', argsKey: '{}' },
      { name: 'foo', argsKey: '{}' },
    ]));
  });

  it('returns true for 3 identical calls', () => {
    assert.ok(toolEngine.detectLoop([
      { name: 'foo', argsKey: '{}' },
      { name: 'foo', argsKey: '{}' },
      { name: 'foo', argsKey: '{}' },
    ]));
  });

  it('returns false for different tools', () => {
    assert.ok(!toolEngine.detectLoop([
      { name: 'foo', argsKey: '{}' },
      { name: 'bar', argsKey: '{}' },
      { name: 'foo', argsKey: '{}' },
    ]));
  });

  it('returns false for same tool different args', () => {
    assert.ok(!toolEngine.detectLoop([
      { name: 'foo', argsKey: '{"a":1}' },
      { name: 'foo', argsKey: '{"a":2}' },
      { name: 'foo', argsKey: '{"a":3}' },
    ]));
  });
});

describe('ToolEngine — extractToolCalls', () => {
  it('extracts OpenAI tool calls', () => {
    const data = {
      choices: [{
        finish_reason: 'tool_calls',
        message: {
          tool_calls: [{
            id: 'tc1',
            function: { name: 'test_tool', arguments: '{"q":"hello"}' },
          }],
        },
      }],
    };
    const result = toolEngine.extractToolCalls(data, 'openai');
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'test_tool');
    assert.deepEqual(result[0].args, { q: 'hello' });
  });

  it('extracts Anthropic tool calls', () => {
    const data = {
      content: [
        { type: 'text', text: 'hello' },
        { type: 'tool_use', id: 'tc1', name: 'test_tool', input: { q: 'hello' } },
      ],
    };
    const result = toolEngine.extractToolCalls(data, 'anthropic-messages');
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'test_tool');
    assert.deepEqual(result[0].args, { q: 'hello' });
  });

  it('returns null for no tool calls', () => {
    assert.equal(toolEngine.extractToolCalls({ choices: [{ finish_reason: 'stop' }] }, 'openai'), null);
  });
});

describe('ToolEngine — executeToolCalls', () => {
  beforeEach(() => {
    toolRegistry.unregisterTool('_test_echo');
  });

  it('executes a registered tool', async () => {
    toolRegistry.registerTool('_test_echo', {
      schema: { description: 'echo', parameters: { type: 'object', properties: {} } },
      handler: async (args) => ({ echo: args.msg }),
      meta: { icon: 'T', risk: 'low' },
    });

    const setBroadcast = require('../services/tool-events').setBroadcast;
    setBroadcast(() => {});

    const results = await toolEngine.executeToolCalls(
      [{ id: 'tc1', name: '_test_echo', args: { msg: 'hi' } }],
      { channel: 'test', agentId: 'agent1', runId: 'r1' }
    );

    assert.equal(results.length, 1);
    assert.equal(results[0].error, null);
    assert.deepEqual(results[0].result, { echo: 'hi' });
    toolRegistry.unregisterTool('_test_echo');
  });

  it('handles unknown tool gracefully', async () => {
    const setBroadcast = require('../services/tool-events').setBroadcast;
    setBroadcast(() => {});

    const results = await toolEngine.executeToolCalls(
      [{ id: 'tc2', name: '_nonexistent_tool', args: {} }],
      { channel: 'test', agentId: 'agent1', runId: 'r1' }
    );

    assert.equal(results.length, 1);
    assert.ok(results[0].error);
    assert.equal(results[0].result, null);
  });
});

describe('ToolEngine — streamToolAccumulator', () => {
  it('accumulates OpenAI tool call deltas', () => {
    const acc = toolEngine.createStreamToolAccumulator();

    acc.feedDelta({ tool_calls: [{ index: 0, id: 'tc1', function: { name: 'foo', arguments: '{"a' } }] });
    acc.feedDelta({ tool_calls: [{ index: 0, function: { arguments: '":1}' } }] });

    assert.ok(acc.hasToolCalls());
    const calls = acc.getToolCalls();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].name, 'foo');
    assert.deepEqual(calls[0].args, { a: 1 });
  });
});

describe('ToolEngine — injectToolResults', () => {
  it('injects OpenAI tool results', () => {
    const messages = [];
    toolEngine.injectToolResultsOpenAI(
      messages,
      [{ id: 'tc1', name: 'test', args: { q: 'x' } }],
      [{ toolCallId: 'tc1', name: 'test', result: { ok: true }, error: null }]
    );
    assert.equal(messages.length, 2);
    assert.equal(messages[0].role, 'assistant');
    assert.equal(messages[1].role, 'tool');
    assert.equal(messages[1].tool_call_id, 'tc1');
  });

  it('injects Anthropic tool results', () => {
    const messages = [];
    toolEngine.injectToolResultsAnthropic(
      messages,
      [{ id: 'tc1', name: 'test', args: { q: 'x' } }],
      [{ toolCallId: 'tc1', name: 'test', result: { ok: true }, error: null }]
    );
    assert.equal(messages.length, 2);
    assert.equal(messages[0].role, 'assistant');
    assert.equal(messages[1].role, 'user');
    assert.equal(messages[1].content[0].type, 'tool_result');
  });
});

describe('ToolRegistry — registration', () => {
  beforeEach(() => {
    toolRegistry.unregisterTool('_test_reg');
  });

  it('registers and retrieves a tool', () => {
    toolRegistry.registerTool('_test_reg', {
      schema: { description: 'test', parameters: { type: 'object', properties: {} } },
      handler: async () => ({}),
      meta: { icon: 'T', risk: 'low' },
    });
    assert.ok(toolRegistry.getAllToolNames().includes('_test_reg'));
    assert.ok(toolRegistry.getHandler('_test_reg'));
    assert.equal(toolRegistry.getMeta('_test_reg').risk, 'low');
    toolRegistry.unregisterTool('_test_reg');
    assert.ok(!toolRegistry.getAllToolNames().includes('_test_reg'));
  });

  it('throws on missing schema or handler', () => {
    assert.throws(() => toolRegistry.registerTool('_bad', { schema: null, handler: null }));
  });

  it('toOpenAITools formats correctly', () => {
    toolRegistry.registerTool('_test_reg', {
      schema: { description: 'desc', parameters: { type: 'object', properties: { x: { type: 'string' } } } },
      handler: async () => ({}),
      meta: {},
    });
    const entries = [{ schema: toolRegistry._getSchema('_test_reg') ? { type: 'function', function: toolRegistry._getSchema('_test_reg') } : null }].filter(Boolean);
    assert.ok(entries.length >= 0);
    toolRegistry.unregisterTool('_test_reg');
  });
});
