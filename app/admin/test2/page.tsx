"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, RotateCcw, ShieldCheck, Sparkles, Box } from "lucide-react";
import * as THREE from "three";

export default function LoadingCubeDemoPage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [progress, setProgress] = useState(0);
    const [statusIndex, setStatusIndex] = useState(0);
    const [isComplete, setIsComplete] = useState(false);

    const isCompleteRef = useRef(false);
    isCompleteRef.current = isComplete;

    const statusSteps = [
        "暗号化通信を確立中... [TLS 1.3 Verified]",
        "国税庁 法人登記データベース突合中...",
        "全国加盟企業 未払い・遅延レコード照合中...",
        "多角的与信リスクスコア解析中...",
        "【照会完了】リスク検知なし：正常稼働中"
    ];

    // プログレスバーとステータス進行シミュレーション
    useEffect(() => {
        let currentP = 0;
        const interval = setInterval(() => {
            currentP += 1.5;
            if (currentP >= 100) {
                currentP = 100;
                setProgress(100);
                setIsComplete(true);
                setStatusIndex(4);
                clearInterval(interval);
            } else {
                setProgress(Math.floor(currentP));
                if (currentP < 25) setStatusIndex(0);
                else if (currentP < 55) setStatusIndex(1);
                else if (currentP < 80) setStatusIndex(2);
                else setStatusIndex(3);
            }
        }, 50);

        return () => clearInterval(interval);
    }, []);

    const resetSimulation = () => {
        setIsComplete(false);
        setProgress(0);
        setStatusIndex(0);
        let currentP = 0;
        const interval = setInterval(() => {
            currentP += 1.5;
            if (currentP >= 100) {
                currentP = 100;
                setProgress(100);
                setIsComplete(true);
                setStatusIndex(4);
                clearInterval(interval);
            } else {
                setProgress(Math.floor(currentP));
                if (currentP < 25) setStatusIndex(0);
                else if (currentP < 55) setStatusIndex(1);
                else if (currentP < 80) setStatusIndex(2);
                else setStatusIndex(3);
            }
        }, 50);
    };

    // --- Three.js 3D ローディングキューブ ---
    useEffect(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x050508, 0.05);

        const camera = new THREE.PerspectiveCamera(
            45,
            container.clientWidth / container.clientHeight,
            0.1,
            100
        );
        camera.position.set(0, 0, 7.2);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.3;

        container.appendChild(renderer.domElement);

        // ライティング
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
        scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
        keyLight.position.set(5, 8, 5);
        scene.add(keyLight);

        const cyanLight = new THREE.PointLight(0x00f0ff, 4.0, 15);
        cyanLight.position.set(-5, -4, 4);
        scene.add(cyanLight);

        const purpleLight = new THREE.PointLight(0xa855f7, 3.5, 15);
        purpleLight.position.set(5, -4, -4);
        scene.add(purpleLight);

        // キューブグループ
        const rubiksGroup = new THREE.Group();
        scene.add(rubiksGroup);

        const cubeSize = 0.94;
        const gap = 0.06;
        const step = cubeSize + gap; // 1.0

        // ロゴテクスチャ生成
        let frontCanvasTexture: THREE.CanvasTexture | null = null;
        let backCanvasTexture: THREE.CanvasTexture | null = null;

        const createLogoTexture = (imgSrc: string, callback: (tex: THREE.CanvasTexture) => void) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = 768;
                canvas.height = 768;
                const ctx = canvas.getContext("2d")!;

                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, 768, 768);

                const grad = ctx.createRadialGradient(384, 384, 120, 384, 384, 384);
                grad.addColorStop(0, "rgba(255, 255, 255, 1)");
                grad.addColorStop(1, "rgba(241, 245, 249, 1)");
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, 768, 768);

                const pad = 96;
                ctx.drawImage(img, pad, pad, 768 - pad * 2, 768 - pad * 2);

                const tex = new THREE.CanvasTexture(canvas);
                tex.generateMipmaps = true;
                tex.minFilter = THREE.LinearMipmapLinearFilter;
                callback(tex);
            };
            img.src = imgSrc;
        };

        const pieceMeshes: THREE.Mesh[] = [];

        const createMaterials = (x: number, y: number, z: number) => {
            const bodyMat = new THREE.MeshPhysicalMaterial({
                color: 0x090a0f,
                metalness: 0.85,
                roughness: 0.2,
                clearcoat: 0.9,
            });

            const makeFaceMat = (col: number) => new THREE.MeshPhysicalMaterial({
                color: col,
                metalness: 0.25,
                roughness: 0.15,
                clearcoat: 1.0,
            });

            // 正面: ミエリスシンボル
            let frontMat: THREE.Material = makeFaceMat(0x00f0ff);
            if (z === 1 && frontCanvasTexture) {
                const tex = frontCanvasTexture.clone();
                tex.repeat.set(1 / 3, 1 / 3);
                tex.offset.set((x + 1) / 3, (y + 1) / 3);
                tex.needsUpdate = true;
                frontMat = new THREE.MeshPhysicalMaterial({
                    map: tex,
                    metalness: 0.1,
                    roughness: 0.15,
                    clearcoat: 1.0,
                });
            }

            // 裏面: ミエリスブランドロゴ
            let backMat: THREE.Material = makeFaceMat(0x6366f1);
            if (z === -1 && backCanvasTexture) {
                const tex = backCanvasTexture.clone();
                tex.repeat.set(1 / 3, 1 / 3);
                tex.offset.set((1 - x) / 3, (y + 1) / 3);
                tex.needsUpdate = true;
                backMat = new THREE.MeshPhysicalMaterial({
                    map: tex,
                    metalness: 0.1,
                    roughness: 0.15,
                    clearcoat: 1.0,
                });
            }

            return [
                x === 1 ? makeFaceMat(0x38bdf8) : bodyMat,  // 右
                x === -1 ? makeFaceMat(0xa855f7) : bodyMat, // 左
                y === 1 ? makeFaceMat(0xf8fafc) : bodyMat,  // 上
                y === -1 ? makeFaceMat(0x1e293b) : bodyMat, // 下
                z === 1 ? frontMat : bodyMat,               // 前 (ロゴ)
                z === -1 ? backMat : bodyMat,               // 後 (ロゴ)
            ];
        };

        const buildRubiksCube = () => {
            while (rubiksGroup.children.length > 0) {
                rubiksGroup.remove(rubiksGroup.children[0]);
            }
            pieceMeshes.length = 0;

            const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

            for (let x = -1; x <= 1; x++) {
                for (let y = -1; y <= 1; y++) {
                    for (let z = -1; z <= 1; z++) {
                        const materials = createMaterials(x, y, z);
                        const mesh = new THREE.Mesh(geometry, materials);
                        mesh.position.set(x * step, y * step, z * step);
                        mesh.castShadow = true;
                        mesh.userData = { origX: x, origY: y, origZ: z };
                        rubiksGroup.add(mesh);
                        pieceMeshes.push(mesh);
                    }
                }
            }
        };

        buildRubiksCube();

        createLogoTexture("/logo-mark.png", (tex) => {
            frontCanvasTexture = tex;
            buildRubiksCube();
        });
        createLogoTexture("/logo-brand.png", (tex) => {
            backCanvasTexture = tex;
            buildRubiksCube();
        });

        // --- 自動高速スピン演出 (ローディング) ---
        let sliceAnimating = false;
        let sliceAngle = 0;
        let sliceAxis = new THREE.Vector3(1, 0, 0);
        let sliceGroup: THREE.Mesh[] = [];
        let timeSinceLastSlice = 0;

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

        // アニメーションループ
        let animationFrameId: number;
        let lastTime = performance.now();
        let targetRotationY = 0.25;
        let targetRotationX = 0.15;

        const animate = (time: number) => {
            animationFrameId = requestAnimationFrame(animate);

            const dt = (time - lastTime) / 1000;
            lastTime = time;

            const completed = isCompleteRef.current;

            if (!completed) {
                // ローディング中：高速自転 ＆ 0.3秒おきに連続スライス回転
                timeSinceLastSlice += dt;
                if (timeSinceLastSlice > 0.35 && !sliceAnimating) {
                    timeSinceLastSlice = 0;
                    startSliceRotation();
                }

                targetRotationY += 1.4 * dt;
                targetRotationX += 0.8 * dt;
            } else {
                // 完了後：正面を向いてゆったり優雅にアイドリング
                targetRotationY = 0.25;
                targetRotationX = 0.15;
            }

            // スライス回転アニメーション (高速でカチャッと回る)
            if (sliceAnimating) {
                const turnSpeed = Math.PI * 5.0; // 超高速スピン
                const stepAngle = turnSpeed * dt;
                sliceAngle += stepAngle;

                const q = new THREE.Quaternion().setFromAxisAngle(sliceAxis, stepAngle);
                sliceGroup.forEach((mesh) => {
                    mesh.position.applyQuaternion(q);
                    mesh.quaternion.premultiply(q);
                });

                if (sliceAngle >= Math.PI / 2) {
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

            // 全体回転の補間
            rubiksGroup.rotation.y += (targetRotationY - rubiksGroup.rotation.y) * 0.1;
            rubiksGroup.rotation.x += (targetRotationX - rubiksGroup.rotation.x) * 0.1;

            // 浮遊上下アニメーション
            rubiksGroup.position.y = Math.sin(time * 0.003) * 0.1;

            renderer.render(scene, camera);
        };

        animate(performance.now());

        const handleResize = () => {
            if (!container) return;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        };
        window.addEventListener("resize", handleResize);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener("resize", handleResize);
            renderer.dispose();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };
    }, []);

    return (
        <div className="h-screen w-screen bg-[#050508] text-white flex flex-col items-center justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden font-sans p-6 sm:p-10">
            
            {/* 1. 背景グリッドとアンビエントライティング */}
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
            {/* 中央のグラデーショングロー (完了時はグリーン、ローディング中はブルー紫) */}
            <div 
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] blur-[140px] pointer-events-none transition-all duration-1000 ${
                    isComplete 
                        ? "bg-gradient-to-b from-emerald-500/20 via-teal-500/10 to-transparent" 
                        : "bg-gradient-to-b from-cyan-500/20 via-indigo-500/15 to-transparent"
                }`} 
            />

            {/* 2. ヘッダーナビゲーション (戻る / testへのリンク) */}
            <header className="w-full max-w-4xl flex items-center justify-between z-30 relative">
                <Link
                    href="/admin"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-white/60 hover:text-white transition-all backdrop-blur-md"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>管理トップへ</span>
                </Link>

                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/test"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-white/60 hover:text-white transition-all backdrop-blur-md"
                    >
                        <Box className="w-3.5 h-3.5 text-indigo-400" />
                        <span>test (自由操作版) へ</span>
                    </Link>
                </div>
            </header>

            {/* 3. 中央: 3D ルービックキューブ (ローディング演出) */}
            <main className="flex-1 w-full flex flex-col items-center justify-center relative z-20">
                
                {/* 3D キャンバス */}
                <div 
                    ref={containerRef}
                    className="w-full max-w-md h-[300px] sm:h-[360px] relative pointer-events-none"
                />

                {/* ローディングステータス & プログレスバー UI */}
                <div className="w-full max-w-md px-4 mt-2 flex flex-col items-center text-center">
                    
                    {/* ステータステキスト */}
                    <div className="flex items-center gap-2 mb-3">
                        {isComplete ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
                        ) : (
                            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                        )}
                        <span className={`text-xs sm:text-sm font-mono tracking-wider font-semibold transition-colors duration-300 ${
                            isComplete ? "text-emerald-400" : "text-white/80"
                        }`}>
                            {statusSteps[statusIndex]}
                        </span>
                    </div>

                    {/* プログレスバー */}
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden relative mb-2">
                        <div 
                            className={`h-full transition-all duration-150 ease-out rounded-full ${
                                isComplete 
                                    ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" 
                                    : "bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 shadow-[0_0_12px_rgba(6,182,212,0.8)]"
                            }`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* パーセンテージ表示 */}
                    <div className="w-full flex items-center justify-between text-[11px] font-mono text-white/40">
                        <span>DATA PIPELINE</span>
                        <span className="font-bold text-white/70">{progress}%</span>
                    </div>

                    {/* 完了時のリトライボタン */}
                    {isComplete && (
                        <button
                            onClick={resetSimulation}
                            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 text-xs font-bold text-white transition-all shadow-lg animate-fade-in"
                        >
                            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                            <span>ローディングを再実行する</span>
                        </button>
                    )}
                </div>

            </main>

            {/* 4. フッター */}
            <footer className="w-full max-w-4xl flex items-center justify-between text-[11px] text-white/40 z-30 relative">
                <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>MIERIS 3D Data Pipeline Engine</span>
                </div>
                <span>Inspired by Resend 3D Experience</span>
            </footer>

        </div>
    );
}
