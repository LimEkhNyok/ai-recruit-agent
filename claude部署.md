# Claude Code 部署指南

> 本文件是 Claude Code 更新代码到 AWS 服务器的操作手册。
> 用户说"更新到服务器"/"部署"时，按此文件执行。

---

## 服务器信息

| 项目 | 值 |
|------|-----|
| 服务器 IP | `13.214.147.27` |
| SSH 用户 | `ubuntu` |
| SSH 密钥 | `D:\BrowserDownload\database-5-key.pem` |
| 项目路径（服务器） | `/home/ubuntu/ai-recruit-agent` |
| 项目路径（本地） | `C:\Users\72409\Desktop\ai-recruit-agent` |
| Git 远程仓库 | `git@github.com:LimEkhNyok/ai-recruit-agent.git` |
| 后端服务名 | `ai-recruit-backend`（systemd） |
| 前端产物目录 | `frontend/dist/` |

---

## SSH 命令模板

所有服务器操作通过以下方式执行：

```bash
ssh -i "D:\BrowserDownload\database-5-key.pem" -o StrictHostKeyChecking=no ubuntu@13.214.147.27 "命令"
```

多条命令用 `&&` 连接，或用引号包裹整段 bash。

---

## 部署流程

### 第一步：判断改动范围

通过 `git diff --name-only` 或 `git status` 判断本次改动涉及哪些目录：

- **只改了 `backend/`** → 执行：推送 → 服务器拉取 → 重启后端
- **只改了 `frontend/`** → 执行：推送 → 本地构建前端 → SCP 上传 dist → 服务器修复权限
- **前后端都改了** → 执行以上全部步骤
- **改了 `backend/requirements.txt`** → 额外执行：服务器安装依赖
- **改了 `backend/alembic/`** → 额外执行：服务器运行数据库迁移

### 第二步：提交并推送到 GitHub

> 提交前必须询问用户确认，且不以 Claude Code 身份提交（不加 Co-Authored-By）。

```bash
git add 具体文件列表
git commit -m "用户确认的提交信息"
git push origin main
```

### 第三步：服务器拉取代码

```bash
ssh -i "D:\BrowserDownload\database-5-key.pem" -o StrictHostKeyChecking=no ubuntu@13.214.147.27 "cd ~/ai-recruit-agent && git pull"
```

### 第四步：按需执行后端更新

**如果 `requirements.txt` 有变化：**

```bash
ssh -i "D:\BrowserDownload\database-5-key.pem" -o StrictHostKeyChecking=no ubuntu@13.214.147.27 "cd ~/ai-recruit-agent/backend && source venv/bin/activate && pip install -r requirements.txt"
```

**如果有新的数据库迁移（alembic 目录有变化）：**

```bash
ssh -i "D:\BrowserDownload\database-5-key.pem" -o StrictHostKeyChecking=no ubuntu@13.214.147.27 "cd ~/ai-recruit-agent/backend && source venv/bin/activate && alembic upgrade head"
```

**重启后端服务：**

```bash
ssh -i "D:\BrowserDownload\database-5-key.pem" -o StrictHostKeyChecking=no ubuntu@13.214.147.27 "sudo systemctl restart ai-recruit-backend"
```

### 第五步：按需执行前端更新

**本地构建前端（服务器内存不足，必须在本地构建）：**

```bash
cd /c/Users/72409/Desktop/ai-recruit-agent/frontend && npm run build
```

**SCP 上传构建产物到服务器：**

```bash
scp -i "D:\BrowserDownload\database-5-key.pem" -o StrictHostKeyChecking=no -r "C:\Users\72409\Desktop\ai-recruit-agent\frontend\dist" ubuntu@13.214.147.27:~/ai-recruit-agent/frontend/
```

**修复文件权限（否则 Nginx 无法读取，报 500）：**

```bash
ssh -i "D:\BrowserDownload\database-5-key.pem" -o StrictHostKeyChecking=no ubuntu@13.214.147.27 "chmod -R 755 /home/ubuntu/ai-recruit-agent/frontend/dist"
```

### 第六步：验证部署

**验证后端：**

```bash
ssh -i "D:\BrowserDownload\database-5-key.pem" -o StrictHostKeyChecking=no ubuntu@13.214.147.27 "curl -s http://127.0.0.1:8000/api/health"
```

期望返回包含 `"status":"ok"` 的 JSON。

**验证后端服务状态：**

```bash
ssh -i "D:\BrowserDownload\database-5-key.pem" -o StrictHostKeyChecking=no ubuntu@13.214.147.27 "sudo systemctl status ai-recruit-backend --no-pager -l"
```

期望看到 `active (running)`。

---

## 故障排查

**后端启动失败时，查看日志：**

```bash
ssh -i "D:\BrowserDownload\database-5-key.pem" -o StrictHostKeyChecking=no ubuntu@13.214.147.27 "sudo journalctl -u ai-recruit-backend --since '5 min ago' --no-pager"
```

**Nginx 报错时，查看日志：**

```bash
ssh -i "D:\BrowserDownload\database-5-key.pem" -o StrictHostKeyChecking=no ubuntu@13.214.147.27 "sudo tail -30 /var/log/nginx/error.log"
```

**git pull 冲突时：**

先告知用户服务器上有未提交的修改，询问是否丢弃后再执行：

```bash
ssh -i "D:\BrowserDownload\database-5-key.pem" -o StrictHostKeyChecking=no ubuntu@13.214.147.27 "cd ~/ai-recruit-agent && git checkout -- . && git pull"
```

---

## 注意事项

1. **提交 git 前必须询问用户**，确认提交信息和文件范围
2. **不以 Claude Code 身份提交**，不加 Co-Authored-By 签名
3. **前端必须在本地构建**，服务器只有 1GB 内存会 OOM
4. **SCP 上传后必须修复权限**，否则 Nginx 报 500
5. **不要用 `git add .`**，避免提交 `.env` 等敏感文件
6. 部署完成后告知用户访问 `http://13.214.147.27` 验证
