import React, { useState, useRef } from 'react';
import { Button, Tabs, Input, Select, Upload, Slider, Spin, message, App } from 'antd';
import { CloseOutlined, PictureOutlined, EditOutlined } from '@ant-design/icons';
import styles from './AICollaborationPanel.module.css';
import { generateAIImage, editAIImage, testAPIConnection } from '../../services/aiService';

const { TextArea } = Input;
const { Option } = Select;

export const AICollaborationPanel = ({ onClose, editor, fileId }) => {
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState('generate');
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('realistic');
  const [quality, setQuality] = useState('economic');
  const [selectedEditType, setSelectedEditType] = useState(null);
  const fileInputRef = useRef(null);

  // 定义不同编辑功能的配置
  const editTypeConfig = {
    'enhance': {
      needsPrompt: false,
      label: '🔍 高清放大',
      desc: '智能增强图像分辨率和清晰度，无需额外描述'
    },
    'style_transfer': {
      needsPrompt: true,
      label: '🎨 风格转换',
      desc: '转换图片艺术风格',
      placeholder: '例如：转换为水彩画风格、油画风格、素描风格'
    },
    'remove_watermark': {
      needsPrompt: false,
      label: '🧹 去水印',
      desc: '智能去除图片中的文字水印和标记'
    },
    'colorize': {
      needsPrompt: true,
      label: '🌈 图像上色',
      desc: '为黑白图片添加自然色彩',
      placeholder: '例如：使用温暖的色调上色、复古色彩风格'
    },
    'instruction_edit': {
      needsPrompt: true,
      label: '✏️ 指令编辑',
      desc: '按照指令编辑图片内容',
      placeholder: '例如：让天空更蓝，添加几朵白云，调整整体亮度',
      required: true
    }
  };

  // AI图像生成
  const handleImageGeneration = async () => {
    if (!prompt.trim()) {
      message.warning('请输入描述文字');
      return;
    }

    setLoading(true);
    try {
      const response = await generateAIImage(prompt, style);

      if (response.success) {
        // 将生成的图像添加到画布
        if (editor && response.imageUrl) {
          editor.addImage(response.imageUrl);
        }
        message.success('AI图像生成成功！');
        setPrompt(''); // 清空输入框
      } else {
        message.error(response.error || 'AI图像生成失败，请重试');
      }
    } catch (error) {
      console.error('AI图像生成错误:', error);
      message.error('AI图像生成失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // AI图像编辑
  const handleImageEdit = async (editType) => {
    const activeObject = editor.canvas.getActiveObject();

    // 检查是否选择了图片对象
    if (!activeObject) {
      message.warning('请先在画布上选择一个对象');
      return;
    }

    if (activeObject.type !== 'image') {
      message.warning('请选择一个图片对象，AI编辑仅支持图片');
      return;
    }

    // 检查是否需要填写prompt
    const config = editTypeConfig[editType];
    if (config && config.required && !prompt.trim()) {
      message.warning(`${config.label}功能需要填写编辑指令`);
      setSelectedEditType(editType); // 设置选中的编辑类型以便UI提示
      return;
    }

    setLoading(true);
    try {
      // 获取当前图片URL
      const imageData = activeObject.getSrc();
      console.log('开始AI图像编辑:', { editType, imageData });

      // 调用AI图像编辑API
      const response = await editAIImage(imageData, editType, prompt);

      if (response.success) {
        // 更新图片源
        activeObject.setSrc(response.imageUrl, () => {
          // 保持原有的尺寸和位置
          editor.canvas.renderAll();
          console.log('图片编辑完成并更新到画布');
        });
        message.success(`${editType}编辑成功！图片已更新`);

        // 清空编辑指令
        setPrompt('');
      } else {
        message.error(response.error || 'AI图像编辑失败，请重试');
      }
    } catch (error) {
      console.error('AI图像编辑错误:', error);
      message.error('AI图像编辑失败，请检查网络连接后重试');
    } finally {
      setLoading(false);
    }
  };

  // 测试API连接
  const handleTestConnection = async () => {
    console.log('🔄 用户点击测试连接按钮');
    setLoading(true);

    // 显示开始测试的消息
    message.loading('正在测试阿里云API连接...', 0);

    try {
      console.log('📞 调用测试API连接...');
      const result = await testAPIConnection();

      // 关闭loading消息
      message.destroy();

      console.log('📋 测试结果:', result);

      if (result.success) {
        message.success(result.message, 5);
        console.log('✅ 连接测试成功');
      } else {
        message.error(result.message, 8);
        console.log('❌ 连接测试失败:', result.message);
      }
    } catch (error) {
      message.destroy();
      console.error('🚫 测试连接异常:', error);
      message.error(`测试连接异常: ${error.message}`, 8);
    } finally {
      setLoading(false);
    }
  };

  const tabItems = [
    {
      key: 'generate',
      label: (
        <span>
          <PictureOutlined />
          AI生成
        </span>
      ),
      children: (
        <div className={styles.tabContent}>
          <div className={styles.section}>
            <h4>描述您想要的图片</h4>
            <TextArea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="例如：一只可爱的橙色小猫在花园里玩耍"
              rows={4}
              maxLength={500}
            />
            <div className={styles.promptHelp}>
              <small>💡 提示：支持中文描述，描述越详细生成效果越好</small>
            </div>
          </div>

          <div className={styles.section}>
            <h4>风格选择</h4>
            <Select
              value={style}
              onChange={setStyle}
              style={{ width: '100%' }}
            >
              <Option value="realistic">写实风格</Option>
              <Option value="cartoon">卡通风格</Option>
              <Option value="anime">动漫风格</Option>
              <Option value="watercolor">水彩风格</Option>
              <Option value="oil_painting">油画风格</Option>
              <Option value="sketch">素描风格</Option>
            </Select>
          </div>

          <div className={styles.section}>
            <h4>图像质量</h4>
            <Select
              value={quality}
              onChange={setQuality}
              style={{ width: '100%' }}
            >
              <Option value="economic">经济型 (0.04元/张) 性价比高</Option>
              <Option value="turbo">标准型 (0.14元/张) 速度快</Option>
              <Option value="plus">高级型 (0.20元/张) 质量最佳</Option>
            </Select>
            <div className={styles.promptHelp}>
              <small>💰 AI功能均基于阿里云百炼平台的免费额度：限500张，有效期180天</small>
            </div>
          </div>



          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <Button
              type="primary"
              onClick={handleImageGeneration}
              loading={loading}
              disabled={!prompt.trim()}
              style={{ flex: 1 }}
            >
              生成图片
            </Button>
            <Button
              onClick={handleTestConnection}
              loading={loading}
              title="测试API连接状态"
            >
              测试连接
            </Button>
          </div>
        </div>
      )
    },
    {
      key: 'edit',
      label: (
        <span>
          <EditOutlined />
          AI编辑
        </span>
      ),
      children: (
        <div className={styles.tabContent}>
          <div className={styles.section}>
            <div className={styles.infoBox}>
              <h4>🖼️ 图片AI编辑</h4>
              <p>请先在画布上选择一张图片，然后选择编辑方式</p>
              <small>💡 提示：支持5种AI编辑功能，部分功能需要填写编辑指令</small>
            </div>

            <div className={styles.editOptions}>
              {Object.entries(editTypeConfig).map(([editType, config]) => (
                <div
                  key={editType}
                  className={`${styles.editCard} ${selectedEditType === editType ? styles.selected : ''}`}
                  onClick={() => setSelectedEditType(editType)}
                >
                  <div className={styles.editCardHeader}>
                    <span className={styles.editLabel}>{config.label}</span>
                    {config.needsPrompt && (
                      <span className={styles.promptRequired}>
                        {config.required ? '必填' : '可选'}
                      </span>
                    )}
                  </div>
                  <div className={styles.editDesc}>{config.desc}</div>
                </div>
              ))}
            </div>

            {selectedEditType && (
              <div className={styles.selectedEditSection}>
                <h4>
                  {editTypeConfig[selectedEditType].label}
                  {editTypeConfig[selectedEditType].needsPrompt && (
                    <span className={styles.promptTag}>
                      {editTypeConfig[selectedEditType].required ? ' (必填指令)' : ' (可选指令)'}
                    </span>
                  )}
                </h4>

                {editTypeConfig[selectedEditType].needsPrompt ? (
                  <div>
                    <TextArea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={editTypeConfig[selectedEditType].placeholder}
                      rows={3}
                      maxLength={200}
                      disabled={false}
                    />
                    <div className={styles.promptHelp}>
                      <small>
                        {editTypeConfig[selectedEditType].required
                          ? '⚠️ 此功能需要填写编辑指令才能执行'
                          : '💡 可以填写指令来指导AI编辑，留空则使用默认设置'
                        }
                      </small>
                    </div>
                  </div>
                ) : (
                  <div>
                    <TextArea
                      value=""
                      placeholder="此功能无需填写指令，系统将自动处理"
                      rows={2}
                      disabled={true}
                      style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                    />
                    <div className={styles.promptHelp}>
                      <small>✅ 此功能无需额外指令，点击执行即可</small>
                    </div>
                  </div>
                )}

                <Button
                  type="primary"
                  onClick={() => handleImageEdit(selectedEditType)}
                  loading={loading}
                  disabled={editTypeConfig[selectedEditType].required && !prompt.trim()}
                  style={{ width: '100%', marginTop: '12px' }}
                >
                  执行 {editTypeConfig[selectedEditType].label}
                </Button>
              </div>
            )}
          </div>
        </div>
      )
    }
  ];

  return (
    <div className={styles.aiPanel}>
      <div className={styles.header}>
        <h3>AI协作助手</h3>
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={onClose}
          className={styles.closeButton}
        />
      </div>

      <div className={styles.content}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          tabPosition="top"
        />
      </div>

      {loading && (
        <div className={styles.loadingOverlay}>
          <Spin size="large" />
          <p>AI正在处理中，请稍候...</p>
        </div>
      )}
    </div>
  );
};