<script setup>
import { ref } from 'vue'
import { toolGroups } from '@/tools/registry'
import { clearAll, listKeys, usedBytes } from '@/utils/storage'

defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])

const confirmingClear = ref(false)

function onClearData() {
  clearAll()
  confirmingClear.value = false
  // 主题选择本身也存在 localStorage 里，被清掉后重新加载页面回到"跟随系统"
  location.reload()
}

// 只在真的存过东西时才显示"清空本地数据"，避免新用户看到一堆无用按钮
const hasData = ref(listKeys().length > 0)

function sizeText() {
  const b = usedBytes()
  return b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`
}
</script>

<template>
  <nav
    class="app-sidebar"
    :class="{ 'is-open': open }"
    aria-label="工具列表"
  >
    <div class="brand">
      <svg class="brand-icon" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill="var(--accent)" />
        <path
          d="M12.5 9.5 8 16l4.5 6.5M19.5 9.5 24 16l-4.5 6.5"
          fill="none"
          stroke="var(--fg-on-accent)"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span class="brand-name">AIToolsWeb</span>
      <button class="close-btn" aria-label="关闭工具列表" @click="emit('close')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <div class="groups">
      <section v-for="g in toolGroups" :key="g.name" class="group">
        <h2 class="group-title">{{ g.name }}</h2>
        <ul class="group-list">
          <li v-for="t in g.items" :key="t.id">
            <RouterLink :to="`/t/${t.id}`" class="item" :title="t.desc">
              <svg class="item-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  :d="t.icon"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span class="item-name">{{ t.name }}</span>
            </RouterLink>
          </li>
        </ul>
      </section>
    </div>

    <div class="foot">
      <p class="privacy">所有计算在本地浏览器完成，数据不会上传</p>
      <template v-if="hasData">
        <button v-if="!confirmingClear" class="foot-btn" @click="confirmingClear = true">
          清空本地数据（{{ sizeText() }}）
        </button>
        <div v-else class="confirm">
          <span>确定清空？</span>
          <button class="foot-btn danger" @click="onClearData">确定</button>
          <button class="foot-btn" @click="confirmingClear = false">取消</button>
        </div>
      </template>
    </div>
  </nav>
</template>

<style scoped>
.app-sidebar {
  width: var(--sidebar-w);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-elev);
  border-right: 1px solid var(--border);
}

/* ---------- 品牌区 ---------- */

.brand {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  height: var(--topbar-h);
  padding: 0 var(--sp-3);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.brand-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.brand-name {
  font-weight: 600;
  font-size: var(--fs-md);
  letter-spacing: -0.01em;
}

.close-btn {
  display: none;
  margin-left: auto;
  padding: var(--sp-1);
  border-radius: var(--radius-sm);
  color: var(--fg-muted);
}

.close-btn svg {
  width: 18px;
  height: 18px;
  display: block;
}

.close-btn:hover {
  background-color: var(--bg-hover);
  color: var(--fg);
}

/* ---------- 工具列表 ---------- */

.groups {
  flex: 1;
  overflow-y: auto;
  padding: var(--sp-3) var(--sp-2);
}

.group + .group {
  margin-top: var(--sp-4);
}

.group-title {
  padding: 0 var(--sp-2) var(--sp-1);
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--fg-subtle);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.group-list {
  list-style: none;
}

.item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2);
  border-radius: var(--radius);
  color: var(--fg-muted);
  font-size: var(--fs-base);
  text-decoration: none;
  transition: background-color var(--transition), color var(--transition);
}

.item:hover {
  background-color: var(--bg-hover);
  color: var(--fg);
  text-decoration: none;
}

/* vue-router 自动加的选中类，不需要手写 route.path 判断 */
.item.router-link-active {
  background-color: var(--accent-bg);
  color: var(--accent);
  font-weight: 500;
}

.item-icon {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
}

.item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------- 底部 ---------- */

.foot {
  flex-shrink: 0;
  padding: var(--sp-3);
  border-top: 1px solid var(--border);
}

.privacy {
  font-size: var(--fs-xs);
  line-height: 1.5;
  color: var(--fg-subtle);
}

.foot-btn {
  margin-top: var(--sp-2);
  margin-right: var(--sp-2);
  font-size: var(--fs-xs);
  color: var(--fg-muted);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.foot-btn:hover {
  color: var(--fg);
}

.foot-btn.danger {
  color: var(--danger);
}

.confirm {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  flex-wrap: wrap;
  margin-top: var(--sp-1);
  font-size: var(--fs-xs);
  color: var(--fg-muted);
}

/* ---------- 窄屏：变成抽屉 ---------- */

@media (max-width: 768px) {
  .app-sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 50;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    box-shadow: var(--shadow-md);
  }

  .app-sidebar.is-open {
    transform: translateX(0);
  }

  .close-btn {
    display: block;
  }
}
</style>
