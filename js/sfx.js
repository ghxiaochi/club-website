/* =========================================================
   HNYZ · 音效
   ---------------------------------------------------------
   素材来自 Anuken 的音游 Animdustry（assets/sounds 与
   assets/music），已转成单声道 MP3（兼容 iOS）并压到 300KB 左右。
   浏览器要求先有用户操作才允许播放，所以全部由点击触发。
   开关状态存在 localStorage：hnyz:sound
   ========================================================= */

(() => {
  "use strict";

  const SRC = {
    hover: "audio/jump.mp3",
    click: "audio/pat.mp3",
    locked: "audio/hit.mp3",
    back: "audio/back.mp3",
    view: "audio/view.mp3"
  };

  const KEY = "hnyz:sound";
  const pools = {};

  let enabled = true;
  try {
    enabled = window.localStorage.getItem(KEY) !== "off";
  } catch (error) {
    /* 隐私模式：默认开 */
  }

  function pool(name) {
    if (!pools[name]) {
      const src = SRC[name];
      /* reveal 是一段小音乐，只留一个；其余留 4 个用来叠着播 */
      const size = name === "reveal" ? 1 : 3;
      pools[name] = Array.from({ length: size }, () => {
        const audio = new Audio(src);
        audio.preload = "auto";
        return audio;
      });
    }
    return pools[name];
  }

  function play(name, options) {
    if (!enabled || !SRC[name]) return null;

    const opts = options || {};
    const list = pool(name);
    const audio = list.find((item) => item.paused || item.ended) || list[0];

    try {
      audio.volume = typeof opts.volume === "number" ? opts.volume : 0.3;
      audio.playbackRate = typeof opts.rate === "number" ? opts.rate : 1;
      /* 元数据还没到就设 currentTime 会抛错，也会打断加载 */
      if (audio.readyState >= 1) audio.currentTime = 0;
      const promise = audio.play();
      if (promise && typeof promise.catch === "function") promise.catch(() => {});
    } catch (error) {
      /* 忽略 */
    }

    return audio;
  }

  function stop(name) {
    (pools[name] || []).forEach((audio) => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (error) {
        /* 忽略 */
      }
    });
  }

  function sync() {
    document.querySelectorAll("[data-sound-toggle]").forEach((button) => {
      button.setAttribute("aria-pressed", String(enabled));
      button.classList.toggle("is-muted", !enabled);
      button.setAttribute("aria-label", enabled ? "关闭音效" : "打开音效");
      button.setAttribute("title", enabled ? "关闭音效" : "打开音效");
    });
  }

  function setEnabled(value) {
    enabled = Boolean(value);

    try {
      window.localStorage.setItem(KEY, enabled ? "on" : "off");
    } catch (error) {
      /* 忽略 */
    }

    if (!enabled) Object.keys(pools).forEach(stop);
    sync();
  }

  /* 第一次按下时把常用的几个音效先拉下来，避免第一声延迟 */
  function prime() {
    ["click", "hover", "locked", "back", "view"].forEach((name) => {
      pool(name).forEach((audio) => {
        try {
          audio.load();
        } catch (error) {
          /* 忽略 */
        }
      });
    });
  }

  document.addEventListener("pointerdown", prime, { once: true, passive: true });
  document.addEventListener("keydown", prime, { once: true });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-sound-toggle]");
    if (!button) return;
    setEnabled(!enabled);
    if (enabled) play("select", { volume: 0.22 });
  });

  sync();
  window.addEventListener("load", sync);

  window.HNYZ_SFX = {
    play,
    stop,
    isEnabled: () => enabled,
    setEnabled
  };
})();
