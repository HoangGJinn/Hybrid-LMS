export const aiGenerateKeys = {
  knowledgeComponents: (documentIds: string[]) =>
    [
      'ai-generate',
      'knowledge-components',
      ...[...documentIds].sort(),
    ] as const,
};
