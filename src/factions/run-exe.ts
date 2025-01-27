import { spawn } from "child_process";

export async function runProcess(command: string, args: string[]) {
    return new Promise<void>((resolve, reject) => {
        const process = spawn(command, args, { stdio: "inherit" });

        process.on("close", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Process exited with code ${code}`));
            }
        });

        process.on("error", (err) => {
            reject(err);
        });
    });
}
