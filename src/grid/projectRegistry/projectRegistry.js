export const PROJECT_REGISTRY = [
  {
    id: 'meridian-port',
    name: 'Meridian Port',
    status: 'Active',
    accent: 'orange',
    icon: '/meridian-checklist-icon.svg',
    summary: 'Mission-control surface for Meridian readiness, smoke evidence, prompts, reports, and audio.',
    sections: ['readiness', 'smoke tests', 'evidence', 'reports'],
  },
];

export function getActiveProject(activePortId) {
  return PROJECT_REGISTRY.find((project) => project.id === activePortId) || PROJECT_REGISTRY[0];
}
