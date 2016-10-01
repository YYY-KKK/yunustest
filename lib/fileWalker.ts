import * as fs from 'fs';
import * as path from 'path';

/** Walk a directory recursively and call a callback function for each file or directory found. */
export function walkRecursive(rootDirPath: string, callback: (parentDirName: string, fileName: string, fileStats: fs.Stats) => void) {
    fs.readdir(rootDirPath, function(err, files) {
        if (err) return;

        for (let file of files) {
            let fileFullpath = path.join(rootDirPath, file);
            fs.stat(fileFullpath, function(err, fileStats) {
                if (err) return;

                callback(rootDirPath, file,  fileStats);

                if (fileStats.isDirectory()) {
                    walkRecursive(fileFullpath, callback);
                }
            });
        }
    });
}