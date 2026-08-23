// Isolated Monaco entry point. Everything Monaco-related is imported here so
// that React.lazy() can pull it in as a separate chunk on first use instead of
// weighing down the initial app bundle.
import React from 'react';
import Editor from '@monaco-editor/react';
import '../../monacoSetup';

export default function MonacoEditor(props) {
  return <Editor {...props} />;
}
