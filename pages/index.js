import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Head from "next/head";

// ═══════════════════════════════════════════
// CONSTANTS & CONFIG
// ═══════════════════════════════════════════
const SYMBOLS = ["🍒", "⭐", "💎", "🍋", "🔔", "7️⃣", "🍀", "👑"];
const REEL_COUNT = 5;
const ROUNDS_PER_GAME = 5;
const STARTING_COINS = 500;
const ENTRY_FEE = 50;

const COMBOS = {
  5: { points: 500, label: "JACKPOT!" },
  4: { points: 150, label: "רביעייה!" },
  3: { points: 50, label: "שלישייה!" },
  2: { points: 20, label: "זוג!" },
};

// ═══════════════════════════════════════════
// AVATAR PARTS
// ═══════════════════════════════════════════
const AVATAR_PARTS = {
  skin: ["#FDDBB4", "#F5C5A3", "#D4A574", "#C08B5C", "#8D5524", "#4A2C17"],
  face: ["😊", "😎", "🤩", "😏", "🥳", "😇", "🤓", "😤", "🧐", "😋", "🤪", "😈"],
  hair: [
    { id: "none", label: "בלי", svg: null },
    { id: "short", label: "קצר", color: true },
    { id: "long", label: "ארוך", color: true },
    { id: "curly", label: "מתולתל", color: true },
    { id: "mohawk", label: "מוהוק", color: true },
    { id: "bun", label: "קוקו", color: true },
  ],
  hairColor: ["#2C1810", "#5A3825", "#8B6914", "#D4A017", "#C0392B", "#E74C3C", "#8E44AD", "#2ECC71", "#3498DB", "#ECF0F1"],
  top: [
    { id: "tshirt", label: "חולצת T", emoji: "👕" },
    { id: "hoodie", label: "קפוצ'ון", emoji: "🧥" },
    { id: "suit", label: "חליפה", emoji: "🤵" },
    { id: "dress", label: "שמלה", emoji: "👗" },
    { id: "tank", label: "גופייה", emoji: "🦺" },
    { id: "jersey", label: "ג'רזי", emoji: "👚" },
  ],
  topColor: ["#E74C3C", "#3498DB", "#2ECC71", "#F39C12", "#9B59B6", "#1ABC9C", "#E91E63", "#34495E", "#ECF0F1", "#000000"],
  accessory: [
    { id: "none", label: "בלי", emoji: "" },
    { id: "glasses", label: "משקפיים", emoji: "👓" },
    { id: "sunglasses", label: "שמש", emoji: "🕶️" },
    { id: "hat", label: "כובע", emoji: "🎩" },
    { id: "crown", label: "כתר", emoji: "👑" },
    { id: "headband", label: "סרט", emoji: "🎀" },
  ],
};

// ═══════════════════════════════════════════
// AUDIO
// ═══════════════════════════════════════════
const AudioCtx = typeof window !== "undefined" ? (window.AudioContext || window.webkitAudioContext) : null;
let audioCtx = null;
const getCtx = () => { if (!audioCtx && AudioCtx) audioCtx = new AudioCtx(); return audioCtx; };

const playSound = (type) => {
  const ctx = getCtx();
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  if (type === "spin") {
    o.type = "sawtooth"; o.frequency.setValueAtTime(200, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    o.start(); o.stop(ctx.currentTime + 0.3);
  } else if (type === "win") {
    [523,659,784,1047].forEach((f,i) => {
      const o2=ctx.createOscillator(), g2=ctx.createGain();
      o2.connect(g2); g2.connect(ctx.destination); o2.type="sine";
      o2.frequency.setValueAtTime(f, ctx.currentTime+i*0.12);
      g2.gain.setValueAtTime(0.1, ctx.currentTime+i*0.12);
      g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+i*0.12+0.3);
      o2.start(ctx.currentTime+i*0.12); o2.stop(ctx.currentTime+i*0.12+0.3);
    });
  } else if (type === "jackpot") {
    [523,659,784,1047,1318,1568].forEach((f,i) => {
      const o2=ctx.createOscillator(), g2=ctx.createGain();
      o2.connect(g2); g2.connect(ctx.destination); o2.type="square";
      o2.frequency.setValueAtTime(f, ctx.currentTime+i*0.1);
      g2.gain.setValueAtTime(0.06, ctx.currentTime+i*0.1);
      g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+i*0.1+0.5);
      o2.start(ctx.currentTime+i*0.1); o2.stop(ctx.currentTime+i*0.1+0.5);
    });
  } else if (type === "click") {
    o.type="sine"; o.frequency.setValueAtTime(800, ctx.currentTime);
    g.gain.setValueAtTime(0.04, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.05);
    o.start(); o.stop(ctx.currentTime+0.05);
  } else if (type === "challenge") {
    [440,554,659].forEach((f,i) => {
      const o2=ctx.createOscillator(), g2=ctx.createGain();
      o2.connect(g2); g2.connect(ctx.destination); o2.type="triangle";
      o2.frequency.setValueAtTime(f, ctx.currentTime+i*0.15);
      g2.gain.setValueAtTime(0.08, ctx.currentTime+i*0.15);
      g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+i*0.15+0.2);
      o2.start(ctx.currentTime+i*0.15); o2.stop(ctx.currentTime+i*0.15+0.2);
    });
  }
};

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
const randomSymbol = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
const genId = () => Math.random().toString(36).substr(2, 9);

const calcScore = (reels) => {
  const counts = {};
  reels.forEach(s => counts[s] = (counts[s]||0)+1);
  const max = Math.max(...Object.values(counts));
  if (reels.slice(0,3).every(s => s==="💎")) return { points: 300, label: "יהלומים!" };
  if (reels.slice(0,4).every(s => s==="⭐")) return { points: 250, label: "כוכבים!" };
  if (new Set(reels).size === REEL_COUNT) return { points: 100, label: "קשת!" };
  if (COMBOS[max]) return COMBOS[max];
  return { points: 0, label: "" };
};

// Simulated online users (in real app = Firebase presence)
const FAKE_ONLINE = [
  { id: "bot1", name: "דוד", online: true, avatar: { skin: "#FDDBB4", face: "😎", hair: "short", hairColor: "#2C1810", top: "hoodie", topColor: "#3498DB", accessory: "sunglasses" }, coins: 720, totalScore: 1200, wins: 8, gamesPlayed: 15, rank: 1 },
  { id: "bot2", name: "שרה", online: true, avatar: { skin: "#F5C5A3", face: "🤩", hair: "long", hairColor: "#D4A017", top: "dress", topColor: "#E91E63", accessory: "crown" }, coins: 580, totalScore: 950, wins: 6, gamesPlayed: 12, rank: 2 },
  { id: "bot3", name: "רון", online: true, avatar: { skin: "#D4A574", face: "😏", hair: "mohawk", hairColor: "#E74C3C", top: "jersey", topColor: "#2ECC71", accessory: "none" }, coins: 430, totalScore: 600, wins: 3, gamesPlayed: 10, rank: 4 },
  { id: "bot4", name: "תמר", online: false, avatar: { skin: "#C08B5C", face: "😇", hair: "bun", hairColor: "#8B6914", top: "tshirt", topColor: "#F39C12", accessory: "glasses" }, coins: 350, totalScore: 400, wins: 2, gamesPlayed: 8, rank: 5 },
];

// ═══════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════
const GOLD = "#FFD700";
const DARK = "#08080e";
const CARD = "#111118";
const CARD2 = "#16161f";
const BORDER = "#1e1e2e";
const RED = "#ff3b5c";
const GREEN = "#00e676";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800;900&family=Fredoka+One&family=Noto+Sans+Hebrew:wght@400;600;700;800&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { overflow-x: hidden; }

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }

@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
@keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.04); } }
@keyframes glow { 0%,100% { box-shadow:0 0 15px rgba(255,215,0,0.2); } 50% { box-shadow:0 0 35px rgba(255,215,0,0.5); } }
@keyframes confettiDrop { 0% { transform:translateY(-100vh) rotate(0); opacity:1; } 100% { transform:translateY(100vh) rotate(720deg); opacity:0; } }
@keyframes floatAvatar { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-3px)} 75%{transform:translateX(3px)} }
@keyframes spinReel { 0%{transform:translateY(0)} 100%{transform:translateY(-50%)} }
@keyframes jackpotBg { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
@keyframes slideRight { from{transform:translateX(-100%);opacity:0} to{transform:translateX(0);opacity:1} }
@keyframes pop { 0%{transform:scale(0)} 60%{transform:scale(1.15)} 100%{transform:scale(1)} }

.casino-floor {
  background: radial-gradient(ellipse at 50% 80%, #1a0a2e 0%, #0a0612 50%, #060410 100%);
  position: relative;
  overflow: hidden;
}
.casino-floor::before {
  content: '';
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(circle at 20% 30%, rgba(255,215,0,0.03) 0%, transparent 40%),
    radial-gradient(circle at 80% 60%, rgba(255,59,92,0.03) 0%, transparent 40%);
  pointer-events: none;
}

.avatar-bubble {
  cursor: pointer;
  transition: all 0.3s ease;
  animation: floatAvatar 3s ease-in-out infinite;
}
.avatar-bubble:hover {
  transform: scale(1.1) !important;
  z-index: 10;
}

.slot-handle-track {
  width: 48px;
  height: 220px;
  background: linear-gradient(180deg, #2a1a0a, #1a1008, #2a1a0a);
  border-radius: 24px;
  border: 2px solid #3d2a10;
  position: relative;
  cursor: grab;
  touch-action: none;
  box-shadow: inset 0 2px 8px rgba(0,0,0,0.5);
}
.slot-handle-knob {
  width: 44px;
  height: 56px;
  background: linear-gradient(180deg, #FFD700, #B8860B, #FFD700);
  border-radius: 22px;
  position: absolute;
  left: 2px;
  cursor: grab;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: box-shadow 0.2s;
  touch-action: none;
}
.slot-handle-knob:active {
  cursor: grabbing;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.3), 0 0 20px rgba(255,215,0,0.4);
}
.slot-handle-knob::after {
  content: '≡';
  color: #5a3a00;
  font-size: 20px;
  font-weight: bold;
}

.reel-container {
  width: 64px;
  height: 76px;
  overflow: hidden;
  background: linear-gradient(180deg, #0a0a14, #12121e, #0a0a14);
  border-radius: 10px;
  border: 2px solid #2a2a3a;
  position: relative;
}
.reel-container::before, .reel-container::after {
  content: '';
  position: absolute;
  left: 0; right: 0;
  height: 25%;
  z-index: 2;
  pointer-events: none;
}
.reel-container::before { top: 0; background: linear-gradient(to bottom, rgba(10,10,20,0.9), transparent); }
.reel-container::after { bottom: 0; background: linear-gradient(to top, rgba(10,10,20,0.9), transparent); }

.reel-strip {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.reel-spinning .reel-strip {
  animation: spinReel 0.12s linear infinite;
}

.video-placeholder {
  background: linear-gradient(135deg, #0a0a14, #111120);
  border: 1px solid #1e1e2e;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.video-placeholder::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(255,255,255,0.02) 0%, transparent 70%);
}
`;

// ═══════════════════════════════════════════
// AVATAR RENDERER
// ═══════════════════════════════════════════
function AvatarDisplay({ avatar, size = 60, style = {} }) {
  if (!avatar) return <div style={{ width: size, height: size, borderRadius: "50%", background: "#222", ...style }} />;
  
  const top = AVATAR_PARTS.top.find(t => t.id === avatar.top);
  const acc = AVATAR_PARTS.accessory.find(a => a.id === avatar.accessory);
  const hairStyle = AVATAR_PARTS.hair.find(h => h.id === avatar.hair);
  
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `radial-gradient(circle at 50% 40%, ${avatar.skin}, ${avatar.skin}cc)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
      border: `2px solid ${avatar.skin}88`,
      boxShadow: `0 2px 10px ${avatar.skin}33`,
      ...style,
    }}>
      {/* Hair background */}
      {avatar.hair !== "none" && (
        <div style={{
          position: "absolute",
          top: avatar.hair === "long" ? -2 : 0,
          left: avatar.hair === "mohawk" ? "30%" : 0,
          right: avatar.hair === "mohawk" ? "30%" : 0,
          height: avatar.hair === "long" ? "55%" : avatar.hair === "bun" ? "30%" : "40%",
          background: avatar.hairColor,
          borderRadius: avatar.hair === "curly" ? "50% 50% 30% 30%" : avatar.hair === "mohawk" ? "40%" : "50% 50% 0 0",
          zIndex: 0,
        }} />
      )}
      {/* Face */}
      <span style={{ fontSize: size * 0.45, zIndex: 1, marginTop: size * 0.05 }}>
        {avatar.face}
      </span>
      {/* Top/clothing indicator */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: "30%",
        background: avatar.topColor || "#333",
        borderRadius: "0 0 50% 50%",
        zIndex: 0,
      }} />
      {/* Accessory */}
      {acc && acc.id !== "none" && (
        <span style={{
          position: "absolute",
          top: acc.id === "hat" || acc.id === "crown" ? -2 : acc.id === "headband" ? 2 : "25%",
          fontSize: size * 0.28,
          zIndex: 2,
        }}>{acc.emoji}</span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// CONFETTI
// ═══════════════════════════════════════════
function Confetti({ active }) {
  if (!active) return null;
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:9999 }}>
      {Array.from({length:50},(_,i) => (
        <div key={i} style={{
          position:"absolute",
          left:`${Math.random()*100}%`, top:-20,
          width: 6+Math.random()*8, height: 8+Math.random()*10,
          background: ["#FFD700","#ff3b5c","#00e676","#448aff","#b388ff","#ff9100"][i%6],
          borderRadius: 2,
          animation: `confettiDrop ${2+Math.random()*2}s ease-in ${Math.random()*2}s forwards`,
        }} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// SCREENS
// ═══════════════════════════════════════════

// ── 1. GOOGLE LOGIN ──
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  
  const handleGoogle = () => {
    setLoading(true);
    playSound("click");
    setTimeout(() => {
      onLogin({ email: email || "player@gmail.com", isNew: true });
    }, 800);
  };
  
  return (
    <div style={{
      minHeight: "100vh",
      background: `radial-gradient(ellipse at 50% 30%, #1a0a2e, #08080e 70%)`,
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding: 24, fontFamily: "'Noto Sans Hebrew', 'Rubik', sans-serif",
    }}>
      <div style={{ animation: "fadeIn 0.6s ease" }}>
        <div style={{
          fontFamily: "'Fredoka One', cursive", fontSize: 48,
          background: `linear-gradient(90deg, ${GOLD}, #FFA000, ${GOLD})`,
          backgroundSize: "200% auto", animation: "shimmer 3s linear infinite",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          textAlign: "center", marginBottom: 8,
        }}>🎰</div>
        <div style={{
          fontFamily: "'Fredoka One', cursive", fontSize: 32,
          background: `linear-gradient(90deg, ${GOLD}, #FFA000, ${GOLD})`,
          backgroundSize: "200% auto", animation: "shimmer 3s linear infinite",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          textAlign: "center", marginBottom: 4,
        }}>Family Slot Arena</div>
        <div style={{ color: "#555", textAlign: "center", fontSize: 14, marginBottom: 40 }}>
          הקזינו המשפחתי
        </div>
        
        <div style={{
          background: CARD, border: `1px solid ${BORDER}`,
          borderRadius: 20, padding: 32, width: 360, maxWidth: "100%",
        }}>
          <button onClick={handleGoogle} disabled={loading} style={{
            width: "100%", padding: "14px 20px",
            background: "#fff", color: "#333",
            border: "none", borderRadius: 12,
            fontFamily: "'Rubik', sans-serif", fontWeight: 600, fontSize: 15,
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 10, transition: "all 0.2s",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            opacity: loading ? 0.6 : 1,
          }}>
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {loading ? "מתחבר..." : "התחבר עם Google"}
          </button>
          
          <div style={{ display:"flex", alignItems:"center", gap: 12, margin: "20px 0" }}>
            <div style={{ flex:1, height:1, background:"#222" }} />
            <span style={{ color:"#444", fontSize:12 }}>או</span>
            <div style={{ flex:1, height:1, background:"#222" }} />
          </div>
          
          <input value={email} onChange={e => setEmail(e.target.value)}
            placeholder="your@gmail.com"
            style={{
              width:"100%", padding:"12px 16px",
              background:"#0a0a14", border:`1px solid ${BORDER}`,
              borderRadius:10, color:"#fff", fontSize:14,
              fontFamily:"'Rubik', sans-serif", outline:"none",
              direction:"ltr", textAlign:"left", marginBottom: 12,
            }} />
          <button onClick={handleGoogle} disabled={loading} style={{
            width:"100%", padding:"12px",
            background:`linear-gradient(135deg, ${GOLD}, #B8860B)`,
            color:"#000", border:"none", borderRadius:10,
            fontFamily:"'Rubik', sans-serif", fontWeight:700, fontSize:14,
            cursor:"pointer",
          }}>
            כניסה
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 2. AVATAR CREATOR ──
function AvatarCreator({ onSave, initialAvatar }) {
  const [avatar, setAvatar] = useState(initialAvatar || {
    skin: AVATAR_PARTS.skin[0],
    face: AVATAR_PARTS.face[0],
    hair: "short",
    hairColor: AVATAR_PARTS.hairColor[0],
    top: "tshirt",
    topColor: AVATAR_PARTS.topColor[0],
    accessory: "none",
  });
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState(null);
  const [activeTab, setActiveTab] = useState("face");
  
  const tabs = [
    { id: "face", label: "פנים", icon: "😊" },
    { id: "hair", label: "שיער", icon: "💇" },
    { id: "clothes", label: "לבוש", icon: "👕" },
    { id: "extras", label: "אקסטרה", icon: "✨" },
  ];
  
  const update = (key, val) => setAvatar(prev => ({ ...prev, [key]: val }));
  
  return (
    <div style={{
      minHeight: "100vh",
      background: `radial-gradient(ellipse at 50% 20%, #1a0a2e, ${DARK} 70%)`,
      padding: "20px 16px",
      fontFamily: "'Noto Sans Hebrew', 'Rubik', sans-serif",
      direction: "rtl",
    }}>
      <div style={{
        fontFamily: "'Fredoka One', cursive", fontSize: 24, color: GOLD,
        textAlign: "center", marginBottom: 20,
      }}>בנה את הדמות שלך</div>
      
      {/* Preview */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        marginBottom: 24,
      }}>
        <div style={{ position: "relative" }}>
          <AvatarDisplay avatar={avatar} size={120} />
          {photo && (
            <div style={{
              position: "absolute", bottom: -4, right: -4,
              width: 36, height: 36, borderRadius: "50%",
              background: `url(${photo}) center/cover`,
              border: `2px solid ${GOLD}`,
            }} />
          )}
        </div>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="השם שלך..."
          style={{
            marginTop: 12, padding: "8px 16px", textAlign: "center",
            background: CARD, border: `1px solid ${BORDER}`,
            borderRadius: 10, color: "#fff", fontSize: 16,
            fontFamily: "'Rubik', sans-serif", fontWeight: 600,
            outline: "none", width: 180, direction: "rtl",
          }} />
      </div>
      
      {/* Tabs */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 16,
        background: CARD, borderRadius: 12, padding: 4,
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { playSound("click"); setActiveTab(t.id); }}
            style={{
              flex: 1, padding: "10px 4px",
              background: activeTab === t.id ? CARD2 : "transparent",
              border: activeTab === t.id ? `1px solid ${BORDER}` : "1px solid transparent",
              borderRadius: 10, cursor: "pointer",
              color: activeTab === t.id ? "#fff" : "#666",
              fontFamily: "'Rubik', sans-serif", fontWeight: 600, fontSize: 12,
              transition: "all 0.2s",
            }}>
            <div style={{ fontSize: 18 }}>{t.icon}</div>
            {t.label}
          </button>
        ))}
      </div>
      
      {/* Tab content */}
      <div style={{
        background: CARD, border: `1px solid ${BORDER}`,
        borderRadius: 16, padding: 20, marginBottom: 20,
        animation: "fadeIn 0.3s ease",
      }}>
        {activeTab === "face" && (
          <>
            <div style={{ color: "#888", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>צבע עור:</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {AVATAR_PARTS.skin.map(s => (
                <button key={s} onClick={() => update("skin", s)} style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: `radial-gradient(circle, ${s}, ${s}cc)`,
                  border: avatar.skin === s ? `3px solid ${GOLD}` : "3px solid transparent",
                  cursor: "pointer", transition: "all 0.2s",
                }} />
              ))}
            </div>
            <div style={{ color: "#888", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>הבעה:</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {AVATAR_PARTS.face.map(f => (
                <button key={f} onClick={() => update("face", f)} style={{
                  width: 42, height: 42, borderRadius: 10,
                  background: avatar.face === f ? `${GOLD}20` : "#0a0a14",
                  border: avatar.face === f ? `2px solid ${GOLD}` : `2px solid ${BORDER}`,
                  fontSize: 22, cursor: "pointer", display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}>{f}</button>
              ))}
            </div>
          </>
        )}
        
        {activeTab === "hair" && (
          <>
            <div style={{ color: "#888", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>סגנון שיער:</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {AVATAR_PARTS.hair.map(h => (
                <button key={h.id} onClick={() => update("hair", h.id)} style={{
                  padding: "8px 14px", borderRadius: 10,
                  background: avatar.hair === h.id ? `${GOLD}20` : "#0a0a14",
                  border: avatar.hair === h.id ? `2px solid ${GOLD}` : `2px solid ${BORDER}`,
                  color: avatar.hair === h.id ? GOLD : "#888",
                  fontFamily: "'Rubik', sans-serif", fontWeight: 600, fontSize: 13,
                  cursor: "pointer",
                }}>{h.label}</button>
              ))}
            </div>
            {avatar.hair !== "none" && (
              <>
                <div style={{ color: "#888", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>צבע שיער:</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {AVATAR_PARTS.hairColor.map(c => (
                    <button key={c} onClick={() => update("hairColor", c)} style={{
                      width: 32, height: 32, borderRadius: "50%", background: c,
                      border: avatar.hairColor === c ? `3px solid ${GOLD}` : "3px solid transparent",
                      cursor: "pointer",
                    }} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
        
        {activeTab === "clothes" && (
          <>
            <div style={{ color: "#888", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>סוג לבוש:</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {AVATAR_PARTS.top.map(t => (
                <button key={t.id} onClick={() => update("top", t.id)} style={{
                  padding: "8px 12px", borderRadius: 10,
                  background: avatar.top === t.id ? `${GOLD}20` : "#0a0a14",
                  border: avatar.top === t.id ? `2px solid ${GOLD}` : `2px solid ${BORDER}`,
                  color: avatar.top === t.id ? GOLD : "#888",
                  fontFamily: "'Rubik', sans-serif", fontSize: 12, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <span style={{ fontSize: 16 }}>{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>
            <div style={{ color: "#888", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>צבע:</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {AVATAR_PARTS.topColor.map(c => (
                <button key={c} onClick={() => update("topColor", c)} style={{
                  width: 32, height: 32, borderRadius: "50%", background: c,
                  border: avatar.topColor === c ? `3px solid ${GOLD}` : "3px solid transparent",
                  cursor: "pointer",
                }} />
              ))}
            </div>
          </>
        )}
        
        {activeTab === "extras" && (
          <>
            <div style={{ color: "#888", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>אביזרים:</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
              {AVATAR_PARTS.accessory.map(a => (
                <button key={a.id} onClick={() => update("accessory", a.id)} style={{
                  padding: "8px 14px", borderRadius: 10,
                  background: avatar.accessory === a.id ? `${GOLD}20` : "#0a0a14",
                  border: avatar.accessory === a.id ? `2px solid ${GOLD}` : `2px solid ${BORDER}`,
                  color: avatar.accessory === a.id ? GOLD : "#888",
                  fontFamily: "'Rubik', sans-serif", fontSize: 13, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  {a.emoji && <span style={{ fontSize: 16 }}>{a.emoji}</span>}
                  {a.label}
                </button>
              ))}
            </div>
            <div style={{ color: "#888", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>תמונה אישית:</div>
            <label style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 16px", background: "#0a0a14",
              border: `1px dashed ${BORDER}`, borderRadius: 10,
              color: "#666", fontSize: 13, cursor: "pointer",
            }}>
              📷 {photo ? "שנה תמונה" : "העלה תמונה"}
              <input type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => {
                  const f = e.target.files[0];
                  if (f) { const r = new FileReader(); r.onload = ev => setPhoto(ev.target.result); r.readAsDataURL(f); }
                }} />
            </label>
          </>
        )}
      </div>
      
      <button onClick={() => {
        if (name.trim()) { playSound("win"); onSave({ avatar, name: name.trim(), photo }); }
      }} disabled={!name.trim()} style={{
        width: "100%", padding: "14px",
        background: name.trim() ? `linear-gradient(135deg, ${GOLD}, #B8860B)` : "#222",
        color: name.trim() ? "#000" : "#555",
        border: "none", borderRadius: 14,
        fontFamily: "'Rubik', sans-serif", fontWeight: 800, fontSize: 17,
        cursor: name.trim() ? "pointer" : "not-allowed",
        boxShadow: name.trim() ? `0 4px 20px ${GOLD}33` : "none",
      }}>
        יאללה! 🎰
      </button>
    </div>
  );
}

// ── 3. HOME / DASHBOARD ──
function HomeScreen({ user, allPlayers, onNavigate }) {
  const sorted = [...allPlayers].sort((a, b) => b.totalScore - a.totalScore);
  const userRank = sorted.findIndex(p => p.id === user.id) + 1;
  
  return (
    <div style={{
      minHeight: "100vh",
      background: `radial-gradient(ellipse at 50% 10%, #12081e, ${DARK} 60%)`,
      padding: "20px 16px", paddingBottom: 80,
      fontFamily: "'Noto Sans Hebrew', 'Rubik', sans-serif",
    }}>
      {/* Profile card */}
      <div style={{
        background: `linear-gradient(135deg, ${CARD}, ${CARD2})`,
        border: `1px solid ${BORDER}`, borderRadius: 20,
        padding: 24, marginBottom: 20,
        animation: "fadeIn 0.5s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ position: "relative" }}>
            <AvatarDisplay avatar={user.avatar} size={72} />
            {user.photo && (
              <div style={{
                position: "absolute", bottom: -2, right: -2,
                width: 28, height: 28, borderRadius: "50%",
                background: `url(${user.photo}) center/cover`,
                border: `2px solid ${CARD}`,
              }} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 20, marginBottom: 2 }}>
              {user.name}
            </div>
            <div style={{ color: GOLD, fontFamily: "'Fredoka One', cursive", fontSize: 22 }}>
              🪙 {user.coins}
            </div>
          </div>
          <div style={{
            textAlign: "center", padding: "8px 14px",
            background: `${GOLD}10`, borderRadius: 12,
            border: `1px solid ${GOLD}25`,
          }}>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 28, color: GOLD }}>
              #{userRank}
            </div>
            <div style={{ color: "#888", fontSize: 11 }}>דירוג</div>
          </div>
        </div>
        
        {/* Stats */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8, marginTop: 16,
        }}>
          {[
            { label: "ניצחונות", value: user.wins, color: GREEN },
            { label: "משחקים", value: user.gamesPlayed, color: "#448aff" },
            { label: "ניקוד כולל", value: user.totalScore, color: GOLD },
          ].map(s => (
            <div key={s.label} style={{
              background: "#0a0a14", borderRadius: 10, padding: "10px 8px",
              textAlign: "center",
            }}>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 18, color: s.color }}>
                {s.value}
              </div>
              <div style={{ color: "#666", fontSize: 11 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Quick leaderboard */}
      <div style={{
        background: CARD, border: `1px solid ${BORDER}`,
        borderRadius: 16, padding: 16, marginBottom: 20,
        animation: "fadeIn 0.6s ease",
      }}>
        <div style={{ color: "#888", fontSize: 13, fontWeight: 700, marginBottom: 12, direction: "rtl" }}>
          🏆 טבלת דירוג
        </div>
        {sorted.slice(0, 5).map((p, i) => (
          <div key={p.id} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 4px",
            borderBottom: i < 4 ? `1px solid ${BORDER}` : "none",
            opacity: p.id === user.id ? 1 : 0.7,
          }}>
            <span style={{
              fontFamily: "'Fredoka One', cursive", fontSize: 14,
              color: i < 3 ? GOLD : "#555", width: 24,
            }}>{["🥇","🥈","🥉"][i] || `#${i+1}`}</span>
            <AvatarDisplay avatar={p.avatar} size={32} />
            <span style={{
              flex: 1, color: p.id === user.id ? "#fff" : "#aaa",
              fontWeight: p.id === user.id ? 700 : 400, fontSize: 14,
            }}>
              {p.name} {p.id === user.id && "(אתה)"}
            </span>
            <span style={{ color: GOLD, fontFamily: "'Fredoka One'", fontSize: 13 }}>
              {p.totalScore}
            </span>
          </div>
        ))}
      </div>
      
      {/* Navigation buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <button onClick={() => { playSound("challenge"); onNavigate("casino"); }} style={{
          background: `linear-gradient(135deg, #1a0a2e, #2a1040)`,
          border: `1px solid #3a1a50`, borderRadius: 16,
          padding: 20, cursor: "pointer", textAlign: "center",
          transition: "all 0.2s",
        }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🎰</div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>הקזינו</div>
          <div style={{ color: "#666", fontSize: 11 }}>שחק עכשיו!</div>
        </button>
        <button onClick={() => onNavigate("leaderboard")} style={{
          background: `linear-gradient(135deg, #0a1a2e, #102840)`,
          border: `1px solid #1a3a50`, borderRadius: 16,
          padding: 20, cursor: "pointer", textAlign: "center",
          transition: "all 0.2s",
        }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🏆</div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>דירוג</div>
          <div style={{ color: "#666", fontSize: 11 }}>טבלת ניקוד</div>
        </button>
      </div>
      
      {/* Bottom nav */}
      <BottomNav active="home" onNavigate={onNavigate} />
    </div>
  );
}

// ── BOTTOM NAV ──
function BottomNav({ active, onNavigate }) {
  const items = [
    { id: "home", icon: "🏠", label: "בית" },
    { id: "casino", icon: "🎰", label: "קזינו" },
    { id: "leaderboard", icon: "🏆", label: "דירוג" },
    { id: "profile", icon: "⚙️", label: "פרופיל" },
  ];
  
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: `${DARK}ee`, backdropFilter: "blur(10px)",
      borderTop: `1px solid ${BORDER}`,
      display: "flex", justifyContent: "space-around",
      padding: "8px 0 12px", zIndex: 100,
      maxWidth: 480, margin: "0 auto",
    }}>
      {items.map(it => (
        <button key={it.id} onClick={() => { playSound("click"); onNavigate(it.id); }}
          style={{
            background: "transparent", border: "none",
            cursor: "pointer", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 2, padding: "4px 16px",
            opacity: active === it.id ? 1 : 0.5,
            transition: "all 0.2s",
          }}>
          <span style={{ fontSize: 20 }}>{it.icon}</span>
          <span style={{
            fontSize: 10, color: active === it.id ? GOLD : "#888",
            fontFamily: "'Rubik', sans-serif", fontWeight: 600,
          }}>{it.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── 4. CASINO FLOOR ──
function CasinoFloor({ user, onlinePlayers, onChallenge, onNavigate }) {
  const [selected, setSelected] = useState([]);
  
  const toggleSelect = (pid) => {
    setSelected(prev =>
      prev.includes(pid) ? prev.filter(id => id !== pid)
        : prev.length < 4 ? [...prev, pid] : prev
    );
    playSound("click");
  };
  
  // Random positions for avatars in the casino
  const positions = useMemo(() =>
    onlinePlayers.map((_, i) => ({
      left: 15 + (i % 3) * 30 + Math.random() * 10,
      top: 20 + Math.floor(i / 3) * 28 + Math.random() * 8,
      delay: i * 0.3,
    })), [onlinePlayers.length]
  );
  
  return (
    <div className="casino-floor" style={{
      minHeight: "100vh", padding: "20px 16px", paddingBottom: 80,
      fontFamily: "'Noto Sans Hebrew', 'Rubik', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        textAlign: "center", marginBottom: 16, position: "relative", zIndex: 2,
      }}>
        <div style={{
          fontFamily: "'Fredoka One', cursive", fontSize: 26,
          background: `linear-gradient(90deg, ${GOLD}, #FFA000, ${GOLD})`,
          backgroundSize: "200% auto", animation: "shimmer 3s linear infinite",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>🎰 הקזינו 🎰</div>
        <div style={{ color: "#555", fontSize: 12 }}>
          {onlinePlayers.filter(p => p.online).length} שחקנים מחוברים
        </div>
      </div>
      
      {/* Casino floor area with floating avatars */}
      <div style={{
        background: `linear-gradient(180deg, rgba(26,10,46,0.5), rgba(10,6,18,0.8))`,
        border: `1px solid #2a1a3a`,
        borderRadius: 20, height: 300,
        position: "relative", overflow: "hidden",
        marginBottom: 16,
      }}>
        {/* Decorative elements */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.1 }}>
          {Array.from({length: 8}).map((_,i) => (
            <div key={i} style={{
              position: "absolute",
              left: `${10 + i * 12}%`, top: `${20 + (i%3) * 25}%`,
              fontSize: 30, opacity: 0.3,
            }}>{["🎰","🃏","🎲","💰","🎯","🎪","🎭","🎬"][i]}</div>
          ))}
        </div>
        
        {/* Online player avatars */}
        {onlinePlayers.map((p, i) => {
          const isOnline = p.online;
          const isSelected = selected.includes(p.id);
          const pos = positions[i];
          
          return (
            <div key={p.id} className="avatar-bubble"
              onClick={() => isOnline && toggleSelect(p.id)}
              style={{
                position: "absolute",
                left: `${pos.left}%`, top: `${pos.top}%`,
                animation: `floatAvatar ${2.5 + i * 0.3}s ease-in-out infinite`,
                animationDelay: `${pos.delay}s`,
                opacity: isOnline ? 1 : 0.3,
                filter: isOnline ? "none" : "grayscale(1)",
                zIndex: isSelected ? 5 : 1,
              }}>
              <div style={{ position: "relative" }}>
                <AvatarDisplay avatar={p.avatar} size={54}
                  style={{
                    border: isSelected ? `3px solid ${GOLD}` : "3px solid transparent",
                    boxShadow: isSelected ? `0 0 20px ${GOLD}44` : "none",
                  }} />
                {/* Online dot */}
                <div style={{
                  position: "absolute", bottom: 0, right: 0,
                  width: 14, height: 14, borderRadius: "50%",
                  background: isOnline ? GREEN : "#555",
                  border: `2px solid ${DARK}`,
                }} />
                {isSelected && (
                  <div style={{
                    position: "absolute", top: -6, right: -6,
                    background: GOLD, borderRadius: "50%",
                    width: 20, height: 20, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: 12, animation: "pop 0.3s ease",
                  }}>⚔️</div>
                )}
              </div>
              <div style={{
                textAlign: "center", marginTop: 4,
                color: isSelected ? GOLD : "#aaa",
                fontSize: 11, fontWeight: 600,
                textShadow: "0 1px 3px rgba(0,0,0,0.8)",
              }}>{p.name}</div>
            </div>
          );
        })}
      </div>
      
      {/* Selected players / challenge */}
      {selected.length > 0 && (
        <div style={{
          background: CARD, border: `1px solid ${GOLD}30`,
          borderRadius: 16, padding: 16, marginBottom: 16,
          animation: "fadeIn 0.3s ease",
        }}>
          <div style={{ color: "#888", fontSize: 12, marginBottom: 8, direction: "rtl" }}>
            נבחרו לדו-קרב: ({selected.length})
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {selected.map(pid => {
              const p = onlinePlayers.find(pl => pl.id === pid);
              return (
                <div key={pid} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "#0a0a14", borderRadius: 10, padding: "6px 10px",
                }}>
                  <AvatarDisplay avatar={p.avatar} size={24} />
                  <span style={{ color: "#ccc", fontSize: 12 }}>{p.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); toggleSelect(pid); }}
                    style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 14 }}>✕</button>
                </div>
              );
            })}
          </div>
          <div style={{ color: "#666", fontSize: 12, direction: "rtl", marginBottom: 12 }}>
            💰 קופה: {(selected.length + 1) * ENTRY_FEE} מטבעות ({ENTRY_FEE} לשחקן)
          </div>
          <button onClick={() => { playSound("challenge"); onChallenge(selected); }}
            style={{
              width: "100%", padding: "13px",
              background: `linear-gradient(135deg, ${RED}, #cc0033)`,
              color: "#fff", border: "none", borderRadius: 12,
              fontFamily: "'Rubik', sans-serif", fontWeight: 800, fontSize: 16,
              cursor: "pointer",
              boxShadow: `0 4px 20px ${RED}44`,
            }}>
            ⚔️ תגר לדו-קרב!
          </button>
        </div>
      )}
      
      {!selected.length && (
        <div style={{
          textAlign: "center", color: "#444", fontSize: 13,
          padding: 16, direction: "rtl",
        }}>
          לחץ על שחקנים מחוברים בקזינו כדי לתגר אותם!
        </div>
      )}
      
      <BottomNav active="casino" onNavigate={onNavigate} />
    </div>
  );
}

// ── 5. GAME SCREEN WITH DRAG SLIDER ──
function GameScreen({ gamePlayers, allPlayers, pot, onGameEnd }) {
  const [reels, setReels] = useState(Array(REEL_COUNT).fill("🍒"));
  const [spinning, setSpinning] = useState(false);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [currentRound, setCurrentRound] = useState(0);
  const [scores, setScores] = useState(() => {
    const s = {}; gamePlayers.forEach(pid => s[pid] = 0); return s;
  });
  const [lastResult, setLastResult] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  
  // Drag slider state
  const trackRef = useRef(null);
  const [knobY, setKnobY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [triggered, setTriggered] = useState(false);
  const dragStartY = useRef(0);
  
  const currentPlayerId = gamePlayers[currentPlayerIdx];
  const currentPlayer = allPlayers.find(p => p.id === currentPlayerId);
  const isMyTurn = currentPlayerIdx >= 0; // In prototype, always can play
  
  // Drag handler
  const handleDragStart = (e) => {
    if (spinning || gameOver || triggered) return;
    e.preventDefault();
    setDragging(true);
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY - knobY;
  };
  
  const handleDragMove = useCallback((e) => {
    if (!dragging || spinning) return;
    e.preventDefault();
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const maxY = rect.height - 56;
    let newY = Math.max(0, Math.min(clientY - dragStartY.current, maxY));
    setKnobY(newY);
    
    // Trigger spin when pulled past 70%
    if (newY > maxY * 0.7 && !triggered) {
      setTriggered(true);
      doSpin();
    }
  }, [dragging, spinning, triggered]);
  
  const handleDragEnd = useCallback(() => {
    setDragging(false);
    // Animate knob back
    setKnobY(0);
    setTimeout(() => setTriggered(false), 500);
  }, []);
  
  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleDragMove, { passive: false });
      window.addEventListener("mouseup", handleDragEnd);
      window.addEventListener("touchmove", handleDragMove, { passive: false });
      window.addEventListener("touchend", handleDragEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleDragMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [dragging, handleDragMove, handleDragEnd]);
  
  const doSpin = useCallback(() => {
    if (spinning || gameOver) return;
    setSpinning(true);
    setLastResult(null);
    playSound("spin");
    
    const interval = setInterval(() => {
      setReels(prev => prev.map(() => randomSymbol()));
    }, 80);
    
    setTimeout(() => {
      clearInterval(interval);
      const finalReels = Array.from({ length: REEL_COUNT }, () => randomSymbol());
      setReels(finalReels);
      
      const result = calcScore(finalReels);
      setLastResult(result);
      
      if (result.points > 0) {
        setScores(prev => ({ ...prev, [currentPlayerId]: prev[currentPlayerId] + result.points }));
        if (result.points >= 300) {
          playSound("jackpot"); setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        } else { playSound("win"); }
      }
      
      setSpinning(false);
      
      setTimeout(() => {
        const next = currentPlayerIdx + 1;
        if (next >= gamePlayers.length) {
          if (currentRound + 1 >= ROUNDS_PER_GAME) { setGameOver(true); }
          else { setCurrentRound(r => r + 1); setCurrentPlayerIdx(0); }
        } else { setCurrentPlayerIdx(next); }
        setLastResult(null);
        setKnobY(0);
      }, 1800);
    }, 1500);
  }, [spinning, gameOver, currentPlayerIdx, currentRound, gamePlayers, currentPlayerId]);
  
  // Game Over
  if (gameOver) {
    const sorted = [...gamePlayers].sort((a, b) => scores[b] - scores[a]);
    const winnerId = sorted[0];
    const winner = allPlayers.find(p => p.id === winnerId);
    
    return (
      <div style={{
        minHeight: "100vh",
        background: `radial-gradient(ellipse at 50% 30%, #1a0a2e, ${DARK} 70%)`,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 24,
        fontFamily: "'Noto Sans Hebrew', 'Rubik', sans-serif",
      }}>
        <Confetti active={true} />
        <div style={{
          fontFamily: "'Fredoka One', cursive", fontSize: 32,
          color: GOLD, animation: "pulse 1.5s ease infinite", marginBottom: 12,
        }}>🏆 ניצחון! 🏆</div>
        <AvatarDisplay avatar={winner.avatar} size={100} style={{ marginBottom: 12 }} />
        <div style={{ fontFamily: "'Fredoka One'", fontSize: 24, color: "#fff", marginBottom: 4 }}>
          {winner.name}
        </div>
        <div style={{ fontFamily: "'Fredoka One'", fontSize: 20, color: GOLD, marginBottom: 24 }}>
          🪙 +{pot} מטבעות!
        </div>
        
        <div style={{
          background: CARD, border: `1px solid ${BORDER}`,
          borderRadius: 16, padding: 20, width: "100%", maxWidth: 340, marginBottom: 20,
        }}>
          {sorted.map((pid, i) => {
            const p = allPlayers.find(pl => pl.id === pid);
            return (
              <div key={pid} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 0",
                borderBottom: i < sorted.length - 1 ? `1px solid ${BORDER}` : "none",
              }}>
                <span style={{ fontFamily: "'Fredoka One'", fontSize: 16, color: i===0?GOLD:"#555", width: 28 }}>
                  {["🥇","🥈","🥉","4️⃣","5️⃣"][i]}
                </span>
                <AvatarDisplay avatar={p.avatar} size={30} />
                <span style={{ flex: 1, color: "#ccc", fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                <span style={{ fontFamily: "'Fredoka One'", color: i===0?GOLD:"#888", fontSize: 15 }}>
                  {scores[pid]}
                </span>
              </div>
            );
          })}
        </div>
        
        <button onClick={() => onGameEnd(winnerId, scores)} style={{
          padding: "14px 40px",
          background: `linear-gradient(135deg, ${GOLD}, #B8860B)`,
          color: "#000", border: "none", borderRadius: 14,
          fontFamily: "'Rubik', sans-serif", fontWeight: 800, fontSize: 17,
          cursor: "pointer", boxShadow: `0 4px 20px ${GOLD}33`,
        }}>חזרה ללובי 🎰</button>
      </div>
    );
  }
  
  const sortedScores = [...gamePlayers]
    .map(pid => ({ pid, score: scores[pid] }))
    .sort((a, b) => b.score - a.score);
  
  return (
    <div style={{
      minHeight: "100vh",
      background: `radial-gradient(ellipse at 50% 20%, #1a0a2e, ${DARK} 70%)`,
      padding: "12px",
      fontFamily: "'Noto Sans Hebrew', 'Rubik', sans-serif",
    }}>
      <Confetti active={showConfetti} />
      
      {/* Round indicator */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 8, padding: "0 4px",
      }}>
        <div style={{ fontFamily: "'Fredoka One'", fontSize: 13, color: "#555" }}>
          סיבוב {currentRound + 1}/{ROUNDS_PER_GAME}
        </div>
        <div style={{ display: "flex", gap: 3 }}>
          {Array.from({ length: ROUNDS_PER_GAME }, (_, i) => (
            <div key={i} style={{
              width: 20, height: 5, borderRadius: 3,
              background: i < currentRound ? GREEN : i === currentRound ? GOLD : "#1a1a24",
            }} />
          ))}
        </div>
        <div style={{ fontFamily: "'Fredoka One'", fontSize: 13, color: GOLD }}>
          💰 {pot}
        </div>
      </div>
      
      {/* Players scores */}
      <div style={{
        display: "flex", gap: 6, marginBottom: 12, overflowX: "auto",
        padding: "4px 0",
      }}>
        {sortedScores.map(({ pid }, i) => {
          const p = allPlayers.find(pl => pl.id === pid);
          const isTurn = pid === currentPlayerId;
          return (
            <div key={pid} style={{
              flex: "0 0 auto", minWidth: 72,
              background: isTurn ? `${GOLD}10` : CARD,
              border: `2px solid ${isTurn ? GOLD : BORDER}`,
              borderRadius: 12, padding: "8px 6px",
              textAlign: "center",
              animation: isTurn ? "glow 2s ease infinite" : "none",
            }}>
              <AvatarDisplay avatar={p.avatar} size={32} style={{ margin: "0 auto" }} />
              <div style={{
                color: isTurn ? "#fff" : "#888", fontSize: 11,
                fontWeight: 600, marginTop: 2,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{p.name}</div>
              <div style={{ fontFamily: "'Fredoka One'", fontSize: 14, color: GOLD }}>
                {scores[pid]}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Current turn indicator */}
      <div style={{
        textAlign: "center", marginBottom: 10,
        color: GOLD, fontWeight: 700, fontSize: 14,
      }}>
        תור: {currentPlayer?.avatar?.face} {currentPlayer?.name} — גרור את הסלידר למטה!
      </div>
      
      {/* SLOT MACHINE + HANDLE LAYOUT */}
      <div style={{
        display: "flex", gap: 12, alignItems: "center",
        justifyContent: "center",
      }}>
        {/* Slot machine */}
        <div style={{
          background: `linear-gradient(145deg, #1a1024, #0f0a18)`,
          borderRadius: 20, padding: "20px 16px",
          border: `2px solid #2d1f3d`,
          boxShadow: spinning ? `0 0 40px ${GOLD}22` : "0 8px 30px rgba(0,0,0,0.4)",
          flex: "0 0 auto",
        }}>
          <div style={{
            textAlign: "center", marginBottom: 12,
            fontFamily: "'Fredoka One'", fontSize: 16,
            background: `linear-gradient(90deg, ${GOLD}, #FFA000, ${GOLD})`,
            backgroundSize: "200% auto", animation: "shimmer 3s linear infinite",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>FAMILY SLOTS</div>
          
          <div style={{
            display: "flex", gap: 6, justifyContent: "center",
            padding: "12px 8px",
            background: "rgba(0,0,0,0.4)",
            borderRadius: 14,
            border: "1px solid #1a1a2e",
          }}>
            {reels.map((sym, i) => (
              <div key={i} className={`reel-container ${spinning ? "reel-spinning" : ""}`}>
                <div className="reel-strip" style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                }}>
                  <span style={{ fontSize: 32, lineHeight: "76px", filter: "drop-shadow(0 0 6px rgba(255,255,255,0.2))" }}>
                    {sym}
                  </span>
                  {spinning && (
                    <span style={{ fontSize: 32, lineHeight: "76px" }}>
                      {randomSymbol()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* DRAG HANDLE - on the right */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{
            color: "#444", fontSize: 10, fontWeight: 600,
            fontFamily: "'Rubik', sans-serif",
          }}>↓ גרור ↓</div>
          <div className="slot-handle-track" ref={trackRef}
            style={{ opacity: spinning || gameOver ? 0.3 : 1 }}>
            <div className="slot-handle-knob"
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
              style={{
                top: knobY,
                transition: dragging ? "none" : "top 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              }} />
            {/* Pull zone indicator */}
            <div style={{
              position: "absolute", bottom: 8, left: "50%",
              transform: "translateX(-50%)",
              width: 20, height: 20, borderRadius: "50%",
              background: `${GREEN}20`,
              border: `1px dashed ${GREEN}40`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10,
            }}>✓</div>
          </div>
        </div>
      </div>
      
      {/* Result */}
      {lastResult && lastResult.points > 0 && (
        <div style={{
          textAlign: "center", marginTop: 14,
          animation: "pop 0.4s ease",
        }}>
          <div style={{
            fontFamily: "'Fredoka One'",
            fontSize: lastResult.points >= 300 ? 26 : 20,
            color: lastResult.points >= 300 ? GOLD : GREEN,
            animation: lastResult.points >= 300 ? "pulse 0.5s ease infinite" : "none",
          }}>{lastResult.label}</div>
          <div style={{ fontFamily: "'Fredoka One'", fontSize: 18, color: "#fff", marginTop: 2 }}>
            +{lastResult.points} נקודות!
          </div>
        </div>
      )}
      
      {/* Video placeholders */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(gamePlayers.length, 3)}, 1fr)`,
        gap: 6, marginTop: 16,
      }}>
        {gamePlayers.map(pid => {
          const p = allPlayers.find(pl => pl.id === pid);
          return (
            <div key={pid} className="video-placeholder"
              style={{ height: 80, padding: 8 }}>
              <AvatarDisplay avatar={p.avatar} size={28} />
              <div style={{ color: "#555", fontSize: 10, marginTop: 4 }}>
                📹 {p.name}
              </div>
              <div style={{
                position: "absolute", top: 4, right: 4,
                width: 8, height: 8, borderRadius: "50%",
                background: pid === currentPlayerId ? RED : GREEN,
              }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── LEADERBOARD ──
function LeaderboardScreen({ players, onNavigate }) {
  const sorted = [...players].sort((a, b) => b.totalScore - a.totalScore);
  
  return (
    <div style={{
      minHeight: "100vh",
      background: `radial-gradient(ellipse at 50% 10%, #12081e, ${DARK} 60%)`,
      padding: "20px 16px", paddingBottom: 80,
      fontFamily: "'Noto Sans Hebrew', 'Rubik', sans-serif",
    }}>
      <div style={{
        fontFamily: "'Fredoka One'", fontSize: 24, color: GOLD,
        textAlign: "center", marginBottom: 20,
      }}>🏆 טבלת אלופים</div>
      
      {sorted.map((p, i) => (
        <div key={p.id} style={{
          display: "flex", alignItems: "center", gap: 12,
          background: i === 0 ? `${GOLD}08` : CARD,
          border: `1px solid ${i === 0 ? `${GOLD}25` : BORDER}`,
          borderRadius: 14, padding: "12px 14px", marginBottom: 8,
          animation: `fadeIn 0.3s ease ${i * 0.05}s both`,
        }}>
          <span style={{
            fontFamily: "'Fredoka One'", fontSize: 18,
            color: i < 3 ? GOLD : "#444", width: 30,
          }}>{["🥇","🥈","🥉"][i] || `#${i+1}`}</span>
          <AvatarDisplay avatar={p.avatar} size={40} />
          <div style={{ flex: 1 }}>
            <div style={{ color: "#ddd", fontWeight: 700, fontSize: 14 }}>{p.name}</div>
            <div style={{ color: "#666", fontSize: 11 }}>
              {p.wins}W • {p.gamesPlayed} games
            </div>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontFamily: "'Fredoka One'", fontSize: 15, color: GOLD }}>
              🪙 {p.coins}
            </div>
            <div style={{ color: "#666", fontSize: 10 }}>{p.totalScore} pts</div>
          </div>
        </div>
      ))}
      
      <BottomNav active="leaderboard" onNavigate={onNavigate} />
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState("login");
  const [user, setUser] = useState(null);
  const [allPlayers, setAllPlayers] = useState(FAKE_ONLINE);
  const [gamePlayers, setGamePlayers] = useState([]);
  const [pot, setPot] = useState(0);
  
  const handleLogin = ({ email }) => {
    setScreen("avatar");
  };
  
  const handleAvatarSave = ({ avatar, name, photo }) => {
    const newUser = {
      id: genId(), name, avatar, photo,
      email: "player@gmail.com",
      coins: STARTING_COINS,
      totalScore: 0, wins: 0, gamesPlayed: 0,
      online: true, rank: allPlayers.length + 1,
    };
    setUser(newUser);
    setAllPlayers(prev => [...prev, newUser]);
    setScreen("home");
  };
  
  const handleNavigate = (target) => {
    playSound("click");
    if (target === "profile") { setScreen("avatar-edit"); }
    else { setScreen(target); }
  };
  
  const handleChallenge = (selectedIds) => {
    const playerIds = [user.id, ...selectedIds];
    const totalPot = playerIds.length * ENTRY_FEE;
    
    setAllPlayers(prev => prev.map(p =>
      playerIds.includes(p.id) ? { ...p, coins: p.coins - ENTRY_FEE } : p
    ));
    if (user) setUser(prev => ({ ...prev, coins: prev.coins - ENTRY_FEE }));
    
    setGamePlayers(playerIds);
    setPot(totalPot);
    setScreen("game");
  };
  
  const handleGameEnd = (winnerId, scores) => {
    setAllPlayers(prev => prev.map(p => {
      if (!gamePlayers.includes(p.id)) return p;
      const isWinner = p.id === winnerId;
      return {
        ...p,
        coins: isWinner ? p.coins + pot : p.coins,
        totalScore: p.totalScore + (scores[p.id] || 0),
        wins: isWinner ? p.wins + 1 : p.wins,
        gamesPlayed: p.gamesPlayed + 1,
      };
    }));
    
    if (user) {
      setUser(prev => {
        const isWinner = prev.id === winnerId;
        return {
          ...prev,
          coins: isWinner ? prev.coins + pot : prev.coins,
          totalScore: prev.totalScore + (scores[prev.id] || 0),
          wins: isWinner ? prev.wins + 1 : prev.wins,
          gamesPlayed: prev.gamesPlayed + 1,
        };
      });
    }
    
    setScreen("home");
  };
  
  return (
    <>
      <Head><style dangerouslySetInnerHTML={{ __html: css }} /></Head>
      <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", position: "relative" }}>
        {screen === "login" && <LoginScreen onLogin={handleLogin} />}
        
        {screen === "avatar" && <AvatarCreator onSave={handleAvatarSave} />}
        
        {screen === "avatar-edit" && user && (
          <AvatarCreator initialAvatar={user.avatar} onSave={({ avatar, name, photo }) => {
            setUser(prev => ({ ...prev, avatar, name, photo }));
            setAllPlayers(prev => prev.map(p => p.id === user.id ? { ...p, avatar, name } : p));
            setScreen("home");
          }} />
        )}
        
        {screen === "home" && user && (
          <HomeScreen user={user} allPlayers={allPlayers} onNavigate={handleNavigate} />
        )}
        
        {screen === "casino" && user && (
          <CasinoFloor
            user={user}
            onlinePlayers={allPlayers.filter(p => p.id !== user.id)}
            onChallenge={handleChallenge}
            onNavigate={handleNavigate}
          />
        )}
        
        {screen === "game" && (
          <GameScreen
            gamePlayers={gamePlayers}
            allPlayers={allPlayers}
            pot={pot}
            onGameEnd={handleGameEnd}
          />
        )}
        
        {screen === "leaderboard" && (
          <LeaderboardScreen players={allPlayers} onNavigate={handleNavigate} />
        )}
      </div>
    </>
  );
}
