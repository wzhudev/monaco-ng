const prefix = '@silicic/monaco-ng:';

export function getMonacoScriptsCannotBeLoadedError(source: string): Error {
  return new Error(
    `${prefix} cannot load assets of monaco editor from ${source}.`
  );
}
