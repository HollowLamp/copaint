import { fabric } from 'fabric';
import { useCallback, useRef, useState } from 'react';
import { JSON_KEYS } from '../../utils/constants';

export const useHistory = ({ canvas, saveCallback }) => {
  const [historyIndex, setHistoryIndex] = useState(0);
  const canvasHistory = useRef([]);
  const skipSave = useRef(false);

  // 是否可以撤销
  const canUndo = useCallback(() => {
    return historyIndex > 0;
  }, [historyIndex]);

  // 是否可以重做
  const canRedo = useCallback(() => {
    return historyIndex < canvasHistory.current.length - 1;
  }, [historyIndex]);

  // 保存当前状态到历史记录
  const save = useCallback(
    (skip = false) => {
      if (!canvas) return;

      const currentState = canvas.toJSON(JSON_KEYS);
      const json = JSON.stringify(currentState);

      if (!skip && !skipSave.current) {
        canvasHistory.current.push(json);
        setHistoryIndex(canvasHistory.current.length - 1);
      }

      // 只有在不跳过保存时才调用saveCallback
      if (!skip && !skipSave.current) {
        const workspace = canvas.getObjects().find((obj) => obj.name === 'clip');
        const height = workspace?.height || 0;
        const width = workspace?.width || 0;

        saveCallback?.({ json, height, width });
      }
    },
    [canvas, saveCallback]
  );

  // 撤销上一步操作
  const undo = useCallback(() => {
    if (canUndo()) {
      skipSave.current = true;
      canvas?.clear().renderAll();

      const previousIndex = historyIndex - 1;
      const previousState = JSON.parse(canvasHistory.current[previousIndex]);

      canvas?.loadFromJSON(previousState, () => {
        // 确保workspace存在并设置为clipPath
        const workspace = canvas.getObjects().find((obj) => obj.name === 'clip');
        if (workspace) {
          // 确保workspace不可选择和编辑
          workspace.set({
            selectable: false,
            hasControls: false,
            evented: false
          });
          // 设置为clipPath
          canvas.clipPath = workspace;
          // 确保workspace在最底层
          canvas.sendToBack(workspace);
        }

        canvas.renderAll();
        setHistoryIndex(previousIndex);
        skipSave.current = false;
      });
    }
  }, [canUndo, canvas, historyIndex]);

  // 重做撤销的操作
  const redo = useCallback(() => {
    if (canRedo()) {
      skipSave.current = true;
      canvas?.clear().renderAll();

      const nextIndex = historyIndex + 1;
      const nextState = JSON.parse(canvasHistory.current[nextIndex]);

      canvas?.loadFromJSON(nextState, () => {
        // 确保workspace存在并设置为clipPath
        const workspace = canvas.getObjects().find((obj) => obj.name === 'clip');
        if (workspace) {
          // 确保workspace不可选择和编辑
          workspace.set({
            selectable: false,
            hasControls: false,
            evented: false
          });
          // 设置为clipPath
          canvas.clipPath = workspace;
          // 确保workspace在最底层
          canvas.sendToBack(workspace);
        }

        canvas.renderAll();
        setHistoryIndex(nextIndex);
        skipSave.current = false;
      });
    }
  }, [canvas, historyIndex, canRedo]);

  return {
    save,
    canUndo,
    canRedo,
    undo,
    redo,
    setHistoryIndex,
    canvasHistory,
  };
};
