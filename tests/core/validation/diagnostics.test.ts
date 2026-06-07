import { describe, expect, it } from 'vitest';
import { getDiagnosticStage } from '../../../src/core/validation';
import type { Diagnostic } from '../../../src/core/validation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const diag = (overrides: Partial<Diagnostic> = {}): Diagnostic => ({
  severity: 'error',
  code: 'test_code',
  message: 'test message',
  path: 'test.path',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Source stage
// ---------------------------------------------------------------------------

describe('getDiagnosticStage — source', () => {
  it('classifies sourceText path as source', () => {
    expect(getDiagnosticStage(diag({ path: 'sourceText' }))).toBe('source');
  });

  it('classifies source.chapters path as source', () => {
    expect(getDiagnosticStage(diag({ path: 'source.chapters' }))).toBe('source');
  });

  it('classifies source.chapters[N].text path as source', () => {
    expect(getDiagnosticStage(diag({ path: 'source.chapters[0].text' }))).toBe('source');
    expect(getDiagnosticStage(diag({ path: 'source.chapters[2].text' }))).toBe('source');
  });

  it('classifies source.chapters[N].title path as source', () => {
    expect(getDiagnosticStage(diag({ path: 'source.chapters[0].title' }))).toBe('source');
    expect(getDiagnosticStage(diag({ path: 'source.chapters[5].title' }))).toBe('source');
  });

  it('does NOT classify unrelated paths as source', () => {
    expect(getDiagnosticStage(diag({ path: 'chapters' }))).not.toBe('source');
    expect(getDiagnosticStage(diag({ path: 'source' }))).not.toBe('source');
    expect(getDiagnosticStage(diag({ path: 'model' }))).not.toBe('source');
    expect(getDiagnosticStage(diag({ path: 'scene[0].blocks[1].text' }))).not.toBe('source');
  });
});

// ---------------------------------------------------------------------------
// Plan stage
// ---------------------------------------------------------------------------

describe('getDiagnosticStage — plan', () => {
  it('classifies model path as plan', () => {
    expect(getDiagnosticStage(diag({ path: 'model' }))).toBe('plan');
  });

  it('classifies model_ prefix codes as plan regardless of path', () => {
    expect(getDiagnosticStage(diag({ code: 'model_timeout', path: 'whatever' }))).toBe('plan');
    expect(getDiagnosticStage(diag({ code: 'model_validation_error', path: '' }))).toBe('plan');
  });

  it('classifies adaptation_ prefix codes as plan regardless of path', () => {
    expect(getDiagnosticStage(diag({ code: 'adaptation_missing_scene', path: 'some.scene' }))).toBe(
      'plan',
    );
  });
});

// ---------------------------------------------------------------------------
// Document stage (default)
// ---------------------------------------------------------------------------

describe('getDiagnosticStage — document', () => {
  it('classifies scene-level paths as document', () => {
    expect(getDiagnosticStage(diag({ path: 'scene[0]' }))).toBe('document');
    expect(getDiagnosticStage(diag({ path: 'scene[0].blocks[1].text' }))).toBe('document');
  });

  it('classifies generic paths as document', () => {
    expect(getDiagnosticStage(diag({ path: 'export' }))).toBe('document');
    expect(getDiagnosticStage(diag({ path: '' }))).toBe('document');
  });

  it('classifies diagnostics with unrecognized codes as document', () => {
    expect(getDiagnosticStage(diag({ code: 'empty_chapter_text', path: 'some.path' }))).toBe(
      'document',
    );
  });
});
