const { spawn } = require( 'child_process' );
const spawnargs = require('./spawnargs');

async function cljKondo(argString) {
    let args = spawnargs(argString);
    return new Promise((resolve, reject) => {
        let result = {
            stdout: "",
            stderr: "",
            statusCode: null
        };
        const kondo = spawn('clj-kondo',
                            [...args],
                            {
                                shell: true
                            });
        kondo.stdout.on('data', data => {
            result.stdout += data.toString();
        });
        kondo.stderr.on('data', data => {
            result.stderr += data.toString();
        });
        kondo.on('close', code => {
            result.exitCode = code;
            result.stdout = JSON.parse(result.stdout);
            resolve(result);
        });
    });
}

module.exports = cljKondo;
