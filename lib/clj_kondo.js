const { spawn } = require( 'child_process' );

async function cljKondo() {
    return new Promise((resolve, reject) => {
        let result = {};
        const kondo = spawn('clj-kondo', [...arguments, '--config', '{:output {:format :json}}']);
        kondo.stdout.on('data', data => {
            result.stdout = JSON.parse(`${data}`);
        });
        kondo.stderr.on('data', data => {
            result.stderr = `${data}`;
        });
        kondo.on('close', code => {
            result.exitCode = code;
            resolve(result);
        });
    });
}

module.exports = cljKondo;
