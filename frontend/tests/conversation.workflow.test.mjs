import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(
  new URL('../../packages/conversation-workflow/src/index.ts', import.meta.url),
  'utf8'
);
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
new Function('exports', 'require', 'module', output)(module.exports, require, module);
const workflow = module.exports;

const valid = (overrides = {}) => ({
  currentStep: 0,
  hasRider: true,
  hasVehicle: true,
  hasRideability: true,
  hasCategory: true,
  hasSubcategory: true,
  issueGroupCount: 1,
  remarksWordCount: 0,
  ...overrides,
});

test('blocks Next when a Rider is missing', () => {
  const result = workflow.nextWorkflow(valid({ hasRider: false }));
  assert.equal(result.step, 0);
  assert.equal(result.validation, 'Select a rider to continue.');
});

test('advances valid workflow state', () => {
  assert.deepEqual(workflow.nextWorkflow(valid({ currentStep: 2 })), { step: 3, validation: null });
});

test('supports Back and Review Edit transitions', () => {
  assert.deepEqual(workflow.previousWorkflow(valid({ currentStep: 4 })), {
    step: 3,
    validation: null,
  });
  assert.deepEqual(workflow.editWorkflow(valid({ currentStep: 8 }), 2), {
    step: 2,
    validation: null,
  });
});

test('rejects invalid edit targets', () => {
  const result = workflow.editWorkflow(valid({ currentStep: 4 }), 9);
  assert.equal(result.step, 4);
  assert.equal(result.validation, 'That conversation step is unavailable.');
});

test('requires an issue group and valid remarks before completion', () => {
  assert.equal(
    workflow.validateWorkflowCompletion(valid({ issueGroupCount: 0 })),
    'Add at least one problem before creating the ticket.'
  );
  assert.equal(
    workflow.validateWorkflowCompletion(valid({ remarksWordCount: 201 })),
    'Remarks cannot exceed 200 words.'
  );
  assert.equal(workflow.validateWorkflowCompletion(valid()), null);
});

test('creates, resumes, cancels, and submits deterministically', () => {
  assert.equal(workflow.createConversation().currentStep, 0);
  assert.deepEqual(workflow.resumeWorkflow(valid({ currentStep: 7 })), {
    step: 7,
    validation: null,
  });
  assert.deepEqual(workflow.cancelWorkflow(), { step: 0, validation: null });
  assert.deepEqual(workflow.submitWorkflow(valid({ currentStep: 8 })), {
    step: 9,
    validation: null,
  });
});
