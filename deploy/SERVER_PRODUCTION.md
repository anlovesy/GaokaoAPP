# 正式服务器部署方案

## 适用场景

如果你准备把项目长期给广东考生、家长或顾问使用，建议尽快从临时公网演示升级到正式服务器。

这套方案更适合：

- 长期稳定访问
- 多用户后台管理
- 历史记录长期保存
- 后续绑定域名和 HTTPS

## 推荐路线

优先建议：

1. 腾讯云轻量应用服务器
2. 阿里云 ECS

最低建议规格：

- 2 vCPU
- 2 GB 内存
- 40 GB 系统盘

## 服务器端部署步骤

### 1. 安装 Node.js

建议 Node 24。

### 2. 拉取仓库

```bash
git clone https://github.com/anlovesy/GaokaoAPP.git
cd GaokaoAPP
```

### 3. 安装依赖并构建

```bash
npm install
npm run build
```

### 4. 配置环境变量

建议在服务器上新建 `.env`：

```env
PORT=3001
DATA_DIR=/data/gaokao
ADMIN_USERNAME=LYYzhiyuan
ADMIN_PASSWORD=请改成你自己的强密码

OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5

DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash

DASHSCOPE_API_KEY=
DASHSCOPE_MODEL=qwen-plus
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
```

### 5. 创建数据目录

```bash
mkdir -p /data/gaokao
```

### 6. 启动服务

```bash
npm start
```

## 推荐使用 PM2 守护

安装：

```bash
npm install -g pm2
```

启动：

```bash
pm2 start server/index.js --name gaokao-app
pm2 save
pm2 startup
```

## 反向代理

建议用 Nginx 把公网域名代理到 `3001`。

示例：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## HTTPS

建议使用：

- Let's Encrypt
- 或云厂商负载均衡 / CDN 证书

## 上线后重点检查

1. 首页是否可正常访问
2. `/api/health` 是否返回 `ok: true`
3. `/api/meta/data-status` 是否识别到广东 2025 数据
4. 后台管理员是否可登录
5. 多用户创建、改密、删除是否正常
6. 聊天式 AI 顾问是否成功接入模型
