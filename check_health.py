import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('92.113.151.24', username='admin', password='Denskie123', timeout=10)
    
    def run(cmd):
        stdin, stdout, stderr = ssh.exec_command(cmd)
        return stdout.read().decode('utf-8', errors='replace').strip()
    
    print("=== SYSTEM LOAD & UPTIME ===")
    print(run("uptime"))
    
    print("\n=== MEMORY USAGE ===")
    print(run("free -m"))
    
    print("\n=== DISK SPACE ===")
    print(run("df -h /"))
    
    print("\n=== DOCKER CONTAINERS STATUS ===")
    print(run("echo 'Denskie123' | sudo -S docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"))
    
    ssh.close()
except Exception as e:
    print(f"Failed to connect or run commands: {e}")
