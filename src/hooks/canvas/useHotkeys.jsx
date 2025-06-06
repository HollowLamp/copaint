import { fabric } from 'fabric';
import { useEvent } from 'react-use';

export const useHotkeys = ({ canvas, undo, redo, save, copy, paste }) => {
  useEvent('keydown', (event) => {
    const isCtrlKey = event.ctrlKey || event.metaKey;
    const isBackspace = event.key === 'Backspace';

    const isInput = ['INPUT', 'TEXTAREA'].includes(event.target.tagName);

    if (isInput) return;

    // 删除选中的对象
    if (isBackspace) {
      canvas?.remove(...canvas.getActiveObjects());
      canvas?.discardActiveObject();
    }

    // 撤销（Ctrl+Z）
    if (isCtrlKey && event.key === 'z') {
      event.preventDefault();
      undo();
    }

    // 重做（Ctrl+Y）
    if (isCtrlKey && event.key === 'y') {
      event.preventDefault();
      redo();
    }

    // 复制（Ctrl+C）
    if (isCtrlKey && event.key === 'c') {
      event.preventDefault();
      copy();
    }

    // 粘贴（Ctrl+V）
    if (isCtrlKey && event.key === 'v') {
      event.preventDefault();
      paste();
    }

    // 保存（Ctrl+S）
    if (isCtrlKey && event.key === 's') {
      event.preventDefault();
      save(true);
    }

    // 全选（Ctrl+A）
    if (isCtrlKey && event.key === 'a') {
      event.preventDefault();
      canvas?.discardActiveObject();

      const allObjects = canvas?.getObjects().filter((obj) => obj.selectable);

      canvas?.setActiveObject(new fabric.ActiveSelection(allObjects, { canvas }));
      canvas?.renderAll();
    }
  });
};
