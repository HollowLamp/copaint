import { fabric } from 'fabric';
import { useEvent } from 'react-use';

export const useHotkeys = ({ canvas, undo, redo, save, copy, paste, hasEditPermission = true }) => {
  useEvent('keydown', (event) => {
    const isCtrlKey = event.ctrlKey || event.metaKey;
    const isBackspace = event.key === 'Backspace';

    const isInput = ['INPUT', 'TEXTAREA'].includes(event.target.tagName);

    if (isInput) return;

    // 删除选中的对象（需要编辑权限）
    if (isBackspace && hasEditPermission) {
      canvas?.remove(...canvas.getActiveObjects());
      canvas?.discardActiveObject();
    }

    // 撤销（Ctrl+Z）（需要编辑权限）
    if (isCtrlKey && event.key === 'z' && hasEditPermission) {
      event.preventDefault();
      undo();
    }

    // 重做（Ctrl+Y）（需要编辑权限）
    if (isCtrlKey && event.key === 'y' && hasEditPermission) {
      event.preventDefault();
      redo();
    }

    // 复制（Ctrl+C）（允许只读用户复制）
    if (isCtrlKey && event.key === 'c') {
      event.preventDefault();
      copy();
    }

    // 粘贴（Ctrl+V）（需要编辑权限）
    if (isCtrlKey && event.key === 'v' && hasEditPermission) {
      event.preventDefault();
      paste();
    }

    // 保存（Ctrl+S）（需要编辑权限）
    if (isCtrlKey && event.key === 's' && hasEditPermission) {
      event.preventDefault();
      save(true);
    }

    // 全选（Ctrl+A）（允许只读用户查看选择）
    if (isCtrlKey && event.key === 'a') {
      event.preventDefault();
      canvas?.discardActiveObject();

      const allObjects = canvas?.getObjects().filter((obj) => obj.selectable);

      canvas?.setActiveObject(new fabric.ActiveSelection(allObjects, { canvas }));
      canvas?.renderAll();
    }
  });
};
