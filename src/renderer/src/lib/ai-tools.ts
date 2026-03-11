export type AIToolId = 'claude' | 'codex';

export type AIToolConfig = {
  id: AIToolId;
  label: string;
  color: string;
  bgLight: string;
  borderColor: string;
};

export type AIToolThemeConfig = {
  light: AIToolConfig;
  dark: AIToolConfig;
};

const AI_TOOL_THEMES: Record<AIToolId, AIToolThemeConfig> = {
  claude: {
    light: {
      id: 'claude',
      label: 'Claude',
      color: '#D97757',
      bgLight: 'rgba(217, 119, 87, 0.08)',
      borderColor: 'rgba(217, 119, 87, 0.2)'
    },
    dark: {
      id: 'claude',
      label: 'Claude',
      color: '#E8A088',
      bgLight: 'rgba(217, 119, 87, 0.12)',
      borderColor: 'rgba(217, 119, 87, 0.25)'
    }
  },
  codex: {
    light: {
      id: 'codex',
      label: 'Codex',
      color: '#000000',
      bgLight: 'rgba(0, 0, 0, 0.04)',
      borderColor: 'rgba(0, 0, 0, 0.15)'
    },
    dark: {
      id: 'codex',
      label: 'Codex',
      color: '#e0e0e0',
      bgLight: 'rgba(255, 255, 255, 0.06)',
      borderColor: 'rgba(255, 255, 255, 0.12)'
    }
  }
};

export function getAITools(isDark: boolean): Record<AIToolId, AIToolConfig> {
  const mode = isDark ? 'dark' : 'light';
  return {
    claude: AI_TOOL_THEMES.claude[mode],
    codex: AI_TOOL_THEMES.codex[mode]
  };
}

// Keep static reference for non-themed uses (detection)
export const AI_TOOLS: Record<AIToolId, AIToolConfig> = {
  claude: AI_TOOL_THEMES.claude.light,
  codex: AI_TOOL_THEMES.codex.light
};

export const detectAITool = (appName: string, exePath: string | null): AIToolId | null => {
  const name = appName.toLowerCase();
  const path = (exePath ?? '').toLowerCase();

  if (name.includes('codex') || path.includes('codex')) return 'codex';
  if (name.includes('claude') || path.includes('claude')) return 'claude';

  return null;
};
