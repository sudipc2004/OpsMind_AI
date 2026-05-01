import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere, MeshDistortMaterial, PerspectiveCamera, OrbitControls, Text, MeshWobbleMaterial } from '@react-three/drei';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Zap, Database, Cpu } from 'lucide-react';

const Scene = () => {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 8]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#6E56CF" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00E5FF" />
      
      <Float speed={2} rotationIntensity={1} floatIntensity={2}>
        <Sphere args={[1.5, 64, 64]} position={[0, 0, 0]}>
          <MeshDistortMaterial
            color="#13111C"
            attach="material"
            distort={0.4}
            speed={4}
            roughness={0.2}
            metalness={1}
            emissive="#6E56CF"
            emissiveIntensity={0.2}
          />
        </Sphere>
      </Float>

      <mesh position={[0, 0, -2]}>
        <planeGeometry args={[20, 20]} />
        <MeshWobbleMaterial
          color="#0B0A10"
          factor={0.1}
          speed={1}
          opacity={0.5}
          transparent
        />
      </mesh>
    </>
  );
};

const Landing = ({ onEnter }) => {
  return (
    <div className="relative w-full h-screen bg-[#0B0A10] overflow-hidden">
      {/* 3D Background */}
      <div className="absolute inset-0 z-0">
        <Canvas>
          <Scene />
        </Canvas>
      </div>

      {/* Overlay Content */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="flex flex-col items-center text-center max-w-4xl"
        >
          {/* Logo Section */}
          <div className="relative mb-10">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-4 bg-gradient-to-r from-railway-accent to-cyan-400 rounded-full blur-xl opacity-20"
            />
            <div className="relative bg-[#13111C] p-6 rounded-2xl border border-white/10 shadow-2xl">
              <img src="/logo.png" alt="OpsMind" className="w-20 h-20 object-contain" />
            </div>
          </div>

          <h1 className="text-6xl md:text-8xl font-serif text-white font-medium tracking-tight mb-6">
            Ops<span className="text-railway-accent">Mind</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-400 font-light mb-12 max-w-2xl leading-relaxed">
            The intelligent command center for <span className="text-white">Enterprise Standard Operating Procedures</span>. 
            Real-time RAG, multi-engine AI, and automated compliance.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 mb-20">
            <Feature icon={<Shield size={18} />} text="Secure Auditing" />
            <Feature icon={<Zap size={18} />} text="Low Latency" />
            <Feature icon={<Database size={18} />} text="Vector Search" />
            <Feature icon={<Cpu size={18} />} text="Multi-LLM" />
          </div>

          <motion.button
            whileHover={{ scale: 1.05, shadow: "0 0 30px rgba(110,86,207,0.4)" }}
            whileTap={{ scale: 0.95 }}
            onClick={onEnter}
            className="group flex items-center gap-3 px-10 py-5 bg-white text-[#0B0A10] rounded-full text-lg font-bold shadow-2xl transition-all"
          >
            Enter Command Center
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </motion.div>

        {/* Floating Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-50"></div>
      </div>
      
      {/* Footer Branding */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center text-[10px] font-mono text-gray-600 uppercase tracking-[0.3em]">
        OpsMind Enterprise Platform © 2026
      </div>
    </div>
  );
};

const Feature = ({ icon, text }) => (
  <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/5 bg-white/5 backdrop-blur-sm text-sm text-gray-300 font-mono">
    <span className="text-railway-accent">{icon}</span>
    {text}
  </div>
);

export default Landing;
