import React, { useState } from 'react';
import { Button } from '../../components/button/Button';
import { useNavigate } from 'react-router';
import styles from './CanvasPage.module.css';

export const Component = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [canvasContent, setCanvasContent] = useState('空白画板');
  // 添加用于工具选择的状态
  const [selectedTool, setSelectedTool] = useState(null);
  // 添加用于缩放比例的状态
  const [zoomLevel, setZoomLevel] = useState(100);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  // 处理菜单选项
  const handleMenuOption = (option) => {
    switch(option) {
      case '打开':
        setCanvasContent('新建的空白画板');
        break;
      case '保存':
        alert('画板已保存');
        break;
      case '导出图片':
        alert('画板已导出');
        break;
      case '实时协作':
        alert('分享链接已复制');
        break;
      case 'AI协作':
        alert('AI协作已启动');
        break;
      case '重置画布':
        setCanvasContent('空白画板');
        break;
      case '评论':
        alert('评论功能已启动');
        break;
      
      default:
        break;
    }
    setIsMenuOpen(false);
  };
  
  // 处理工具选择
  const handleToolSelect = (tool, index) => {
    setSelectedTool(index);
    alert(`已选择${tool}工具`);
  };
  
  // 处理缩放功能
  const handleZoom = (direction) => {
    if (direction === 'in') {
      setZoomLevel(prev => Math.min(prev + 10, 200));
    } else {
      setZoomLevel(prev => Math.max(prev - 10, 50));
    }
  };

  // Toolbar图标数组
  let icons = [
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
      <div className={styles.content} style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        margin: 0,
        padding: 0,
        overflow: 'hidden'
      }}>
        {/* 画板 - 铺满内容区域 */}
        <div style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#f9f9f9',
          position: 'relative'
        }}>
          {/* 画板内容 */}
          <div style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: `translate(-50%, -50%) scale(${zoomLevel/100})`,
            transition: 'transform 0.2s ease'
          }}>
            {canvasContent}
          </div>
        </div>
      </div>
      
      {/* 顶部菜单 - 漂浮在画板上 */}
      <div className={styles.menuContainer} style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
        <button className={styles.menuButton} onClick={toggleMenu}>
          ☰
        </button>
        {isMenuOpen && (
          <div className={styles.menuBox}>
            <ul>
              <li onClick={() => handleMenuOption('打开')}>
                <img src="/imgs/folder-open-solid.jpg" alt="图标" style={{ width: '16px', height: '15px', marginRight: '10px',marginLeft:'5px',verticalAlign: 'middle',objectFit: 'contain' }} />
                打开本地文件
              </li>
              <li onClick={() => handleMenuOption('保存')}>
                <img src="/imgs/floppy-disk-solid.jpg" alt="图标" style={{ width: '16px', height: '15px', marginRight: '10px', marginLeft: '5px', verticalAlign: 'middle',objectFit: 'contain' }} />
                保存
              </li>
              <li onClick={() => handleMenuOption('导出图片')}>
                <img src="/imgs/file-export-solid.jpg" alt="图标" style={{ width: '16px', height: '15px', marginRight: '10px', marginLeft: '5px', verticalAlign: 'middle',objectFit:'contain'}} />
                导出图片
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
                <img src="/imgs/trash-solid.jpg" alt="图标" style={{ width: '16px', height: '15px', marginRight: '10px', marginLeft: '5px', verticalAlign: 'middle',objectFit:'contain' }} />
                重置画布
              </li>
              <li onClick={() => handleMenuOption('评论')}>
                <img src="/imgs/comment-regular.jpg" alt="图标" style={{ width: '16px', height: '15px', marginRight: '10px', marginLeft: '5px', verticalAlign: 'middle',objectFit:'contain' }} />
                评论
              </li>
            </ul>
            <hr />
            <ul>
              <li>
                <img src="/imgs/moon-solid.jpg" alt="图标" style={{ width: '16px', height: '15px', marginRight: '10px', marginLeft: '5px', verticalAlign: 'middle', objectFit: 'contain' }} />
                夜间模式
              </li>
              <li>
                <img src="/imgs/layer-group-solid.jpg" alt="图标" style={{ width: '16px', height: '15px', marginRight: '10px', marginLeft: '5px', verticalAlign: 'middle',objectFit:'contain' }} />
                画布背景</li>
              <li>
                <img src="/imgs/globe-solid.jpg" alt="图标" style={{ width: '16px', height: '15px', marginRight: '10px', marginLeft: '5px', verticalAlign: 'middle',objectFit:'contain' }} />
                
                语言
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* 画板工具栏 - 漂浮在画板上 */}
      {/* <div className={styles.toolbarContainer} style={{ zIndex: 10 }}>
        {['🔒','🖐','🖱','⬛','➡️','✏️','A','🖼','🧹'].map((icon, index, arr) => (
          <React.Fragment key={index}>
            <button 
              className={styles.toolbarButton} 
              onClick={() => handleToolSelect(icon, index)}
              style={selectedTool === index ? { backgroundColor: '#e0e0e0' } : {}}
            >
              {icon}
            </button>
            {index !== arr.length - 1 && <div className={styles.verticalDivider} />}
          </React.Fragment>
        ))}
      </div> */}

      <div className={styles.toolbarContainer} style={{ zIndex: 10 }}>
      {icons.map((icon, index, arr) => (
        <React.Fragment key={index}>
          <button 
            className={styles.toolbarButton} 
            onClick={() => handleToolSelect(icon, index)}
            style={selectedTool === index ? { backgroundColor: '#e0e0e0' } : {}}
          >
            <img src={icon} alt={`Icon-${index}`} style={{ width: '18px', height: '18px' ,verticalAlign: 'middle'}} />
          </button>
          {index !== arr.length - 1 && <div className={styles.verticalDivider} />}
        </React.Fragment>
      ))}
    </div>
    
      {/* 右上角按钮 - 漂浮在画板上 */}
      <div className={styles.rightButtons} style={{ zIndex: 10 }}>
        
        {/* <Button onClick={() => alert('已打开素材库')}>素材库</Button> */}
        <Button onClick={() => alert('已打开素材库')}>
          <img src="/imgs/share-nodes-solid.png" alt="图标" style={{ width: '13px', height: '15px', marginRight: '6px',verticalAlign: 'middle' }} />
          分享
        </Button>
        <Button onClick={() => alert('已生成分享链接')}>
          <img src='/imgs/store-solid.jpg' alt="图标" style={{ width: '16px', height: '15px', marginRight: '6px',verticalAlign: 'middle' }} />
          素材库
        </Button>
      </div>
      
      {/* 左下角缩放按钮组 - 漂浮在画板上 */}
      <div className={styles.ZoomButton} style={{ zIndex: 10 }}>
        <button className="decrease" onClick={() => handleZoom('out')}>-</button>
        <span className="value">{zoomLevel}%</span>
        <button className="increase" onClick={() => handleZoom('in')}>+</button>
      </div>
      
      {/* 左下角撤销重做按钮 - 漂浮在画板上 */}
      <div className={styles.UndoRedoButton} style={{ zIndex: 10 }}>
        <button className='undo' onClick={() => alert('撤销操作')}>↺</button>
        <button className='redo' onClick={() => alert('重做操作')}>↻</button>
      </div>
      
      {/* 右下角按钮组 - 漂浮在画板上 */}
      <div className={styles.bottomRight} style={{ zIndex: 10 }}>
        <button className={styles.cornerButton} onClick={() => alert('显示帮助')}>❓</button>
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