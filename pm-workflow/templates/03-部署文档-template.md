# 项目部署文档

> **模板说明**：本模板用于 Phase5 上线阶段，指导运维或开发人员进行项目部署。请根据实际部署环境填写，删除或替换所有 `[占位符]` 内容。确保部署步骤真实可执行，关键配置不遗漏。

---

## 一、部署环境要求

### 1.1 服务器配置

| 项目 | 最低配置 | 推荐配置 |
|------|----------|----------|
| CPU | [N] 核 | [N] 核 |
| 内存 | [N] GB | [N] GB |
| 硬盘 | [N] GB SSD | [N] GB SSD |
| 操作系统 | [如 Ubuntu 20.04 / CentOS 7] | [推荐版本] |
| 带宽 | [N] Mbps | [N] Mbps |

### 1.2 软件依赖

| 软件 | 版本要求 | 用途 | 安装命令 |
|------|----------|------|----------|
| Node.js | >= [版本] | [运行时] | `[安装命令]` |
| Nginx | >= [版本] | [反向代理 / 静态文件服务] | `[安装命令]` |
| [数据库名称] | >= [版本] | [数据存储] | `[安装命令]` |
| [其他依赖] | >= [版本] | [用途] | `[安装命令]` |
| Git | >= [版本] | [代码拉取] | `[安装命令]` |
| PM2（如适用） | >= [版本] | [进程管理] | `[安装命令]` |

### 1.3 网络要求

| 项目 | 说明 |
|------|------|
| 开放端口 | [80, 443, 22, 以及其他需要的端口] |
| 防火墙规则 | [需要放行的 IP 或端口规则] |
| 外网访问 | [是/否，说明哪些服务需要外网访问] |

---

## 二、部署步骤

### 2.1 环境准备

```bash
# 1. 更新系统
sudo apt update && sudo apt upgrade -y

# 2. 安装必要软件
# 以 Ubuntu 为例，请根据实际情况调整
sudo apt install -y git curl nginx
```

```bash
# 3. 安装 Node.js（使用 nvm 管理版本）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install [版本号]
nvm use [版本号]
```

```bash
# 4. 安装 PM2（如适用）
npm install -g pm2
```

### 2.2 代码部署

```bash
# 1. 创建项目目录
sudo mkdir -p /var/www/[项目名称]
sudo chown -R $USER:$USER /var/www/[项目名称]

# 2. 克隆代码
cd /var/www/[项目名称]
git clone [仓库地址] .

# 3. 切换到指定版本
git checkout [版本号或分支]

# 4. 安装依赖
npm install --production

# 5. 构建项目
npm run build
```

### 2.3 配置环境变量

```bash
# 创建 .env 文件
cat > .env << 'EOF'
[VARIABLE_NAME]=[value]
[VARIABLE_NAME]=[value]
EOF
```

### 2.4 启动服务

```bash
# 使用 PM2 启动（如适用）
pm2 start npm --name "[项目名称]" -- start

# 设置开机自启
pm2 startup
pm2 save
```

```bash
# 或直接使用 Nginx 托管静态文件
# 后续在 Nginx 配置章节说明
```

### 2.5 验证部署

```bash
# 检查服务状态
pm2 status

# 检查端口监听
sudo netstat -tlnp | grep [端口号]

# 本地访问测试
curl http://localhost:[端口号]
```

---

## 三、配置文件说明

### 3.1 Nginx 配置

```nginx
# 文件路径：/etc/nginx/sites-available/[项目名称]
server {
    listen 80;
    server_name [域名] www.[域名];

    # 静态文件目录
    root /var/www/[项目名称]/dist;
    index index.html;

    # 日志
    access_log /var/log/nginx/[项目名称]-access.log;
    error_log  /var/log/nginx/[项目名称]-error.log;

    # SPA 路由支持（如适用）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # API 反向代理（如适用）
    location /api/ {
        proxy_pass http://localhost:[后端端口号]/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;
}
```

```bash
# 启用站点配置
sudo ln -s /etc/nginx/sites-available/[项目名称] /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重新加载 Nginx
sudo systemctl reload nginx
```

### 3.2 环境变量说明

| 变量名 | 说明 | 示例值 | 是否必填 | 敏感信息 |
|--------|------|--------|----------|----------|
| `[VARIABLE_1]` | [说明] | `[值]` | 是 | 否 |
| `[VARIABLE_2]` | [说明] | `[值]` | 是 | 是（需加密存储） |
| `[VARIABLE_3]` | [说明] | `[值]` | 否 | 否 |

---

## 四、域名与 SSL 配置

### 4.1 域名信息

| 域名 | 用途 | DNS 解析目标 |
|------|------|--------------|
| `[www.example.com]` | 生产环境 | [服务器 IP 或 CNAME] |
| `[api.example.com]` | API 服务 | [服务器 IP] |
| `[dev.example.com]` | 开发/测试环境 | [服务器 IP] |

### 4.2 SSL 证书配置（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 申请证书
sudo certbot --nginx -d [域名] -d www.[域名]

# 证书自动续期（已自动配置）
sudo certbot renew --dry-run
```

### 4.3 HTTPS 强制跳转

Nginx 配置中已包含 SSL 配置后，添加以下规则：

```nginx
server {
    listen 80;
    server_name [域名] www.[域名];
    return 301 https://$server_name$request_uri;
}
```

---

## 五、监控与告警

### 5.1 监控指标

| 监控项 | 监控方式 | 告警阈值 | 告警通知方式 |
|--------|----------|----------|--------------|
| 服务可用性 | [如 UptimeRobot / 阿里云云监控] | 连续 [N] 次不可用 | [邮件 / 短信 / 钉钉 / 飞书] |
| CPU 使用率 | [如 Prometheus / 云监控] | > [80%] 持续 [N] 分钟 | [通知方式] |
| 内存使用率 | [监控方式] | > [80%] 持续 [N] 分钟 | [通知方式] |
| 磁盘使用率 | [监控方式] | > [85%] | [通知方式] |
| 接口响应时间 | [监控方式] | > [N] ms | [通知方式] |
| 错误日志 | [监控方式] | 出现 [ERROR] 级别日志 | [通知方式] |
| SSL 证书到期 | [监控方式] | 到期前 [N] 天 | [通知方式] |

### 5.2 日志管理

```bash
# 日志文件位置
/var/log/nginx/[项目名称]-access.log    # Nginx 访问日志
/var/log/nginx/[项目名称]-error.log     # Nginx 错误日志
~/.pm2/logs/[项目名称]-out.log          # 应用输出日志
~/.pm2/logs/[项目名称]-error.log        # 应用错误日志
```

```bash
# 日志轮转配置（/etc/logrotate.d/[项目名称]）
/var/log/nginx/[项目名称]-*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
    endscript
}
```

---

## 六、备份与恢复

### 6.1 备份策略

| 备份内容 | 备份频率 | 保留份数 | 备份位置 |
|----------|----------|----------|----------|
| 数据库 | [每日] | [7] 份 | [备份路径或云存储] |
| 配置文件 | [每次变更] | [5] 份 | [备份路径] |
| 静态资源 | [每周] | [4] 份 | [备份路径] |

### 6.2 恢复步骤

```bash
# 1. 停止服务
pm2 stop [项目名称]

# 2. 恢复数据
[恢复命令]

# 3. 重启服务
pm2 start [项目名称]
```

---

## 七、回滚方案

### 7.1 快速回滚步骤

```bash
# 1. 进入项目目录
cd /var/www/[项目名称]

# 2. 回退到上一个版本
git checkout [上一个稳定版本 tag]

# 3. 重新安装依赖（如有变更）
npm install --production

# 4. 重新构建
npm run build

# 5. 重启服务
pm2 restart [项目名称]
```

### 7.2 回滚决策条件

- 核心功能不可用，影响 [N]% 以上用户
- 出现严重安全漏洞
- 数据出现错误或丢失
- 页面完全无法加载

---

## 八、常见问题排查

### Q1：服务启动失败
**排查步骤**：
1. 检查端口是否被占用：`sudo netstat -tlnp | grep [端口]`
2. 检查环境变量是否配置正确：`cat .env`
3. 查看错误日志：`pm2 logs [项目名称] --err`

### Q2：页面 404
**排查步骤**：
1. 检查 Nginx 配置中 root 路径是否正确
2. 确认构建产物目录是否存在：`ls /var/www/[项目名称]/dist`
3. 检查 Nginx try_files 配置

### Q3：API 请求失败
**排查步骤**：
1. 检查后端服务是否运行：`pm2 status`
2. 检查 Nginx 反向代理配置
3. 检查防火墙是否放行对应端口

---

> **填写完成检查**：确认部署步骤已在新环境实际验证通过，域名和 SSL 配置正确，监控告警已配置生效，回滚方案可行。