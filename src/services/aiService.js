// AI服务 - 阿里云通义万相

/**
 * AI图像生成和编辑服务
 * 使用阿里云通义万相API，免费额度500张，有效期180天
 */

// API配置
const AI_CONFIG = {
  aliyun: {
    apiKey: 'sk-0aaa03ce0cb5499ab97219f4c89e1266',
    // 使用代理URL避免CORS问题
    baseUrl: '/api/dashscope/api/v1/services/aigc',
    // 文生图模型 (根据需求选择)
    models: {
      economic: 'wanx2.0-t2i-turbo',   // 0.04元/张，性价比高
      turbo: 'wanx2.1-t2i-turbo',     // 0.14元/张，速度快
      plus: 'wanx2.1-t2i-plus'        // 0.20元/张，质量最高
    },
    defaultModel: 'wanx2.0-t2i-turbo'  // 默认使用经济型
  }
};

/**
 * 生成AI图像
 * @param {string} prompt - 图像描述
 * @param {string} style - 图像风格
 * @returns {Promise<{success: boolean, imageUrl?: string, error?: string}>}
 */
export async function generateAIImage(prompt, style = 'realistic') {
  try {
    console.log('阿里云AI图像生成请求:', { prompt, style });

    // 如果没有API密钥，使用模拟数据
    if (!AI_CONFIG.aliyun.apiKey) {
      console.log('使用模拟AI图像生成');
      return await mockImageGeneration(prompt, style);
    }

    return await generateWithAliyun(prompt, style);
  } catch (error) {
    console.error('AI图像生成失败:', error);
    return {
      success: false,
      error: error.message || '图像生成失败'
    };
  }
}

/**
 * 使用阿里云通义万相生成图像
 */
async function generateWithAliyun(prompt, style) {
  // 风格提示词优化
  const stylePrompts = {
    realistic: '高清摄影，写实风格，专业摄影，细节丰富',
    cartoon: '卡通插画风格，可爱，色彩鲜艳，动画风格',
    anime: '动漫风格，精美插画，日式动画，细致绘画',
    watercolor: '水彩画风格，柔和色调，艺术绘画，淡雅',
    oil_painting: '油画风格，厚重笔触，古典艺术，绘画大师',
    sketch: '素描风格，线条艺术，手绘效果，铅笔画'
  };

  const enhancedPrompt = `${prompt}，${stylePrompts[style] || ''}，高质量，精美，细节清晰`;

  try {
    // 第一步：创建图像生成任务
    console.log('创建阿里云图像生成任务...');

    const createResponse = await fetch(`${AI_CONFIG.aliyun.baseUrl}/text2image/image-synthesis`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.aliyun.apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable'
      },
      body: JSON.stringify({
        model: AI_CONFIG.aliyun.defaultModel,
        input: {
          prompt: enhancedPrompt,
          negative_prompt: "模糊，低质量，变形，丑陋，水印，文字"
        },
        parameters: {
          size: "1024*1024",
          n: 1,
          prompt_extend: true,
          watermark: false
        }
      })
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('阿里云任务创建失败:', errorText);

      if (errorText.includes('quota') || errorText.includes('insufficient')) {
        throw new Error('免费额度已用完或余额不足，请等待每日重置或充值');
      }

      throw new Error(`任务创建失败: ${errorText}`);
    }

    const createData = await createResponse.json();
    const taskId = createData.output?.task_id;

    if (!taskId) {
      throw new Error('未能获取任务ID，请重试');
    }

    console.log('任务创建成功，ID:', taskId, '开始轮询结果...');

    // 第二步：轮询任务结果 (阿里云文生图约需1-3分钟)
    let attempts = 0;
    const maxAttempts = 90; // 最多等待3分钟

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 每2秒查询一次

      const resultResponse = await fetch(`/api/dashscope/api/v1/tasks/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${AI_CONFIG.aliyun.apiKey}`
        }
      });

            if (resultResponse.ok) {
        const resultData = await resultResponse.json();
        console.log('📋 任务状态响应:', resultData);

        const status = resultData.output?.task_status;

        console.log(`任务状态: ${status} (尝试 ${attempts + 1}/${maxAttempts})`);

        if (status === 'SUCCEEDED') {
          const results = resultData.output?.results;
          if (results && results.length > 0) {
            const imageUrl = results[0].url;
            console.log('✅ 图像生成成功:', imageUrl);

            return {
              success: true,
              imageUrl: imageUrl
            };
          }
        } else if (status === 'FAILED') {
          throw new Error('图像生成任务失败，请重试');
        }
        // PENDING 或 RUNNING 状态继续等待
      } else {
        const errorText = await resultResponse.text();
        console.error(`❌ 查询任务状态失败 (${resultResponse.status}):`, errorText);

        // 如果是持续的错误，停止重试
        if (resultResponse.status === 404) {
          throw new Error('任务ID不存在或已过期');
        }
      }

      attempts++;
    }

    throw new Error('图像生成超时（超过3分钟），请稍后重试');

  } catch (error) {
    console.error('阿里云API调用失败:', error);
    throw error;
  }
}

/**
 * AI图像编辑
 * @param {string} imageUrl - 原始图像URL
 * @param {string} editType - 编辑类型
 * @param {string} instruction - 编辑指令
 * @returns {Promise<{success: boolean, imageUrl?: string, error?: string}>}
 */
export async function editAIImage(imageUrl, editType, instruction = '') {
  try {
    console.log('AI图像编辑请求:', { imageUrl, editType, instruction });

    // 如果没有API密钥，使用模拟数据
    if (!AI_CONFIG.aliyun.apiKey) {
      return await mockImageEdit(imageUrl, editType, instruction);
    }

    return await editWithAliyun(imageUrl, editType, instruction);
  } catch (error) {
    console.error('AI图像编辑失败:', error);
    return {
      success: false,
      error: error.message || '图像编辑失败'
    };
  }
}

/**
 * 调整图片尺寸以符合阿里云要求（512-4096像素）
 */
async function resizeImageToValidDimensions(base64Data) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      let { width, height } = img;
      console.log('📏 原始图片尺寸:', { width, height });

      // 检查是否需要调整尺寸
      const minSize = 512;
      const maxSize = 4096;

      let needResize = false;

      // 如果任一边小于512，按比例放大到512
      if (width < minSize || height < minSize) {
        const scale = minSize / Math.min(width, height);
        width *= scale;
        height *= scale;
        needResize = true;
        console.log('📈 图片太小，放大到:', { width: Math.round(width), height: Math.round(height) });
      }

      // 如果任一边大于4096，按比例缩小到4096
      if (width > maxSize || height > maxSize) {
        const scale = maxSize / Math.max(width, height);
        width *= scale;
        height *= scale;
        needResize = true;
        console.log('📉 图片太大，缩小到:', { width: Math.round(width), height: Math.round(height) });
      }

      // 确保尺寸为整数
      width = Math.round(width);
      height = Math.round(height);

      if (needResize) {
        // 重新绘制图片
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // 转换为Base64
        const resizedBase64 = canvas.toDataURL('image/png');
        console.log('✅ 图片尺寸调整完成:', { width, height });
        resolve(resizedBase64);
      } else {
        console.log('✅ 图片尺寸符合要求，无需调整');
        resolve(base64Data);
      }
    };
    img.src = base64Data;
  });
}

/**
 * 将Base64图片上传到阿里云临时存储并获取公网URL
 */
async function uploadImageToAliyun(base64Data) {
  try {
    // 第零步：检查并调整图片尺寸
    console.log('📏 检查图片尺寸是否符合阿里云要求...');
    const validBase64 = await resizeImageToValidDimensions(base64Data);

    // 第一步：获取上传凭证
    console.log('🔑 获取阿里云文件上传凭证...');
    const policyResponse = await fetch('/api/dashscope/api/v1/uploads?action=getPolicy&model=wanx2.1-imageedit', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.aliyun.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!policyResponse.ok) {
      throw new Error(`获取上传凭证失败: ${policyResponse.status} ${policyResponse.statusText}`);
    }

    const policyData = await policyResponse.json();
    console.log('✅ 上传凭证获取成功:', policyData);

    if (!policyData.data) {
      throw new Error('上传凭证数据无效');
    }

    const policy = policyData.data;

    // 第二步：准备文件数据
    // 将调整后的Base64转换为Blob
    const byteCharacters = atob(validBase64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });

    // 生成文件名和key
    const fileName = `edit_${Date.now()}.png`;
    const key = `${policy.upload_dir}/${fileName}`;

    // 第三步：上传文件到OSS
    console.log('📤 上传文件到阿里云OSS...');
    const formData = new FormData();
    formData.append('OSSAccessKeyId', policy.oss_access_key_id);
    formData.append('Signature', policy.signature);
    formData.append('policy', policy.policy);
    formData.append('x-oss-object-acl', policy.x_oss_object_acl);
    formData.append('x-oss-forbid-overwrite', policy.x_oss_forbid_overwrite);
    formData.append('key', key);
    formData.append('success_action_status', '200');
    formData.append('file', blob, fileName);

    const uploadResponse = await fetch(policy.upload_host, {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      throw new Error(`文件上传失败: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    // 第四步：生成公网URL
    const publicUrl = `oss://${key}`;
    console.log('✅ 文件上传成功，获得公网URL:', publicUrl);

    return {
      success: true,
      url: publicUrl,
      expiresIn: 48 * 60 * 60 * 1000 // 48小时有效期
    };

  } catch (error) {
    console.error('❌ 文件上传失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 使用阿里云进行图像编辑
 */
async function editWithAliyun(imageUrl, editType, instruction) {
  // 阿里云图像编辑功能映射（根据官方文档）
  const editFunctionMap = {
    'enhance': 'super_resolution',           // 图像超分（高清放大）
    'style_transfer': 'stylization_all',    // 全局风格化
    'remove_watermark': 'remove_watermark', // 去文字水印
    'colorize': 'colorization',             // 图像上色
    'instruction_edit': 'description_edit'   // 指令编辑
  };

  const editFunction = editFunctionMap[editType];
  if (!editFunction) {
    throw new Error(`不支持的编辑类型: ${editType}`);
  }

  try {
    // 第一步：如果是Base64格式，先上传到临时存储
    let actualImageUrl = imageUrl;
    if (imageUrl.startsWith('data:image/')) {
      console.log('🔄 检测到Base64图片，正在上传到阿里云临时存储...');
      const uploadResult = await uploadImageToAliyun(imageUrl);

      if (!uploadResult.success) {
        throw new Error(`图片上传失败: ${uploadResult.error}`);
      }

      actualImageUrl = uploadResult.url;
      console.log('✅ Base64图片上传完成，使用公网URL:', actualImageUrl);
    }

    // 第二步：创建图像编辑任务
    console.log('创建阿里云图像编辑任务:', { editType, editFunction });

    // 根据编辑类型生成提示词
    let promptText = '';
    switch (editType) {
      case 'enhance':
        promptText = "图像超分";  // 超分功能提示词要简洁
        break;
      case 'style_transfer':
        promptText = instruction || "转换为艺术绘画风格";
        break;
      case 'remove_watermark':
        promptText = "去除图像中的文字";
        break;
      case 'colorize':
        promptText = instruction || "为黑白图像上色，自然色彩";
        break;
      case 'instruction_edit':
        promptText = instruction || "按指令编辑图像";
        break;
    }

    // 构建正确的请求体结构（根据官方文档）
    const requestBody = {
      model: 'wanx2.1-imageedit',
      input: {
        function: editFunction,
        prompt: promptText,
        base_image_url: actualImageUrl
      },
      parameters: {
        n: 1,
        watermark: false
      }
    };

    console.log('📤 图像编辑请求体:', JSON.stringify(requestBody, null, 2));

    const createResponse = await fetch(`${AI_CONFIG.aliyun.baseUrl}/image2image/image-synthesis`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.aliyun.apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
        'X-DashScope-OssResourceResolve': 'enable' // 使用临时文件URL时必须添加此header
      },
      body: JSON.stringify(requestBody)
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('阿里云图像编辑任务创建失败:', errorText);

      if (errorText.includes('quota') || errorText.includes('insufficient')) {
        throw new Error('图像编辑额度不足，请等待重置或充值');
      }

      throw new Error(`图像编辑任务创建失败: ${errorText}`);
    }

    const createData = await createResponse.json();
    const taskId = createData.output?.task_id;

    if (!taskId) {
      throw new Error('未能获取图像编辑任务ID');
    }

    console.log('图像编辑任务创建成功，ID:', taskId, '开始轮询结果...');

    // 第二步：轮询任务结果
    let attempts = 0;
    const maxAttempts = 60; // 最多等待2分钟

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const resultResponse = await fetch(`/api/dashscope/api/v1/tasks/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${AI_CONFIG.aliyun.apiKey}`,
          'X-DashScope-OssResourceResolve': 'enable' // 使用临时文件URL时必须添加
        }
      });

      if (resultResponse.ok) {
        const resultData = await resultResponse.json();
        const status = resultData.output?.task_status;

        console.log(`图像编辑任务状态: ${status} (尝试 ${attempts + 1}/${maxAttempts})`);
        console.log('📋 完整状态响应:', JSON.stringify(resultData, null, 2));

        if (status === 'SUCCEEDED') {
          const results = resultData.output?.results;
          if (results && results.length > 0) {
            const editedImageUrl = results[0].url;
            console.log('图像编辑成功:', editedImageUrl);

            return {
              success: true,
              imageUrl: editedImageUrl,
              message: `${editType}编辑完成`
            };
          }
        } else if (status === 'FAILED') {
          // 获取失败的详细原因
          const errorMessage = resultData.output?.message || resultData.message || '未知错误';
          const errorCode = resultData.output?.code || resultData.code || '未知错误码';
          console.error('❌ 任务失败详情:', { errorCode, errorMessage, fullResponse: resultData });
          throw new Error(`图像编辑任务失败: [${errorCode}] ${errorMessage}`);
        }
        // PENDING 或 RUNNING 状态继续等待
      } else {
        const errorText = await resultResponse.text();
        console.warn('查询图像编辑任务状态失败:', errorText);
      }

      attempts++;
    }

    throw new Error('图像编辑超时，请稍后重试');

  } catch (error) {
    console.error('阿里云图像编辑失败:', error);
    throw error;
  }
}

/**
 * 模拟图像生成（用于演示）
 */
async function mockImageGeneration(prompt, style) {
  console.log('模拟阿里云图像生成...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  const imageUrl = `https://picsum.photos/1024/1024?random=${Date.now()}`;

  return {
    success: true,
    imageUrl: imageUrl,
    message: `模拟生成: ${prompt} (${style}风格)`
  };
}

/**
 * 模拟图像编辑（用于演示）
 */
async function mockImageEdit(imageUrl, editType, instruction) {
  console.log('模拟图像编辑...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  const newImageUrl = `https://picsum.photos/1024/1024?random=${Date.now()}`;

  return {
    success: true,
    imageUrl: newImageUrl,
    message: `模拟编辑: ${editType}`
  };
}

/**
 * 测试API连接
 */
export async function testAPIConnection() {
  try {
    console.log('测试阿里云API连接...');

    if (!AI_CONFIG.aliyun.apiKey) {
      return { success: true, message: '演示模式：无需API密钥' };
    }

    return await testAliyunConnection();
  } catch (error) {
    return { success: false, message: `连接测试失败: ${error.message}` };
  }
}

/**
 * 测试阿里云连接和额度
 */
async function testAliyunConnection() {
  console.log('🔍 开始测试阿里云API连接...');
  console.log('API URL:', `${AI_CONFIG.aliyun.baseUrl}/text2image/image-synthesis`);
  console.log('API Key前缀:', AI_CONFIG.aliyun.apiKey.substring(0, 10) + '...');

  try {
    console.log('📤 发送测试请求...');

    const requestBody = {
      model: AI_CONFIG.aliyun.defaultModel,
      input: {
        prompt: "test connection"
      },
      parameters: {
        size: "512*512",
        n: 1
      }
    };

    console.log('请求体:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${AI_CONFIG.aliyun.baseUrl}/text2image/image-synthesis`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.aliyun.apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📥 收到响应状态:', response.status, response.statusText);
    console.log('响应头:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('✅ 响应数据:', data);

      if (data.output?.task_id) {
        return {
          success: true,
          message: `阿里云连接成功！任务ID: ${data.output.task_id}`
        };
      } else {
        return {
          success: false,
          message: `响应格式异常: ${JSON.stringify(data)}`
        };
      }
    }

    const errorText = await response.text();
    console.error('❌ API测试失败:', errorText);

    if (errorText.includes('quota') || errorText.includes('insufficient')) {
      return {
        success: false,
        message: 'API密钥有效，但免费额度已用完或余额不足'
      };
    }

    if (errorText.includes('invalid') || errorText.includes('unauthorized')) {
      return {
        success: false,
        message: 'API密钥无效，请检查配置'
      };
    }

    if (errorText.includes('CORS') || errorText.includes('Access-Control')) {
      return {
        success: false,
        message: 'CORS错误：请确保开发服务器已重启并配置了代理'
      };
    }

    return {
      success: false,
      message: `HTTP ${response.status}: ${errorText}`
    };
  } catch (error) {
    console.error('🚫 网络错误:', error);

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        success: false,
        message: '网络连接失败：请检查代理配置和网络连接'
      };
    }

    return {
      success: false,
      message: `网络错误: ${error.message}`
    };
  }
}

export default {
  generateAIImage,
  editAIImage,
  testAPIConnection,
  AI_CONFIG
};