(function () {
  'use strict';

  if (window.__bmVolumeStep5Loaded) return;
  window.__bmVolumeStep5Loaded = true;

  const FLAG_ATTR = 'data-bm-volume-step5';
  const STEP = 0.05;
  let keyDirection = 0;
  let clearDirectionTimer = 0;

  function isEnabled() {
    return document.documentElement?.getAttribute(FLAG_ATTR) !== '0';
  }

  function nextVolume(volume, direction) {
    if (!Number.isFinite(volume)) return volume;
    const currentStep = volume / STEP;
    const nextStep = direction > 0
      ? Math.floor(currentStep + 1e-5) + 1
      : Math.ceil(currentStep - 1e-5) - 1;
    const snapped = Math.round(Math.max(0, Math.min(1 / STEP, nextStep)) * STEP * 100) / 100;
    return snapped === 0 ? 0 : snapped - Number.EPSILON * 2;
  }

  function trackVolumeKey(event) {
    if (!isEnabled()) return;
    const path = event.composedPath();
    const musicVolumeSlider = location.hostname === 'music.youtube.com'
      ? path.find((node) => node instanceof Element && (
        node.id === 'volume-slider' || node.id === 'expand-volume-slider'
      ))
      : null;
    const musicPlayerBar = musicVolumeSlider
      ? path.find((node) => node instanceof Element && node.localName === 'ytmusic-player-bar')
      : null;
    const isRight = event.key === 'ArrowRight' || event.keyCode === 39;
    const isLeft = event.key === 'ArrowLeft' || event.keyCode === 37;
    if (musicVolumeSlider && (isRight || isLeft)) {
      const current = Number(musicVolumeSlider.value);
      if (Number.isFinite(current)) {
        const direction = isRight ? 1 : -1;
        const snapped = Math.round(nextVolume(current / 100, direction) * 100);
        event.preventDefault();
        event.stopImmediatePropagation();
        if (typeof musicPlayerBar?.updateVolume === 'function') {
          musicPlayerBar.updateVolume(snapped);
        }
      }
      return;
    }

    const onYouTubePlayer = location.hostname === 'www.youtube.com'
      && path.some((node) => node instanceof Element && node.id === 'movie_player');
    if (onYouTubePlayer && (event.key === 'ArrowUp' || event.keyCode === 38)) keyDirection = 1;
    else if (onYouTubePlayer && (event.key === 'ArrowDown' || event.keyCode === 40)) keyDirection = -1;
    else return;
    window.clearTimeout(clearDirectionTimer);
    clearDirectionTimer = window.setTimeout(() => { keyDirection = 0; }, 0);
  }

  function patchNativeVolumeSetter() {
    const prototype = window.HTMLMediaElement?.prototype;
    if (!prototype || prototype.__bmVolumeStep5SetterPatched) return;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'volume');
    if (!descriptor || typeof descriptor.get !== 'function' || typeof descriptor.set !== 'function') return;

    Object.defineProperty(prototype, 'volume', {
      ...descriptor,
      set(value) {
        if (keyDirection && isEnabled()) value = nextVolume(descriptor.get.call(this), keyDirection);
        descriptor.set.call(this, value);
      },
    });
    prototype.__bmVolumeStep5SetterPatched = true;
  }

  window.addEventListener('keydown', trackVolumeKey, true);
  patchNativeVolumeSetter();
})();
