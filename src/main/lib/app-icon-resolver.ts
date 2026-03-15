import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

export type IconCandidate =
  | {
      kind: 'file-icon';
      path: string;
    }
  | {
      kind: 'image-file';
      path: string;
    };

const APPX_MANIFEST_FILE = 'AppxManifest.xml';

const normalize = (value: string): string => value.trim().toLowerCase();

const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const knownAliasExecutables = (normalizedToken: string, systemRoot: string): string[] => {
  const screenSketch = path.join(systemRoot, 'SystemApps', 'Microsoft.ScreenSketch_8wekyb3d8bbwe', 'ScreenSketch.exe');

  if (normalizedToken === 'task manager' || normalizedToken === 'taskmgr' || normalizedToken === 'taskmgr.exe') {
    return ['Taskmgr.exe'];
  }

  if (
    normalizedToken === 'snipping tool' ||
    normalizedToken === 'snippingtool' ||
    normalizedToken === 'snippingtool.exe' ||
    normalizedToken === 'screen sketch' ||
    normalizedToken === 'screensketch' ||
    normalizedToken === 'screensketch.exe'
  ) {
    return ['SnippingTool.exe', 'ScreenSketch.exe', screenSketch];
  }

  return [];
};

const tokenToExecutablePaths = (token: string, systemRoot: string): string[] => {
  const trimmed = token.trim();
  if (!trimmed) {
    return [];
  }

  if (path.isAbsolute(trimmed)) {
    return [trimmed];
  }

  const hasSeparators = trimmed.includes('\\') || trimmed.includes('/');
  const base = path.basename(trimmed);
  const hasExtension = /\.[a-z0-9]+$/i.test(base);

  const localTokens = new Set<string>();
  localTokens.add(trimmed);

  if (!hasExtension && !hasSeparators) {
    localTokens.add(`${trimmed}.exe`);
  }

  if (base && base !== trimmed) {
    localTokens.add(base);
    if (!/\.[a-z0-9]+$/i.test(base)) {
      localTokens.add(`${base}.exe`);
    }
  }

  const candidates = new Set<string>();

  for (const localToken of localTokens) {
    if (path.isAbsolute(localToken)) {
      continue;
    }

    if (localToken.includes('\\') || localToken.includes('/')) {
      continue;
    }

    candidates.add(path.join(systemRoot, 'System32', localToken));
    candidates.add(path.join(systemRoot, 'SysWOW64', localToken));
    candidates.add(path.join(systemRoot, localToken));
  }

  return Array.from(candidates);
};

const buildAdjacentImageCandidates = (exePath: string): IconCandidate[] => {
  if (!path.isAbsolute(exePath)) {
    return [];
  }

  const directory = path.dirname(exePath);
  const parentDirectory = path.dirname(directory);
  const baseName = path.basename(exePath, path.extname(exePath));
  const directories = parentDirectory !== directory ? [directory, parentDirectory] : [directory];
  const assetNames = [`${baseName}.ico`, `${baseName}.png`, 'app.ico', 'app.png', 'logo.ico', 'logo.png', 'icon.ico', 'icon.png'];
  const nestedAssetPaths = [
    ['resources', 'assets', 'logo.ico'],
    ['resources', 'assets', 'logo.png'],
    ['resources', 'icon.ico'],
    ['resources', 'icon.png'],
    ['resources', 'app.ico'],
    ['resources', 'app.png']
  ];

  const candidates: IconCandidate[] = [];
  const seen = new Set<string>();
  const addCandidate = (candidatePath: string): void => {
    const key = `image-file:${candidatePath}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    candidates.push({ kind: 'image-file', path: candidatePath });
  };

  for (const assetDirectory of directories) {
    for (const assetName of assetNames) {
      addCandidate(path.join(assetDirectory, assetName));
    }

    for (const nestedAssetPath of nestedAssetPaths) {
      addCandidate(path.join(assetDirectory, ...nestedAssetPath));
    }
  }

  return candidates;
};

const findAppxPackageRoot = async (exePath: string): Promise<string | null> => {
  if (!path.isAbsolute(exePath)) {
    return null;
  }

  let currentDirectory = path.dirname(exePath);
  for (let depth = 0; depth < 4; depth += 1) {
    const manifestPath = path.join(currentDirectory, APPX_MANIFEST_FILE);
    if (await pathExists(manifestPath)) {
      return currentDirectory;
    }

    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      break;
    }

    currentDirectory = parentDirectory;
  }

  return null;
};

const extractManifestLogoPaths = (manifest: string): string[] => {
  const candidates: string[] = [];
  const seen = new Set<string>();
  const addMatches = (pattern: RegExp): void => {
    for (const match of manifest.matchAll(pattern)) {
      const value = match[1]?.trim();
      if (!value || value.startsWith('ms-resource:') || seen.has(value)) {
        continue;
      }

      seen.add(value);
      candidates.push(value);
    }
  };

  addMatches(/Square44x44Logo="([^"]+)"/g);
  addMatches(/Square150x150Logo="([^"]+)"/g);
  addMatches(/<Logo>([^<]+)<\/Logo>/g);

  return candidates;
};

const getPackageAssetPriority = (fileName: string, requestedBaseName: string): number => {
  const normalizedName = fileName.toLowerCase();
  const ext = path.extname(normalizedName);
  const normalizedBaseName = path.basename(normalizedName, ext);

  let score = 100;
  if (normalizedBaseName === requestedBaseName) {
    score -= 60;
  } else if (normalizedBaseName.startsWith(requestedBaseName)) {
    score -= 25;
  }

  if (normalizedName.includes('unplated')) {
    score -= 20;
  }

  if (normalizedName.includes('targetsize-48') || normalizedName.includes('targetsize-44')) {
    score -= 15;
  } else if (normalizedName.includes('targetsize-32')) {
    score -= 12;
  } else if (normalizedName.includes('targetsize-24')) {
    score -= 10;
  } else if (normalizedName.includes('targetsize-16')) {
    score -= 8;
  } else if (normalizedName.includes('scale-200')) {
    score -= 7;
  } else if (normalizedName.includes('scale-150')) {
    score -= 5;
  } else if (normalizedName.includes('scale-125')) {
    score -= 4;
  } else if (normalizedName.includes('scale-100')) {
    score -= 3;
  }

  if (normalizedName.includes('storelogo')) {
    score += 10;
  }

  return score;
};

const buildManifestImageCandidates = async (packageRoot: string, relativePath: string): Promise<IconCandidate[]> => {
  const normalizedRelativePath = relativePath.replace(/[\\/]+/g, path.sep);
  const resolvedAssetPath = path.join(packageRoot, normalizedRelativePath);
  const assetDirectory = path.dirname(resolvedAssetPath);
  const assetExtension = path.extname(resolvedAssetPath);
  const assetBaseName = path.basename(resolvedAssetPath, assetExtension).toLowerCase();

  const candidates: IconCandidate[] = [];
  const seen = new Set<string>();
  const addCandidate = (candidatePath: string): void => {
    const key = `image-file:${candidatePath}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    candidates.push({ kind: 'image-file', path: candidatePath });
  };

  addCandidate(resolvedAssetPath);

  if (!(await pathExists(assetDirectory))) {
    return candidates;
  }

  const matchingFiles = (await readdir(assetDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => {
      const extension = path.extname(fileName);
      if (assetExtension && extension.toLowerCase() !== assetExtension.toLowerCase()) {
        return false;
      }

      return path.basename(fileName, extension).toLowerCase().startsWith(assetBaseName);
    })
    .sort((left, right) => {
      const scoreDelta = getPackageAssetPriority(left, assetBaseName) - getPackageAssetPriority(right, assetBaseName);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return left.localeCompare(right);
    });

  for (const fileName of matchingFiles) {
    addCandidate(path.join(assetDirectory, fileName));
  }

  return candidates;
};

const buildAppxManifestCandidates = async (exePath: string): Promise<IconCandidate[]> => {
  const packageRoot = await findAppxPackageRoot(exePath);
  if (!packageRoot) {
    return [];
  }

  try {
    const manifest = await readFile(path.join(packageRoot, APPX_MANIFEST_FILE), 'utf8');
    const logoPaths = extractManifestLogoPaths(manifest);
    const candidateGroups = await Promise.all(logoPaths.map((logoPath) => buildManifestImageCandidates(packageRoot, logoPath)));

    return candidateGroups.flat();
  } catch {
    return [];
  }
};

export const buildIconCandidates = async (appName: string, exePath: string | null): Promise<IconCandidate[]> => {
  const systemRoot = process.env.SystemRoot ?? 'C:\\Windows';

  const tokens = new Set<string>();
  const addToken = (value: string | null | undefined): void => {
    if (!value) {
      return;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    tokens.add(trimmed);
    tokens.add(path.basename(trimmed));
  };

  addToken(exePath);
  addToken(appName);

  const compactName = normalize(appName).replace(/\s+/g, '');
  if (compactName) {
    tokens.add(compactName);
  }

  const candidates: IconCandidate[] = [];
  const seen = new Set<string>();
  const manifestCandidatesByPath = new Map<string, IconCandidate[]>();
  const addCandidate = (candidate: IconCandidate): void => {
    const key = `${candidate.kind}:${candidate.path}`;
    if (!candidate.path || seen.has(key)) {
      return;
    }

    seen.add(key);
    candidates.push(candidate);
  };
  const getManifestCandidates = async (candidatePath: string): Promise<IconCandidate[]> => {
    if (manifestCandidatesByPath.has(candidatePath)) {
      return manifestCandidatesByPath.get(candidatePath) ?? [];
    }

    const manifestCandidates = await buildAppxManifestCandidates(candidatePath);
    manifestCandidatesByPath.set(candidatePath, manifestCandidates);
    return manifestCandidates;
  };

  for (const token of tokens) {
    for (const candidatePath of tokenToExecutablePaths(token, systemRoot)) {
      addCandidate({ kind: 'file-icon', path: candidatePath });

      if (path.isAbsolute(candidatePath)) {
        for (const adjacentCandidate of buildAdjacentImageCandidates(candidatePath)) {
          addCandidate(adjacentCandidate);
        }

        for (const manifestCandidate of await getManifestCandidates(candidatePath)) {
          addCandidate(manifestCandidate);
        }
      }
    }

    for (const alias of knownAliasExecutables(normalize(token), systemRoot)) {
      for (const candidatePath of tokenToExecutablePaths(alias, systemRoot)) {
        addCandidate({ kind: 'file-icon', path: candidatePath });

        if (path.isAbsolute(candidatePath)) {
          for (const adjacentCandidate of buildAdjacentImageCandidates(candidatePath)) {
            addCandidate(adjacentCandidate);
          }

          for (const manifestCandidate of await getManifestCandidates(candidatePath)) {
            addCandidate(manifestCandidate);
          }
        }
      }
    }
  }

  return candidates;
};
