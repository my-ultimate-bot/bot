const { promisify } = require('util');

const axios = require('axios');
const AdmZip = require('adm-zip');
const fs = require('fs-extra');
const npm = require('npm');

const logger = require('./logger');

module.exports = async (urlZip, urlPackage, branch) => {
  try {
    const { version, dependencies } = await fs.readJSON('./package.json');
    const fetchRemotePackage = await axios.get(`${urlPackage}/${branch}/package.json`);
    const remoteVersion = fetchRemotePackage.data.version;
    const remoteDependencies = fetchRemotePackage.data.dependencies;

    if (version !== remoteVersion) {
      const { data } = await axios({
        method: 'get',
        url: `${urlZip}/${branch}`,
        responseType: 'stream',
      });
      const file = fs.createWriteStream('./updateFiles.zip');
      data.pipe(file);

      file.once('finish', async () => {
        const zip = new AdmZip('./updateFiles.zip');
        zip.extractAllTo('./', true);

        const extractedFolder = `./bot-${branch}`;
        const listEntries = await fs.readdir(extractedFolder);
        await Promise.all(listEntries.map(async (entry) => fs.move(`${extractedFolder}/${entry}`, `./${entry}`, { overwrite: true })));

        await fs.remove('./updateFiles.zip');
        await fs.remove(extractedFolder);

        const dependenciesStringified = JSON.stringify(dependencies);
        const remoteDependenciesStringified = JSON.stringify(remoteDependencies);
        if (dependenciesStringified !== remoteDependenciesStringified) {
          npm.load({ 'ignore-scripts': true, loglevel: 'error', progress: false }, async () => {
            try {
              const installPackage = promisify(npm.commands.install);
              console.log('New version detected, installing...');

              await installPackage(Object.keys(remoteDependencies));
            } catch (error) {
              console.error(error);
              logger.error(error);
            }

            process.exit(0);
          });
        } else {
          process.exit(0);
        }
      });
    } else {
      console.log('The software is up to date');
      return true;
    }
  } catch (e) {
    console.error(e);
    logger.error(e);
    return true;
  }
};
