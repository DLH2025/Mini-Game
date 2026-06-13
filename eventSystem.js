/**
 * Event System - Publish/Subscribe pattern
 * Decouples game systems for better maintainability
 */
class EventSystem {
    constructor() {
        this.listeners = new Map();
        this.onceListeners = new Map();
    }

    // Subscribe to an event
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    // Subscribe to an event once
    once(event, callback) {
        if (!this.onceListeners.has(event)) {
            this.onceListeners.set(event, []);
        }
        this.onceListeners.get(event).push(callback);
    }

    // Unsubscribe from an event
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
        if (this.onceListeners.has(event)) {
            const callbacks = this.onceListeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    // Emit an event with data
    emit(event, data = {}) {
        // Regular listeners
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`Event listener error for ${event}:`, e);
                }
            });
        }

        // Once listeners
        if (this.onceListeners.has(event)) {
            const callbacks = this.onceListeners.get(event);
            this.onceListeners.delete(event);
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`Once event listener error for ${event}:`, e);
                }
            });
        }
    }

    // Remove all listeners for an event
    removeAll(event) {
        this.listeners.delete(event);
        this.onceListeners.delete(event);
    }

    // Get listener count for debugging
    listenerCount(event) {
        const regular = this.listeners.has(event) ? this.listeners.get(event).length : 0;
        const once = this.onceListeners.has(event) ? this.onceListeners.get(event).length : 0;
        return regular + once;
    }
}

// Global event system instance
const eventSystem = new EventSystem();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EventSystem, eventSystem };
}
