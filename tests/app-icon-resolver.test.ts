import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { buildIconCandidates } from '../src/main/lib/app-icon-resolver';

describe('app icon resolver helpers', () => {
  const tempDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })));
  });

  it('adds sibling and parent asset candidates for versioned executable installs', async () => {
    const exePath = 'C:\\Users\\karim\\AppData\\Local\\SampleApp\\app-1.2.3\\SampleApp.exe';
    const candidates = await buildIconCandidates('Sample App', exePath);

    expect(candidates[0]).toEqual({ kind: 'file-icon', path: exePath });
    expect(candidates).toContainEqual({
      kind: 'image-file',
      path: path.join('C:\\Users\\karim\\AppData\\Local\\SampleApp\\app-1.2.3', 'app.ico')
    });
    expect(candidates).toContainEqual({
      kind: 'image-file',
      path: path.join('C:\\Users\\karim\\AppData\\Local\\SampleApp', 'app.ico')
    });
  });

  it('adds packaged desktop resource logo candidates for installed apps', async () => {
    const exePath = 'C:\\Users\\karim\\AppData\\Local\\Programs\\ArkWatch\\ArkWatch.exe';
    const candidates = await buildIconCandidates('ArkWatch', exePath);

    expect(candidates).toContainEqual({
      kind: 'image-file',
      path: path.join('C:\\Users\\karim\\AppData\\Local\\Programs\\ArkWatch', 'resources', 'assets', 'logo.ico')
    });
  });

  it('adds manifest-declared appx image assets for packaged apps', async () => {
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'arkwatch-icon-test-'));
    tempDirectories.push(tempDirectory);

    const packageRoot = path.join(tempDirectory, 'Raycast.Raycast_0.49.0.0_x64__qypenmj9wpt2a');
    const executableDirectory = path.join(packageRoot, 'Raycast');
    const imageDirectory = path.join(packageRoot, 'Images', 'Production');
    const exePath = path.join(executableDirectory, 'Raycast.exe');

    await fs.mkdir(executableDirectory, { recursive: true });
    await fs.mkdir(imageDirectory, { recursive: true });
    await fs.writeFile(path.join(packageRoot, 'AppxManifest.xml'), `<?xml version="1.0" encoding="utf-8"?>
<Package>
  <Properties>
    <Logo>Images\\Production\\MsixLogo.png</Logo>
  </Properties>
  <Applications>
    <Application Id="Raycast" Executable="Raycast\\Raycast.exe">
      <uap:VisualElements Square150x150Logo="Images\\Production\\Square150x150Logo.png" Square44x44Logo="Images\\Production\\Square44x44Logo.png" />
    </Application>
  </Applications>
</Package>`);
    await fs.writeFile(path.join(imageDirectory, 'Square44x44Logo.targetsize-48.png'), '');
    await fs.writeFile(path.join(imageDirectory, 'Square44x44Logo.scale-200.png'), '');
    await fs.writeFile(path.join(imageDirectory, 'Square150x150Logo.scale-200.png'), '');

    const candidates = await buildIconCandidates('Raycast', exePath);

    expect(candidates).toContainEqual({
      kind: 'image-file',
      path: path.join(imageDirectory, 'Square44x44Logo.targetsize-48.png')
    });
    expect(candidates).toContainEqual({
      kind: 'image-file',
      path: path.join(imageDirectory, 'Square44x44Logo.scale-200.png')
    });
  });

  it('keeps the fallback generic for any executable path, not just Discord', async () => {
    const exePath = 'D:\\Tools\\WidgetSuite\\build-42\\Widget.exe';
    const candidates = await buildIconCandidates('Completely Different Name', exePath);

    expect(candidates).toContainEqual({ kind: 'file-icon', path: exePath });
    expect(candidates).toContainEqual({
      kind: 'image-file',
      path: path.join('D:\\Tools\\WidgetSuite\\build-42', 'app.ico')
    });
    expect(candidates).toContainEqual({
      kind: 'image-file',
      path: path.join('D:\\Tools\\WidgetSuite', 'app.ico')
    });
  });
});
