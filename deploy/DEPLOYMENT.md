# 部署说明

## 目标

把当前项目部署成公网可访问链接，让学生、家长或顾问通过浏览器直接打开使用。

## 推荐方案一：Render

1. 把项目推送到 GitHub
2. 登录 [Render](https://render.com/)
3. 新建 Web Service
4. 连接 GitHub 仓库
5. Render 会自动识别根目录 `render.yaml`
6. 配置环境变量：
   - `DATA_DIR`：推荐 `/var/data/gaokao`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `OPENAI_API_KEY`
   - `DEEPSEEK_API_KEY`
   - `DASHSCOPE_API_KEY`
   - `OPENAI_MODEL`
   - `DEEPSEEK_MODEL`
   - `DASHSCOPE_MODEL`
   - `DASHSCOPE_BASE_URL`
7. 部署完成后获得公网链接

默认后台账号建议只在首次启动时使用，部署后立即改为你自己的安全密码。

### 当前 Render 配置已包含

- 健康检查：`/api/health`
- Node 24
- 持久化磁盘：挂载到 `/var/data`
- 持久化数据目录：`/var/data/gaokao`

这意味着部署后以下内容可以持久保存：

- 后台登录用户与令牌
- 历史志愿记录
- 聊天记录
- 后台上传导入的真实 CSV
- 生成后的结构化数据

## 推荐方案二：Docker + 云服务器

```bash
docker build -t gaokao-planner-agent .
docker run -d -p 3001:3001 --env-file .env gaokao-planner-agent
```

然后把服务器 `3001` 端口通过 Nginx 反向代理到域名。

## 域名与 HTTPS

生产环境建议：

- 绑定域名
- 开启 HTTPS
- 使用 Nginx / Caddy 做反向代理

## 说明

本仓库已经支持：

- 前后端同端口托管
- 手机和电脑端响应式访问
- 公网环境直接访问
- 多模型环境变量切换
