export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="text-center text-white">
        <h1 className="text-6xl font-bold mb-4">Pathfinder</h1>
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
