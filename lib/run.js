const request = require('./request');
const cljKondo = require('./clj_kondo');

const { GITHUB_SHA, GITHUB_EVENT_PATH, INPUT_GITHUB_TOKEN, GITHUB_WORKSPACE, GITHUB_REPOSITORY } = process.env;
const cljKondoArgs = process.env.LINT_ARGS;
const checkName = process.env.CHECK_NAME;

const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github.antiope-preview+json',
    Authorization: `Bearer ${INPUT_GITHUB_TOKEN}`,
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
        status: conclusion === 'in-progress' ? 'in_progress' : 'completed',
    };

    if (conclusion !== 'in-progress') {
        body.completed_at = new Date();
        body.conclusion = conclusion;
    }

    if (output) {
        body.output = output;
    }

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

function chunk(array, size) {
    if (!array) return [];
    const firstChunk = array.slice(0, size);
    if (!firstChunk.length) {
        return array;
    }
    return [firstChunk].concat(chunk(array.slice(size, array.length), size));
}

const annotationLevels = {
    info: "notice",
    warning: "warning",
    error: "failure"
};

async function run() {
    const id = await createCheck();
    try {
        let { exitCode, stdout, stderr } = await cljKondo(cljKondoArgs);
        if (exitCode === 2 || exitCode === 3) {
            for (const c of chunk(stdout.findings, 50)) {
                let annotations = [];
                for (const f of c) {
                    const { filename, level, type, col, row, message } = f;
                    annotations.push({
                        path: filename,
                        start_line: row,
                        end_line: row,
                        annotation_level: annotationLevels[level],
                        message: `[${type}] ${message}`
                    });
                }
                await updateCheck(id, 'in-progress', {
                    title: checkName,
                    summary: `linting took ${stdout.summary.duration}ms, errors: ${stdout.summary.error}, warnings: ${stdout.summary.warning}, info: ${stdout.summary.info}`,
                    annotations
                });
            }
            console.log(`clj-kondo detects some problems and exited with a non-zero code (${exitCode}). Please check founded problems at https://github.com/${GITHUB_REPOSITORY}/runs/${id}`);
            await updateCheck(id, 'failure', {
                title: checkName,
                summary: `linting took ${stdout.summary.duration}ms, errors: ${stdout.summary.error}, warnings: ${stdout.summary.warning}, info: ${stdout.summary.info}`,
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
