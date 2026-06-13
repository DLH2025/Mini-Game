/**
 * Offscreen Canvas Cache System
 * Pre-renders static game elements to improve performance
 */
class OffscreenCache {
    constructor() {
        this.caches = new Map();
        this.dirtyFlags = new Map();
    }

    // Create or get cached canvas for a key
    getCanvas(key, width, height) {
        if (!this.caches.has(key)) {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            this.caches.set(key, {
                canvas: canvas,
                ctx: canvas.getContext('2d'),
                width: width,
                height: height
            });
            this.dirtyFlags.set(key, true);
        }
        return this.caches.get(key);
    }

    // Mark a cache as dirty (needs redraw)
    markDirty(key) {
        this.dirtyFlags.set(key, true);
    }

    // Check if cache is dirty
    isDirty(key) {
        return this.dirtyFlags.get(key) || false;
    }

    // Clear dirty flag after drawing
    clearDirty(key) {
        this.dirtyFlags.set(key, false);
    }

    // Render to main canvas if dirty, otherwise use cached version
    render(ctx, key, drawFn, x = 0, y = 0) {
        const cache = this.caches.get(key);
        if (!cache) return;

        if (this.isDirty(key)) {
            drawFn(cache.ctx, cache.width, cache.height);
            this.clearDirty(key);
        }

        ctx.drawImage(cache.canvas, x, y);
    }

    // Render a portion of the cached canvas (for viewport culling)
    renderRegion(ctx, key, sx, sy, sw, sh, dx, dy) {
        const cache = this.caches.get(key);
        if (!cache) return;
        ctx.drawImage(cache.canvas, sx, sy, sw, sh, dx, dy, sw, sh);
    }

    // Clear all caches
    clear() {
        this.caches.clear();
        this.dirtyFlags.clear();
    }

    // Remove specific cache
    remove(key) {
        this.caches.delete(key);
        this.dirtyFlags.delete(key);
    }
}

// Global cache instance
const offscreenCache = new OffscreenCache();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OffscreenCache, offscreenCache };
}
