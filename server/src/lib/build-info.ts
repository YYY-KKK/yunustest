import * as fs from 'fs';
import * as path from 'path';

let version;
let buildDate;
let commitSha;

export function refreshBuildInfo() {
	const buildInfoJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../../build-info.json"), 'utf8'));
	const pkJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../../package.json"), 'utf8'));
	buildDate = buildInfoJson.buildDate;
	commitSha = buildInfoJson.commitSha;
	version = pkJson.version;
}

export function getBuildInfo() {
	return {
		version: version,
		buildDate: buildDate,
		commitSha: commitSha
	};
}

refreshBuildInfo();