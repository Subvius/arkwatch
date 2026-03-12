const path = require('node:path');
const { existsSync } = require('node:fs');
const { execFileSync } = require('node:child_process');

module.exports = async (context) => {
  if (context.electronPlatformName !== 'win32') {
    return;
  }

  const configuredExecutable = context.packager.executableName;
  const productFilename = context.packager.appInfo.productFilename || context.packager.appInfo.productName || 'ArkWatch';
  const executableName = configuredExecutable
    ? configuredExecutable.toLowerCase().endsWith('.exe')
      ? configuredExecutable
      : `${configuredExecutable}.exe`
    : `${productFilename}.exe`;
  const projectDir = context.projectDir || context.packager.projectDir || process.cwd();
  const executablePath = path.join(context.appOutDir, executableName);
  const iconPath = path.join(projectDir, 'build', 'logo.ico');
  const rceditPath = path.join(
    projectDir,
    'node_modules',
    'electron-winstaller',
    'vendor',
    'rcedit.exe'
  );

  if (!existsSync(executablePath)) {
    throw new Error(`after-pack: executable not found at ${executablePath}`);
  }

  if (!existsSync(iconPath)) {
    throw new Error(`after-pack: icon not found at ${iconPath}`);
  }

  if (!existsSync(rceditPath)) {
    throw new Error(`after-pack: rcedit not found at ${rceditPath}`);
  }

  const version = context.packager.appInfo.version;

  execFileSync(
    rceditPath,
    [
      executablePath,
      '--set-icon',
      iconPath,
      '--set-version-string',
      'FileDescription',
      productFilename,
      '--set-version-string',
      'ProductName',
      productFilename,
      '--set-version-string',
      'InternalName',
      executableName,
      '--set-version-string',
      'OriginalFilename',
      executableName,
      '--set-file-version',
      version,
      '--set-product-version',
      version
    ],
    { stdio: 'inherit' }
  );
};
