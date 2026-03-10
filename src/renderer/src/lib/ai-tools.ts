export type AIToolId = 'claude' | 'codex';

export type AIToolConfig = {
  id: AIToolId;
  label: string;
  color: string;
  bgLight: string;
  borderColor: string;
};

export const AI_TOOLS: Record<AIToolId, AIToolConfig> = {
  claude: {
    id: 'claude',
    label: 'Claude',
    color: '#D97757',
    bgLight: 'rgba(217, 119, 87, 0.08)',
    borderColor: 'rgba(217, 119, 87, 0.2)'
  },
  codex: {
    id: 'codex',
    label: 'Codex',
    color: '#000000',
    bgLight: 'rgba(0, 0, 0, 0.04)',
    borderColor: 'rgba(0, 0, 0, 0.15)'
  }
};

export const detectAITool = (appName: string, exePath: string | null): AIToolId | null => {
  const name = appName.toLowerCase();
  const path = (exePath ?? '').toLowerCase();

  if (name.includes('codex') || path.includes('codex')) return 'codex';
  if (name.includes('claude') || path.includes('claude')) return 'claude';

  return null;
};
