export const isLocalPreview = (): boolean => (
  import.meta.env.DEV && import.meta.env.MODE === 'preview'
);
