import { describe, expect, it } from 'vitest';
import { mapProcessNamesToAITools, parseTasklistCsvOutput } from '../src/main/tracker/process-scanner';

describe('process-scanner helpers', () => {
  it('parses process names from tasklist CSV output', () => {
    const stdout = [
      '"Code.exe","1234","Console","1","20,000 K"',
      '"Codex.exe","2222","Console","1","30,000 K"',
      ''
    ].join('\r\n');

    expect(parseTasklistCsvOutput(stdout)).toEqual(['Code.exe', 'Codex.exe']);
  });

  it('maps known AI tool processes to running flags', () => {
    const mapped = mapProcessNamesToAITools(['claude.exe', 'Codex.exe']);

    expect(mapped.get('claude')).toMatchObject({ name: 'Claude Code', running: true });
    expect(mapped.get('codex')).toMatchObject({ name: 'Codex', running: true });
  });

  it('keeps tools offline when process list does not include them', () => {
    const mapped = mapProcessNamesToAITools(['Code.exe', 'chrome.exe']);

    expect(mapped.get('claude')).toMatchObject({ name: 'Claude Code', running: false });
    expect(mapped.get('codex')).toMatchObject({ name: 'Codex', running: false });
  });
});
