import SkillTreeBackground from './components/SkillTreeBackground';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 relative overflow-hidden">
      <SkillTreeBackground />
      <div className="text-center text-white relative z-10">
        <h1 className="text-7xl font-bold mb-4 tracking-wider" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.15em', textShadow: '0 0 30px rgba(255,255,255,0.5), 0 0 60px rgba(139,92,246,0.3)' }}>
          PATHFINDER
        </h1>
        <p className="text-xl mb-8">あなたの成長を可視化するスキルツリーRPG</p>
        <div className="space-x-4">
          <a
            href="/login"
            className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition inline-block"
          >
            はじめる
          </a>
        </div>
      </div>
    </div>
  );
}
