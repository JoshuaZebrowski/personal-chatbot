import { spawn } from 'child_process';

function startServer(scriptFile) {
    return new Promise((resolve) => {
        const server = spawn('node', [scriptFile], {
            stdio: 'pipe'
        });

        let hasStarted = false;

        server.stdout.on('data', (data) => {
            const output = data.toString().trim();
            
            if (!hasStarted && (
                output.includes('running on') || 
                output.includes('Local:')
            )) {
                hasStarted = true;
                resolve(server);
            }
        });

        server.stderr.on('data', () => {
            // Ignore stderr output
        });

        // Timeout fallback
        setTimeout(() => {
            if (!hasStarted) {
                resolve(server);
            }
        }, 8000);
    });
}

async function main() {
    const apiServer = await startServer('cosmos-api-server.js');
    await new Promise(resolve => setTimeout(resolve, 2000));
    const frontendServer = await startServer('serve.js');

    console.log('servers running successfully');
    console.log('web application: http://localhost:8000/');

    // Graceful shutdown
    process.on('SIGINT', () => {
        apiServer.kill();
        frontendServer.kill();
        setTimeout(() => process.exit(0), 1000);
    });

    // Keep process alive
    await new Promise(() => {});
}

main().catch(() => {
    process.exit(1);
});