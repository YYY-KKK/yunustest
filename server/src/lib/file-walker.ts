import * as fs from 'fs';
import * as path from 'path';
import * as thenify from 'thenify';

const readdir = thenify(fs.readdir);
const stat = thenify(fs.stat);

/** Walk a directory recursively and call a callback function for each file or directory found. */
export async function walkRecursive(
    rootDirPath: string,
    callback: (parentDirName: string, fileName: string, fileStats: fs.Stats) => void): Promise<any> {

    return new Promise(async function (resolve, reject) {
        try {
            const files: string[] = await readdir(rootDirPath);

            for (let file of files) {
                try {
                    const fileFullPath = path.join(rootDirPath, file);
                    const fileStats = await stat(fileFullPath);
                    await callback(rootDirPath, file, fileStats);

                    if (fileStats.isDirectory()) {
                        await walkRecursive(fileFullPath, callback);
                    }
                } catch { }
            }

            resolve();
        } catch (err) {
            reject(err);
        }
    });
}