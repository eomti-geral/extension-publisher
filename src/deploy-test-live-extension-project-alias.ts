import fs from 'fs';
import path from 'path';

const copyDirectory = (source: string, destination: string) => {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const files = fs.readdirSync(source);
  files.forEach((file) => {
    const sourcePath = path.join(source, file);
    const destPath = path.join(destination, file);

    if (fs.statSync(sourcePath).isDirectory()) {
      copyDirectory(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  });
};

const main = async () => {
  try {
    // fake env var
    process.env.EXTENSION_PROJECT_FOLDER = '.';

    // Read package.json
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const { dist: distPath, artifact: artifactPath } = packageJson.path;

    // Create directories if they don't exist
    if (!fs.existsSync(distPath)) {
      fs.mkdirSync(distPath, { recursive: true });
    }
    if (!fs.existsSync(artifactPath)) {
      fs.mkdirSync(artifactPath, { recursive: true });
    }

    // Copy test/extension to dist directory
    copyDirectory('test/extension', distPath);

    // Copy web-ext-artifacts to artifact directory
    copyDirectory('web-ext-artifacts', artifactPath);

    // Read manifest.json from the copied dist directory
    const manifestPath = path.join(distPath, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    // Find the zip file in the artifact directory
    const files = fs.readdirSync(artifactPath);
    const zipFile = files.find((file) => file.endsWith('.zip'));

    if (zipFile) {
      const newFileName =
        `${manifest.name}(chrome)-${manifest.version}.zip`.replace(
          /[<>:"/\\|?*]/g,
          '-'
        ); // Replace invalid characters
      const oldPath = path.join(artifactPath, zipFile);
      const newPath = path.join(artifactPath, newFileName);

      // Rename the zip file
      fs.renameSync(oldPath, newPath);
      console.log(`Successfully renamed zip file to: ${newFileName}`);
    } else {
      console.error('No zip file found in artifacts directory');
    }

    console.log('Deployment setup completed successfully!');
  } catch (error) {
    console.error('Error during deployment setup:', error);
    process.exit(1);
  }
};

main();
