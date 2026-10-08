"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, RefreshCw, Eye, Move3D, Layers, ShieldCheck, Zap } from "lucide-react";
import * as THREE from "three";

export default function Resend3DDemoPage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isRotating, setIsRotating] = useState(true);
    const [colorMode, setColorMode] = useState<"resend" | "vibrant" | "monochrome">("resend");
    const [shuffleCount, setShuffleCount] = useState(0);

    const isRotatingRef = useRef(isRotating);
    isRotatingRef.current = isRotating;

    const colorModeRef = useRef(colorMode);
    colorModeRef.current = colorMode;

    const shuffleTriggerRef = useRef(0);

    useEffect(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;

        // --- 1. Scene, Camera, Renderer ---
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x050508, 0.04);

        const camera = new THREE.PerspectiveCamera(
            45,
            container.clientWidth / container.clientHeight,
            0.1,
            100
        );
        camera.position.set(0, 0, 7.5);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        container.appendChild(renderer.domElement);

        // --- 2. Lights ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        // キーライト (上方斜め前)
        const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
        keyLight.position.set(5, 8, 5);
        scene.add(keyLight);

        // フィルライト (反対側、ほのかな青紫)
        const fillLight = new THREE.PointLight(0x6366f1, 3.5, 20);
        fillLight.position.set(-6, -4, 4);
        scene.add(fillLight);

        // バックリムライト (後方から輪郭を際立たせる白シアン光)
        const rimLight = new THREE.PointLight(0x38bdf8, 4.0, 20);
        rimLight.position.set(0, 5, -5);
        scene.add(rimLight);

        // --- 3. ルービックキューブ (3x3x3 = 27個の小キューブ) ---
        const rubiksGroup = new THREE.Group();
        scene.add(rubiksGroup);

        const cubeSize = 0.94; // 小キューブサイズ
        const gap = 0.06;      // キューブ間のスリット
        const step = cubeSize + gap; // 1.0

        // 色のパレット定義
        const getPalette = (mode: "resend" | "vibrant" | "monochrome") => {
            if (mode === "vibrant") {
                return {
                    body: 0x111115,
                    right: 0xef4444, // 赤
                    left: 0xf97316,  // オレンジ
                    top: 0xffffff,   // 白
                    bottom: 0xfacc15,// 黄
                    front: 0x10b981, // 緑
                    back: 0x3b82f6   // 青
                };
            }
            if (mode === "monochrome") {
                return {
                    body: 0x09090b,
                    right: 0x71717a,
                    left: 0x52525b,
                    top: 0xf4f4f5,
                    bottom: 0x27272a,
                    front: 0xa1a1aa,
                    back: 0x3f3f46
                };
            }
            // resend スタイル (ダーク＆サイバーメタリック)
            return {
                body: 0x0c0d12,
                right: 0x6366f1, // インディゴ
                left: 0xec4899,  // ネオンピンク
                top: 0xffffff,   // クリスタルホワイト
                bottom: 0x1e293b,// ダークスレート
                front: 0x06b6d4, // シアン
                back: 0x8b5cf6   // パープル
            };
        };

        const pieceMeshes: THREE.Mesh[] = [];

        const createCubeMaterials = (x: number, y: number, z: number, mode: "resend" | "vibrant" | "monochrome") => {
            const pal = getPalette(mode);

            const bodyMat = new THREE.MeshPhysicalMaterial({
                color: pal.body,
                metalness: 0.85,
                roughness: 0.25,
                clearcoat: 0.8,
                clearcoatRoughness: 0.2,
            });

            const makeFaceMat = (faceColor: number) => new THREE.MeshPhysicalMaterial({
                color: faceColor,
                metalness: 0.3,
                roughness: 0.15,
                clearcoat: 1.0,
                clearcoatRoughness: 0.1,
                reflectivity: 0.9,
            });

            return [
                x === 1 ? makeFaceMat(pal.right) : bodyMat,  // +X (右)
                x === -1 ? makeFaceMat(pal.left) : bodyMat,  // -X (左)
                y === 1 ? makeFaceMat(pal.top) : bodyMat,    // +Y (上)
                y === -1 ? makeFaceMat(pal.bottom) : bodyMat,// -Y (下)
                z === 1 ? makeFaceMat(pal.front) : bodyMat,  // +Z (前)
                z === -1 ? makeFaceMat(pal.back) : bodyMat,  // -Z (後)
            ];
        };

        const buildRubiksCube = (mode: "resend" | "vibrant" | "monochrome") => {
            while (rubiksGroup.children.length > 0) {
                rubiksGroup.remove(rubiksGroup.children[0]);
            }
            pieceMeshes.length = 0;

            const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

            for (let x = -1; x <= 1; x++) {
                for (let y = -1; y <= 1; y++) {
                    for (let z = -1; z <= 1; z++) {
                        // 中心核 (0,0,0) は見えないので省略可能だが、一貫性のため配置
                        const materials = createCubeMaterials(x, y, z, mode);
                        const mesh = new THREE.Mesh(geometry, materials);
                        mesh.position.set(x * step, y * step, z * step);
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;
                        mesh.userData = { origX: x, origY: y, origZ: z };
                        rubiksGroup.add(mesh);
                        pieceMeshes.push(mesh);
                    }
                }
            }
        };

        buildRubiksCube(colorModeRef.current);

        // --- 4. マウスインタラクション & ドラッグ回転 ---
        let mouseX = 0;
        let mouseY = 0;
        let targetRotationX = 0.5;
        let targetRotationY = 0.7;

        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };

        const handlePointerMove = (e: MouseEvent | TouchEvent) => {
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

            const rect = container.getBoundingClientRect();
            const x = ((clientX - rect.left) / rect.width) * 2 - 1;
            const y = -(((clientY - rect.top) / rect.height) * 2 - 1);

            mouseX = x * 0.4;
            mouseY = y * 0.4;

            if (isDragging) {
                const deltaX = clientX - previousMousePosition.x;
                const deltaY = clientY - previousMousePosition.y;

                targetRotationY += deltaX * 0.008;
                targetRotationX += deltaY * 0.008;

                previousMousePosition = { x: clientX, y: clientY };
            }
        };

        const handlePointerDown = (e: MouseEvent | TouchEvent) => {
            isDragging = true;
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            previousMousePosition = { x: clientX, y: clientY };
        };

        const handlePointerUp = () => {
            isDragging = false;
        };

        container.addEventListener("mousedown", handlePointerDown);
        container.addEventListener("mousemove", handlePointerMove);
        window.addEventListener("mouseup", handlePointerUp);

        container.addEventListener("touchstart", handlePointerDown, { passive: true });
        container.addEventListener("touchmove", handlePointerMove, { passive: true });
        window.addEventListener("touchend", handlePointerUp);

        // --- 5. リサイズ処理 ---
        const handleResize = () => {
            if (!container) return;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        };
        window.addEventListener("resize", handleResize);

        // --- 6. アニメーションループ ---
        let animationFrameId: number;
        let lastTime = performance.now();

        // スライス回転アニメーション用状態
        let sliceAnimating = false;
        let sliceAngle = 0;
        let sliceAxis = new THREE.Vector3(1, 0, 0);
        let sliceGroup: THREE.Mesh[] = [];

        const startSliceRotation = () => {
            if (sliceAnimating) return;
            const axes = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
            const chosenAxis = axes[Math.floor(Math.random() * axes.length)];
            const chosenLayer = Math.random() > 0.5 ? 1 : -1;

            sliceAxis = chosenAxis;
            sliceGroup = pieceMeshes.filter((m) => {
                const p = m.position;
                if (chosenAxis.x === 1) return Math.abs(p.x - chosenLayer * step) < 0.2;
                if (chosenAxis.y === 1) return Math.abs(p.y - chosenLayer * step) < 0.2;
                if (chosenAxis.z === 1) return Math.abs(p.z - chosenLayer * step) < 0.2;
                return false;
            });

            sliceAngle = 0;
            sliceAnimating = true;
        };

        let lastShuffleVal = 0;

        const animate = (time: number) => {
            animationFrameId = requestAnimationFrame(animate);

            const dt = (time - lastTime) / 1000;
            lastTime = time;

            // シャッフルトリガーの検知
            if (shuffleTriggerRef.current !== lastShuffleVal) {
                lastShuffleVal = shuffleTriggerRef.current;
                startSliceRotation();
            }

            // カラーモード変更の検知
            if (colorModeRef.current !== colorMode) {
                buildRubiksCube(colorModeRef.current);
            }

            // スライス（レイヤー）の回転アニメーション
            if (sliceAnimating) {
                const turnSpeed = Math.PI * 2.5; // 90度をサクッと回転
                const stepAngle = turnSpeed * dt;
                sliceAngle += stepAngle;

                const q = new THREE.Quaternion().setFromAxisAngle(sliceAxis, stepAngle);
                sliceGroup.forEach((mesh) => {
                    mesh.position.applyQuaternion(q);
                    mesh.quaternion.premultiply(q);
                });

                if (sliceAngle >= Math.PI / 2) {
                    // 90度回転完了時に座標をグリッドにスナップ
                    const diff = sliceAngle - Math.PI / 2;
                    const finalQ = new THREE.Quaternion().setFromAxisAngle(sliceAxis, -diff);
                    sliceGroup.forEach((mesh) => {
                        mesh.position.applyQuaternion(finalQ);
                        mesh.quaternion.premultiply(finalQ);
                        mesh.position.x = Math.round(mesh.position.x / step) * step;
                        mesh.position.y = Math.round(mesh.position.y / step) * step;
                        mesh.position.z = Math.round(mesh.position.z / step) * step;
                    });
                    sliceAnimating = false;
                }
            }

            // 自動自転
            if (isRotatingRef.current && !isDragging) {
                targetRotationY += 0.45 * dt;
                targetRotationX += 0.25 * dt;
            }

            // マウス追従補間 (Lerp)
            rubiksGroup.rotation.y += (targetRotationY + mouseX - rubiksGroup.rotation.y) * 0.08;
            rubiksGroup.rotation.x += (targetRotationX + mouseY - rubiksGroup.rotation.x) * 0.08;

            // 浮遊上下アニメーション
            rubiksGroup.position.y = Math.sin(time * 0.0015) * 0.12;

            renderer.render(scene, camera);
        };

        animate(performance.now());

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("mouseup", handlePointerUp);
            window.removeEventListener("touchend", handlePointerUp);
            container.removeEventListener("mousedown", handlePointerDown);
            container.removeEventListener("mousemove", handlePointerMove);
            container.removeEventListener("touchstart", handlePointerDown);
            container.removeEventListener("touchmove", handlePointerMove);
            renderer.dispose();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };
    }, []);

    const triggerShuffle = () => {
        shuffleTriggerRef.current += 1;
        setShuffleCount((prev) => prev + 1);
    };

    return (
        <div className="min-h-screen bg-[#050508] text-white flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden font-sans">
            
            {/* 1. 背景グリッドとアンビエントライティング (Resend Style) */}
            <div 
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                    backgroundImage: `
                        linear-gradient(to right, rgba(255, 255, 255, 0.07) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255, 255, 255, 0.07) 1px, transparent 1px)
                    `,
                    backgroundSize: '40px 40px'
                }}
            />
            {/* 上部中央のグラデーショングロー */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-indigo-600/20 via-sky-500/10 to-transparent blur-[120px] pointer-events-none" />
            
            {/* 2. ヘッダーナビゲーション */}
            <header className="relative z-20 px-6 py-5 flex items-center justify-between border-b border-white/[0.08] backdrop-blur-md bg-black/30">
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-white/80 hover:text-white transition-all group"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 text-white/60 group-hover:-translate-x-0.5 transition-transform" />
                        <span>管理画面へ戻る</span>
                    </Link>
                    <span className="text-white/20 text-xs">|</span>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-mono tracking-wider text-white/70 uppercase">
                            Resend 3D Experience Lab
                        </span>
                    </div>
                </div>

                <div className="hidden sm:flex items-center gap-3 text-xs text-white/60">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                        <Move3D className="w-3.5 h-3.5 text-sky-400" />
                        <span>ドラッグで360°回転</span>
                    </span>
                </div>
            </header>

            {/* 3. メインビジュアルエリア */}
            <main className="relative flex-1 flex flex-col items-center justify-center px-4 py-8 z-10">
                
                {/* ヒーロータイトル帯 */}
                <div className="text-center max-w-xl mx-auto mb-4 pointer-events-none select-none">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-sky-500/10 border border-white/10 text-[11px] font-semibold text-white/80 mb-3 backdrop-blur-md">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Next.js ＋ Three.js WebGL Engine</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-b from-white via-white/90 to-white/40 bg-clip-text text-transparent pb-1">
                        インタラクティブ 3D キューブ
                    </h1>
                    <p className="text-xs sm:text-sm text-white/60 mt-2 leading-relaxed">
                        マウスを動かすと視点が追従し、ドラッグで自由に回転できます。<br />
                        ボタン操作でカチャッとスライス回転（シャッフル）させることが可能です。
                    </p>
                </div>

                {/* 3D キャンバス配置コンテナ */}
                <div 
                    ref={containerRef}
                    className="w-full max-w-2xl h-[360px] sm:h-[420px] md:h-[460px] cursor-grab active:cursor-grabbing relative"
                    title="ドラッグして回転 / マウスで傾き追従"
                />

                {/* コントロールパネル (フロートドック) */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 p-2 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-2xl z-20">
                    
                    {/* シャッフル (スライス回転) */}
                    <button
                        onClick={triggerShuffle}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-xs font-bold transition-all text-white shadow-lg shadow-indigo-600/30"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>1面カチャッと回す</span>
                    </button>

                    {/* 自動回転 トグル */}
                    <button
                        onClick={() => setIsRotating(!isRotating)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${
                            isRotating 
                                ? "bg-white/10 border-white/20 text-white" 
                                : "bg-transparent border-white/10 text-white/60 hover:text-white"
                        }`}
                    >
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>自動自転: {isRotating ? "ON" : "OFF"}</span>
                    </button>

                    {/* スタイル切替 */}
                    <div className="flex items-center bg-black/40 rounded-xl p-0.5 border border-white/10 text-xs">
                        <button
                            onClick={() => { setColorMode("resend"); colorModeRef.current = "resend"; }}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                                colorMode === "resend" 
                                    ? "bg-white/15 text-white font-bold" 
                                    : "text-white/50 hover:text-white"
                            }`}
                        >
                            Resend Cyber
                        </button>
                        <button
                            onClick={() => { setColorMode("vibrant"); colorModeRef.current = "vibrant"; }}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                                colorMode === "vibrant" 
                                    ? "bg-white/15 text-white font-bold" 
                                    : "text-white/50 hover:text-white"
                            }`}
                        >
                            Classic
                        </button>
                        <button
                            onClick={() => { setColorMode("monochrome"); colorModeRef.current = "monochrome"; }}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                                colorMode === "monochrome" 
                                    ? "bg-white/15 text-white font-bold" 
                                    : "text-white/50 hover:text-white"
                            }`}
                        >
                            Monochrome
                        </button>
                    </div>
                </div>

            </main>

            {/* 4. フッター */}
            <footer className="relative z-20 px-6 py-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between text-[11px] text-white/40 gap-2">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>MIERIS 管理者専用 実験室（Sandbox）</span>
                </div>
                <span>Inspired by Resend.com Design System</span>
            </footer>

        </div>
    );
}
