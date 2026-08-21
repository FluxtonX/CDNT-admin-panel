// Browser Desktop Notifications and Web Audio Chime Utility

class NotificationSound {
  private audioCtx: AudioContext | null = null;
  private isUnlocked: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      const unlockAudio = () => {
        try {
          this.getAudioContext();
          if (this.audioCtx && this.audioCtx.state === "suspended") {
            this.audioCtx.resume();
          }
          this.isUnlocked = true;
          window.removeEventListener("click", unlockAudio);
          window.removeEventListener("keydown", unlockAudio);
          window.removeEventListener("touchstart", unlockAudio);
        } catch {
          // ignore
        }
      };
      window.addEventListener("click", unlockAudio, { passive: true });
      window.addEventListener("keydown", unlockAudio, { passive: true });
      window.addEventListener("touchstart", unlockAudio, { passive: true });
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Plays a pleasant 2-tone melodic notification chime (Apple/Slack style)
   */
  public play(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Note 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.3, now + 0.03);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.36);

      // Note 2: 880 Hz (A5) slightly higher & vibrant
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, now + 0.12);

      gain2.gain.setValueAtTime(0, now + 0.12);
      gain2.gain.linearRampToValueAtTime(0.35, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.12);
      osc2.stop(now + 0.66);
    } catch (e) {
      console.warn("Could not play notification audio:", e);
    }
  }
}

export const soundManager = new NotificationSound();

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch {
    return Notification.permission;
  }
}

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

export interface DesktopNotificationOptions {
  title: string;
  body: string;
  tag?: string;
  onClick?: () => void;
  playSound?: boolean;
}

export function sendDesktopNotification({
  title,
  body,
  tag,
  onClick,
  playSound = true,
}: DesktopNotificationOptions): void {
  if (typeof window === "undefined") return;

  // 1. Play audible sound chime
  if (playSound) {
    soundManager.play();
  }

  // 2. Display native OS Desktop Notification if permission is granted
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const notification = new Notification(title, {
        body,
        icon: "/favicon.ico",
        tag: tag || "cdnt-admin-alert",
      });

      if (onClick) {
        notification.onclick = (e) => {
          e.preventDefault();
          window.focus();
          onClick();
          notification.close();
        };
      }
    } catch (err) {
      console.warn("Error displaying desktop notification:", err);
    }
  }
}
