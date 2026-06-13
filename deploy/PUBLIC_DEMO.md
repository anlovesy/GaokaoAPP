# 临时公网演示链接开关说明

## 适用场景

当你想临时把本机运行的高考志愿项目公开给别人访问，但又不想立刻购买服务器时，可以使用 Cloudflare 临时隧道。

这套方式适合：

- 临时演示
- 给朋友、家长、学生试看
- 内测

这套方式不适合正式长期生产，因为：

- 电脑必须保持开机
- 链接可能变化
- 隧道没有长期稳定性保证

## 一键开启

直接双击：

- `D:\agent\study\GaokaoApp\tools\start-public-demo.cmd`

脚本会做两件事：

1. 启动本地生产服务，端口 `3011`
2. 启动 Cloudflare 临时公网隧道

## 一键关闭

直接双击：

- `D:\agent\study\GaokaoApp\tools\stop-public-demo.cmd`

## 如何查看公网链接

开启后，打开这个日志文件：

- `D:\agent\study\GaokaoApp\tools\cloudflared-public.log`

里面会有一条类似这样的地址：

```text
https://xxxxxx.trycloudflare.com
```

这就是可以发给别人访问的公网链接。

## 如何自定义后台账号密码

默认脚本里给的是演示用途账号密码，正式对外演示前，建议你先在命令行里设置自己的强密码：

```powershell
$env:GAOKAO_DEMO_ADMIN_USERNAME="your_admin"
$env:GAOKAO_DEMO_ADMIN_PASSWORD="your_strong_password"
cmd /c D:\agent\study\GaokaoApp\tools\start-public-demo.cmd
```

如果你直接双击脚本而没有先设置环境变量，脚本会使用内置演示账号：

- 用户名默认会使用 `LYYzhiyuan`
- 但密码不会自动给默认值

也就是说，若你没有先设置 `GAOKAO_DEMO_ADMIN_PASSWORD`，脚本会直接提示并停止，避免把弱密码公开到外网。

## 常见问题

### 1. 为什么链接打不开？

常见原因：

- 本机电脑休眠或关机
- 本地服务没有启动成功
- Cloudflare 临时隧道失效

可检查：

- `D:\agent\study\GaokaoApp\tools\project-server-public.log`
- `D:\agent\study\GaokaoApp\tools\cloudflared-public.log`

### 2. 为什么每次链接都不一样？

因为这是临时隧道，不是固定域名。

### 3. 能不能长期商用？

不建议。长期商用建议改成：

- 腾讯云轻量服务器
- 阿里云 ECS
- 其他正式托管方案
