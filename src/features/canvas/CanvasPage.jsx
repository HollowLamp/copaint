import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router';
import { fabric } from 'fabric';
import { Button } from '../../components/button/Button';
import { useNavigate } from 'react-router';
import { useEditor } from '../../hooks/canvas/useEditor';
import { getFileContent, saveFileContent } from '../../services/fileService';
import { colors, fonts } from '../../utils/constants';
import { useTheme } from '../../hooks/ThemeContext';
import styles from './CanvasPage.module.css';

export const Component = () => {
  const navigate = useNavigate();
  const { id: fileId } = useParams();
  const canvasElementRef = useRef(null);
  const containerRef = useRef(null);
  const isLoadingRef = useRef(false);
  const saveTimeoutRef = useRef(null);
  const { theme, toggleTheme } = useTheme();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [showPropertyPanel, setShowPropertyPanel] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [recentColors, setRecentColors] = useState([]);

  // 添加颜色到最近使用
  const addToRecentColors = (color) => {
    if (color === 'transparent') return;

    setRecentColors(prev => {
      const filtered = prev.filter(c => c !== color);
      const newColors = [color, ...filtered].slice(0, 6); // 保留最近6个颜色
      return newColors;
    });
  };

  // 防抖保存函数
  const debouncedSave = useRef((data) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (fileId && !isLoadingRef.current) {
        try {
          await saveFileContent(fileId, data);
          console.log('画布已自动保存');
        } catch (error) {
          console.error('保存失败:', error);
        }
      }
    }, 1000); // 1秒防抖
  });

  // 使用editor hook
  const { init, editor } = useEditor({
    defaultState: null,
    defaultHeight: 900,
    defaultWidth: 1200,
    clearSelectionCallback: () => {
      setSelectedTool(null);
    },
    saveCallback: ({ json, height, width }) => {
      // 只有在初始化完成且不在加载状态时才保存
      if (isInitialized && !isLoadingRef.current) {
        debouncedSave.current({ json, height, width });
      }
    },
  });

  // 初始化canvas
  useEffect(() => {
    const canvas = new fabric.Canvas(canvasElementRef.current, {
      controlsAboveOverlay: false,
      preserveObjectStacking: true,
    });

    init({
      initialCanvas: canvas,
      initialContainer: containerRef.current
    });

    return () => {
      canvas.dispose();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [init]);

  // 加载文件内容
  useEffect(() => {
    const loadFile = async () => {
      if (fileId && editor && !isInitialized) {
        try {
          isLoadingRef.current = true;
          console.log('开始加载文件内容...');

          const content = await getFileContent(fileId);
          if (content && content.json) {
            // 在加载期间禁用自动保存
            editor.loadJson(JSON.stringify(content.json));
            console.log('文件内容加载完成');
          }

          // 延迟一段时间后才启用自动保存，确保所有canvas事件都已处理完毕
          setTimeout(() => {
            isLoadingRef.current = false;
            setIsInitialized(true);
            console.log('初始化完成，启用自动保存');
          }, 2000);

        } catch (error) {
          console.error('加载文件失败:', error);
          isLoadingRef.current = false;
          setIsInitialized(true);
        }
      } else if (!fileId) {
        // 如果没有fileId，直接标记为已初始化
        setTimeout(() => {
          setIsInitialized(true);
        }, 1000);
      }
    };

    loadFile();
  }, [fileId, editor]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // 处理菜单选项
  const handleMenuOption = (option) => {
    if (!editor) return;

    switch (option) {
      case '保存':
        // 手动保存时立即执行，不走防抖
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        const saveWorkspace = editor.getWorkspace();
        const data = {
          json: editor.canvas.toJSON(),
          height: saveWorkspace?.height || 0,
          width: saveWorkspace?.width || 0
        };
        saveFileContent(fileId, data).then(() => {
          alert('保存成功！');
        }).catch((error) => {
          console.error('保存失败:', error);
          alert('保存失败，请重试');
        });
        break;
      case '导出图片':
        editor.savePng();
        break;
      case '导出JPG':
        editor.saveJpg();
        break;
      case '重置画布':
        // 添加确认对话框
        if (confirm('确定要重置画布吗？这将清除所有绘制内容，但保留白色底布。')) {
          // 使用专门的重置函数，只删除非workspace的对象，保留白色底布
          editor.resetCanvas();
        }
        break;
      case '画布背景':
        const color = prompt('请输入背景颜色 (如: #ffffff 或 white):');
        if (color) {
          editor.changeBackground(color);
        }
        break;
      default:
        alert(`${option}功能正在开发中`);
        break;
    }
    setIsMenuOpen(false);
  };

  // 处理工具选择
  const handleToolSelect = (toolIndex) => {
    if (!editor) return;

    setSelectedTool(toolIndex);

    // 先关闭绘图模式
    if (isDrawingMode) {
      editor.disableDrawingMode();
      setIsDrawingMode(false);
    }

    switch (toolIndex) {
      case 0: // 锁定
        // 禁用所有对象的选择
        editor.canvas.getObjects().forEach(obj => {
          if (obj.name !== 'clip') {
            obj.selectable = false;
          }
        });
        editor.canvas.discardActiveObject();
        editor.canvas.renderAll();
        break;
      case 1: // 手掌工具 - 平移功能
        editor.canvas.getObjects().forEach(obj => {
          if (obj.name !== 'clip') {
            obj.selectable = false;
          }
        });
        editor.canvas.discardActiveObject();
        // 可以在这里添加平移模式的逻辑
        break;
      case 2: // 选择工具
        editor.canvas.getObjects().forEach(obj => {
          if (obj.name !== 'clip') {
            obj.selectable = true;
          }
        });
        break;
      case 3: // 矩形
        editor.addRectangle();
        break;
      case 4: // 圆形
        editor.addCircle();
        break;
      case 5: // 画笔
        editor.enableDrawingMode();
        setIsDrawingMode(true);
        break;
      case 6: // 调色板
        setShowPropertyPanel(!showPropertyPanel);
        break;
      case 7: // 文字
        editor.addText('双击编辑文字');
        break;
      case 8: // 图片
        // 创建文件输入
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              editor.addImage(event.target.result);
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
        break;
      case 9: // 橡皮擦
        editor.delete();
        break;
      default:
        break;
    }
  };

  // 添加形状菜单功能
  const addShape = (shapeType) => {
    if (!editor) return;

    switch (shapeType) {
      case 'triangle':
        editor.addTriangle();
        break;
      case 'inverseTriangle':
        editor.addInverseTriangle();
        break;
      case 'diamond':
        editor.addDiamond();
        break;
      case 'softRectangle':
        editor.addSoftRectangle();
        break;
      default:
        break;
    }
  };

  // 渲染形状选择菜单
  const renderShapeMenu = () => {
    if (selectedTool !== 3) return null; // 只在矩形工具选中时显示

    return (
      <div className={styles.shapeMenu}>
        <button onClick={() => addShape('triangle')}>△ 三角形</button>
        <button onClick={() => addShape('inverseTriangle')}>▽ 倒三角</button>
        <button onClick={() => addShape('diamond')}>◇ 菱形</button>
        <button onClick={() => addShape('softRectangle')}>▢ 圆角矩形</button>
      </div>
    );
  };

  // 处理快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!editor) return;

      // 防止在输入框中触发快捷键
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key.toLowerCase()) {
        case 'v': // 选择工具
          handleToolSelect(2);
          break;
        case 'r': // 矩形
          handleToolSelect(3);
          break;
        case 'o': // 圆形
          handleToolSelect(4);
          break;
        case 'b': // 画笔
          handleToolSelect(5);
          break;
        case 't': // 文字
          handleToolSelect(7);
          break;
        case 'delete':
        case 'backspace':
          editor.delete();
          break;
        case 'escape':
          setShowPropertyPanel(false);
          setSelectedTool(null);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, selectedTool]);

  // 渲染属性面板
  const renderPropertyPanel = () => {
    if (!showPropertyPanel || !editor) return null;

    // 处理自选颜色
    const handleCustomColor = (colorType) => {
      const input = document.createElement('input');
      input.type = 'color';
      input.onchange = (e) => {
        const color = e.target.value;
        addToRecentColors(color);
        if (colorType === 'fill') {
          editor.changeFillColor(color);
        } else if (colorType === 'stroke') {
          editor.changeStrokeColor(color);
        }
      };
      input.click();
    };

    // 处理颜色选择
    const handleColorSelect = (color, colorType) => {
      addToRecentColors(color);
      if (colorType === 'fill') {
        editor.changeFillColor(color);
      } else if (colorType === 'stroke') {
        editor.changeStrokeColor(color);
      }
    };

    return (
      <div className={styles.propertyPanel}>
        <div className={styles.propertyPanelHeader}>
          <h3>属性面板</h3>
          <button onClick={() => setShowPropertyPanel(false)}>×</button>
        </div>

        <div className={styles.propertySection}>
          <h4>填充颜色</h4>
          <div className={styles.colorGrid}>
            {colors.map((color, index) => (
              <button
                key={index}
                className={styles.colorButton}
                style={{ backgroundColor: color === 'transparent' ? '#fff' : color }}
                onClick={() => handleColorSelect(color, 'fill')}
                title={color}
              >
                {color === 'transparent' && '∅'}
              </button>
            ))}
            {/* 自选颜色按钮 */}
            <button
              className={styles.customColorButton}
              onClick={() => handleCustomColor('fill')}
              title="自选颜色"
            >
              <div className={styles.colorPicker}>
                🎨
              </div>
            </button>
          </div>
          {/* 最近使用的颜色 */}
          {recentColors.length > 0 && (
            <>
              <h5 className={styles.recentTitle}>最近使用</h5>
              <div className={styles.recentColors}>
                {recentColors.map((color, index) => (
                  <button
                    key={index}
                    className={styles.recentColorButton}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorSelect(color, 'fill')}
                    title={color}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className={styles.propertySection}>
          <h4>边框颜色</h4>
          <div className={styles.colorGrid}>
            {colors.slice(0, 10).map((color, index) => (
              <button
                key={index}
                className={styles.colorButton}
                style={{ backgroundColor: color === 'transparent' ? '#fff' : color }}
                onClick={() => handleColorSelect(color, 'stroke')}
                title={color}
              >
                {color === 'transparent' && '∅'}
              </button>
            ))}
            {/* 自选颜色按钮 */}
            <button
              className={styles.customColorButton}
              onClick={() => handleCustomColor('stroke')}
              title="自选颜色"
            >
              <div className={styles.colorPicker}>
                🎨
              </div>
            </button>
          </div>
          {/* 最近使用的颜色 */}
          {recentColors.length > 0 && (
            <>
              <h5 className={styles.recentTitle}>最近使用</h5>
              <div className={styles.recentColors}>
                {recentColors.map((color, index) => (
                  <button
                    key={index}
                    className={styles.recentColorButton}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorSelect(color, 'stroke')}
                    title={color}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className={styles.propertySection}>
          <h4>边框宽度</h4>
          <input
            type="range"
            min="0"
            max="20"
            value={editor.getActiveStrokeWidth()}
            onChange={(e) => editor.changeStrokeWidth(parseInt(e.target.value))}
          />
          <span>{editor.getActiveStrokeWidth()}px</span>
        </div>

        {editor.selectedObjects.length > 0 && editor.selectedObjects[0].type?.includes('text') && (
          <>
            <div className={styles.propertySection}>
              <h4>字体</h4>
              <select
                value={editor.getActiveFontFamily()}
                onChange={(e) => editor.changeFontFamily(e.target.value)}
                className={styles.fontSelect}
              >
                <optgroup label="英文字体">
                  {fonts.filter(font => !font.includes('黑体') && !font.includes('宋体') && !font.includes('仿宋') && !font.includes('楷体') && !font.includes('隶书') && !font.includes('幼圆') && !font.includes('华文') && !font.includes('微软') && !font.includes('苹方') && !font.includes('思源') && !font.includes('Noto') && !font.includes('SC')).map(font => (
                    <option key={font} value={font} style={{ fontFamily: font }}>
                      {font}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="中文字体">
                  {fonts.filter(font => font.includes('黑体') || font.includes('宋体') || font.includes('仿宋') || font.includes('楷体') || font.includes('隶书') || font.includes('幼圆') || font.includes('华文') || font.includes('微软') || font.includes('苹方') || font.includes('思源') || font.includes('Noto') || font.includes('SC')).map(font => (
                    <option key={font} value={font} style={{ fontFamily: font }}>
                      {font}
                    </option>
                  ))}
                </optgroup>
              </select>
              <div className={styles.fontPreview}>
                <span style={{ fontFamily: editor.getActiveFontFamily() }}>
                  字体预览 Font Preview 123
                </span>
              </div>
            </div>

            <div className={styles.propertySection}>
              <h4>字体大小</h4>
              <input
                type="range"
                min="8"
                max="200"
                value={editor.getActiveFontSize()}
                onChange={(e) => editor.changeFontSize(parseInt(e.target.value))}
              />
              <span>{editor.getActiveFontSize()}px</span>
            </div>

            <div className={styles.propertySection}>
              <h4>文字对齐</h4>
              <div className={styles.alignButtons}>
                <button
                  onClick={() => editor.changeTextAlign('left')}
                  className={editor.getActiveTextAlign() === 'left' ? styles.active : ''}
                >
                  左对齐
                </button>
                <button
                  onClick={() => editor.changeTextAlign('center')}
                  className={editor.getActiveTextAlign() === 'center' ? styles.active : ''}
                >
                  居中
                </button>
                <button
                  onClick={() => editor.changeTextAlign('right')}
                  className={editor.getActiveTextAlign() === 'right' ? styles.active : ''}
                >
                  右对齐
                </button>
              </div>
            </div>

            <div className={styles.propertySection}>
              <h4>文字样式</h4>
              <div className={styles.textStyleButtons}>
                <button
                  onClick={() => editor.changeFontWeight(editor.getActiveFontWeight() === 'bold' ? 'normal' : 'bold')}
                  className={editor.getActiveFontWeight() === 'bold' ? styles.active : ''}
                >
                  B
                </button>
                <button
                  onClick={() => editor.changeFontStyle(editor.getActiveFontStyle() === 'italic' ? 'normal' : 'italic')}
                  className={editor.getActiveFontStyle() === 'italic' ? styles.active : ''}
                >
                  I
                </button>
                <button
                  onClick={() => editor.changeFontUnderline(!editor.getActiveFontUnderline())}
                  className={editor.getActiveFontUnderline() ? styles.active : ''}
                >
                  U
                </button>
                <button
                  onClick={() => editor.changeFontLinethrough(!editor.getActiveFontLinethrough())}
                  className={editor.getActiveFontLinethrough() ? styles.active : ''}
                >
                  S
                </button>
              </div>
            </div>
          </>
        )}

        <div className={styles.propertySection}>
          <h4>透明度</h4>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            defaultValue="1"
            onChange={(e) => editor.changeOpacity(parseFloat(e.target.value))}
          />
        </div>

        <div className={styles.propertySection}>
          <h4>层级</h4>
          <div className={styles.layerButtons}>
            <button onClick={() => editor.bringForward()}>上移一层</button>
            <button onClick={() => editor.sendBackwards()}>下移一层</button>
          </div>
        </div>
      </div>
    );
  };

  // Toolbar图标数组
  const icons = [
    '/imgs/lock-solid.jpg',
    '/imgs/hand-regular.jpg',
    '/imgs/arrow-pointer-solid.jpg',
    '/imgs/vector-square-solid.jpg',
    '/imgs/circle-regular.jpg',
    '/imgs/pen-solid.jpg',
    '/imgs/palette-solid.jpg',
    '/imgs/font-solid.jpg',
    '/imgs/image-solid.jpg',
    '/imgs/eraser-solid.jpg'
  ];

  return (
    <div className={styles.pageContainer} style={{
      height: '100vh',
      width: '100vw',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0
    }}>
      {/* 画板内容区域 - 完全填满整个页面 */}
      <div
        ref={containerRef}
        className={styles.content}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          margin: 0,
          padding: 0,
          overflow: 'hidden'
        }}
      >
        {/* Canvas画布 */}
        <canvas ref={canvasElementRef} />
      </div>

      {/* 加载状态指示器 */}
      {!isInitialized && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          zIndex: 1000
        }}>
          正在加载画布...
        </div>
      )}

      {/* 顶部菜单 - 漂浮在画板上 */}
      <div className={styles.menuContainer} style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
        <button className={styles.menuButton} onClick={toggleMenu}>
          ☰
        </button>
        {isMenuOpen && (
          <div className={styles.menuBox}>
            <ul>
              <li onClick={() => handleMenuOption('保存')}>
                <img src="/imgs/floppy-disk-solid.jpg" alt="图标" style={{ width: '16px', height: '15px', marginRight: '10px', marginLeft: '5px', verticalAlign: 'middle', objectFit: 'contain' }} />
                保存
              </li>
              <li onClick={() => handleMenuOption('导出图片')}>
                <img src="/imgs/file-export-solid.jpg" alt="图标" style={{ width: '16px', height: '15px', marginRight: '10px', marginLeft: '5px', verticalAlign: 'middle', objectFit: 'contain' }} />
                导出PNG
              </li>
              <li onClick={() => handleMenuOption('导出JPG')}>
                <img src="/imgs/file-export-solid.jpg" alt="图标" style={{ width: '16px', height: '15px', marginRight: '10px', marginLeft: '5px', verticalAlign: 'middle', objectFit: 'contain' }} />
                导出JPG
              </li>
              <li onClick={() => handleMenuOption('实时协作')}>
                <img src="/imgs/user-group-solid.jpg" alt="图标" style={{ width: '16px', height: '15px', marginRight: '10px', marginLeft: '5px', verticalAlign: 'middle', objectFit: 'contain' }} />
                实时协作
              </li>
              <li onClick={() => handleMenuOption('AI协作')}>
                <img src="/imgs/robot-solid.jpg" alt="图标" style={{ width: '16px', height: '15px', marginRight: '10px', marginLeft: '5px', verticalAlign: 'middle', objectFit: 'contain' }} />
                AI协作
              </li>
              <li onClick={() => handleMenuOption('重置画布')}>
                <img src="/imgs/trash-solid.jpg" alt="图标" style={{ width: '16px', height: '15px', marginRight: '10px', marginLeft: '5px', verticalAlign: 'middle', objectFit: 'contain' }} />
                重置画布
              </li>
              <li onClick={() => handleMenuOption('评论')}>
                <img src="/imgs/comment-regular.jpg" alt="图标" style={{ width: '16px', height: '15px', marginRight: '10px', marginLeft: '5px', verticalAlign: 'middle', objectFit: 'contain' }} />
                评论
              </li>
            </ul>
            <hr />
            <ul>
              <li onClick={toggleTheme}>
                <img src="/imgs/moon-solid.jpg" alt="图标" style={{ width: '16px', height: '15px', marginRight: '10px', marginLeft: '5px', verticalAlign: 'middle', objectFit: 'contain' }} />
                {theme === 'light' ? '夜间模式' : '日间模式'}
              </li>
              <li onClick={() => handleMenuOption('画布背景')}>
                <img src="/imgs/layer-group-solid.jpg" alt="图标" style={{ width: '16px', height: '15px', marginRight: '10px', marginLeft: '5px', verticalAlign: 'middle', objectFit: 'contain' }} />
                画布背景
              </li>
              <li>
                <img src="/imgs/globe-solid.jpg" alt="图标" style={{ width: '16px', height: '15px', marginRight: '10px', marginLeft: '5px', verticalAlign: 'middle', objectFit: 'contain' }} />
                语言
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* 画板工具栏 - 漂浮在画板上 */}
      <div className={styles.toolbarContainer} style={{ zIndex: 10 }}>
        {icons.map((icon, index, arr) => (
          <React.Fragment key={index}>
            <button
              className={styles.toolbarButton}
              onClick={() => handleToolSelect(index)}
              style={selectedTool === index ? { backgroundColor: '#e0e0e0' } : {}}
            >
              <img src={icon} alt={`Icon-${index}`} style={{ width: '18px', height: '18px', verticalAlign: 'middle' }} />
            </button>
            {index !== arr.length - 1 && <div className={styles.verticalDivider} />}
          </React.Fragment>
        ))}
      </div>

      {/* 形状选择菜单 */}
      {renderShapeMenu()}

      {/* 属性面板 */}
      {renderPropertyPanel()}

      {/* 右上角按钮 - 漂浮在画板上 */}
      <div className={styles.rightButtons} style={{ zIndex: 10 }}>
        <Button onClick={() => alert('分享功能正在开发中')}>
          <img src="/imgs/share-nodes-solid.png" alt="图标" style={{ width: '13px', height: '15px', marginRight: '6px', verticalAlign: 'middle' }} />
          分享
        </Button>
        <Button onClick={() => alert('素材库功能正在开发中')}>
          <img src='/imgs/store-solid.jpg' alt="图标" style={{ width: '16px', height: '15px', marginRight: '6px', verticalAlign: 'middle' }} />
          素材库
        </Button>
      </div>

      {/* 左下角缩放按钮组 - 漂浮在画板上 */}
      <div className={styles.ZoomButton} style={{ zIndex: 10 }}>
        <button className="decrease" onClick={() => editor?.zoomOut()}>-</button>
        <span className="value">缩放</span>
        <button className="increase" onClick={() => editor?.zoomIn()}>+</button>
      </div>

      {/* 左下角撤销重做按钮 - 漂浮在画板上 */}
      <div className={styles.UndoRedoButton} style={{ zIndex: 10 }}>
        <button
          className='undo'
          onClick={() => editor?.onUndo()}
          disabled={!editor?.canUndo}
          style={{ opacity: editor?.canUndo ? 1 : 0.5 }}
        >
          ↺
        </button>
        <button
          className='redo'
          onClick={() => editor?.onRedo()}
          disabled={!editor?.canRedo}
          style={{ opacity: editor?.canRedo ? 1 : 0.5 }}
        >
          ↻
        </button>
      </div>

      {/* 右下角按钮组 - 漂浮在画板上 */}
      <div className={styles.bottomRight} style={{ zIndex: 10 }}>
        <button className={styles.cornerButton} onClick={() => alert('帮助功能正在开发中')}>❓</button>
      </div>

      {/* 返回按钮 - 漂浮在画板上 */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10
      }}>
        <Button onClick={() => navigate('/')}>返回首页</Button>
      </div>
    </div>
  );
};