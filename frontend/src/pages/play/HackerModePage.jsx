import React, { useState, useEffect, useRef } from "react";
import "./HackerModePage.css";

const SOURCE_CODE = `
#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>
#include <linux/fs.h>
#include <linux/uaccess.h>

#define DEVICE_NAME "nexus_core"
#define BUF_LEN 1024

static int device_open(struct inode *, struct file *);
static int device_release(struct inode *, struct file *);
static ssize_t device_read(struct file *, char *, size_t, loff_t *);
static ssize_t device_write(struct file *, const char *, size_t, loff_t *);

static int major_num;
static int device_open_count = 0;
static char msg_buffer[BUF_LEN];
static char *msg_ptr;

static struct file_operations fops = {
    .read = device_read,
    .write = device_write,
    .open = device_open,
    .release = device_release
};

static int __init nexus_init(void) {
    printk(KERN_INFO "NexusCore: Initializing system sandbox terminal...\\n");
    major_num = register_chrdev(0, DEVICE_NAME, &fops);
    if (major_num < 0) {
        printk(KERN_ALERT "NexusCore: Failed to register a major number %d\\n", major_num);
        return major_num;
    }
    printk(KERN_INFO "NexusCore: Registered successfully with major number %d\\n", major_num);
    return 0;
}

static void __exit nexus_exit(void) {
    unregister_chrdev(major_num, DEVICE_NAME);
    printk(KERN_INFO "NexusCore: Sandbox terminal module unloaded.\\n");
}

/* System Boot Log Simulation */
[    0.000000] Booting Linux on physical CPU 0x0
[    0.000000] Linux version 6.1.0-21-amd64 (debian-kernel@lists.debian.org)
[    0.000000] Command line: BOOT_IMAGE=/vmlinuz-6.1.0-21-amd64 root=UUID=8d2e-4b9a ro quiet
[    0.072841] x86/fpu: Supporting XSAVE feature 0x001: 'x87 floating point registers'
[    0.072895] x86/fpu: Supporting XSAVE feature 0x002: 'SSE registers'
[    0.072942] x86/fpu: Supporting XSAVE feature 0x004: 'AVX registers'
[    0.410928] ACPI: Core revision 20221020
[    0.732912] SCSI subsystem initialized
[    0.841928] libata version 3.00 loaded.
[    1.129381] EXT4-fs (sda2): mounted filesystem with ordered data mode. Opts: (null). Quota mode: none.
[    1.503928] systemd[1]: Inserted module 'autofs4'
[    1.902918] systemd[1]: Reached target Local File Systems.
[    2.120392] systemd[1]: Starting LSB: VirtualBox Additions service...
[    2.381928] nexus-daemon[412]: Connecting to Central Gateway tnhub.kr:443...
[    2.791823] nexus-daemon[412]: SSL handshake completed. AES-256-GCM.
[    3.102918] nexus-daemon[412]: INITIALIZING PRIVATE SANDBOX CONTEXT [OK]
[    3.491029] nexus-daemon[412]: EXPORTING TERMINAL NEXUS SHELL BINDINGS [OK]
[    3.819208] EXT4-fs (sda2): re-mounted. Opts: errors=remount-ro
[    4.119280] udevd[431]: starting version 252.22-1~deb12u1
[    4.492102] EXT4-fs (sda2): mounting detected custom workspace system [OK]
[    4.892019] audit: type=1400 audit(1716310239.019:2): lsm=apparmor res=1
[    5.110291] IPv6: ADDRCONF(NETDEV_CHANGE): eth0: link becomes ready
[    5.390192] docker0: port 1(veth01) entered blocking state
[    5.789208] docker0: port 1(veth01) entered forwarding state
[    6.110291] SYSTEM RUNLEVEL 5: MULTIUSER GRAPHICAL DESKTOP ENVIRONMENT [OK]
[    6.481902] TERMINAL NEXUS KERNEL STACK MODULE SUCCESSFUL BINDINGS
[    6.901823] WARNING: STACK BOUNDARY VERIFICATION INCOMPLETE, BYPASS ATTEMPT DETECTED
`;

const HackerModePage = () => {
  const [displayText, setDisplayText] = useState("TERMINAL NEXUS v2.0 - SECURE SHELL SIMULATOR\nTYPE ANY KEY TO START HACKING...\n\n");
  const [codeIndex, setCodeIndex] = useState(0);
  const [overlayState, setOverlayState] = useState(null); // 'GRANTED' or 'DENIED'
  const [autoType, setAutoType] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const consoleRef = useRef(null);
  const autoTypeInterval = useRef(null);

  // 자동 스크롤 효과
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [displayText]);

  // 키보드 리스너 등록
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      clearInterval(autoTypeInterval.current);
    };
  }, [codeIndex, overlayState, autoType]);

  // 자동 스크롤/타이핑
  useEffect(() => {
    if (autoType) {
      autoTypeInterval.current = setInterval(() => {
        simulateTyping();
      }, 60);
    } else {
      clearInterval(autoTypeInterval.current);
    }
    return () => clearInterval(autoTypeInterval.current);
  }, [autoType, codeIndex]);

  const handleFullscreenChange = () => {
    setIsFullscreen(!!document.fullscreenElement);
  };

  // 키 입력 핸들러
  const handleKeyDown = (e) => {
    // 단축키 매핑
    if (e.key === "Tab") {
      e.preventDefault();
      triggerGranted();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      triggerDenied();
      return;
    }
    // F11은 브라우저 기본 동작이 있으므로 건드리지 않음

    // 일반 타이핑
    if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) {
      simulateTyping();
    }
  };

  // 가짜 텍스트 타이핑 시뮬레이션
  const simulateTyping = () => {
    // 소스코드에서 다음 3글자 추출
    const chunkLength = 3;
    let nextChunk = SOURCE_CODE.substring(codeIndex, codeIndex + chunkLength);
    
    // 만약 소스코드 한바퀴를 다 돌았으면 인덱스 초기화
    let nextIndex = codeIndex + chunkLength;
    if (nextIndex >= SOURCE_CODE.length) {
      nextIndex = 0;
      nextChunk += "\n\n/* RE-BOOTING SYSTEM MATRIX MODULE */\n\n";
    }

    setDisplayText((prev) => prev + nextChunk);
    setCodeIndex(nextIndex);
  };

  // Web Audio API: ACCESS GRANTED 비프음
  const playGrantedSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const playNote = (freq, startTime, duration) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        gainNode.gain.setValueAtTime(0.15, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      const now = audioCtx.currentTime;
      playNote(523.25, now, 0.08); // C5
      playNote(659.25, now + 0.08, 0.08); // E5
      playNote(783.99, now + 0.16, 0.08); // G5
      playNote(1046.50, now + 0.24, 0.3); // C6
    } catch (e) {
      console.error("Audio error:", e);
    }
  };

  // Web Audio API: ACCESS DENIED 사이렌음
  const playDeniedSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = "sawtooth";
      const now = audioCtx.currentTime;

      // 사이렌 경보음 주파수 스윕
      osc.frequency.setValueAtTime(250, now);
      osc.frequency.linearRampToValueAtTime(550, now + 0.35);
      osc.frequency.linearRampToValueAtTime(250, now + 0.7);
      osc.frequency.linearRampToValueAtTime(550, now + 1.05);
      osc.frequency.linearRampToValueAtTime(100, now + 1.4);

      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 1.2);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 1.4);
    } catch (e) {
      console.error("Audio error:", e);
    }
  };

  // GRANTED 모드 켜기
  const triggerGranted = () => {
    setOverlayState("GRANTED");
    playGrantedSound();
    setTimeout(() => {
      setOverlayState(null);
    }, 2000);
  };

  // DENIED 모드 켜기
  const triggerDenied = () => {
    setOverlayState("DENIED");
    playDeniedSound();
    setTimeout(() => {
      setOverlayState(null);
    }, 2000);
  };

  // 전체 화면 토글
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`전체화면 전환 오류: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // 콘솔 초기화
  const clearConsole = () => {
    setDisplayText("TERMINAL NEXUS v2.0 - SECURE SHELL SIMULATOR\nCONSOLE CLEARED.\n\n");
    setCodeIndex(0);
  };

  return (
    <div className={`hacker-container ${overlayState === "DENIED" ? "siren-active" : ""}`}>
      {/* 상단 액션 바 */}
      <div className="hacker-toolbar">
        <div className="toolbar-title">📟 HOLLYWOOD HACKER TERMINAL</div>
        <div className="toolbar-controls">
          <label className="switch-label">
            <input
              type="checkbox"
              className="switch-input"
              checked={autoType}
              onChange={(e) => setAutoType(e.target.checked)}
            />
            Auto Type (자동 해킹)
          </label>
          <button className="control-btn" onClick={triggerGranted}>
            Granted (Tab)
          </button>
          <button className="control-btn" onClick={triggerDenied}>
            Denied (Esc)
          </button>
          <button className="control-btn" onClick={clearConsole}>
            Clear
          </button>
          <button className="control-btn" onClick={toggleFullScreen}>
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen (F11)"}
          </button>
        </div>
      </div>

      {/* 해킹 텍스트 콘솔 */}
      <div className="hacker-console" ref={consoleRef}>
        {displayText}
        <span className="hacker-cursor" />
      </div>

      {/* 팝업 오버레이 */}
      {overlayState === "GRANTED" && (
        <div className="overlay-granted">
          ACCESS GRANTED
        </div>
      )}
      {overlayState === "DENIED" && (
        <div className="overlay-denied">
          ACCESS DENIED
        </div>
      )}

      {/* 우측 하단 단축키 가이드 */}
      <div className="hacker-instructions">
        [Tab]: Access Granted | [Esc]: Access Denied | [아무 문자키]: 타이핑 입력
      </div>
    </div>
  );
};

export default HackerModePage;
