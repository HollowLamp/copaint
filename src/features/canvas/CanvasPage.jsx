import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router';
import { fabric } from 'fabric';
import { App } from 'antd';
import { Button } from '../../components/button/Button';
import { useNavigate } from 'react-router';
import { useEditor } from '../../hooks/canvas/useEditor';
import { getFileContent, saveFileContent } from '../../services/fileService';
import { colors, fonts } from '../../utils/constants';
import { useTheme } from '../../hooks/ThemeContext';
import { useCollaboration } from '../../hooks/useCollaboration';
import { CollaborationPanel } from '../../components/collaboration/CollaborationPanel';
import { joinByShareLink } from '../../services/collaborationService';
import { firestore } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import styles from './CanvasPage.module.css';
import { auth } from '../../services/firebase';
import * as userService from '../../services/userService';

export const Component = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { id: fileId } = useParams();
  const canvasElementRef = useRef(null);
  const containerRef = useRef(null);
  const isLoadingRef = useRef(false);
  const saveTimeoutRef = useRef(null);
  const editorRef = useRef(null); // 添加editor引用
  const { theme, toggleTheme } = useTheme();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [showPropertyPanel, setShowPropertyPanel] = useState(false);
  const [showCollaborationPanel, setShowCollaborationPanel] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [recentColors, setRecentColors] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [ownerId, setOwnerId] = useState(null);

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

  // 协作内容更新回调
  const handleCollaborationContentUpdate = useCallback((content) => {
    console.log('收到协作内容更新回调', {
      hasContent: !!content,
      hasJson: !!content?.json
    });

    if (!content || !content.json) {
      console.log('内容为空，跳过更新');
      return;
    }

    try {
      console.log('开始应用远程画布内容');
      // 标记为接收更新，避免触发保存
      isLoadingRef.current = true;

      // 延迟执行，确保editor已经初始化
      setTimeout(() => {
        // 使用editor hook的引用，而不是直接访问editor变量
        const currentEditor = editorRef.current;

        if (!currentEditor) {
          console.log('editor未准备好，跳过更新');
          isLoadingRef.current = false;
          return;
        }

        console.log('editor已准备好，应用远程内容');

        // 清除当前选择，避免冲突
        currentEditor.canvas.discardActiveObject();

        // 加载新内容
        currentEditor.loadJson(JSON.stringify(content.json));

        // 确保workspace存在且设置正确
        setTimeout(() => {
          const workspace = currentEditor.getWorkspace();
          if (workspace) {
            workspace.set({
              selectable: false,
              hasControls: false,
              evented: false
            });
            currentEditor.canvas.clipPath = workspace;
            currentEditor.canvas.sendToBack(workspace);
          }

          // 重新渲染画布
          currentEditor.canvas.renderAll();
        }, 100);

        console.log('远程画布内容应用成功');

        // 延长加载标记时间，确保不会立即触发保存
        setTimeout(() => {
          isLoadingRef.current = false;
          console.log('远程画布更新完成，恢复本地保存');
        }, 1000);

      }, 50); // 短暂延迟确保editor已初始化

    } catch (error) {
      console.error('应用远程内容失败:', error);
      isLoadingRef.current = false;
    }
  }, []); // 移除editor依赖

  // 协作者更新回调
  const handleCollaboratorsUpdate = useCallback((newCollaborators) => {
    console.log('更新协作者列表:', newCollaborators);
    setCollaborators(newCollaborators);
  }, []);

  // 使用协作Hook
  const collaboration = useCollaboration({
    fileId,
    onContentUpdate: handleCollaborationContentUpdate,
    onCollaboratorsUpdate: handleCollaboratorsUpdate
  });

  // 调试：监听协作数据变化
  useEffect(() => {
    console.log('CanvasPage 协作数据变化:', {
      collaborators: collaboration.collaborators,
      ownerId: collaboration.ownerId,
      currentUser: collaboration.currentUser?.uid,
      hasEditPermission: collaboration.hasEditPermission,
      hasAccess: collaboration.hasAccess
    });
  }, [collaboration.collaborators, collaboration.ownerId, collaboration.currentUser, collaboration.hasEditPermission, collaboration.hasAccess]);

  // 访问权限检查
  useEffect(() => {
    if (collaboration.currentUser && collaboration.ownerId && collaboration.collaborators !== undefined) {
      const hasAccess = collaboration.hasAccess;

      if (!hasAccess) {
        message.error('您没有权限访问此文件');
        navigate('/');
      }
    }
  }, [collaboration.currentUser, collaboration.ownerId, collaboration.collaborators, collaboration.hasAccess, navigate]);

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
      if (isInitialized && !isLoadingRef.current && !collaboration.isReceivingUpdate) {
        console.log('触发本地保存回调', {
          hasEditPermission: collaboration.hasEditPermission,
          objectCount: json?.objects?.length || 0
        });

        // 使用协作服务更新文件内容（会自动广播）
        if (collaboration.hasEditPermission) {
          collaboration.broadcastCanvasUpdate({ json, height, width });
        } else {
          // 如果没有编辑权限，使用原来的本地保存
          console.log('无编辑权限，使用本地保存');
          debouncedSave.current({ json, height, width });
        }
      } else {
        console.log('跳过保存回调', {
          isInitialized,
          isLoading: isLoadingRef.current,
          isReceivingUpdate: collaboration.isReceivingUpdate
        });
      }
    },
    hasEditPermission: collaboration.hasEditPermission,
  });

  // 更新editor引用
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

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

  // 根据权限控制canvas的可编辑性
  useEffect(() => {
    if (editor && editor.canvas) {
      const hasEdit = collaboration.hasEditPermission;

      // 设置canvas是否允许选择
      editor.canvas.selection = hasEdit;

      // 设置所有对象的可选择性和可编辑性
      const applyPermissions = () => {
        editor.canvas.getObjects().forEach(obj => {
          if (obj.name !== 'clip') { // 保持workspace的clip对象不受影响
            obj.selectable = hasEdit;
            obj.evented = hasEdit;
          }
        });
      };

      applyPermissions();

      // 监听对象添加事件，为新对象应用权限
      const handleObjectAdded = (e) => {
        const obj = e.target;
        if (obj && obj.name !== 'clip') {
          obj.selectable = hasEdit;
          obj.evented = hasEdit;
        }
      };

      editor.canvas.on('object:added', handleObjectAdded);

      // 如果没有编辑权限，禁用绘图模式
      if (!hasEdit && isDrawingMode) {
        editor.disableDrawingMode();
        setIsDrawingMode(false);
        setSelectedTool(null);
      }

      editor.canvas.renderAll();

      console.log('权限控制已应用:', { hasEdit, objectCount: editor.canvas.getObjects().length });

      // 清理监听器
      return () => {
        if (editor.canvas) {
          editor.canvas.off('object:added', handleObjectAdded);
        }
      };
    }
  }, [collaboration.hasEditPermission, editor, isDrawingMode]);

  // 处理分享链接加入
  useEffect(() => {
    const handleShareLink = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const shareCode = urlParams.get('share');

      if (shareCode && fileId && collaboration.currentUser) {
        try {
          const password = prompt('请输入分享密码（如果有的话）:') || '';
          await joinByShareLink(fileId, shareCode, collaboration.currentUser.uid, password);
          message.success('成功加入协作！');
          // 清除URL中的分享参数
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          message.error('加入协作失败: ' + error.message);
          // 如果加入失败，跳转回首页
          navigate('/');
        }
      }
    };

    if (collaboration.currentUser) {
      handleShareLink();
    }
  }, [fileId, collaboration.currentUser, navigate]);

  // 加载文件内容
  useEffect(() => {
    const loadFile = async () => {
      if (fileId && editor && !isInitialized) {
        try {
          isLoadingRef.current = true;
          console.log('开始加载文件内容...');

          // 将文件添加到最近打开列表
          const uid = auth.currentUser?.uid;
          if (uid) {
            try {
              await userService.addRecentFile(uid, fileId);
              console.log('已添加到最近打开列表');
            } catch (error) {
              console.error('添加到最近打开列表失败:', error);
            }
          }

          const content = await getFileContent(fileId);
          if (content && content.json) {
            // 在加载期间禁用自动保存
            editor.loadJson(JSON.stringify(content.json));
            console.log('文件内容加载完成');
          }

          // 获取文件的详细信息，包括所有者
          const fileData = await getDoc(doc(firestore, 'files', fileId));
          if (fileData.exists()) {
            const data = fileData.data();
            console.log('文件详细信息:', data);
            setOwnerId(data.ownerId);
            setCollaborators(data.collaborators || []);
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
        // 检查权限
        if (!checkEditPermission()) return;

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
          message.success('保存成功！');
        }).catch((error) => {
          console.error('保存失败:', error);
          message.error('保存失败，请重试');
        });
        break;
      case '导出图片':
        editor.savePng();
        break;
      case '导出JPG':
        editor.saveJpg();
        break;
      case '重置画布':
        // 检查权限
        if (!checkEditPermission()) return;

        // 添加确认对话框
        if (confirm('确定要重置画布吗？这将清除所有绘制内容，但保留白色底布。')) {
          // 使用专门的重置函数，只删除非workspace的对象，保留白色底布
          editor.resetCanvas();
        }
        break;
      case '实时协作':
        setShowCollaborationPanel(!showCollaborationPanel);
        break;
      case '画布背景':
        // 检查权限
        if (!checkEditPermission()) return;

        const color = prompt('请输入背景颜色 (如: #ffffff 或 white):');
        if (color) {
          editor.changeBackground(color);
        }
        break;
      default:
        message.info(`${option}功能正在开发中`);
        break;
    }
    setIsMenuOpen(false);
  };

  // 检查编辑权限
  const checkEditPermission = () => {
    if (!collaboration.hasEditPermission) {
      message.warning('您只有只读权限，无法编辑画布');
      return false;
    }
    return true;
  };

  // 处理工具选择
  const handleToolSelect = (toolIndex) => {
    if (!editor) return;

    // 对于编辑工具，检查权限
    if ([3, 4, 5, 7, 8].includes(toolIndex) && !checkEditPermission()) {
      return;
    }

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

      {/* 协作状态指示器 */}
      {collaboration.currentUser && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          zIndex: 999
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: collaboration.isOnline ? '#00ff00' : '#ff0000'
          }}></div>
          {collaboration.isOnline ? '已连接' : '已断线'}
          {collaboration.collaborators.length > 0 && (
            <span>| {collaboration.collaborators.length + 1} 人在线</span>
          )}
          {!collaboration.hasEditPermission && collaboration.ownerId !== collaboration.currentUser?.uid && (
            <span style={{ color: '#ffa500' }}>| 只读模式</span>
          )}
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

      {/* 协作面板 */}
      {showCollaborationPanel && (
        <CollaborationPanel
          fileId={fileId}
          collaborators={collaboration.collaborators}
          ownerId={collaboration.ownerId}
          onClose={() => setShowCollaborationPanel(false)}
        />
      )}

      {/* 右上角按钮 - 漂浮在画板上 */}
      <div className={styles.rightButtons} style={{ zIndex: 10 }}>
        <Button onClick={() => message.info('分享功能正在开发中')}>
          <img src="/imgs/share-nodes-solid.png" alt="图标" style={{ width: '13px', height: '15px', marginRight: '6px', verticalAlign: 'middle' }} />
          分享
        </Button>
        <Button onClick={() => message.info('素材库功能正在开发中')}>
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
          onClick={() => {
            if (checkEditPermission()) {
              editor?.onUndo();
            }
          }}
          disabled={!editor?.canUndo || !collaboration.hasEditPermission}
          style={{ opacity: (editor?.canUndo && collaboration.hasEditPermission) ? 1 : 0.5 }}
        >
          ↺
        </button>
        <button
          className='redo'
          onClick={() => {
            if (checkEditPermission()) {
              editor?.onRedo();
            }
          }}
          disabled={!editor?.canRedo || !collaboration.hasEditPermission}
          style={{ opacity: (editor?.canRedo && collaboration.hasEditPermission) ? 1 : 0.5 }}
        >
          ↻
        </button>
      </div>

      {/* 右下角按钮组 - 漂浮在画板上 */}
      <div className={styles.bottomRight} style={{ zIndex: 10 }}>
        <button className={styles.cornerButton} onClick={() => message.info('帮助功能正在开发中')}>❓</button>
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