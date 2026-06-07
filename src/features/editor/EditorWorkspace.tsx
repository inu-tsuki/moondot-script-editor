import type { ReactNode } from 'react';

type EditorWorkspaceProps = {
  sceneNavigator: ReactNode;
  scriptEditor: ReactNode;
  exportBar: ReactNode;
};

/**
 * Editor workspace wrapper.
 *
 * Vertical flex layout: scene navigator → script editor (flex-1, scrollable)
 * → export bar.  Contains no business logic — pure layout composition.
 */
export function EditorWorkspace({ sceneNavigator, scriptEditor, exportBar }: EditorWorkspaceProps) {
  return (
    <>
      {sceneNavigator}
      <div className="flex-1 min-h-0">{scriptEditor}</div>
      {exportBar}
    </>
  );
}
