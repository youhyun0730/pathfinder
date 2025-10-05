// Pathfinder color scheme
export const colors = {
  // Node types
  nodeTypes: {
    center: '#FFD700',    // Gold for center/current position
    current: '#4A90E2',   // Blue for current skills
    skill: '#7ED321',     // Green for skills to learn
    cert: '#9013FE',      // Purple for certifications
    position: '#F5A623',  // Orange for job positions
    goal: '#FF6B9D',      // Pink for goals
  },

  // UI gradients
  gradients: {
    primary: 'from-blue-500 to-purple-600',
    secondary: 'from-purple-500 to-pink-500',
    success: 'from-green-500 to-teal-600',
    warning: 'from-orange-500 to-red-500',
    goal: 'from-purple-600 to-indigo-700',
  },

  // State colors
  states: {
    locked: 'opacity-60',
    unlocked: 'opacity-100',
    highlighted: '#FFD700',
    hover: 'opacity-90',
  },

  // Background colors
  backgrounds: {
    main: 'bg-gradient-to-br from-blue-500 to-purple-600',
    goal: 'bg-gradient-to-br from-purple-600 to-indigo-700',
    card: 'bg-white/95',
    overlay: 'bg-white/10',
  },
} as const;

// Helper function to get node color by type
export function getNodeColor(nodeType: string): string {
  return colors.nodeTypes[nodeType as keyof typeof colors.nodeTypes] || colors.nodeTypes.skill;
}

// Helper function to get gradient by name
export function getGradient(name: keyof typeof colors.gradients): string {
  return colors.gradients[name];
}
