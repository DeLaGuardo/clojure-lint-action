const request = require('./request');
const cljKondo = require('./clj_kondo');

const { GITHUB_SHA, GITHUB_EVENT_PATH, GITHUB_WORKSPACE, GITHUB_REPOSITORY, ACTIONS_RUNTIME_TOKEN } = process.env;
const cljKondoArgs = process.argv.slice(2);
const checkName = 'clj-kondo check';

const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github.antiope-preview+json',
    Authorization: `Bearer ${ACTIONS_RUNTIME_TOKEN}`,
    'User-Agent': 'clojure-lint-action'
};

async function createCheck() {
    const body = {
        name: checkName,
        head_sha: GITHUB_SHA,
        status: 'in_progress',
        started_at: new Date()
    };

    const { data } = await request(`https://api.github.com/repos/${GITHUB_REPOSITORY}/check-runs`, {
        method: 'POST',
        headers,
        body
    });
    const { id } = data;
    return id;
}

async function updateCheck(id, conclusion, output) {
    const body = {
        name: checkName,
        head_sha: GITHUB_SHA,
        status: 'completed',
        completed_at: new Date(),
        conclusion,
        output
    };

    await request(`https://api.github.com/repos/${GITHUB_REPOSITORY}/check-runs/${id}`, {
        method: 'PATCH',
        headers,
        body
    });
}

function exitWithError(err) {
    console.error('Error', err.stack);
    if (err.data) {
        console.error(err.data);
    }
    process.exit(1);
}

async function run() {
    const id = await createCheck();
    try {
        let { exitCode, stdout, stderr } = await cljKondo(...cljKondoArgs);
        if (exitCode === 2 || exitCode === 3) {
            let annotations = [];
            for (const f in stdout.findings) {
                const { filename, level, type, col, row, message } = f;
                annotations.push({
                    filename,
                    start_line: row,
                    end_line: row,
                    annotation_level: level,
                    message: `[${type}] ${message}`
                });
            }
            await updateCheck(id, 'failure', {
                title: checkName,
                summay: stdout.summary,
                annotations
            });
            process.exit(78);
        } else if (exitCode == 0) {
            await updateCheck(id, 'success');
            process.exit(0);
        } else {
            let err = new Error("Failed to run clj-kondo");
            err.data = stderr;
            throw err;
        }
    } catch (err) {
        await updateCheck(id, 'failure');
        exitWithError(err);
    }
}

run().catch(exitWithError);
