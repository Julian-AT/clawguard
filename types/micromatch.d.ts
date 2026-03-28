declare module "micromatch" {
  const micromatch: {
    isMatch: (input: string, pattern: string, options?: { dot?: boolean }) => boolean;
  };
  export default micromatch;
}
