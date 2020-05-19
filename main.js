const core = require('@actions/core');
const exec = require('@actions/exec');
const tc = require('@actions/tool-cache');
const { Octokit } = require("@octokit/rest");

const baseDownloadURL = "https://storage.googleapis.com/kubernetes-release/release/v1.18.0/bin/linux/amd64/kubectl"
const fallbackVersion = "1.42.0"
const octokit = new Octokit();

async function downloadDoctl(version) {
    console.log(version);
    const doctlDownload = await tc.downloadTool(`${baseDownloadURL}`);
    return doctlDownload;
}

async function run() {
  try { 
    var version = core.getInput('version');
    if ((!version) || (version.toLowerCase() === 'latest')) {
        version = await octokit.repos.getLatestRelease({
            owner: 'debianmaster',
            repo: 'kubectl'
        }).then(result => {
            return result.data.name;
        }).catch(error => {
            // GitHub rate-limits are by IP address and runners can share IPs.
            // This mostly effects macOS where the pool of runners seems limited.
            // Fallback to a known version if API access is rate limited.
            core.warning(`${error.message}

Failed to retrieve latest version; falling back to: ${fallbackVersion}`);
            return fallbackVersion;
        });
    }
    if (version.charAt(0) === 'v') {
        version = version.substr(1);
    }

    var path = tc.find("kubectl", version);
    if (!path) {
        const installPath = await downloadDoctl(version);
        path = await tc.cacheDir(installPath, 'doctl', version);
    }
    core.addPath(path);
    core.info(`>>> doctl version v${version} installed to ${path}`);

    var token = core.getInput('token', { required: true });
    await exec.exec('kubectl get nodes', [token]);
    core.info('>>> Successfully logged into doctl');
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run();
