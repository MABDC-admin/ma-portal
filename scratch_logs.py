import paramiko

host = "92.113.151.24"
user = "admin"
password = "Denskie123"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password, timeout=10)

stdin, stdout, stderr = ssh.exec_command("sudo -S docker logs --tail 50 ma-portal-frontend <<< 'Denskie123'")
import sys
sys.stdout.reconfigure(encoding='utf-8')
print(stdout.read().decode('utf-8', errors='ignore'))
print(stderr.read().decode('utf-8', errors='ignore'))

ssh.close()
