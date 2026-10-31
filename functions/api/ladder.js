/* Pages Functions 适配层：把 worker/ladder.js 挂到站点同域
   ---------------------------------------------------------
   路由：/api/ladder（GET 取榜，POST 交成绩）
   好处：
     · 同域 → 没有跨域、没有 OPTIONS 预检
     · 国内可达性和主站完全一致，不用赌 *.workers.dev
     · 逻辑只有 worker/ladder.js 一份，独立 Worker 的部署方式也还能用

   前提：Pages 项目里把 KV 命名空间绑成 LADDER
   （Settings → Functions → KV namespace bindings） */
import worker from "../../worker/ladder.js";

export const onRequest = (context) => worker.fetch(context.request, context.env);
