import { createRouter, createWebHashHistory } from 'vue-router'
import { tools, toolById, defaultToolId } from '@/tools/registry'

/**
 * 路由
 *
 * 为什么用 hash 模式（地址里带 #）而不是 history 模式：
 *
 *   GitHub Pages 是纯静态文件服务器，**没有任何 URL 重写能力**。
 *   history 模式下用户访问 /AIToolsWeb/t/json 或者在工具页按 F5，
 *   服务器会去找一个根本不存在的文件 /AIToolsWeb/t/json，直接返回 404。
 *
 *   hash 模式下地址是 /AIToolsWeb/#/t/json，井号后面的内容浏览器根本不会
 *   发给服务器，服务器永远只被请求 /AIToolsWeb/ 这一个真实存在的目录。
 *   所以刷新 404 的问题从根上就不存在。
 *
 * 为什么 createWebHashHistory() 不传参数：
 *   不传时，vue-router 会自动从 location.pathname 推导 base。
 *   部署在 /AIToolsWeb/ 下时 base 就是 /AIToolsWeb/，换成自定义域名时
 *   自动变成 /。同一份构建产物两边都能跑，不用改代码。
 */
const routes = [
  // 打开站点直接进入第一个工具，不做首页
  { path: '/', redirect: `/t/${defaultToolId}` },

  // 由注册表自动展开。新增工具不需要改这里
  ...tools.map((t) => ({
    path: `/t/${t.id}`,
    name: t.id,
    component: t.load,
    meta: { title: t.name, toolId: t.id },
  })),

  // 兜底：hash 里写了不认识的东西（比如以后改了路由结构的旧链接）时回到第一个工具
  { path: '/:pathMatch(.*)*', redirect: `/t/${defaultToolId}` },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// 每个工具单独设置页面标题。
// 不设的话所有工具的浏览器标签页标题都一样，同时开几个标签就没法区分了
router.afterEach((to) => {
  const tool = to.meta.toolId ? toolById.get(to.meta.toolId) : null
  document.title = tool ? `${tool.name} · AIToolsWeb` : 'AIToolsWeb · 开发者工具箱'
})
