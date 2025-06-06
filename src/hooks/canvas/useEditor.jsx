import { fabric } from 'fabric';
import { useCallback, useState, useMemo, useRef } from 'react';

import {
  FILL_COLOR,
  STROKE_WIDTH,
  STROKE_COLOR,
  CIRCLE_OPTIONS,
  DIAMOND_OPTIONS,
  TRIANGLE_OPTIONS,
  RECTANGLE_OPTIONS,
  STROKE_DASH_ARRAY,
  TEXT_OPTIONS,
  FONT_FAMILY,
  FONT_WEIGHT,
  FONT_SIZE,
  JSON_KEYS,
} from '../../utils/constants';

import { useHistory } from './useHistory';
import { createFilter, downloadFile, isTextType, transformText } from '../../utils/utils';
import { useHotkeys } from './useHotkeys';
import { useClipboard } from './useClipboard';
import { useAutoResize } from './useAutoResize';
import { useCanvasEvents } from './useCanvasEvents';
import { useWindowEvents } from './useWindowEvents';
import { useLoadState } from './useLoadState';

// 构建 editor API 核心对象
const buildEditor = ({
  save,
  undo,
  redo,
  canRedo,
  canUndo,
  autoZoom,
  copy,
  paste,
  canvas,
  fillColor,
  fontFamily,
  setFontFamily,
  setFillColor,
  strokeColor,
  setStrokeColor,
  strokeWidth,
  setStrokeWidth,
  selectedObjects,
  strokeDashArray,
  setStrokeDashArray,
}) => {
  const generateSaveOptions = () => {
    const { width, height, left, top } = getWorkspace();
    return {
      name: 'Image',
      format: 'png',
      quality: 1,
      width,
      height,
      left,
      top,
    };
  };

  const savePng = () => {
    const options = generateSaveOptions();
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    const dataUrl = canvas.toDataURL(options);
    downloadFile(dataUrl, 'png');
    autoZoom();
  };

  const saveSvg = () => {
    const options = generateSaveOptions();
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    const dataUrl = canvas.toDataURL(options);
    downloadFile(dataUrl, 'svg');
    autoZoom();
  };

  const saveJpg = () => {
    const options = generateSaveOptions();
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    const dataUrl = canvas.toDataURL(options);
    downloadFile(dataUrl, 'jpg');
    autoZoom();
  };

  const saveJson = async () => {
    const dataUrl = canvas.toJSON(JSON_KEYS);
    await transformText(dataUrl.objects);
    const fileString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(dataUrl, null, '\t')
    )}`;
    downloadFile(fileString, 'json');
  };

  const loadJson = (json) => {
    const data = JSON.parse(json);
    // 加载时不触发保存
    canvas.loadFromJSON(data, () => {
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

      autoZoom();
      // 加载完成后调用一次skip=true的保存，确保历史记录正确但不触发外部保存
      save(true);
    });
  };

  const getWorkspace = () => {
    return canvas.getObjects().find((object) => object.name === 'clip');
  };

  const center = (object) => {
    const workspace = getWorkspace();
    const center = workspace?.getCenterPoint();
    if (!center) return;
    canvas._centerObject(object, center);
  };

  const addToCanvas = (object) => {
    center(object);
    canvas.add(object);
    canvas.setActiveObject(object);
    // 确保workspace始终在最底层
    const workspace = getWorkspace();
    if (workspace) {
      canvas.sendToBack(workspace);
    }
  };

  return {
    savePng,
    saveJpg,
    saveSvg,
    saveJson,
    loadJson,
    canUndo,
    canRedo,
    autoZoom,
    getWorkspace,
    zoomIn: () => {
      let zoomRatio = canvas.getZoom();
      zoomRatio += 0.05;
      const center = canvas.getCenter();
      canvas.zoomToPoint(new fabric.Point(center.left, center.top), zoomRatio > 1 ? 1 : zoomRatio);
    },
    zoomOut: () => {
      let zoomRatio = canvas.getZoom();
      zoomRatio -= 0.05;
      const center = canvas.getCenter();
      canvas.zoomToPoint(
        new fabric.Point(center.left, center.top),
        zoomRatio < 0.2 ? 0.2 : zoomRatio
      );
    },
    changeSize: (value) => {
      const workspace = getWorkspace();
      workspace?.set(value);
      autoZoom();
      save();
    },
    changeBackground: (value) => {
      const workspace = getWorkspace();
      workspace?.set({ fill: value });
      canvas.renderAll();
      save();
    },
    enableDrawingMode: () => {
      canvas.discardActiveObject();
      canvas.renderAll();
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.width = strokeWidth;
      canvas.freeDrawingBrush.color = strokeColor;
    },
    disableDrawingMode: () => {
      canvas.isDrawingMode = false;
    },
    onUndo: () => undo(),
    onRedo: () => redo(),
    onCopy: () => copy(),
    onPaste: () => paste(),
    changeImageFilter: (value) => {
      const objects = canvas.getActiveObjects();
      objects.forEach((object) => {
        if (object.type === 'image') {
          const imageObject = object;
          const effect = createFilter(value);
          imageObject.filters = effect ? [effect] : [];
          imageObject.applyFilters();
          canvas.renderAll();
        }
      });
    },
    addImage: (value) => {
      fabric.Image.fromURL(
        value,
        (image) => {
          const workspace = getWorkspace();
          image.scaleToWidth(workspace?.width || 0);
          image.scaleToHeight(workspace?.height || 0);
          addToCanvas(image);
        },
        { crossOrigin: 'anonymous' }
      );
    },
    delete: () => {
      canvas.getActiveObjects().forEach((object) => canvas.remove(object));
      canvas.discardActiveObject();
      canvas.renderAll();
    },
    resetCanvas: () => {
      // 获取workspace对象
      const workspace = getWorkspace();

      // 获取所有非workspace的对象
      const objectsToRemove = canvas.getObjects().filter(obj => obj.name !== 'clip');

      // 删除所有非workspace的对象
      objectsToRemove.forEach(obj => {
        canvas.remove(obj);
      });

      // 清除选择状态
      canvas.discardActiveObject();

      // 确保workspace在底层并设置正确的属性
      if (workspace) {
        workspace.set({
          selectable: false,
          hasControls: false,
          evented: false
        });
        canvas.sendToBack(workspace);
        canvas.clipPath = workspace;
      }

      // 重新渲染和自动缩放
      canvas.renderAll();
      autoZoom();
    },
    addText: (value, options) => {
      const object = new fabric.Textbox(value, {
        ...TEXT_OPTIONS,
        fill: fillColor,
        ...options,
      });
      addToCanvas(object);
    },
    // 后续继续实现 font/opacity 等功能
    changeFontSize: (value) => {
      canvas.getActiveObjects().forEach((object) => {
        if (isTextType(object.type)) {
          object.set({ fontSize: value });
        }
      });
      canvas.renderAll();
    },
    getActiveFontSize: () => {
      const selectedObject = selectedObjects[0];
      if (!selectedObject) return FONT_SIZE;
      const value = selectedObject.get('fontSize') || FONT_SIZE;
      return value;
    },
    changeTextAlign: (value) => {
      canvas.getActiveObjects().forEach((object) => {
        if (isTextType(object.type)) {
          object.set({ textAlign: value });
        }
      });
      canvas.renderAll();
    },
    getActiveTextAlign: () => {
      const selectedObject = selectedObjects[0];
      if (!selectedObject) return 'left';
      const value = selectedObject.get('textAlign') || 'left';
      return value;
    },
    changeFontUnderline: (value) => {
      canvas.getActiveObjects().forEach((object) => {
        if (isTextType(object.type)) {
          object.set({ underline: value });
        }
      });
      canvas.renderAll();
    },
    getActiveFontUnderline: () => {
      const selectedObject = selectedObjects[0];
      if (!selectedObject) return false;
      const value = selectedObject.get('underline') || false;
      return value;
    },
    changeFontLinethrough: (value) => {
      canvas.getActiveObjects().forEach((object) => {
        if (isTextType(object.type)) {
          object.set({ linethrough: value });
        }
      });
      canvas.renderAll();
    },
    getActiveFontLinethrough: () => {
      const selectedObject = selectedObjects[0];
      if (!selectedObject) return false;
      const value = selectedObject.get('linethrough') || false;
      return value;
    },
    changeFontStyle: (value) => {
      canvas.getActiveObjects().forEach((object) => {
        if (isTextType(object.type)) {
          object.set({ fontStyle: value });
        }
      });
      canvas.renderAll();
    },
    getActiveFontStyle: () => {
      const selectedObject = selectedObjects[0];
      if (!selectedObject) return 'normal';
      const value = selectedObject.get('fontStyle') || 'normal';
      return value;
    },
    changeFontWeight: (value) => {
      canvas.getActiveObjects().forEach((object) => {
        if (isTextType(object.type)) {
          object.set({ fontWeight: value });
        }
      });
      canvas.renderAll();
    },
    changeOpacity: (value) => {
      canvas.getActiveObjects().forEach((object) => {
        object.set({ opacity: value });
      });
      canvas.renderAll();
    },
    bringForward: () => {
      canvas.getActiveObjects().forEach((object) => {
        canvas.bringForward(object);
      });
      canvas.renderAll();
      const workspace = getWorkspace();
      if (workspace) {
        canvas.sendToBack(workspace);
      }
    },
    sendBackwards: () => {
      canvas.getActiveObjects().forEach((object) => {
        canvas.sendBackwards(object);
      });
      canvas.renderAll();
      const workspace = getWorkspace();
      if (workspace) {
        canvas.sendToBack(workspace);
      }
    },
    changeFontFamily: (value) => {
      setFontFamily(value);
      canvas.getActiveObjects().forEach((object) => {
        if (isTextType(object.type)) {
          object.set({ fontFamily: value });
        }
      });
      canvas.renderAll();
    },
    changeFillColor: (value) => {
      setFillColor(value);
      canvas.getActiveObjects().forEach((object) => {
        object.set({ fill: value });
      });
      canvas.renderAll();
    },
    changeStrokeColor: (value) => {
      setStrokeColor(value);
      canvas.getActiveObjects().forEach((object) => {
        if (isTextType(object.type)) {
          object.set({ fill: value });
        } else {
          object.set({ stroke: value });
        }
      });
      canvas.freeDrawingBrush.color = value;
      canvas.renderAll();
    },
    changeStrokeWidth: (value) => {
      setStrokeWidth(value);
      canvas.getActiveObjects().forEach((object) => {
        object.set({ strokeWidth: value });
      });
      canvas.freeDrawingBrush.width = value;
      canvas.renderAll();
    },
    changeStrokeDashArray: (value) => {
      setStrokeDashArray(value);
      canvas.getActiveObjects().forEach((object) => {
        object.set({ strokeDashArray: value });
      });
      canvas.renderAll();
    },
    addCircle: () => {
      const object = new fabric.Circle({
        ...CIRCLE_OPTIONS,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth,
        strokeDashArray,
      });
      addToCanvas(object);
    },
    addSoftRectangle: () => {
      const object = new fabric.Rect({
        ...RECTANGLE_OPTIONS,
        rx: 50,
        ry: 50,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth,
        strokeDashArray,
      });
      addToCanvas(object);
    },
    addRectangle: () => {
      const object = new fabric.Rect({
        ...RECTANGLE_OPTIONS,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth,
        strokeDashArray,
      });
      addToCanvas(object);
    },
    addTriangle: () => {
      const object = new fabric.Triangle({
        ...TRIANGLE_OPTIONS,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth,
        strokeDashArray,
      });
      addToCanvas(object);
    },
    addInverseTriangle: () => {
      const HEIGHT = TRIANGLE_OPTIONS.height;
      const WIDTH = TRIANGLE_OPTIONS.width;
      const object = new fabric.Polygon(
        [
          { x: 0, y: 0 },
          { x: WIDTH, y: 0 },
          { x: WIDTH / 2, y: HEIGHT },
        ],
        {
          ...TRIANGLE_OPTIONS,
          fill: fillColor,
          stroke: strokeColor,
          strokeWidth,
          strokeDashArray,
        }
      );
      addToCanvas(object);
    },
    addDiamond: () => {
      const HEIGHT = DIAMOND_OPTIONS.height;
      const WIDTH = DIAMOND_OPTIONS.width;
      const object = new fabric.Polygon(
        [
          { x: WIDTH / 2, y: 0 },
          { x: WIDTH, y: HEIGHT / 2 },
          { x: WIDTH / 2, y: HEIGHT },
          { x: 0, y: HEIGHT / 2 },
        ],
        {
          ...DIAMOND_OPTIONS,
          fill: fillColor,
          stroke: strokeColor,
          strokeWidth,
          strokeDashArray,
        }
      );
      addToCanvas(object);
    },
    canvas,
    getActiveFontWeight: () => {
      const selectedObject = selectedObjects[0];
      if (!selectedObject) return FONT_WEIGHT;
      const value = selectedObject.get('fontWeight') || FONT_WEIGHT;
      return value;
    },
    getActiveFontFamily: () => {
      const selectedObject = selectedObjects[0];
      if (!selectedObject) return fontFamily;
      const value = selectedObject.get('fontFamily') || fontFamily;
      return value;
    },
    getActiveFillColor: () => {
      const selectedObject = selectedObjects[0];
      if (!selectedObject) return fillColor;
      const value = selectedObject.get('fill') || fillColor;
      return value;
    },
    getActiveStrokeColor: () => {
      const selectedObject = selectedObjects[0];
      if (!selectedObject) return strokeColor;
      const value = selectedObject.get('stroke') || strokeColor;
      return value;
    },
    getActiveStrokeWidth: () => {
      const selectedObject = selectedObjects[0];
      if (!selectedObject) return strokeWidth;
      const value = selectedObject.get('strokeWidth') || strokeWidth;
      return value;
    },
    getActiveStrokeDashArray: () => {
      const selectedObject = selectedObjects[0];
      if (!selectedObject) return strokeDashArray;
      const value = selectedObject.get('strokeDashArray') || strokeDashArray;
      return value;
    },
    selectedObjects,
  };
};

export const useEditor = ({
  defaultState,
  defaultHeight,
  defaultWidth,
  clearSelectionCallback,
  saveCallback,
}) => {
  const initialState = useRef(defaultState);
  const initialWidth = useRef(defaultWidth);
  const initialHeight = useRef(defaultHeight);

  const [canvas, setCanvas] = useState(null);
  const [container, setContainer] = useState(null);
  const [selectedObjects, setSelectedObjects] = useState([]);

  const [fontFamily, setFontFamily] = useState(FONT_FAMILY);
  const [fillColor, setFillColor] = useState(FILL_COLOR);
  const [strokeColor, setStrokeColor] = useState(STROKE_COLOR);
  const [strokeWidth, setStrokeWidth] = useState(STROKE_WIDTH);
  const [strokeDashArray, setStrokeDashArray] = useState(STROKE_DASH_ARRAY);

  useWindowEvents();

  const { save, canRedo, canUndo, undo, redo, canvasHistory, setHistoryIndex } = useHistory({
    canvas,
    saveCallback,
  });

  const { copy, paste } = useClipboard({ canvas });

  const { autoZoom } = useAutoResize({
    canvas,
    container,
  });

  useCanvasEvents({
    save,
    canvas,
    setSelectedObjects,
    clearSelectionCallback,
  });

  useHotkeys({
    undo,
    redo,
    copy,
    paste,
    save,
    canvas,
  });

  useLoadState({
    canvas,
    autoZoom,
    initialState,
    canvasHistory,
    setHistoryIndex,
  });

  const editor = useMemo(() => {
    if (canvas) {
      return buildEditor({
        save,
        undo,
        redo,
        canUndo,
        canRedo,
        autoZoom,
        copy,
        paste,
        canvas,
        fillColor,
        strokeWidth,
        strokeColor,
        setFillColor,
        setStrokeColor,
        setStrokeWidth,
        strokeDashArray,
        selectedObjects,
        setStrokeDashArray,
        fontFamily,
        setFontFamily,
      });
    }
    return undefined;
  }, [
    canRedo,
    canUndo,
    undo,
    redo,
    save,
    autoZoom,
    copy,
    paste,
    canvas,
    fillColor,
    strokeWidth,
    strokeColor,
    selectedObjects,
    strokeDashArray,
    fontFamily,
  ]);

  // 初始化编辑器：创建 workspace，并居中 + clip
  const init = useCallback(({ initialCanvas, initialContainer }) => {
    fabric.Object.prototype.set({
      cornerColor: '#FFF',
      cornerStyle: 'circle',
      borderColor: '#3b82f6',
      borderScaleFactor: 1.5,
      transparentCorners: false,
      borderOpacityWhenMoving: 1,
      cornerStrokeColor: '#3b82f6',
    });

    const initialWorkspace = new fabric.Rect({
      width: initialWidth.current,
      height: initialHeight.current,
      name: 'clip',
      fill: 'white',
      selectable: false,
      hasControls: false,
      evented: false,
      shadow: new fabric.Shadow({
        color: 'rgba(0,0,0,0.8)',
        blur: 5,
      }),
    });

    initialCanvas.setWidth(initialContainer.offsetWidth);
    initialCanvas.setHeight(initialContainer.offsetHeight);

    initialCanvas.add(initialWorkspace);
    initialCanvas.centerObject(initialWorkspace);
    initialCanvas.clipPath = initialWorkspace;

    setCanvas(initialCanvas);
    setContainer(initialContainer);

    const currentState = JSON.stringify(initialCanvas.toJSON(JSON_KEYS));
    canvasHistory.current = [currentState];
    setHistoryIndex(0);
  }, []);

  return { init, editor };
};
