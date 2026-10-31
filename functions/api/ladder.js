/* Pages Functions 适配层：把 worker/ladder.js 挂到站点同域 /api/ladder
   ---------------------------------------------------------
   ⚠️ 现在**不生效**，留作备用。
   本站托管在 GitHub Pages（hnyzbcs.de5.net 由 de5.net 反代加速），
   只有 Cloudflare Pages 才会执行这个目录，GitHub Pages 下
   /api/ladder 会走 404。等站点迁到 Cloudflare Pages 时，
   这里不用改任何代码，绑一个名为 LADDER 的 KV 就自动生效。

   为什么值得留着：同域没有跨域和 OPTIONS 预检，也不用赌
   *.workers.dev 在国内的可达性。

   前提：Pages 项目 → Settings → Functions → KV namespace bindings
        变量名必须叫 LADDER（worker/ladder.js 里写死了） */
import worker from "../../worker/ladder.js";

export const onRequest = (context) => worker.fetch(context.request, context.env);
