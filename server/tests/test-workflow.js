const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const workflow = require('../services/workflow');

describe('Workflow — renderPrompt', () => {
  it('replaces {{input}}', () => {
    assert.equal(workflow.renderPrompt('Hello {{input}}', 'world', {}), 'Hello world');
  });

  it('replaces {{s1.output}}', () => {
    assert.equal(
      workflow.renderPrompt('Result: {{s1.output}}', '', { s1: 'done' }),
      'Result: done'
    );
  });

  it('replaces multiple references', () => {
    assert.equal(
      workflow.renderPrompt('{{input}} → {{s1.output}} → {{s2.output}}', 'start', { s1: 'mid', s2: 'end' }),
      'start → mid → end'
    );
  });

  it('handles missing output gracefully', () => {
    assert.equal(workflow.renderPrompt('{{s99.output}}', '', {}), '');
  });
});

describe('Workflow — normalizeSteps', () => {
  it('normalizes basic step', () => {
    const steps = workflow.normalizeSteps([{ name: 'Step 1', agent: 'a1', prompt: 'hello' }]);
    assert.equal(steps.length, 1);
    assert.equal(steps[0].id, 's1');
    assert.equal(steps[0].type, 'agent');
    assert.equal(steps[0].onError, 'fail');
    assert.equal(steps[0].maxRetries, 0);
  });

  it('normalizes condition step', () => {
    const steps = workflow.normalizeSteps([{
      type: 'condition', name: 'Check', conditionExpr: '需要修改',
      conditionMode: 'keyword', branches: { true: 's2', false: 's3' },
    }]);
    assert.equal(steps[0].type, 'condition');
    assert.equal(steps[0].conditionExpr, '需要修改');
    assert.equal(steps[0].branches.true, 's2');
    assert.equal(steps[0].branches.false, 's3');
  });

  it('clamps maxRetries to 0-3', () => {
    const steps = workflow.normalizeSteps([
      { maxRetries: 5 },
      { maxRetries: -1 },
      { maxRetries: 2 },
    ]);
    assert.equal(steps[0].maxRetries, 3);
    assert.equal(steps[1].maxRetries, 0);
    assert.equal(steps[2].maxRetries, 2);
  });

  it('defaults onError to fail', () => {
    const steps = workflow.normalizeSteps([{}]);
    assert.equal(steps[0].onError, 'fail');
  });
});

describe('Workflow — evaluateCondition', () => {
  it('keyword mode: matches keyword in last output', async () => {
    const step = { conditionExpr: '成功', conditionMode: 'keyword' };
    const rs = { input: '', outputs: { s1: '任务成功完成' }, stepIndex: 1, steps: [{ id: 's1' }, step], channel: 'test' };
    const result = await workflow.evaluateCondition(step, rs);
    assert.ok(result);
  });

  it('keyword mode: no match', async () => {
    const step = { conditionExpr: '失败', conditionMode: 'keyword' };
    const rs = { input: '', outputs: { s1: '任务成功完成' }, stepIndex: 1, steps: [{ id: 's1' }, step], channel: 'test' };
    const result = await workflow.evaluateCondition(step, rs);
    assert.ok(!result);
  });

  it('empty expression defaults to true', async () => {
    const step = { conditionExpr: '', conditionMode: 'keyword' };
    const rs = { input: 'anything', outputs: {}, stepIndex: 0, steps: [step], channel: 'test' };
    const result = await workflow.evaluateCondition(step, rs);
    assert.ok(result);
  });

  it('keyword with template {{input}}', async () => {
    const step = { conditionExpr: '{{input}}', conditionMode: 'keyword' };
    const rs = { input: 'hello', outputs: {}, stepIndex: 0, steps: [step], channel: 'test' };
    const result = await workflow.evaluateCondition(step, rs);
    assert.ok(result);
  });
});

describe('Workflow — CRUD', () => {
  const store = require('../services/storage');
  const origWorkflows = [...store.workflows];

  beforeEach(() => {
    store.workflows = [...origWorkflows];
  });

  it('creates a workflow', () => {
    const wf = workflow.create({ name: 'Test WF', steps: [{ agent: 'a1', prompt: 'hello' }] });
    assert.ok(wf.id.startsWith('wf-'));
    assert.equal(wf.name, 'Test WF');
    assert.equal(wf.steps.length, 1);
    assert.equal(wf.steps[0].type, 'agent');
    store.workflows = store.workflows.filter(w => w.id !== wf.id);
  });

  it('updates a workflow', () => {
    const wf = workflow.create({ name: 'Old Name', steps: [] });
    const updated = workflow.update(wf.id, { name: 'New Name' });
    assert.equal(updated.name, 'New Name');
    store.workflows = store.workflows.filter(w => w.id !== wf.id);
  });

  it('removes a workflow', () => {
    const wf = workflow.create({ name: 'To Delete', steps: [] });
    assert.ok(workflow.remove(wf.id));
    assert.equal(workflow.getById(wf.id), null);
  });

  it('returns null for non-existent update', () => {
    assert.equal(workflow.update('non-existent', {}), null);
  });
});
