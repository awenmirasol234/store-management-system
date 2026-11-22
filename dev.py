import os
import socket
import subprocess
import sys
import time
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
PORTS = (3001, 5173)


def check_port(port):
    socket_address = ("127.0.0.1", port)
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        server_socket.bind(socket_address)
    except OSError:
        return False
    finally:
        server_socket.close()
    return True


def stop_process(process):
    if process.poll() is not None:
        return

    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait()


def main():
    for port in PORTS:
        if not check_port(port):
            print("Port " + str(port) + " is already in use.")
            return 1

    backend_environment = os.environ.copy()
    backend_environment["PORT"] = "3001"
    backend_environment["DATABASE_PATH"] = "./data/store.db"
    backend_environment["UPLOADS_DIR"] = "./uploads"

    npm_command = "npm.cmd"
    if sys.platform != "win32":
        npm_command = "npm"

    processes = []
    try:
        processes.append(
            subprocess.Popen(
                [npm_command, "start"],
                cwd=BACKEND_DIR,
                env=backend_environment,
            )
        )
        processes.append(
            subprocess.Popen(
                [npm_command, "run", "dev"],
                cwd=FRONTEND_DIR,
            )
        )

        while True:
            for process in processes:
                if process.poll() is not None:
                    return process.returncode
            time.sleep(0.2)
    except KeyboardInterrupt:
        print("\nStopping development servers...")
        return 0
    finally:
        for process in processes:
            stop_process(process)


if __name__ == "__main__":
    raise SystemExit(main())
